/**
 * Client-side API composable — replaces all /api/ server routes.
 * Queries Supabase directly from the client using the anon key + RLS.
 *
 * Every function here mirrors a former server/api/ route.
 */

import * as walletReads from '#logic/wallet-page'
import * as gamePage from '#logic/game-page'
import { errorText } from '~/utils/error-text'

export type { WalletPerformance } from '#logic/wallet-page'

export const useApi = () => {
  const apiFetch = useApiFetch()
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
   * GET /api/leagues/:slug — single league with games and standings
   */
  /** Group-stage membership for one competition season (`competition_groups`); [] when it has none. */
  const fetchCompetitionGroups = async (leagueKey: string, season: string) => {
    const { data, error } = await supabase
      .from('competition_groups')
      .select('group_name, team:teams!team_id(name)')
      .eq('league_key', leagueKey)
      .eq('season', season)
    if (error) throw error
    return (data || []).map((r: any) => ({ group: r.group_name as string, team: r.team?.name as string }))
  }

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
  const fetchFantasyProjections = (gameId: number) => gamePage.fetchFantasyProjections(supabase, gameId)

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
   * GET /api/player/:id/season — player season stats
   */
  const fetchPlayerSeason = async (playerId: number, leagueKey?: string) => {
    const params: Record<string, string> = {}
    if (leagueKey) params.league = leagueKey
    params.limit = '30'

    const data = await apiFetch(`/api/player/${playerId}/season`, { params })
    return data as { games: any[], averages: any, gameCount: number }
  }

  // ============================================================
  // USER DATA (auth required, RLS enforced)
  // ============================================================

  // ============================================================
  // WALLETS / PARLAYS / ACCURACY (public reads, no RLS gate)
  // ============================================================

  // The wallet reads live in `#logic/wallet-page` — the ONE implementation, shared with the
  // `wallet-page` Edge Function — so a wallet page and the cards that read one panel cannot disagree.
  // Do NOT compute ROI in the client: `get_wallet_performance` is the only source.
  const caller = () => ({ id: (user.value as any)?.id ?? null, role: (user.value as any)?.role ?? null })

  const fetchWallets = () => walletReads.fetchWallets(supabase, caller())
  const fetchWalletPerformance = (walletId?: number) => walletReads.fetchWalletPerformance(supabase, walletId)
  const fetchWalletBreakdown = (walletId: number) => walletReads.fetchWalletBreakdown(supabase, walletId)
  const fetchWalletVulnerability = (walletId: number) => walletReads.fetchWalletVulnerability(supabase, walletId)
  const fetchWalletMarginOfLoss = (walletId: number) => walletReads.fetchWalletMarginOfLoss(supabase, walletId)
  const fetchWalletBets = (walletId: number, opts: Parameters<typeof walletReads.fetchWalletBets>[2] = {}) =>
    walletReads.fetchWalletBets(supabase, walletId, opts)
  const fetchWalletParlays = (walletId: number, opts: Parameters<typeof walletReads.fetchWalletParlays>[2] = {}) =>
    walletReads.fetchWalletParlays(supabase, walletId, opts)
  const fetchWalletStats = (walletId: number) => walletReads.fetchWalletStats(supabase, caller(), walletId)
  const fetchWalletBalanceHistory = (walletId: number, days = 30) =>
    walletReads.fetchWalletBalanceHistory(supabase, walletId, days)
  const fetchWalletSeasonLadder = (walletId: number) => walletReads.fetchWalletSeasonLadder(supabase, walletId)

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
    fetchLeague,
    fetchCompetitionGroups,
    fetchFantasyProjections,
    fetchPlayerPropPicks,
    fetchPlayerSeason,
    // Wallets / parlays / accuracy
    fetchWallets,
    fetchWalletBets,
    fetchWalletBreakdown,
    fetchWalletVulnerability,
    fetchWalletMarginOfLoss,
    fetchWalletParlays,
    fetchWalletStats,
    fetchWalletPerformance,
    fetchWalletBalanceHistory,
    fetchWalletSeasonLadder,
    fetchLeagueAnalysis,
    fetchTwinSeasonPhase,
    fetchParlays,
    fetchPredictionsAccuracy,
  }
}
