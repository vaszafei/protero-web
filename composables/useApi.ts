/**
 * Client-side API composable — replaces all /api/ server routes.
 * Queries Supabase directly from the client using the anon key + RLS.
 *
 * Every function here mirrors a former server/api/ route.
 */

// Identity + bankroll columns for a wallet row. `persona_name`/`bio`/
// `archetype`/`lifecycle` are what utils/wallet-meta.ts resolves a wallet's
// identity from; omitting them is why every trader persona rendered as
// "Strategy wallet".
//
// `roi`, `total_bets` and `win_rate` are deliberately NOT selected. They are
// bankroll-return columns, unmaintained since the `update_wallet_stats` trigger
// was dropped 2026-08-10. Use fetchWalletPerformance() for anything numeric.
const WALLET_IDENTITY_COLUMNS =
  'id, name, persona_name, bio, archetype, lifecycle, balance, initial_balance, is_active, is_public'

/** One row of `get_wallet_performance` — see the RPC migration for semantics. */
export interface WalletPerformance {
  wallet_id: number
  n_wagers: number
  n_won: number
  n_pending: number
  turnover: number
  pnl: number
  roi_pct: number | null
  win_rate_pct: number | null
  /** One-sided p against a zero-edge null. Null below n=10. */
  p_luck: number | null
  /** 'EDGE' (p<0.05) · 'hint' (p<0.20) · 'LUCK' · 'n<10' */
  verdict: 'EDGE' | 'hint' | 'LUCK' | 'n<10'
}

