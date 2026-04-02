/**
 * GET /api/user/bets
 * Returns the authenticated user's bet history
 * Query: ?status=pending|won|lost&sport=football|basketball&limit=50
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const query = getQuery(event)
  const status = query.status as string | undefined
  const sport = query.sport as string | undefined
  const limit = parseInt(query.limit as string) || 50

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

  // Build query
  let q = supabase
    .from('user_bets')
    .select(`
      id, game_id, bet_type, sport, selection, stake, odds,
      bookmaker, status, profit, notes, source, admin_bet_id,
      placed_at, settled_at,
      games!inner(date, league_key, home_team_id, away_team_id,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      )
    `)
    .eq('user_id', session.user_id)
    .order('placed_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)
  if (sport) q = q.eq('sport', sport)

  const { data: bets, error } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { bets: bets || [] }
})
