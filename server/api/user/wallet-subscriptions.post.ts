/**
 * POST /api/user/wallet-subscriptions
 * Follow or unfollow a wallet.
 * Body: { walletId: number, action: 'follow' | 'unfollow' }
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readBody(event)
  const { walletId, action } = body || {}

  if (!walletId || !['follow', 'unfollow'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'walletId and action (follow|unfollow) required' })
  }

  const supabase = getSupabase()

  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', sessionId)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  if (action === 'follow') {
    const { error } = await supabase
      .from('user_wallet_subscriptions')
      .upsert({ user_id: session.user_id, wallet_id: walletId }, { onConflict: 'user_id,wallet_id' })

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, action: 'followed' }
  } else {
    const { error } = await supabase
      .from('user_wallet_subscriptions')
      .delete()
      .eq('user_id', session.user_id)
      .eq('wallet_id', walletId)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, action: 'unfollowed' }
  }
})