export const useApi = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()

  // ============================================================
  // PUBLIC DATA (no auth required)
  // ============================================================

  /**
   * GET /api/sports — sports with grouped leagues + wallets
   */
  const fetchSports = async () => {
    // No wallets query here. This used to also return a `wallets` array whose
    // `roi` was (balance - initial_balance) / initial_balance — bankroll return
    // mislabelled as ROI. Nothing consumed it (both callers read only
    // `.sports`), so it was a wrong number and a third round-trip on the
    // leagues page for nobody. Wallet numbers come from
    // fetchWalletPerformance().
    const [sportsRes, leaguesRes] = await Promise.all([
      supabase.from('sports').select('key, name, is_active').eq('is_active', true).order('name'),
      supabase.from('leagues').select('key, name, sport, country, flag').order('country').order('name'),
    ])

    const sportLeagues: Record<string, Record<string, any[]>> = {}
    for (const s of (sportsRes.data || [])) {
      sportLeagues[s.key] = {}
    }

    for (const l of (leaguesRes.data || [])) {
      const sport = l.sport || 'football'
      if (!sportLeagues[sport]) sportLeagues[sport] = {}
      const country = l.country || 'Other'
      if (!sportLeagues[sport][country]) sportLeagues[sport][country] = []
      sportLeagues[sport][country].push({ key: l.key, name: l.name, flag: l.flag || null })
    }

    return {
      sports: (sportsRes.data || [])
        .map(s => ({
          key: s.key,
          name: s.name,
          icon: s.key === 'football' ? '⚽' : s.key === 'basketball' ? '🏀' : '🏅',
          leagues: sportLeagues[s.key] || {}
        }))
        .filter(s => Object.keys(s.leagues).length > 0),
    }
  }

  /**
   * GET /api/leagues — all leagues with game counts
   */
  const fetchLeagues = async (season = currentSeason()) => {
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select('*')
      .order('name')

    if (error) throw error

    // Per-league game counts were once fetched with TWO count queries per
    // league — an N+1 that fired 44 requests and queued on the browser's
    // six-connection limit, which was the calendar's visible latency on every
    // visit. No live page reads `games_count`/`played_count` anymore (the only
    // consumer, LeagueList.vue, is unregistered and unused), so they are not
    // fetched. If a page needs them again, compute them in ONE grouped SQL
    // query (or an RPC), never per-league round trips.
    return {
      leagues: leagues || [],
      season,
      cached_at: new Date().toISOString()
    }
  }

  /**
   * GET /api/games/all — games with teams, predictions
   */
  const fetchGames = async (opts: { from?: string; to?: string; season?: string; leagues?: string[]; includeBets?: boolean; walletId?: number } = {}) => {
    const today = new Date()
    const defaultFrom = new Date(today)
    defaultFrom.setDate(today.getDate() - 14)
    const defaultTo = new Date(today)
    defaultTo.setDate(today.getDate() + 60)

    const fromDate = opts.from || defaultFrom.toISOString().split('T')[0]
    const toDate = opts.to || defaultTo.toISOString().split('T')[0]

    // Calendar/dashboard games. Do NOT select `sport_stats` or the full
    // `odds_raw` here — the calendar renders only the flattened odds scalars
    // and the basketball O/U triple, and those raw JSONB columns cost ~2.5MB
    // per response window (full box scores + the 0.5→9.5 alt ladder nobody on
    // this surface reads). Basketball odds are `sport_stats->odds` (the
    // pre-averaged triple) with `odds_raw->{moneyline,handicap,over_under}` as
    // fallback; football has neither, so those keys are NULL for football at
    // zero payload cost. The game detail page uses fetchGame(), which selects
    // the full columns — only this list endpoint is trimmed.
    const selectCols = `
      id, date, season, league_key, sport, status,
      home_team_id, away_team_id,
      home_goals, away_goals,
      home_xg, away_xg,
      odds_home, odds_away,
      odds:sport_stats->odds,
      ml:odds_raw->moneyline,
      hc:odds_raw->handicap,
      ou:odds_raw->over_under,
      home_team:teams!home_team_id(name, team_key),
      away_team:teams!away_team_id(name, team_key),
      predictions(
        id, prediction, confidence, model_version,
        over_15_prob, over_25_prob, over_35_prob,
        result_correct, created_at
      )
      ${opts.includeBets ? `,bets!left(id,wallet_id,bet_type,stake,odds,status,profit,notes,sport,strategy)` : ''}
    `

    // Paged, because PostgREST caps a response at 1,000 rows silently. The
    // dashboard's default 74-day window across every league/sport is ~3,900
    // rows — a single request truncated at row 1,000 sorted by date ascending,
    // which cut off partway through TODAY and left every later date blank
    // with no error anywhere (same failure mode as the league page fetcher).
    const PAGE = 1000
    const MAX_PAGES = 20
    const games: any[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      let q = supabase
        .from('games')
        .select(selectCols)
        .gte('date', fromDate)
        .lte('date', toDate)

      // A date window spans leagues of BOTH season conventions — European
      // football is on 2026-2027 while argentina_primera and brazil_serie_a are
      // on 2026-2026 — so pinning one season here drops the calendar-year
      // leagues entirely (248 fixtures in the dashboard's own window). Only
      // constrain the season when the caller asked for a specific one; otherwise
      // accept either, since `from`/`to` already bound the query.
      q = opts.season
        ? q.eq('season', opts.season)
        : q.in('season', currentSeasons())

      if (opts.leagues && opts.leagues.length > 0) {
        q = q.in('league_key', opts.leagues)
      }

      const { data, error } = await q
        .order('date', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1)

      if (error) throw error
      if (!data?.length) break
      games.push(...data)
      if (data.length < PAGE) break
    }

    // Parlay legs are stored in `bets` with `notes.parlay_id` set. Strip them
    // here — the dashboard parlays toggle renders them grouped instead.
    const isParlayLeg = (b: any): boolean => {
      if (!b?.notes) return false
      let n: any = b.notes
      if (typeof n === 'string') {
        try { n = JSON.parse(n) } catch { return false }
      }
      return !!(n && (n.parlay_id || n.pick_type === 'prop_parlay_leg' || n.leg_number))
    }

    const enriched = (games || []).map((game: any) => {
      // Filter bets to selected wallet when provided + drop parlay legs
      let bets = game.bets || []
      if (opts.walletId && bets.length > 0) {
        bets = bets.filter((b: any) => b.wallet_id === opts.walletId)
      }
      bets = bets.filter((b: any) => !isParlayLeg(b))
      return {
        ...game,
        bets,
        home_name: game.home_team?.name || 'Unknown',
        away_name: game.away_team?.name || 'Unknown',
        home_key: game.home_team?.team_key || null,
        away_key: game.away_team?.team_key || null,
        // Normalize the slimmed odds into the names the dashboard reads.
        // `odds` is the basketball sport_stats->odds triple (NULL for
        // football); `ml`/`hc`/`ou` are the basketball odds_raw fallback
        // entries, which are single objects (not arrays). `sport_stats` is
        // therefore no longer a full box score on this path.
        sport_stats: game.odds ? { odds: game.odds } : null,
        odds_raw: game.ml || game.hc || game.ou
          ? { moneyline: game.ml, handicap: game.hc, over_under: game.ou }
          : null,
      }
    })

    return { success: true, games: enriched, count: enriched.length, from: fromDate, to: toDate }
  }

  /**
   * GET /api/game/:id — single game with lineups
   */
  const fetchGame = async (gameId: number) => {
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id(name, team_key),
        away_team:teams!away_team_id(name, team_key),
        predictions(*)
      `)
      .eq('id', gameId)
      .single()

    if (error) throw error

    // Fetch lineups separately
    const { data: lineups } = await supabase
      .from('lineups')
      .select('*')
      .eq('game_id', gameId)
      .order('position')

    const homeLineups = (lineups || []).filter((l: any) => l.team_id === game.home_team_id)
    const awayLineups = (lineups || []).filter((l: any) => l.team_id === game.away_team_id)

    // `match_events` is stored as text in the DB (not jsonb), so Supabase returns
    // it as a raw string. Components call `.map()`/`.length` on it — parse here.
    let matchEvents: any[] | null = null
    if (typeof game.match_events === 'string' && game.match_events.trim()) {
      try {
        matchEvents = JSON.parse(game.match_events)
      } catch {
        matchEvents = null
      }
    } else if (Array.isArray(game.match_events)) {
      matchEvents = game.match_events
    }

    return {
      game: {
        ...game,
        home_name: game.home_team?.name || 'Unknown',
        away_name: game.away_team?.name || 'Unknown',
        home_key: game.home_team?.team_key || null,
        away_key: game.away_team?.team_key || null,
        // DB stores these as `*_possession_pct`; normalize so components read
        // `home_possession` / `away_possession` uniformly.
        home_possession: game.home_possession_pct ?? null,
        away_possession: game.away_possession_pct ?? null,
        match_events: matchEvents,
      },
      lineups: { home: homeLineups, away: awayLineups },
      prediction: game.predictions?.[0] || null
    }
  }

  /**
   * GET /api/game/:id/detail — bundled game payload
   * Loads game + lineups + h2h + fantasy in parallel for ~3x faster game-detail page.
   * Safe to use on either web or APK (single Supabase round-trip cost per source).
   */
  const fetchGameDetail = async (gameId: number) => {
    // 1) Game + lineups (sequential — lineups need home_team_id)
    const baseRes = await fetchGame(gameId)
    const game = baseRes.game

    // 2) A completed fixture renders neither H2H nor fantasy projections —
    //    both live on scheduled-only tabs — so skip the two round trips
    //    rather than fetching and discarding them.
    if (game?.status === 'completed') {
      return { ...baseRes, h2h: null, fantasy: [] }
    }

    // 3) Still scheduled: fan out h2h + fantasy in parallel.
    const [h2hRes, fantasyRes] = await Promise.all([
      fetchH2H(game.home_name, game.away_name, 10).catch(() => ({ matches: [], summary: null })),
      fetchFantasyProjections(gameId).catch(() => [])
    ])

    return {
      ...baseRes,
      h2h: h2hRes,
      fantasy: fantasyRes,
    }
  }

  /**
   * GET /api/leagues/:slug — single league with games and standings
   */
  const fetchLeague = async (slug: string, season = currentSeason(slug)) => {
    // `.maybeSingle()`, and a synthesised row when the registry has none.
    //
    // The `leagues` registry holds 22 rows while `games` carries 15 more league
    // keys — the six domestic cups ingested 2026-08-20, conference_league, and
    // the rest. `.single()` answers a zero-row result with a 406, which this
    // threw, so every one of those competitions dead-ended on "Loading league
    // data…" forever: 5,000+ fixtures listed on /leagues and unreachable from
    // it. A competition is defined by having fixtures, not by having a
    // registry row.
    const { data: registryRow, error: lErr } = await supabase
      .from('leagues')
      .select('*')
      .eq('key', slug)
      .maybeSingle()

    if (lErr) throw lErr

    const league = registryRow ?? {
      key: slug,
      name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      flag: null,
      sport: null, // filled from the fixtures below
      unregistered: true,
    }

    const GAME_COLUMNS = `
      id, date, season, league_key, sport, status, round,
      home_team_id, away_team_id, home_goals, away_goals,
      home_xg, away_xg, odds_home, odds_draw, odds_away, sport_stats,
      home_team:teams!home_team_id(name, team_key),
      away_team:teams!away_team_id(name, team_key),
      predictions(id, prediction, confidence, model_version, over_15_prob, over_25_prob, over_35_prob, over_85_corners_prob, over_95_corners_prob, over_105_corners_prob, odds_over_25, odds_under_25, expected_value, result_correct, created_at, model_details, calibrated_prob, belief_score),
      bets(
        id, wallet_id, bet_type, stake, odds, status, profit,
        parlay_legs(parlay_id)
      )
    `

    // Paged, because PostgREST caps a response at 1,000 rows silently. An NBA
    // season is ~1,300 fixtures, so a single request dropped the last quarter
    // of the schedule from the table, the round rail and the picks panel with
    // no error anywhere.
    const PAGE = 1000
    const MAX_PAGES = 20
    const rawGames: any[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await supabase
        .from('games')
        .select(GAME_COLUMNS)
        .eq('league_key', slug)
        .eq('season', season)
        .order('date', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1)

      if (error) throw error
      if (!data?.length) break
      rawGames.push(...data)
      if (data.length < PAGE) break
    }

    const standingsRes = await supabase
      .from('standings')
      .select('*')
      .eq('league_key', slug)
      .eq('season', season)
      .order('pts', { ascending: false })

    if (standingsRes.error) throw standingsRes.error

    // Flatten the best prediction onto each game — PredictionsView consumes
    // `prediction_id` / `prediction` / `model_version` / `over_*_prob` at the
    // game level, not a nested `predictions` array. Without this flatten the
    // Predictions tab rendered zero AI predictions even though the rows exist.
    const games = rawGames.map((g: any) => {
      const prediction = (g.predictions && g.predictions[0]) || null
      return {
        ...g,
        home_name: g.home_team?.name || 'Unknown',
        away_name: g.away_team?.name || 'Unknown',
        // Team keys resolve the crest. They were selected but never flattened,
        // so every fixture card fell through to its text placeholder.
        home_key: g.home_team?.team_key || null,
        away_key: g.away_team?.team_key || null,
        prediction_id: prediction?.id,
        prediction: prediction?.prediction,
        confidence: prediction?.confidence,
        model_version: prediction?.model_version,
        over_15_prob: prediction?.over_15_prob,
        over_25_prob: prediction?.over_25_prob,
        over_35_prob: prediction?.over_35_prob,
        over_85_corners_prob: prediction?.over_85_corners_prob,
        over_95_corners_prob: prediction?.over_95_corners_prob,
        over_105_corners_prob: prediction?.over_105_corners_prob,
        odds_over_25: prediction?.odds_over_25,
        odds_under_25: prediction?.odds_under_25,
        expected_value: prediction?.expected_value,
        // The real model readout — the picker's own probabilities, carried on
        // the prediction row and surfaced by FootballMatchCard. Never computed
        // in the browser.
        model_details: prediction?.model_details ?? null,
        calibrated_prob: prediction?.calibrated_prob ?? null,
        belief_score: prediction?.belief_score ?? null,
      }
    })

    // An unregistered competition's sport comes from its own fixtures.
    if (!league.sport) league.sport = games[0]?.sport || 'football'

    return { league, games, standings: standingsRes.data || [] }
  }

  /**
   * Fantasy projections for a specific game
   */
  const fetchFantasyProjections = async (gameId: number) => {
    const { data, error } = await supabase
      .from('fantasy_projections')
      .select('player_name, team_name, projected_score, projected_minutes, scoring_type, confidence')
      .eq('game_id', gameId)
      .order('projected_score', { ascending: false })

    if (error) throw error
    return data || []
  }

  const fetchPlayerPropPicks = async (gameId: number) => {
    const { data, error } = await supabase
      .from('player_prop_picks')
      .select('player_name, team_name, market, line, direction, pick_type, trad_tier, trad_score, season_hr, l10_hr, h2h_hr, h2h_n, cv, fe_p_over, fe_edge, sniper_score, sniper_signals, n_signals, confidence, result')
      .eq('game_id', gameId)
      .order('trad_score', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * GET /api/h2h/:homeTeam/:awayTeam — head to head
   */
  const fetchH2H = async (homeTeamName: string, awayTeamName: string, limit = 20) => {
    // Find team IDs by name
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .or(`name.eq.${homeTeamName},name.eq.${awayTeamName}`)

    if (!teams || teams.length < 2) return { matches: [], summary: null }

    const homeTeam = teams.find(t => t.name === homeTeamName)
    const awayTeam = teams.find(t => t.name === awayTeamName)
    if (!homeTeam || !awayTeam) return { matches: [], summary: null }

    const { data: matches } = await supabase
      .from('games')
      .select(`
        id, date, season, league_key, home_goals, away_goals, status,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .or(`and(home_team_id.eq.${homeTeam.id},away_team_id.eq.${awayTeam.id}),and(home_team_id.eq.${awayTeam.id},away_team_id.eq.${homeTeam.id})`)
      .not('home_goals', 'is', null)
      .order('date', { ascending: false })
      .limit(limit)

    const m = matches || []
    const homeWins = m.filter((g: any) => {
      const isHome = g.home_team?.name === homeTeamName
      return isHome ? g.home_goals > g.away_goals : g.away_goals > g.home_goals
    }).length

    return {
      matches: m,
      summary: {
        totalMatches: m.length,
        homeTeamWins: homeWins,
        awayTeamWins: m.length - homeWins - m.filter((g: any) => g.home_goals === g.away_goals).length,
        draws: m.filter((g: any) => g.home_goals === g.away_goals).length
      }
    }
  }

  /**
   * GET /api/player/:id/season — player season stats
   */
  const fetchPlayerSeason = async (playerId: number, leagueKey?: string) => {
    const params: Record<string, string> = {}
    if (leagueKey) params.league = leagueKey
    params.limit = '30'

    const data = await $fetch(`/api/player/${playerId}/season`, { params })
    return data as { games: any[], averages: any, gameCount: number }
  }

  // ============================================================
  // USER DATA (auth required, RLS enforced)
  // ============================================================

  // ============================================================
  // WALLETS / PARLAYS / ACCURACY (public reads, no RLS gate)
  // ============================================================

  /**
   * GET wallets visible to the current user.
   *   - Admins see the whole roster, frozen wallets included.
   *   - Regular users see only wallets they are actively subscribed to.
   *   - Anonymous callers get an empty list.
   */
  const fetchWallets = async () => {
    const me = user.value as any
    if (!me?.id) return { wallets: [] }

    const isAdminRole = me.role === 'admin'

    if (isAdminRole) {
      // Operators see the whole roster, frozen wallets included — a wallet that
      // stopped writing is history an operator still needs to read. `lifecycle`
      // ('trader' | 'legacy') is what tells the two apart, not `is_active`.
      const { data, error } = await supabase
        .from('wallets')
        .select(WALLET_IDENTITY_COLUMNS)
        .order('id', { ascending: true })
      if (error) throw error
      return { wallets: data || [] }
    }

    // Regular user — only subscribed, non-expired wallets
    const nowIso = new Date().toISOString()
    const { data: subs, error: sErr } = await supabase
      .from('user_wallet_subscriptions')
      .select('wallet_id, expires_at, is_active')
      .eq('user_id', me.id)
      .eq('is_active', true)
      .gte('expires_at', nowIso)
    if (sErr) throw sErr

    const ids = (subs || []).map((s: any) => s.wallet_id)
    if (ids.length === 0) return { wallets: [] }

    const { data, error } = await supabase
      .from('wallets')
      .select(WALLET_IDENTITY_COLUMNS)
      .in('id', ids)
      .eq('is_active', true)
      .order('id', { ascending: true })
    if (error) throw error
    return { wallets: data || [] }
  }

  /**
   * Wager-level performance via the `get_wallet_performance` RPC.
   *
   * Do NOT compute this in the client. `wallets.roi` / `total_bets` / `win_rate`
   * are bankroll-return columns that stopped being maintained when the
   * `update_wallet_stats` trigger was dropped on 2026-08-10, and deriving ROI
   * from (balance - initial_balance) reports W7 as +69.7% where it is +11.5%.
   *
   * The RPC counts a parlay as ONE wager at `parlay_odds`, never its legs —
   * the rule that separates W21's real -50.2% from the -2.1% leg-counting once
   * reported. Returns `p_luck` beside `roi_pct`; render them together, never
   * ROI alone.
   */
  const fetchWalletPerformance = async (walletId?: number) => {
    const { data, error } = await supabase.rpc('get_wallet_performance',
      walletId == null ? {} : { p_wallet_id: walletId })
    if (error) throw error
    return (data || []) as WalletPerformance[]
  }

  /**
   * Where a wallet's P&L came from: `get_wallet_breakdown(wallet_id)`.
   *
   * Three cuts in one round-trip — competition, market family, price band —
   * computed in SQL for the same reason ROI is: a client-side split invites
   * someone to divide profit by `initial_balance` again.
   *
   * SETTLED SINGLES ONLY, and the payload carries that in `basis`. A parlay
   * has no single league or market, and attributing one to its legs is the
   * leg-counting error that once reported W21 at -2.1% against -76.8%.
   */
  const fetchWalletBreakdown = async (walletId: number) => {
    const { data, error } = await supabase.rpc('get_wallet_breakdown', { p_wallet_id: walletId })
    if (error) throw error
    return (data || { n: 0, cuts: {} }) as {
      wallet_id: number
      basis: string
      n: number
      cuts: Record<string, Array<{
        label: string; n: number; won: number
        turnover: number; pnl: number
        roi_pct: number | null; win_rate_pct: number
      }>>
    }
  }

  /**
   * GET /api/wallet/bets — paginated wallet *singles* with game info.
   *
   * Filters out bets that belong to a parlay (notes->parlay_id is set), so the
   * wallet UI doesn't render parlay legs as standalone singles. Use
   * fetchWalletParlays() for grouped parlay rows.
   */
  const fetchWalletBets = async (walletId: number, opts: { status?: string; limit?: number; offset?: number } = {}) => {
    const limit = Math.min(opts.limit ?? 200, 500)
    const offset = opts.offset ?? 0
    let q = supabase
      .from('bets')
      .select(`
        id, bet_type, stake, odds, status, profit, placed_at, notes, sport, strategy, game_id,
        games!inner(id, date, league_key, home_goals, away_goals, status,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        )
      `, { count: 'exact' })
      .eq('wallet_id', walletId)
      .order('placed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (opts.status && ['pending', 'won', 'lost', 'push', 'void'].includes(opts.status)) {
      q = q.eq('status', opts.status)
    }

    const { data, count, error } = await q
    if (error) throw error

    const isParlayLeg = (b: any): boolean => {
      if (!b?.notes) return false
      // notes is JSONB on the server; client receives it as object or string.
      let n: any = b.notes
      if (typeof n === 'string') {
        try { n = JSON.parse(n) } catch { return false }
      }
      return !!(n && (n.parlay_id || n.pick_type === 'prop_parlay_leg' || n.leg_number))
    }

    const bets = (data || [])
      .filter((b: any) => !isParlayLeg(b))
      .map((b: any) => ({
        ...b,
        home_name: b.games?.home_team?.name || 'TBD',
        away_name: b.games?.away_team?.name || 'TBD',
        date: b.games?.date,
        league_key: b.games?.league_key,
        game_status: b.games?.status,
        home_goals: b.games?.home_goals,
        away_goals: b.games?.away_goals,
      }))
    return { bets, total: count || 0 }
  }

  /**
   * Wallet parlays + their legs (with game info per leg).
   *
   * `parlays` table schema:
   *   id, wallet_id, num_legs, total_stake, final_probability, parlay_odds,
   *   expected_value, correlation_penalty, kelly_fraction, strategy, status,
   *   profit, created_at
   *
   * Each parlay_leg → bet → game. Notes on the leg bet carry the prop / market
   * description (player, market, line, direction) when applicable.
   */
  const fetchWalletParlays = async (walletId: number, opts: { status?: string; limit?: number; offset?: number; from?: string; to?: string } = {}) => {
    const limit = Math.min(opts.limit ?? 100, 500)
    const offset = opts.offset ?? 0

    let q = supabase
      .from('parlays')
      .select(`
        id, wallet_id, num_legs, total_stake, parlay_odds, final_probability,
        expected_value, kelly_fraction, strategy, status, actual_payout, created_at,
        parlay_legs (
          id, leg_number,
          bets (
            id, game_id, bet_type, odds, stake, predicted_prob, status, profit, notes,
            games:game_id (
              id, date, league_key, status, home_goals, away_goals,
              home_team:teams!home_team_id ( id, name ),
              away_team:teams!away_team_id ( id, name )
            )
          )
        )
      `, { count: 'exact' })
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (opts.status && ['pending', 'won', 'lost', 'push', 'void'].includes(opts.status)) {
      q = q.eq('status', opts.status)
    }
    if (opts.from) q = q.gte('created_at', opts.from)
    if (opts.to)   q = q.lte('created_at', opts.to)

    const { data, count, error } = await q
    if (error) throw error

    const parseNotes = (n: any): any => {
      if (!n) return null
      if (typeof n === 'object') return n
      try { return JSON.parse(n) } catch { return null }
    }

    const parlays = (data || []).map((p: any) => {
      const rawLegs = Array.isArray(p.parlay_legs) ? p.parlay_legs : []
      const legs = rawLegs
        .map((pl: any) => {
          const bet = pl.bets || {}
          const g = bet.games || {}
          const meta = parseNotes(bet.notes)
          return {
            id: pl.id,
            leg_number: pl.leg_number,
            bet_id: bet.id,
            bet_type: bet.bet_type,
            odds: bet.odds,
            stake: bet.stake,
            predicted_prob: bet.predicted_prob,
            status: bet.status,
            profit: bet.profit,
            notes: meta,
            game_id: g.id,
            league_key: g.league_key,
            game_status: g.status,
            game_date: g.date,
            home_goals: g.home_goals,
            away_goals: g.away_goals,
            home_name: g.home_team?.name || 'TBD',
            away_name: g.away_team?.name || 'TBD',
          }
        })
        .sort((a: any, b: any) => (a.leg_number || 0) - (b.leg_number || 0))

      // `parlays` stores gross return in `actual_payout` (a lost parlay is 0.00),
      // never a `profit` column. Wager-level profit is payout minus the stake the
      // parlay actually risked — and stays null while the parlay is pending.
      const payout = p.actual_payout == null ? null : Number(p.actual_payout)
      const profit = payout == null ? null : payout - Number(p.total_stake || 0)

      return {
        ...p,
        legs,
        profit,
        // Convenience: latest leg date so the row sorts beside singles by recency
        date: legs[0]?.game_date || p.created_at,
      }
    })
    return { parlays, total: count || 0 }
  }

  /**
   * Wallet identity + wager-level performance for the dashboard card.
   *
   * Numbers come from the `get_wallet_performance` RPC (profit / turnover,
   * parlay = one wager) — NOT from `(balance - initial_balance) / initial_balance`,
   * which is bankroll return and rendered W7 as +69.7% where its ROI is +11.5%.
   */
  const fetchWalletStats = async (walletId: number) => {
    const { data: wallet, error: wErr } = await supabase
      .from('wallets')
      .select(WALLET_IDENTITY_COLUMNS)
      .eq('id', walletId)
      .maybeSingle()
    if (wErr) throw wErr
    if (!wallet) return null

    const perf = await fetchWalletPerformance(walletId)

    return {
      wallet,
      performance: perf[0] || null,
    }
  }

  /**
   * Cumulative wallet balance over time (settled bets only).
   * Used for the wallet performance chart.
   *
   * @param walletId - target wallet
   * @param days     - lookback window. Use 0 for "all time".
   * @returns        - array of { ts, balance } sorted ascending. balance is
   *                   wallet.initial_balance + cumulative pnl up to that ts.
   */
  const fetchWalletBalanceHistory = async (walletId: number, days = 30) => {
    // Pull seed first; we need it to anchor the cumulative series.
    const { data: wallet, error: wErr } = await supabase
      .from('wallets')
      .select('initial_balance, balance')
      .eq('id', walletId)
      .maybeSingle()
    if (wErr) throw wErr
    if (!wallet) return { points: [], initial_balance: 0, current_balance: 0 }

    let q = supabase
      .from('v_wallet_balance_history')
      .select('ts, pnl_cum')
      .eq('wallet_id', walletId)
      .order('ts', { ascending: true })

    if (days > 0) {
      const since = new Date(Date.now() - days * 86400_000).toISOString()
      q = q.gte('ts', since)
    }

    const { data, error } = await q
    if (error) throw error

    const seed = Number(wallet.initial_balance || 0)
    const points = (data || []).map((row: any) => ({
      ts: row.ts as string,
      balance: seed + Number(row.pnl_cum || 0),
    }))
    return {
      points,
      initial_balance: seed,
      current_balance: Number(wallet.balance || 0),
    }
  }

  // ============================================================
  // LEAGUE ANALYSIS (RPC-bundled, SWR-cached)
  // ============================================================

  /**
   * Calls public.get_league_analysis(p_league_key, p_season) which returns the
   * 8-section payload rendered by the Analysis tab on /league/[slug] in one
   * round-trip. Cached via useSwr (memoryTtl 5 min — analysis only updates
   * when new completed games land).
   *
   * Returns { sport, key_metrics, score_distribution, home_vs_away,
   *           scoring_trends, form_table, top_scorers, referee_impact,
   *           market_calibration }
   *
   * `market_calibration` (added 2026-08-25) is football-only and NULL below
   * 40 matched `closing_odds` rows — the season in progress typically matches
   * a handful until football-data.co.uk's weekly refresh, so it renders
   * against a completed archive season, not the live one. It is a read on the
   * CLOSE's own honesty (a reliability diagram + Brier score), never a model
   * claim and never an EV/ROI number — see the do-not-do rule against masking
   * on ROI in root CLAUDE.md.
   */
  const fetchLeagueAnalysis = async (
    leagueKey: string,
    season = currentSeason(),
  ) => {
    const { data, error } = await supabase.rpc('get_league_analysis', {
      p_league_key: leagueKey,
      p_season: season,
    })
    if (error) throw error
    return data as {
      league_key: string
      season: string
      sport: 'football' | 'basketball'
      key_metrics: Record<string, number>
      score_distribution: Array<{ label: string; count: number; pct: number }>
      home_vs_away: any
      scoring_trends: Array<any>
      form_table: Array<any>
      top_scorers: Array<any>
      referee_impact: Array<any>
      market_calibration: { matched: number; total: number; brier: number; buckets: Array<{ bucket: number; n: number; implied: number; actual: number }> } | null
    }
  }

  /**
   * GET /api/parlays — all parlays with legs and game info
   */
  const fetchParlays = async () => {
    const { data, error } = await supabase
      .from('parlays')
      .select(`
        *,
        parlay_legs (
          id, leg_number,
          bets (
            id, game_id, bet_type, odds, predicted_prob, status,
            games:game_id (
              id, date, league_key, status, home_goals, away_goals,
              home_team:home_team_id ( id, name ),
              away_team:away_team_id ( id, name )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, parlays: data || [] }
  }

  /**
   * GET /api/predictions/accuracy — accuracy stats (overall + by confidence)
   */
  const fetchPredictionsAccuracy = async (league?: string) => {
    let q = supabase
      .from('predictions')
      .select('*, games!inner(league_key, round, home_team_id, away_team_id)')
      .not('validated_at', 'is', null)
    if (league) q = q.eq('games.league_key', league)
    const { data: validated, error } = await q
    if (error) throw error

    const total = validated?.length || 0
    const resultCorrect = validated?.filter((p: any) => p.result_correct).length || 0
    const goalsCorrect = validated?.filter((p: any) => p.goals_correct).length || 0
    const over25Correct = validated?.filter((p: any) => p.over25_correct).length || 0
    const bttsCorrect = validated?.filter((p: any) => p.btts_correct).length || 0

    const ranges = [
      { min: 90, max: 100, label: '90-100' },
      { min: 80, max: 89, label: '80-89' },
      { min: 70, max: 79, label: '70-79' },
      { min: 60, max: 69, label: '60-69' },
      { min: 50, max: 59, label: '50-59' },
    ]
    const byConfidence = ranges.map(r => {
      const subset = (validated || []).filter((p: any) => p.confidence >= r.min && p.confidence <= r.max)
      const correct = subset.filter((p: any) => p.result_correct).length
      return {
        range: r.label,
        total: subset.length,
        correct,
        accuracy: subset.length > 0 ? ((correct / subset.length) * 100).toFixed(1) : '0.0',
      }
    })

    return {
      success: true,
      league: league || 'all',
      stats: {
        totalValidated: total,
        resultAccuracy: total > 0 ? ((resultCorrect / total) * 100).toFixed(1) : '0.0',
        goalsAccuracy: total > 0 ? ((goalsCorrect / total) * 100).toFixed(1) : '0.0',
        over25Accuracy: total > 0 ? ((over25Correct / total) * 100).toFixed(1) : '0.0',
        bttsAccuracy: total > 0 ? ((bttsCorrect / total) * 100).toFixed(1) : '0.0',
        counts: { resultCorrect, goalsCorrect, over25Correct, bttsCorrect },
      },
      byConfidence,
    }
  }

  /**
   * Twin vs closing line, split by season phase — the persisted output of
   * `research/closing_line/season_phase.py --persist` (workstream 1 of the
   * research phase). One row per (league, market, phase):
   *
   *   phase='all'  → the per-cell M1 fit: `b_m1` is the twin's stack weight on
   *                  the log-odds residual (0 = the close is right), `t_m1`
   *                  its significance, fit on 2023-24 + 2024-25 and scored on
   *                  2025-26.
   *   phase=early|mid|late → the SAME weight re-scored on the calendar tercile
   *                  of the test season (a phase cannot manufacture its own b).
   *
   * Proper scoring only — paired Brier deltas vs the Shin-close, no EV, no
   * ROI, no bet selection. `twin_delta_brier` negative = the twin beat the
   * close on that slice.
   */
  const fetchTwinSeasonPhase = async (leagueKey: string) => {
    const { data, error } = await supabase
      .from('twin_season_phase')
      .select('*')
      .eq('league_key', leagueKey)
      .order('market')
    if (error) throw error
    return data as Array<{
      league_key: string
      market: string
      phase: 'all' | 'early' | 'mid' | 'late'
      n_test: number
      ceiling: number | null
      close_bss: number | null
      twin_bss: number | null
      b_m1: number | null
      t_m1: number | null
      twin_delta_brier: number | null
      twin_delta_t: number | null
      m1_delta_brier: number | null
      m1_delta_t: number | null
      train_seasons: string
      test_season: string
      computed_at: string
    }>
  }

  return {
    // Public
    fetchSports,
    fetchLeagues,
    fetchGames,
    fetchGame,
    fetchGameDetail,
    fetchLeague,
    fetchFantasyProjections,
    fetchPlayerPropPicks,
    fetchH2H,
    fetchPlayerSeason,
    // Wallets / parlays / accuracy
    fetchWallets,
    fetchWalletBets,
    fetchWalletBreakdown,
    fetchWalletParlays,
    fetchWalletStats,
    fetchWalletPerformance,
    fetchWalletBalanceHistory,
    fetchLeagueAnalysis,
    fetchTwinSeasonPhase,
    fetchParlays,
    fetchPredictionsAccuracy,
  }
}
