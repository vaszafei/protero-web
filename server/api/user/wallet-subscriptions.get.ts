/**
 * GET /api/user/wallet-subscriptions
 * Returns wallets the authenticated user follows, with stats
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
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

  // Get wallet IDs user follows
  const { data: subs, error: subErr } = await supabase
    .from('user_wallet_subscriptions')
    .select('wallet_id, created_at')
    .eq('user_id', session.user_id)

  if (subErr) throw createError({ statusCode: 500, statusMessage: subErr.message })

  const walletIds = (subs || []).map(s => s.wallet_id)
  if (walletIds.length === 0) return { wallets: [] }

  // Get wallet details
  const { data: wallets, error: wErr } = await supabase
    .from('wallets')
    .select('id, name, balance, initial_balance, total_profit, roi, total_bets, total_won, total_lost, win_rate, is_active')
    .in('id', walletIds)

  if (wErr) throw createError({ statusCode: 500, statusMessage: wErr.message })

  return { wallets: wallets || [] }
})
