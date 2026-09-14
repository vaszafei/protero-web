import { getSupabase } from '~/server/utils/supabase'
import { fetchRawRecentFixtures, buildFormSide } from '~/server/utils/team-form'
import { fetchTwinRatings } from '~/server/utils/twin-ratings'
import { fetchCompetitionRules } from '~/server/utils/competition-rules'
import { isEnabled, disabledReason, LEAGUE_ENABLED_MARKETS } from '~/server/utils/football-masks'
import { fetchGameCorrelations } from '~/server/utils/slip-sim'
import { parsePrediction } from '~/utils/prediction-label'

/**
 * The unified per-fixture analysis record (unified-analysis-layer, Track C /
 * C1). One endpoint, computed for ANY fixture in ANY of the 42+ competitions
 * that carry games — not just the 9 leagues masks.py bets. Analysis coverage
 * and betting coverage are different questions; a cup tie or coverage-league
 * fixture with no prediction row still gets form/twin/h2h/time-context, plus
 * an honest `betting.reason` instead of an empty page.
 *
 * Every block below carries its own `status`: `available` | `insufficient_data`
 * | `not_applicable`, per block, so the frontend can render "we don't have
 * this yet" instead of guessing from an empty array.
 *
 * C2 discipline: everything here is descriptive. Nothing computed in this file
 * feeds a mask, a stake or a probability — box-score features are already in
 * the price (`models_redundant_to_price`), and CD #3 gates `masks.py` on
 * holdout ROI + market ceiling, never on what this endpoint renders.
 */

/** V5 Thompson prices NBA/EuroLeague ML_HOME only (CD #37) — V6 AIF bets
 * nothing in basketball (CD #19). No `football-masks.ts`-style per-market
 * table exists for basketball yet; this is deliberately the coarse version. */
const BASKETBALL_ML_HOME_LEAGUES = ['nba', 'euroleague']

const TRENDS_LOOKBACK = 200
const TRENDS_MIN_N = 30
const H2H_LIMIT = 20

function bettingStatus(sport: string, leagueKey: string) {
  if (sport === 'basketball') {
    const supported = BASKETBALL_ML_HOME_LEAGUES.includes(leagueKey)
    return {
      enabled: supported,
      enabled_markets: supported ? ['home_win'] : [],
      reason: supported
        ? null
        : 'not bet — V5 Thompson only prices NBA/EuroLeague ML_HOME (CD #37); this league is not modelled',
    }
  }
  const enabledMarkets = Object.keys(LEAGUE_ENABLED_MARKETS[leagueKey] || {})
  return {
    enabled: enabledMarkets.length > 0,
    enabled_markets: enabledMarkets,
    reason: enabledMarkets.length > 0 ? null : disabledReason(leagueKey, enabledMarkets[0] || ''),
  }
}

