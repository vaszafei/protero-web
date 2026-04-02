import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()
  const query = getQuery(event)

  // Determine walletId: explicit param > user's preferred_wallet_id > fallback 2
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

  // Absolute fallback — admin wallet
  if (!walletId) walletId = 2

  try {
    // Get wallet info
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single()

    if (walletError) throw walletError

    // Get counts + aggregates via parallel COUNT queries (no row data transferred)
    // This replaces fetching ALL bets into Node.js for JS aggregation
    const [totalRes, wonRes, lostRes, pendingRes, pushRes] = await Promise.all([
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'won'),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'lost'),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'pending'),
      supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'push'),
    ])

    const totalBets = totalRes.count || 0
    const wonCount = wonRes.count || 0
    const lostCount = lostRes.count || 0
    const pendingCount = pendingRes.count || 0
    const settledCount = wonCount + lostCount

    // Use wallet's tracked profit + total_profit (maintained by settlement scripts)
    // This avoids fetching all bets just to recalculate P/L
    const totalProfit = parseFloat(wallet.total_profit || 0)
    const totalStaked = parseFloat(wallet.initial_balance || 0) + totalProfit - parseFloat(wallet.balance || 0) + parseFloat(wallet.initial_balance || 0)
    
    // Calculate ROI from wallet balance change
    const initialBalance = parseFloat(wallet.initial_balance || 0)
    const currentBalance = parseFloat(wallet.balance || 0)
    const balanceChange = currentBalance - initialBalance
    const roi = initialBalance > 0 ? (balanceChange / initialBalance) * 100 : 0

    // Win rate
    const winRate = settledCount > 0 ? (wonCount / settledCount) * 100 : 0

    return {
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance || 0),
        initial_balance: parseFloat(wallet.initial_balance || 0),
        season: wallet.season
      },
      stats: {
        totalBets,
        settledBets: settledCount,
        wonBets: wonCount,
        lostBets: lostCount,
        pendingBets: pendingCount,
        totalStaked: initialBalance.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        roi: roi.toFixed(2),
        winRate: winRate.toFixed(1),
        currentBalance: wallet.balance
      }
    }
  } catch (error: any) {
    console.error('Error fetching wallet stats:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch wallet statistics'
    })
  }
})
