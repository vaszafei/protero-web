import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache } from '~/server/utils/cache'

// 3-minute cache — balances freshness with speed
const CACHE_TTL = 180

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Date window — defaults to -14 days … +60 days from today
  const today = new Date()
  const defaultFrom = new Date(today)
  defaultFrom.setDate(today.getDate() - 14)
  const defaultTo = new Date(today)
  defaultTo.setDate(today.getDate() + 60)

  const fromDate = (query.from as string) || defaultFrom.toISOString().split('T')[0]
  const toDate   = (query.to   as string) || defaultTo.toISOString().split('T')[0]
  const season   = (query.season as string) || '2025-2026'
  const includeBets = query.bets === 'true'
  const walletId = query.walletId ? Number(query.walletId) : null

  // League filter — comma-separated league keys (e.g. "nba,euroleague")
  // When provided, only fetch games for these leagues (DB-level filter)
  const leagueKeys = (query.leagues as string)?.split(',').filter(Boolean) || []

  const cacheKey = `games:${season}:${fromDate}:${toDate}:bets=${includeBets}:w=${walletId || 'all'}:lg=${leagueKeys.sort().join(',') || 'all'}`
  const cached = getCached<any>(cacheKey)
  if (cached) {
    setHeader(event, 'X-Cache', 'HIT')
    return cached
  }

  const supabase = getSupabase()

  try {
    const selectCols = `
      id, date, season, league_key, sport, status,
      home_team_id, away_team_id,
      home_goals, away_goals,
      home_xg, away_xg,
      odds_home, odds_away, sport_stats,
      home_team:teams!home_team_id(name, team_key),
      away_team:teams!away_team_id(name, team_key),
      predictions(
        id, prediction, confidence, model_version,
        over_15_prob, over_25_prob, over_35_prob,
        result_correct, created_at
      )
      ${includeBets ? `,bets!left(id,wallet_id,bet_type,stake,odds,status,profit,notes,sport,strategy)` : ''}
    `

    let q = supabase
      .from('games')
      .select(selectCols)
      .eq('season', season)
      .gte('date', fromDate)
      .lte('date', toDate)

    // Apply league filter at DB level when provided
    if (leagueKeys.length > 0) {
      q = q.in('league_key', leagueKeys)
    }

    const { data: games, error } = await q.order('date', { ascending: true })

    if (error) throw error

    const enriched = (games || []).map((game: any) => {
      // Filter bets to the selected wallet client-side (PostgREST can't filter nested)
      let bets = game.bets || []
      if (walletId && bets.length > 0) {
        bets = bets.filter((b: any) => b.wallet_id === walletId)
      }
      return {
        ...game,
        bets,
        home_name: game.home_team?.name || 'Unknown',
        away_name: game.away_team?.name || 'Unknown',
        home_key: game.home_team?.team_key || null,
        away_key: game.away_team?.team_key || null,
      }
    })

    const result = {
      success: true,
      games: enriched,
      count: enriched.length,
      from: fromDate,
      to: toDate,
    }

    setCache(cacheKey, result, CACHE_TTL)
    setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    setHeader(event, 'X-Cache', 'MISS')

    return result

  } catch (error: any) {
    console.error('Error fetching games:', error)
    return { success: false, error: error.message, games: [], count: 0 }
  }
})
