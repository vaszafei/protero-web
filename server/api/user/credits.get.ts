/**
 * GET /api/user/credits
 * Returns the authenticated user's credit balance, recent transactions,
 * active league unlocks, and their free league key.
 */
import { getSupabase } from '~/server/utils/supabase'
import { getAuthenticatedUserId } from '~/server/utils/credits'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const supabase = getSupabase()

  // Fetch balance, recent transactions, active unlocks, and free league in parallel
  const [balanceRes, txRes, unlocksRes, userRes] = await Promise.all([
    supabase
      .from('credit_balances')
      .select('balance, total_earned, total_spent, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('credit_transactions')
      .select('id, amount, type, description, reference_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('league_unlocks')
      .select('league_key, unlocked_at, expires_at, credits_spent')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString()),

    supabase
      .from('users')
      .select('free_league_key')
      .eq('id', userId)
      .single()
  ])

  return {
    balance: balanceRes.data?.balance ?? 0,
    total_earned: balanceRes.data?.total_earned ?? 0,
    total_spent: balanceRes.data?.total_spent ?? 0,
    free_league_key: userRes.data?.free_league_key ?? null,
    transactions: txRes.data || [],
    active_unlocks: unlocksRes.data || []
  }
})
