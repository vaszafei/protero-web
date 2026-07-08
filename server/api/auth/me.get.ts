import { getSupabase } from '~/server/utils/supabase'
import { signUserToken, verifyUserToken, extractBearerToken } from '~/server/utils/jwt'

/**
 * Authenticated-user lookup.
 *
 * Accepts EITHER:
 *   1. A Supabase-RLS JWT in the `Authorization: Bearer <token>` header
 *      (preferred — used by Capacitor APK and direct supabase-js calls).
 *   2. The legacy `session_id` cookie (used by SSR + same-origin web).
 *
 * Always returns a fresh `access_token` so the client can rotate quietly.
 */
export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization')
  const bearer = extractBearerToken(authHeader)
  const sessionId = getCookie(event, 'session_id')

  if (!bearer && !sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const supabase = getSupabase()
  let userId: number | null = null

  // Path 1: Bearer JWT
  if (bearer) {
    try {
      const claims = verifyUserToken(bearer)
      userId = claims.user_id
    } catch (err: any) {
      if (!sessionId) {
        throw createError({ statusCode: 401, statusMessage: `Invalid token: ${err.message}` })
      }
    }
  }

  // Path 2: legacy session cookie
  if (!userId && sessionId) {
    const session = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', sessionId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (session.error || !session.data) {
      deleteCookie(event, 'session_id', { path: '/' })
      throw createError({ statusCode: 401, statusMessage: 'Session expired' })
    }
    userId = session.data.user_id
  }

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const userFields =
    'id, email, name, display_name, role, is_active, onboarding_completed, preferred_sports, preferred_wallet_id, timezone, notification_prefs, avatar_url, created_at'

  const { data: user, error } = await supabase
    .from('users')
    .select(userFields)
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !user) {
    throw createError({ statusCode: 401, statusMessage: 'User not found or inactive' })
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      display_name: user.display_name,
      role: user.role,
      onboarding_completed: user.onboarding_completed ?? false,
      preferred_sports: user.preferred_sports ?? [],
      preferred_wallet_id: user.preferred_wallet_id,
      timezone: user.timezone ?? 'Europe/Athens',
      notification_prefs: user.notification_prefs ?? { picks: true, results: true, news: false },
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    access_token: signUserToken(user.id),
  }
})
