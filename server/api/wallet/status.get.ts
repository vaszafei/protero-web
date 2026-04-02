import { getSupabase } from '~/server/utils/supabase'

// Get wallet status and recent bets
export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    const query = getQuery(event)
    const walletId = query.walletId ? Number(query.walletId) : 1

    // Get wallet info
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single()

    if (walletError || !wallet) {
      throw createError({ statusCode: 404, message: 'Wallet not found' })
    }

    // Get recent bets with game info
    const { data: recentBets } = await supabase
      .from('bets')
      .select('*, game:games(home_team_id, away_team_id, date, home_goals, away_goals, league_key)')
      .eq('wallet_id', walletId)
      .order('placed_at', { ascending: false })
      .limit(50)

    // Get pending bets count + total staked
    const { count: pendingCount } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', walletId)
      .eq('status', 'pending')

    const { data: pendingStake } = await supabase
      .from('bets')
      .select('stake')
      .eq('wallet_id', walletId)
      .eq('status', 'pending')

    const totalStaked = (pendingStake || []).reduce((sum: number, b: any) => sum + Number(b.stake || 0), 0)

    return {
      wallet: {
        id: wallet.id,
        name: wallet.name,
        balance: wallet.balance,
        initialBalance: wallet.initial_balance,
        totalProfit: wallet.total_profit,
        roi: wallet.roi,
        totalBets: wallet.total_bets,
        totalWon: wallet.total_won,
        totalLost: wallet.total_lost,
        winRate: wallet.win_rate,
        isActive: wallet.is_active === 1,
        createdAt: wallet.created_at
      },
      pending: {
        count: pendingCount || 0,
        totalStaked
      },
      recentBets: recentBets || [],
      profitHistory: []
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message })
  }
})