export default defineEventHandler(async (event) => {
  const gameId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(gameId)) {
    throw createError({ statusCode: 400, message: 'Numeric game id required' })
  }

  const supabase = getSupabase()

  const gameRes = await supabase
    .from('games')
    .select(`
      id, league_key, sport, status, date, home_team_id, away_team_id, home_goals, away_goals, sport_stats,
      home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)
    `)
    .eq('id', gameId)
    .maybeSingle()

  if (gameRes.error) throw createError({ statusCode: 500, message: `games query failed: ${gameRes.error.message}` })
  const game: any = gameRes.data
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' })

  const sport = game.sport || 'football'
  const homeName = game.home_team?.name || 'Home'
  const awayName = game.away_team?.name || 'Away'
  const teamIds = [game.home_team_id, game.away_team_id].filter((t: any) => t != null)

  const [competitionRules, predictionRes, formTwin, h2hRes, trendsRes, correlationsSim] = await Promise.all([
    fetchCompetitionRules(supabase, game.league_key),
    supabase.from('predictions').select('*').eq('game_id', gameId).maybeSingle(),
    teamIds.length === 2
      ? Promise.all([
          fetchRawRecentFixtures(supabase, teamIds, game.date),
          fetchTwinRatings(supabase, teamIds, game.league_key),
        ])
      : Promise.resolve(null),
    teamIds.length === 2
      ? supabase
          .from('games')
          .select('id, date, home_team_id, away_team_id, home_goals, away_goals, league_key, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
          .or(`and(home_team_id.eq.${game.home_team_id},away_team_id.eq.${game.away_team_id}),and(home_team_id.eq.${game.away_team_id},away_team_id.eq.${game.home_team_id})`)
          .not('home_goals', 'is', null)
          .lt('date', game.date)
          .order('date', { ascending: false })
          .limit(H2H_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('games')
      .select('home_goals, away_goals')
      .eq('league_key', game.league_key)
      .eq('status', 'completed')
      .lt('date', game.date)
      .not('home_goals', 'is', null)
      .order('date', { ascending: false })
      .limit(TRENDS_LOOKBACK),
    sport === 'football' && teamIds.length === 2
      ? fetchGameCorrelations(gameId)
      : Promise.resolve(null),
  ])

  if (predictionRes.error) throw createError({ statusCode: 500, message: `predictions query failed: ${predictionRes.error.message}` })
  if (h2hRes.error) throw createError({ statusCode: 500, message: `h2h query failed: ${h2hRes.error.message}` })
  if (trendsRes.error) throw createError({ statusCode: 500, message: `trends query failed: ${trendsRes.error.message}` })

  // ── competition ──────────────────────────────────────────────────────
  const competition = competitionRules
    ? {
        status: 'available' as const,
        format: competitionRules.format,
        two_legged: competitionRules.two_legged,
        extra_time: competitionRules.extra_time,
        penalties: competitionRules.penalties,
        away_goals_rule: competitionRules.away_goals_rule,
        season_convention: competitionRules.season_convention,
        periods: competitionRules.periods,
        period_length: competitionRules.period_length,
        ot_rules: competitionRules.ot_rules,
      }
    : { status: 'not_applicable' as const, note: 'no competition_rules row for this league_key — registry gap' }

  // ── betting ───────────────────────────────────────────────────────────
  const betting = bettingStatus(sport, game.league_key)

  // ── prediction ────────────────────────────────────────────────────────
  const predictionRow: any = predictionRes.data
  const bballOuLine = sport === 'basketball' ? game.sport_stats?.odds?.over_under?.line ?? null : null
  const prediction = predictionRow
    ? {
        status: 'available' as const,
        ...predictionRow,
        parsed: parsePrediction(predictionRow.prediction, { homeTeam: homeName, awayTeam: awayName, ouLine: bballOuLine }),
      }
    : { status: 'not_applicable' as const, parsed: parsePrediction(null) }

  // ── form / twin ───────────────────────────────────────────────────────
  let form: any = { status: 'not_applicable', home: null, away: null }
  let twinBlock: any = { status: 'not_applicable', home: null, away: null, league: null }
  let homeSide: any = null
  let awaySide: any = null

  if (formTwin) {
    const [rawFixtures, twin] = formTwin
    homeSide = buildFormSide(Number(game.home_team_id), homeName, rawFixtures, game.date)
    awaySide = buildFormSide(Number(game.away_team_id), awayName, rawFixtures, game.date)

    form = {
      status: homeSide.form.length || awaySide.form.length ? 'available' : 'insufficient_data',
      home: { team_id: homeSide.team_id, name: homeSide.name, entries: homeSide.form },
      away: { team_id: awaySide.team_id, name: awaySide.name, entries: awaySide.form },
    }

    const homeTwin = twin.sideFor(Number(game.home_team_id))
    const awayTwin = twin.sideFor(Number(game.away_team_id))
    twinBlock = {
      status: homeTwin?.fitted || awayTwin?.fitted ? 'available' : 'insufficient_data',
      home: homeTwin,
      away: awayTwin,
      league: twin.league,
    }
  }

  // ── time context ──────────────────────────────────────────────────────
  const kickoff = new Date(game.date)
  const timeContext = {
    status: 'available' as const,
    kickoff: {
      day_of_week: kickoff.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      hour_utc: kickoff.getUTCHours(),
      month: kickoff.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }),
    },
    rest_days: {
      home: homeSide?.rest_days ?? null,
      away: awaySide?.rest_days ?? null,
    },
    congestion_10d: {
      home: homeSide?.matches_last_10_days ?? null,
      away: awaySide?.matches_last_10_days ?? null,
    },
  }

  // ── h2h ───────────────────────────────────────────────────────────────
  const h2hMatches = (h2hRes.data || []) as any[]
  const homeWins = h2hMatches.filter((m) =>
    Number(m.home_team_id) === Number(game.home_team_id) ? m.home_goals > m.away_goals : m.away_goals > m.home_goals
  ).length
  const draws = h2hMatches.filter((m) => m.home_goals === m.away_goals).length
  const h2h = {
    status: h2hMatches.length ? 'available' as const : 'insufficient_data' as const,
    matches: h2hMatches,
    summary: {
      total_matches: h2hMatches.length,
      home_wins: homeWins,
      away_wins: h2hMatches.length - homeWins - draws,
      draws,
    },
  }

  // ── trends (league rolling) ──────────────────────────────────────────
  const trendRows = (trendsRes.data || []) as any[]
  const trends = trendRows.length >= TRENDS_MIN_N
    ? {
        status: 'available' as const,
        n: trendRows.length,
        home_win_rate: Number((trendRows.filter((r) => r.home_goals > r.away_goals).length / trendRows.length).toFixed(3)),
        avg_total_score: Number((trendRows.reduce((s, r) => s + Number(r.home_goals) + Number(r.away_goals), 0) / trendRows.length).toFixed(2)),
      }
    : { status: 'insufficient_data' as const, n: trendRows.length }

  // ── correlations ─────────────────────────────────────────────────────
  // Monte-Carlo joint sim (ml/slips/slip_sim.py), computed live per request —
  // no caching, no DB write (2026-09-14 scoping decision). Descriptive only
  // (C2): never feeds a mask, a stake or a probability.
  const correlations = correlationsSim
    ? { status: 'available' as const, ...correlationsSim }
    : {
        status: sport === 'football'
          ? ('insufficient_data' as const)
          : ('not_applicable' as const),
        note: sport === 'football'
          ? 'simulation unavailable for this fixture'
          : 'same-game correlation sim covers football only (goals/corners/cards)',
      }

  // ── derived (predicted score / pace, ported from GameAnalysis.vue) ────
  let derived: any = { predicted_score: null, pace_trend: null }
  if (h2hMatches.length) {
    const total = h2hMatches.reduce((s, m) => {
      const isHome = Number(m.home_team_id) === Number(game.home_team_id)
      return { home: s.home + (isHome ? Number(m.home_goals) : Number(m.away_goals)), away: s.away + (isHome ? Number(m.away_goals) : Number(m.home_goals)) }
    }, { home: 0, away: 0 })
    const homeAvg = total.home / h2hMatches.length
    const awayAvg = total.away / h2hMatches.length

    let tilt = 0
    const hpRaw = predictionRow?.home_win_prob
    if (typeof hpRaw === 'number' && isFinite(hpRaw)) {
      // `home_win_prob` is stored 0-1 by some model versions, 0-100 by others
      // (GamePrediction.vue already normalizes this three separate ways —
      // this is the same normalization applied here for consistency).
      const hp = hpRaw <= 1 ? hpRaw : hpRaw / 100
      tilt = Math.max(-0.15, Math.min(0.15, hp - 0.5))
    }
    derived.predicted_score = { home: Math.round(homeAvg * (1 + tilt)), away: Math.round(awayAvg * (1 - tilt)) }

    if (h2hMatches.length >= 2) {
      const totals = h2hMatches.map((m) => Number(m.home_goals) + Number(m.away_goals))
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length
      const label = sport === 'basketball'
        ? (avg >= 220 ? 'Fast' : avg >= 200 ? 'Normal' : 'Slow')
        : (avg >= 3 ? 'High' : avg >= 2 ? 'Medium' : 'Low')
      derived.pace_trend = { label, avg_total: Number(avg.toFixed(1)) }
    }
  }

  return {
    game_id: gameId,
    league_key: game.league_key,
    sport,
    status: game.status,
    kickoff: game.date,
    competition,
    betting,
    prediction,
    form,
    twin: twinBlock,
    h2h,
    time_context: timeContext,
    trends,
    correlations,
    derived,
  }
})
