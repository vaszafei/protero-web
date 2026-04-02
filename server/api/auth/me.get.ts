import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')

  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  }

  const supabase = getSupabase()

  try {
    // Find active session
    const userFields = 'id, email, name, display_name, role, is_active, onboarding_completed, preferred_sports, preferred_wallet_id, timezone, notification_prefs, avatar_url, created_at'

    let session = await supabase
      .from('sessions')
      .select(`users!inner(${userFields})`)
      .eq('token', sessionId)
      .gt('expires_at', new Date().toISOString())
      .eq('users.is_active', true)
      .maybeSingle()

    // Fallback: try with token column (old sessions)
    if (!session.data) {
      session = await supabase
        .from('sessions')
        .select(`users!inner(${userFields})`)
        .eq('token', sessionId)
        .gt('expires_at', new Date().toISOString())
        .eq('users.is_active', true)
        .maybeSingle()
    }

    if (session.error || !session.data) {
      deleteCookie(event, 'session_id', { path: '/' })
      throw createError({
        statusCode: 401,
        statusMessage: 'Session expired'
      })
    }

    const user = session.data.users

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
        created_at: user.created_at
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Auth check error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
