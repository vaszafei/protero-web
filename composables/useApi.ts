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

// All football league_keys we have ML wallets for. Wallets that bet across
// many football leagues (V18, V20, Football V6 AIF, V18 Revival, Football V6
// Parlays) are unlocked when the user has access to ANY of these.
const FOOTBALL_LEAGUE_KEYS = [
  'premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1',
  'eredivisie', 'championship', 'super_lig', 'liga_portugal',
  'greek_super_league', 'bundesliga_2', 'ligue_2', 'serie_b', 'la_liga_2',
  'champions_league', 'europa_league',
]

// Wallet ID → list of league_keys that grant access to it.
// A wallet is shown to a user when they have access to AT LEAST ONE of
// these leagues (free_league_key OR active league_unlock).
// Keep in sync with new wallets added to the backend.
const WALLET_LEAGUE_MAP: Record<number, string[]> = {
  2:  FOOTBALL_LEAGUE_KEYS,                    // V18 2025-2026
  3:  FOOTBALL_LEAGUE_KEYS,                    // V20 2025-2026
  4:  ['nba'],                                  // NBA V4 RL
  5:  ['euroleague'],                           // EuroLeague V4 RL
  6:  ['nba'],                                  // NBA V5 Thompson
  7:  ['euroleague'],                           // EuroLeague V5 Thompson
  8:  ['nba'],                                  // NBA V6 AIF
  9:  ['euroleague'],                           // EuroLeague V6 AIF
  10: FOOTBALL_LEAGUE_KEYS,                    // Football V6 AIF
  11: FOOTBALL_LEAGUE_KEYS,                    // V18 Revival
  12: FOOTBALL_LEAGUE_KEYS,                    // Football V6 Parlays
  13: ['greek_basket_league'],                  // GBL V6 AIF
  14: ['acb'],                                  // ACB V6 AIF
  15: ['eurocup'],                              // EuroCup V6 AIF
  16: ['bcl'],                                  // BCL V6 AIF
  // Player props — single wallet covers both NBA and EuroLeague
  19: ['nba', 'euroleague'],                    // Props V2 AIF (automated)
  20: ['nba', 'euroleague'],                    // Props V2 Manual (curated)
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
  const fetchLeagues = async (season = '2025-2026') => {
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select('*')
      .order('name')

    if (error) throw error

    // Get counts for each league
    const activeLeagues = (leagues || []).filter((l: any) => l.key)
    const counts = await Promise.all(
      activeLeagues.map(async (league: any) => {
        const [totalRes, playedRes] = await Promise.all([
          supabase.from('games').select('*', { count: 'exact', head: true }).eq('season', season).eq('league_key', league.key),
          supabase.from('games').select('*', { count: 'exact', head: true }).eq('season', season).eq('league_key', league.key).not('home_goals', 'is', null).not('away_goals', 'is', null),
        ])
        return { key: league.key, total: totalRes.count || 0, played: playedRes.count || 0 }
      })
    )

    const totalMap: Record<string, number> = {}
    const playedMap: Record<string, number> = {}
    for (const c of counts) {
      totalMap[c.key] = c.total
      playedMap[c.key] = c.played
    }

    return {
      leagues: (leagues || []).map((league: any) => ({
        ...league,
        games_count: totalMap[league.key] || 0,
        played_count: playedMap[league.key] || 0,
      })),
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
    const season = opts.season || '2025-2026'

    const selectCols = `
      id, date, season, league_key, sport, status,
      home_team_id, away_team_id,
      home_goals, away_goals,
      home_xg, away_xg,
      odds_home, odds_away, odds_raw, sport_stats,
      home_team:teams!home_team_id(name, team_key),
      away_team:teams!away_team_id(name, team_key),
      predictions(
        id, prediction, confidence, model_version,
        over_15_prob, over_25_prob, over_35_prob,
        result_correct, created_at
      )
      ${opts.includeBets ? `,bets!left(id,wallet_id,bet_type,stake,odds,status,profit,notes,sport,strategy)` : ''}
    `

    let q = supabase
      .from('games')
      .select(selectCols)
      .eq('season', season)
      .gte('date', fromDate)
      .lte('date', toDate)

    if (opts.leagues && opts.leagues.length > 0) {
      q = q.in('league_key', opts.leagues)
    }

    const { data: games, error } = await q.order('date', { ascending: true })
    if (error) throw error

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

    return {
      game: {
        ...game,
        home_name: game.home_team?.name || 'Unknown',
        away_name: game.away_team?.name || 'Unknown',
        home_key: game.home_team?.team_key || null,
        away_key: game.away_team?.team_key || null,
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

    // 2) Now fan out h2h + fantasy in parallel.
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
  const fetchLeague = async (slug: string, season = '2025-2026') => {
    const { data: league, error: lErr } = await supabase
      .from('leagues')
      .select('*')
      .eq('key', slug)
      .single()

    if (lErr) throw lErr

    const [gamesRes, standingsRes] = await Promise.all([
      supabase
        .from('games')
        .select(`
          id, date, season, league_key, sport, status, round,
          home_team_id, away_team_id, home_goals, away_goals,
          home_xg, away_xg, odds_home, odds_away, sport_stats,
          home_team:teams!home_team_id(name, team_key),
          away_team:teams!away_team_id(name, team_key),
          predictions(id, prediction, confidence, over_15_prob, over_25_prob, over_35_prob, result_correct, created_at),
          bets(id, wallet_id, bet_type, stake, odds, status, profit)
        `)
        .eq('league_key', slug)
        .eq('season', season)
        .order('date', { ascending: true }),
      supabase
        .from('standings')
        .select('*')
        .eq('league_key', slug)
        .eq('season', season)
        .order('pts', { ascending: false })
    ])

    const games = (gamesRes.data || []).map((g: any) => ({
      ...g,
      home_name: g.home_team?.name || 'Unknown',
      away_name: g.away_team?.name || 'Unknown',
    }))

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
  const fetchH2H = async (homeTeamName: string, awayTeamName: string, limit = 10) => {
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

  /**
   * GET /api/user/subscriptions
   */
  const fetchSubscriptions = async () => {
    if (!user.value) return { subscriptions: [] }

    // Must use the server route — direct Supabase queries are blocked by RLS
    // because this app uses custom auth (not Supabase Auth), so auth.uid() is null.
    return $fetch('/api/user/subscriptions').catch(() => ({ subscriptions: [] }))
  }

  /**
   * POST /api/user/subscriptions — subscribe/unsubscribe
   */
  const toggleSubscription = async (leagueKey: string, sport = 'football', action: 'subscribe' | 'unsubscribe' = 'subscribe') => {
    if (!user.value) throw new Error('Not authenticated')

    if (action === 'subscribe') {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.value.id,
          league_key: leagueKey,
          sport,
          is_active: true,
        }, { onConflict: 'user_id,league_key' })
      if (error) throw error
      return { success: true, action: 'subscribed', league_key: leagueKey }
    } else {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.value.id)
        .eq('league_key', leagueKey)
      if (error) throw error
      return { success: true, action: 'unsubscribed', league_key: leagueKey }
    }
  }

  /**
   * RPC update_notification_prefs(p_prefs JSONB) — merge keys onto
   * users.notification_prefs and return the new object. Works for both web
   * (Nitro JWT) and APK (Edge Function JWT) — RPC reads auth_user_id() from
   * request.jwt.claims.
   */
  const updateNotificationPrefs = async (prefs: Record<string, boolean>) => {
    if (!user.value) throw new Error('Not authenticated')
    const { data, error } = await supabase.rpc('update_notification_prefs', { p_prefs: prefs })
    if (error) throw error
    return data as Record<string, boolean>
  }

  /**
   * GET /api/user/picks — admin picks for subscribed leagues
   */
  const fetchPicks = async (opts: { sport?: string; days?: number } = {}) => {
    if (!user.value) return { picks: [], subscribed_leagues: [] }

    const days = opts.days || 7
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    // Get subscribed leagues
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('league_key, sport')
      .eq('user_id', user.value.id)

    if (!subs || subs.length === 0) {
      return { picks: [], message: 'Subscribe to leagues to see admin picks', subscribed_leagues: [] }
    }

    const subscribedLeagues = subs.map(s => s.league_key)

    let q = supabase
      .from('bets')
      .select(`
        id, game_id, bet_type, selection, stake, odds, expected_value,
        status, profit, strategy, sport, created_at,
        games!inner(
          date, league_key, home_team_id, away_team_id,
          home_goals, away_goals,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        ),
        predictions(
          home_win_prob, draw_prob, away_win_prob,
          over25_prob, btts_prob, confidence
        )
      `)
      .in('games.league_key', subscribedLeagues)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })

    if (opts.sport) q = q.eq('sport', opts.sport)

    const { data: picks, error } = await q
    if (error) throw error

    return {
      picks: (picks || []).filter((p: any) => p.games),
      subscribed_leagues: subscribedLeagues,
      since: sinceDate.toISOString()
    }
  }

  /**
   * GET /api/user/bets — user's own bet history
   */
  const fetchUserBets = async (opts: { status?: string; sport?: string; limit?: number } = {}) => {
    if (!user.value) return { bets: [] }

    let q = supabase
      .from('user_bets')
      .select(`
        id, game_id, bet_type, sport, selection, stake, odds,
        bookmaker, status, profit, notes, source, admin_bet_id,
        placed_at, settled_at,
        games!inner(date, league_key, home_team_id, away_team_id,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        )
      `)
      .eq('user_id', user.value.id)
      .order('placed_at', { ascending: false })
      .limit(opts.limit || 50)

    if (opts.status) q = q.eq('status', opts.status)
    if (opts.sport) q = q.eq('sport', opts.sport)

    const { data: bets, error } = await q
    if (error) throw error

    return { bets: bets || [] }
  }

  /**
   * POST /api/user/bets — create a new bet
   */
  const createUserBet = async (bet: {
    game_id: number; bet_type: string; selection: string;
    stake: number; odds: number; bookmaker?: string;
    sport?: string; source?: string; admin_bet_id?: number; notes?: string
  }) => {
    if (!user.value) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_bets')
      .insert({
        user_id: user.value.id,
        game_id: bet.game_id,
        bet_type: bet.bet_type,
        selection: bet.selection,
        stake: parseFloat(String(bet.stake)),
        odds: parseFloat(String(bet.odds)),
        bookmaker: bet.bookmaker || null,
        sport: bet.sport || 'football',
        source: bet.source || 'manual',
        admin_bet_id: bet.admin_bet_id || null,
        notes: bet.notes || null,
        status: 'pending',
        placed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { bet: data }
  }

  /**
   * PUT /api/user/bets/:id — update bet status
   */
  const updateUserBet = async (betId: number, updates: { status?: string; profit?: number }) => {
    if (!user.value) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_bets')
      .update(updates)
      .eq('id', betId)
      .eq('user_id', user.value.id)
      .select()
      .single()

    if (error) throw error
    return { bet: data }
  }

  /**
   * GET /api/user/bet-stats — aggregated bet statistics
   */
  const fetchBetStats = async (sport?: string) => {
    if (!user.value) return { stats: { total_bets: 0 } }

    let q = supabase
      .from('user_bets')
      .select('stake, odds, profit, status, sport, bet_type, source')
      .eq('user_id', user.value.id)

    if (sport) q = q.eq('sport', sport)

    const { data: bets, error } = await q
    if (error) throw error

    if (!bets || bets.length === 0) {
      return {
        stats: {
          total_bets: 0, pending: 0, won: 0, lost: 0, void: 0,
          total_staked: 0, total_profit: 0, roi: 0, win_rate: 0, avg_odds: 0,
          by_sport: {}, by_type: {}, by_source: {}
        }
      }
    }

    const settled = bets.filter(b => b.status === 'won' || b.status === 'lost')
    const totalStaked = bets.reduce((s, b) => s + (b.stake || 0), 0)
    const totalProfit = bets.reduce((s, b) => s + (b.profit || 0), 0)
    const won = bets.filter(b => b.status === 'won').length

    const bySport: Record<string, any> = {}
    const byType: Record<string, any> = {}
    const bySource: Record<string, any> = {}

    for (const b of bets) {
      const s = b.sport || 'football'
      if (!bySport[s]) bySport[s] = { bets: 0, profit: 0, won: 0, settled: 0 }
      bySport[s].bets++
      bySport[s].profit += b.profit || 0
      if (b.status === 'won') bySport[s].won++
      if (b.status === 'won' || b.status === 'lost') bySport[s].settled++

      const t = b.bet_type || 'other'
      if (!byType[t]) byType[t] = { bets: 0, profit: 0 }
      byType[t].bets++
      byType[t].profit += b.profit || 0

      const src = b.source || 'manual'
      if (!bySource[src]) bySource[src] = { bets: 0, profit: 0 }
      bySource[src].bets++
      bySource[src].profit += b.profit || 0
    }

    return {
      stats: {
        total_bets: bets.length,
        pending: bets.filter(b => b.status === 'pending').length,
        won,
        lost: bets.filter(b => b.status === 'lost').length,
        void: bets.filter(b => b.status === 'void').length,
        total_staked: Math.round(totalStaked * 100) / 100,
        total_profit: Math.round(totalProfit * 100) / 100,
        roi: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 10000) / 100 : 0,
        win_rate: settled.length > 0 ? Math.round((won / settled.length) * 10000) / 100 : 0,
        avg_odds: bets.length > 0 ? Math.round((bets.reduce((s, b) => s + (b.odds || 0), 0) / bets.length) * 100) / 100 : 0,
        by_sport: bySport,
        by_type: byType,
        by_source: bySource
      }
    }
  }

  /**
   * GET /api/credits/tasks — available contribution tasks
   */
  const fetchCreditsTasks = async () => {
    // Tasks are games that need post-match data contributions
    // For now, find completed games that might still need data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 3)
    
    const { data: games } = await supabase
      .from('games')
      .select(`
        id, date, league_key, status,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('status', 'completed')
      .gte('date', yesterday.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(20)

    // Transform to task format
    const tasks = (games || []).map((g: any, idx: number) => ({
      id: g.id,
      game: {
        date: g.date,
        home_team: g.home_team?.name || 'Unknown',
        away_team: g.away_team?.name || 'Unknown',
      },
      league_key: g.league_key,
      task_type: 'post_match_stats',
      base_reward: 5,
      first_bonus: 3,
      is_first: idx === 0,
      current_contributors: 0,
      max_contributors: 3
    }))

    return { tasks }
  }

  /**
   * POST /api/credits/tasks/contribute — submit a contribution
   */
  const submitContribution = async (taskId: number, data: any) => {
    if (!user.value) throw new Error('Not authenticated')
    // For now, return a simulated success since the credits system
    // tables may not be fully set up
    return { success: true, credits_awarded: 5, is_first: false }
  }

  /**
   * GET /api/credits/leagues — leagues with credit/unlock info
   */
  const fetchCreditsLeagues = async () => {
    if (!user.value) return { leagues: [] }
    
    const [leaguesRes, unlocksRes, userRes] = await Promise.all([
      supabase.from('leagues').select('key, name, sport').order('sport').order('name'),
      supabase.from('league_unlocks').select('league_key, unlocked_at, expires_at, credits_spent')
        .eq('user_id', user.value.id)
        .gte('expires_at', new Date().toISOString()),
      supabase.from('users').select('free_league_key').eq('id', user.value.id).maybeSingle()
    ])

    const unlockMap: Record<string, any> = {}
    for (const u of (unlocksRes.data || [])) {
      unlockMap[u.league_key] = u
    }

    const freeKey = userRes.data?.free_league_key ?? null

    // Tier list MUST mirror unlock_league() in migration
    // 20260424000001_unify_subscription_model.sql
    const topTierLeagues = [
      'premier_league', 'la_liga', 'bundesliga', 'serie_a',
      'champions_league', 'europa_league',
      'nba', 'euroleague', 'eurocup', 'bcl',
      'greek_super_league', 'greek_basket_league'
    ]

    const leagues = (leaguesRes.data || []).map((l: any) => {
      const isTop = topTierLeagues.includes(l.key)
      return {
        key: l.key,
        name: l.name,
        sport: l.sport || 'football',
        is_free: l.key === freeKey,
        is_unlocked: !!unlockMap[l.key],
        unlock_expires_at: unlockMap[l.key]?.expires_at || null,
        credit_cost: isTop ? 50 : 30,
        credit_tier: isTop ? 'top' : 'mid'
      }
    })

    return { leagues, free_league_key: freeKey }
  }

  /**
   * GET /api/credits/config — credits system configuration
   */
  const fetchCreditsConfig = async () => {
    return {
      config: {
        tiers: {
          top: { cost: 50, leagues: ['premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1', 'nba'] },
          mid: { cost: 25 }
        },
        rewards: {
          contribution: { base: 5, first_bonus: 3 },
          referral: 20,
          daily_login: 1
        },
        unlock_duration_days: 30
      }
    }
  }

  /**
   * Spend credits to unlock a league (atomic via RPC).
   *
   * The RPC enforces auth, league existence, free-league guard, balance,
   * tier-cost lookup, expiry stacking, and ledger entry in one transaction.
   * Direct table writes were rejected by RLS (only SELECT policies exist on
   * league_unlocks / credit_balances) — that was the source of the 403.
   */
  const unlockLeagueWithCredits = async (leagueKey: string) => {
    if (!user.value) throw new Error('Not authenticated')
    const { data, error } = await supabase.rpc('unlock_league', {
      p_league_key: leagueKey,
    })
    if (error) throw error
    const res = data as {
      success: boolean
      balance_after?: number
      expires_at?: string
      credits_spent?: number
      error?: string
      balance?: number
      required?: number
    }
    if (!res?.success) {
      throw new Error(res?.error || 'unlock_failed')
    }
    return {
      success: true,
      new_balance: res.balance_after,
      expires_at: res.expires_at,
      credits_spent: res.credits_spent,
    }
  }

  /**
   * Swap the user's free league. RPC mirrors into user_subscriptions for
   * legacy gates and is idempotent.
   */
  const swapFreeLeague = async (leagueKey: string) => {
    if (!user.value) throw new Error('Not authenticated')
    const { data, error } = await supabase.rpc('swap_free_league', {
      p_league_key: leagueKey,
    })
    if (error) throw error
    return data as { success: boolean; free_league_key?: string; error?: string }
  }

  /**
   * GET /api/user/credits — credit balance, transactions, unlocks
   */
  const fetchCredits = async () => {
    if (!user.value) return { balance: 0, total_earned: 0, total_spent: 0, free_league_key: null, transactions: [], active_unlocks: [] }

    const userId = user.value.id
    const [balanceRes, txRes, unlocksRes, userRes] = await Promise.all([
      supabase.from('credit_balances').select('balance, total_earned, total_spent, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('credit_transactions').select('id, amount, type, description, reference_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('league_unlocks').select('league_key, unlocked_at, expires_at, credits_spent').eq('user_id', userId).gte('expires_at', new Date().toISOString()),
      supabase.from('users').select('free_league_key').eq('id', userId).maybeSingle()
    ])

    return {
      balance: balanceRes.data?.balance ?? 0,
      total_earned: balanceRes.data?.total_earned ?? 0,
      total_spent: balanceRes.data?.total_spent ?? 0,
      free_league_key: userRes.data?.free_league_key ?? null,
      transactions: txRes.data || [],
      active_unlocks: unlocksRes.data || []
    }
  }

  // ============================================================
  // WALLETS / PARLAYS / ACCURACY (public reads, no RLS gate)
  // ============================================================

  /**
   * GET /api/wallet/list — all active wallets
   */
  /**
   * GET wallets visible to the current user.
   *   - Admins see every active wallet.
   *   - Regular users see only wallets they are actively subscribed to
   *     (user_wallet_subscriptions WHERE is_active=true AND not expired).
   *   - Anonymous callers get an empty list (the wallet catalogue browse view
   *     lives on /wallet/discover and uses fetchWalletSubscriptions).
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
   * GET /api/wallet/stats — aggregate stats for a wallet
   */
  const fetchWalletStats = async (walletId: number) => {
    const { data: wallet, error: wErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .maybeSingle()
    if (wErr) throw wErr
    if (!wallet) return null

    const [totalRes, wonRes, lostRes, pendingRes, stakeRes] = await Promise.all([
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'won'),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'lost'),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'pending'),
      supabase.from('bets').select('stake').eq('wallet_id', walletId).neq('status', 'void'),
    ])

    const totalBets = totalRes.count || 0
    const wonCount = wonRes.count || 0
    const lostCount = lostRes.count || 0
    const pendingCount = pendingRes.count || 0
    const settledCount = wonCount + lostCount
    const totalStaked = (stakeRes.data || []).reduce((s: number, b: any) => s + Number(b.stake || 0), 0)
    const totalProfit = parseFloat(wallet.total_profit || 0)
    const initialBalance = parseFloat(wallet.initial_balance || 0)
    const currentBalance = parseFloat(wallet.balance || 0)
    const roi = initialBalance > 0 ? ((currentBalance - initialBalance) / initialBalance) * 100 : 0
    const winRate = settledCount > 0 ? (wonCount / settledCount) * 100 : 0

    return {
      wallet: {
        id: wallet.id,
        balance: currentBalance,
        initial_balance: initialBalance,
        season: wallet.season,
      },
      stats: {
        totalBets,
        settledBets: settledCount,
        wonBets: wonCount,
        lostBets: lostCount,
        pendingBets: pendingCount,
        totalStaked: totalStaked.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        roi: roi.toFixed(2),
        winRate: winRate.toFixed(1),
        currentBalance,
      },
    }
  }

  // ============================================================
  // WALLET SUBSCRIPTIONS (credit-paid follow model)
  // ============================================================

  /**
   * List the current user's wallet subscriptions plus the catalogue of
   * available wallets (for the discovery view).
   *
   * Returns:
   *   {
   *     subscriptions: [{wallet_id, expires_at, is_active, credits_spent, ...}],
   *     wallets:       [{id, name, balance, initial_balance, roi, win_rate, total_bets, ...}],
   *     pricing:       { cost_credits, duration_days }
   *   }
   */
  const fetchWalletSubscriptions = async () => {
    const userId = (user.value as any)?.id
    const isAdminRole = (user.value as any)?.role === 'admin'

    const subsPromise = userId
      ? supabase
          .from('user_wallet_subscriptions')
          .select('wallet_id, expires_at, is_active, credits_spent, created_at, last_renewed_at')
          .eq('user_id', userId)
          .eq('is_active', true)
      : Promise.resolve({ data: [], error: null } as any)

    // Compute the user's accessible leagues (free + active unlocks). Used
    // to hide wallets the user cannot benefit from. Admins see everything.
    const accessLeaguesPromise = userId && !isAdminRole
      ? Promise.all([
          supabase.from('users').select('free_league_key').eq('id', userId).maybeSingle(),
          supabase
            .from('league_unlocks')
            .select('league_key, expires_at')
            .eq('user_id', userId)
            .gte('expires_at', new Date().toISOString()),
        ])
      : Promise.resolve(null as any)

    const [subsRes, walletsRes, pricingRes, accessRes] = await Promise.all([
      subsPromise,
      supabase
        .from('wallets')
        .select('id, name, balance, initial_balance, total_profit, roi, total_bets, win_rate, is_active')
        .eq('is_active', true)
        .order('id', { ascending: true }),
      supabase
        .from('credits_config')
        .select('key, value')
        .in('key', ['wallet_subscription_cost', 'wallet_subscription_duration_days']),
      accessLeaguesPromise,
    ])

    if (subsRes.error) throw subsRes.error
    if (walletsRes.error) throw walletsRes.error

    const pricingMap: Record<string, number> = {}
    for (const row of (pricingRes.data || [])) {
      const v = typeof row.value === 'number' ? row.value : Number(row.value)
      pricingMap[row.key] = Number.isFinite(v) ? v : 0
    }

    // Build set of leagues this user has access to
    const accessibleLeagues = new Set<string>()
    if (accessRes && Array.isArray(accessRes)) {
      const [userRow, unlocksRow] = accessRes
      const free = (userRow as any)?.data?.free_league_key
      if (free) accessibleLeagues.add(free)
      for (const u of ((unlocksRow as any)?.data || [])) {
        if (u.league_key) accessibleLeagues.add(u.league_key)
      }
    }

    // Filter wallets: admin sees all; user sees only those mapped to a
    // league they have access to. Unknown wallet IDs are hidden for users.
    let visibleWallets: any[] = walletsRes.data || []
    if (!isAdminRole && userId) {
      visibleWallets = visibleWallets.filter(w => {
        const required = WALLET_LEAGUE_MAP[w.id]
        if (!required) return false
        return required.some(k => accessibleLeagues.has(k))
      })
    }

    return {
      subscriptions: (subsRes.data || []).map((s: any) => ({
        wallet_id: s.wallet_id,
        expires_at: s.expires_at,
        is_active: s.is_active,
        credits_spent: s.credits_spent,
        created_at: s.created_at,
        last_renewed_at: s.last_renewed_at,
      })),
      wallets: visibleWallets,
      pricing: {
        cost_credits: pricingMap.wallet_subscription_cost || 500,
        duration_days: pricingMap.wallet_subscription_duration_days || 30,
      },
    }
  }

  /**
   * Subscribe to a wallet. Atomic: deducts credits + creates/extends sub
   * + writes ledger entry in one DB transaction (via RPC).
   *
   * Returns { success, balance_after, expires_at, error? }
   */
  const subscribeToWallet = async (walletId: number) => {
    const { data, error } = await supabase.rpc('subscribe_to_wallet', {
      p_wallet_id: walletId,
    })
    if (error) throw error
    return data as {
      success: boolean
      balance_after?: number
      expires_at?: string
      error?: string
      balance?: number
      required?: number
    }
  }

  /**
   * Unsubscribe (soft-deactivate). No refund. Idempotent.
   */
  const unsubscribeFromWallet = async (walletId: number) => {
    const { data, error } = await supabase.rpc('unsubscribe_from_wallet', {
      p_wallet_id: walletId,
    })
    if (error) throw error
    return data as { success: boolean; error?: string }
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
   * 7-section payload rendered by the Analysis tab on /league/[slug] in one
   * round-trip. Cached via useSwr (memoryTtl 5 min — analysis only updates
   * when new completed games land).
   *
   * Returns { sport, key_metrics, score_distribution, home_vs_away,
   *           scoring_trends, form_table, top_scorers, referee_impact }
   */
  const fetchLeagueAnalysis = async (
    leagueKey: string,
    season = '2025-2026',
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
    // User
    fetchSubscriptions,
    toggleSubscription,
    updateNotificationPrefs,
    fetchPicks,
    fetchUserBets,
    createUserBet,
    updateUserBet,
    fetchBetStats,
    fetchCredits,
    // Credits system
    fetchCreditsTasks,
    submitContribution,
    fetchCreditsLeagues,
    fetchCreditsConfig,
    unlockLeagueWithCredits,
    swapFreeLeague,
    // Wallets / parlays / accuracy
    fetchWallets,
    fetchWalletBets,
    fetchWalletParlays,
    fetchWalletStats,
    fetchWalletPerformance,
    fetchWalletSubscriptions,
    subscribeToWallet,
    unsubscribeFromWallet,
    fetchWalletBalanceHistory,
    fetchLeagueAnalysis,
    fetchParlays,
    fetchPredictionsAccuracy,
  }
}
