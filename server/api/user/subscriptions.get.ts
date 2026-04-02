/**
 * GET /api/user/subscriptions
 * Returns the leagues the authenticated user is subscribed to
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
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

  // Get user subscriptions with league info
  const { data: subs, error } = await supabase
    .from('user_subscriptions')
    .select('id, league_key, sport, is_active, created_at')
    .eq('user_id', session.user_id)
    .eq('is_active', true)
    .order('sport', { ascending: true })
    .order('league_key', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { subscriptions: subs || [] }
})
