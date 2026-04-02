/**
 * POST /api/user/onboarding
 * Complete the user onboarding wizard.
 * Body: {
 *   display_name: string,
 *   preferred_sports: string[],       // ['football', 'basketball']
 *   league_subscriptions: string[],   // ['premier_league', 'nba']
 *   preferred_wallet_id: number|null,
 *   timezone: string,
 *   notification_prefs: { picks: boolean, results: boolean, news: boolean }
 * }
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readBody(event)
  const {
    display_name,
    preferred_sports,
    league_subscriptions,
    preferred_wallet_id,
    timezone,
    notification_prefs
  } = body

  // Validate required fields
  if (!display_name || display_name.trim().length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Display name must be at least 2 characters' })
  }

  if (!Array.isArray(preferred_sports) || preferred_sports.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Select at least one sport' })
  }

  if (!Array.isArray(league_subscriptions) || league_subscriptions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Subscribe to at least one league' })
  }

  const supabase = getSupabase()

  // Validate session
  let { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', sessionId)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  const userId = session.user_id

  // Update user profile
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      display_name: display_name.trim(),
      preferred_sports,
      preferred_wallet_id: preferred_wallet_id || null,
      timezone: timezone || 'Europe/Athens',
      notification_prefs: notification_prefs || { picks: true, results: true, news: false },
      onboarding_completed: true,
      // Set the user's first selected league as their forever-free league
      free_league_key: league_subscriptions[0] || null
    })
    .eq('id', userId)

  if (updateErr) {
    console.error('Onboarding update error:', updateErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save preferences' })
  }

  // Upsert league subscriptions
  // First, remove old subscriptions
  await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', userId)

  // Fetch league→sport mapping
  const { data: leagues } = await supabase
    .from('leagues')
    .select('key, sport')
    .in('key', league_subscriptions)

  const leagueMap = new Map((leagues || []).map(l => [l.key, l.sport]))

  // Insert new subscriptions
  if (league_subscriptions.length > 0) {
    const rows = league_subscriptions.map((lk: string) => ({
      user_id: userId,
      league_key: lk,
      sport: leagueMap.get(lk) || 'football'
    }))

    const { error: subErr } = await supabase
      .from('user_subscriptions')
      .insert(rows)

    if (subErr) {
      console.error('Subscription insert error:', subErr)
      // Non-fatal — user is still onboarded
    }
  }

  // Fetch updated user
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, display_name, role, onboarding_completed, preferred_sports, preferred_wallet_id, timezone, notification_prefs')
    .eq('id', userId)
    .single()

  return { user, subscriptions: league_subscriptions }
})
