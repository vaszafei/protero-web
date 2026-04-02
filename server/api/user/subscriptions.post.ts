/**
 * POST /api/user/subscriptions
 * Subscribe/unsubscribe from leagues
 * Body: { league_key: string, sport: string, action: 'subscribe' | 'unsubscribe' }
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const { league_key, sport = 'football', action = 'subscribe' } = await readBody(event)

  if (!league_key) {
    throw createError({ statusCode: 400, statusMessage: 'league_key is required' })
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

  if (action === 'subscribe') {
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: session.user_id,
        league_key,
        sport,
        is_active: true,
      }, { onConflict: 'user_id,league_key' })

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { success: true, action: 'subscribed', league_key }

  } else if (action === 'unsubscribe') {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', session.user_id)
      .eq('league_key', league_key)

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { success: true, action: 'unsubscribed', league_key }
  }

  throw createError({ statusCode: 400, statusMessage: 'Invalid action' })
})
