/**
 * GET /api/user/picks
 * Returns admin wallet picks for leagues the user is subscribed to
 * Query: ?sport=football|basketball&days=7
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const query = getQuery(event)
  const sport = query.sport as string | undefined
  const days = parseInt(query.days as string) || 7

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

  // Get user's subscribed leagues
  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('league_key, sport')
    .eq('user_id', session.user_id)

  if (!subs || subs.length === 0) {
    return { picks: [], message: 'Subscribe to leagues to see admin picks' }
  }

  const subscribedLeagues = subs.map(s => s.league_key)

  // Get admin picks from bets table (admin wallet bets)
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - days)

  let q = supabase
    .from('bets')
    .select(`
      id, game_id, bet_type, selection, stake, odds, expected_value,
      status, profit, strategy, sport, created_at,
      games!inner(
        date, league_key, home_team_id, away_team_id,
        home_score, away_score,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      ),
      predictions(
        home_win_prob, draw_prob, away_win_prob,
        over25_prob, btts_prob, confidence
      )
    `)
    .in('games.league_key', subscribedLeagues)
    .gte('created_at', sinceDate.toISOString())
    .order('created_at', { ascending: false })

  if (sport) q = q.eq('sport', sport)

  const { data: picks, error } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Filter out nulls from inner join and format
  const validPicks = (picks || []).filter(p => p.games)

  return {
    picks: validPicks,
    subscribed_leagues: subscribedLeagues,
    since: sinceDate.toISOString()
  }
})
