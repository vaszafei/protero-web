import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()
  const query = getQuery(event)

  // Require explicit walletId — no hardcoded fallback
  let walletId = query.walletId ? Number(query.walletId) : null

  if (!walletId && query.userId) {
    const userId = Number(query.userId)
    const { data: userRow } = await supabase
      .from('users')
      .select('preferred_wallet_id')
      .eq('id', userId)
      .single()
    walletId = userRow?.preferred_wallet_id || null
  }

  if (!walletId) {
    throw createError({ statusCode: 400, message: 'walletId is required' })
  }

  try {
    // Get wallet identity
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, name, persona_name, bio, archetype, lifecycle, balance, initial_balance, is_active, is_public')
      .eq('id', walletId)
      .single()

    if (walletError) throw walletError

    // Wager-level performance from the RPC — profit/turnover, parlay = one
    // wager. Never compute ROI from (balance - initial_balance), which is
    // bankroll return and renders W7 as +69.7% where its ROI is +11.5%.
    const { data: perf, error: perfError } = await supabase
      .rpc('get_wallet_performance', { p_wallet_id: walletId })

    if (perfError) throw perfError

    return {
      wallet,
      performance: (perf && perf[0]) || null,
    }
  } catch (error: any) {
    console.error('Error fetching wallet stats:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch wallet statistics'
    })
  }
})
