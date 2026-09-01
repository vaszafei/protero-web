/**
 * Server-side auth helpers.
 * Mirrors the dual-mode pattern from /server/api/auth/me.get.ts:
 *   1. Bearer JWT (Capacitor APK + direct supabase-js)
 *   2. session_id cookie (web SSR)
 *
 * Use `getOptionalUserId(event)` for endpoints that work for both
 * anonymous and authenticated users (e.g. league pages — predictions
 * filtered by subscriptions, but games still render without auth).
 *
 * Use `requireUserId(event)` to throw 401 when not authenticated.
 */
import type { H3Event } from 'h3'
import { getSupabase } from './supabase'
import { verifyUserToken, extractBearerToken } from './jwt'

export async function getOptionalUserId(event: H3Event): Promise<number | null> {
  const authHeader = getRequestHeader(event, 'authorization')
  const bearer = extractBearerToken(authHeader)
  const sessionId = getCookie(event, 'session_id')

  if (!bearer && !sessionId) return null

  // Path 1: Bearer JWT
  if (bearer) {
    try {
      const claims = verifyUserToken(bearer)
      if (claims?.user_id) return claims.user_id
    } catch {
      // fall through to cookie path
    }
  }

  // Path 2: session cookie
  if (sessionId) {
    try {
      const supabase = getSupabase()
      const session = await supabase
        .from('sessions')
        .select('user_id')
        .eq('token', sessionId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      if (session.data?.user_id) return session.data.user_id
    } catch {
      // ignore — treat as anonymous
    }
  }

  return null
}

export async function requireUserId(event: H3Event): Promise<number> {
  const id = await getOptionalUserId(event)
  if (!id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  return id
}

/**
 * Require an authenticated admin. Operator-only surface — the pipeline-run
 * button spawns a process on the host, so it must never be reachable by a
 * non-admin session.
 */
export async function requireAdmin(event: H3Event): Promise<number> {
  const id = await requireUserId(event)
  const supabase = getSupabase()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', id)
    .maybeSingle()
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin only' })
  }
  return id
}
