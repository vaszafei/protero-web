/**
 * POST /api/user/bets
 * Log a new bet for the authenticated user
 * Body: { game_id, bet_type, selection, stake, odds, bookmaker, sport?, source?, admin_bet_id?, notes? }
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readBody(event)
  const { game_id, bet_type, selection, stake, odds, bookmaker, sport, source, admin_bet_id, notes } = body

  // Validate required fields
  if (!game_id || !bet_type || !selection || stake == null || odds == null) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: game_id, bet_type, selection, stake, odds'
    })
  }

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

  // Validate bet_type
  const validBetTypes = ['1x2', 'over_under', 'btts', 'double_chance', 'asian_handicap', 'correct_score', 'other']
  if (!validBetTypes.includes(bet_type)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid bet_type. Must be one of: ${validBetTypes.join(', ')}`
    })
  }

  // Insert bet
  const { data: bet, error } = await supabase
    .from('user_bets')
    .insert({
      user_id: session.user_id,
      game_id,
      bet_type,
      selection,
      stake: parseFloat(stake),
      odds: parseFloat(odds),
      bookmaker: bookmaker || null,
      sport: sport || 'football',
      source: source || 'manual',
      admin_bet_id: admin_bet_id || null,
      notes: notes || null,
      status: 'pending',
      placed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { bet }
})
