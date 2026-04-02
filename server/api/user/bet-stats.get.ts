/**
 * GET /api/user/bet-stats
 * Returns aggregated bet statistics for the authenticated user
 * Query: ?sport=football|basketball
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const query = getQuery(event)
  const sport = query.sport as string | undefined

  const supabase = getSupabase()

  // Validate session
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', sessionId)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  // Get all user bets for aggregation
  let q = supabase
    .from('user_bets')
    .select('stake, odds, profit, status, sport, bet_type, source')
    .eq('user_id', session.user_id)

  if (sport) q = q.eq('sport', sport)

  const { data: bets, error } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!bets || bets.length === 0) {
    return {
      stats: {
        total_bets: 0,
        pending: 0,
        won: 0,
        lost: 0,
        void: 0,
        total_staked: 0,
        total_profit: 0,
        roi: 0,
        win_rate: 0,
        avg_odds: 0,
        by_sport: {},
        by_type: {},
        by_source: {}
      }
    }
  }

  const settled = bets.filter(b => b.status === 'won' || b.status === 'lost')
  const totalStaked = bets.reduce((s, b) => s + (b.stake || 0), 0)
  const totalProfit = bets.reduce((s, b) => s + (b.profit || 0), 0)
  const won = bets.filter(b => b.status === 'won').length

  // Group by sport
  const bySport: Record<string, { bets: number; profit: number; won: number; settled: number }> = {}
  for (const b of bets) {
    const s = b.sport || 'football'
    if (!bySport[s]) bySport[s] = { bets: 0, profit: 0, won: 0, settled: 0 }
    bySport[s].bets++
    bySport[s].profit += b.profit || 0
    if (b.status === 'won') bySport[s].won++
    if (b.status === 'won' || b.status === 'lost') bySport[s].settled++
  }

  // Group by bet type
  const byType: Record<string, { bets: number; profit: number }> = {}
  for (const b of bets) {
    const t = b.bet_type || 'other'
    if (!byType[t]) byType[t] = { bets: 0, profit: 0 }
    byType[t].bets++
    byType[t].profit += b.profit || 0
  }

  // Group by source
  const bySource: Record<string, { bets: number; profit: number }> = {}
  for (const b of bets) {
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
      avg_odds: bets.length > 0
        ? Math.round((bets.reduce((s, b) => s + (b.odds || 0), 0) / bets.length) * 100) / 100
        : 0,
      by_sport: bySport,
      by_type: byType,
      by_source: bySource
    }
  }
})
