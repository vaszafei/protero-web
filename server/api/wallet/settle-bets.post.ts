import { getSupabase } from '~/server/utils/supabase'
import { logOperation } from '~/server/utils/operations'

// Settle bets for completed games
export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    await logOperation('settle-bets', 'started')

    const supabase = getSupabase()

    // Get pending bets for completed games
    const { data: pendingBets, error: fetchError } = await supabase
      .from('bets')
      .select('*, game:games!inner(home_goals, away_goals, status)')
      .eq('status', 'pending')
      .eq('game.status', 'completed')
      .not('game.home_goals', 'is', null)
      .not('game.away_goals', 'is', null)

    if (fetchError) throw fetchError

    if (!pendingBets || pendingBets.length === 0) {
      await logOperation('settle-bets', 'success', {
        affectedCount: 0,
        durationMs: Date.now() - startTime
      })
      return { success: true, settled: 0, message: 'No bets to settle' }
    }

    let settled = 0
    let totalWon = 0
    let totalLost = 0
    let totalProfit = 0

    for (const bet of pendingBets) {
      const game = (bet as any).game
      const homeGoals = Number(game.home_goals)
      const awayGoals = Number(game.away_goals)

      // Determine actual result
      let actualResult: string
      if (homeGoals > awayGoals) actualResult = 'home'
      else if (awayGoals > homeGoals) actualResult = 'away'
      else actualResult = 'draw'

      // Check if bet won
      const betWon = bet.bet_type === actualResult ||
        (bet.bet_type === 'over25' && (homeGoals + awayGoals) > 2.5) ||
        (bet.bet_type === 'under25' && (homeGoals + awayGoals) < 2.5) ||
        (bet.bet_type === 'btts' && homeGoals > 0 && awayGoals > 0)

      const status = betWon ? 'won' : 'lost'
      const profit = betWon ? (Number(bet.stake) * Number(bet.odds)) - Number(bet.stake) : -Number(bet.stake)

      // Update bet
      await supabase
        .from('bets')
        .update({
          status,
          profit,
          actual_result: actualResult,
          settled_at: new Date().toISOString()
        })
        .eq('id', bet.id)

      // Update wallet
      if (betWon) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance, total_won, total_profit')
          .eq('id', bet.wallet_id)
          .single()
        if (wallet) {
          await supabase
            .from('wallets')
            .update({
              balance: Number(wallet.balance) + Number(bet.stake) + profit,
              total_won: Number(wallet.total_won) + 1,
              total_profit: Number(wallet.total_profit) + profit
            })
            .eq('id', bet.wallet_id)
        }
        totalWon++
      } else {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('total_lost, total_profit')
          .eq('id', bet.wallet_id)
          .single()
        if (wallet) {
          await supabase
            .from('wallets')
            .update({
              total_lost: Number(wallet.total_lost) + 1,
              total_profit: Number(wallet.total_profit) + profit
            })
            .eq('id', bet.wallet_id)
        }
        totalLost++
      }

      totalProfit += profit
      settled++
    }

    // Update wallet win_rate and roi
    const walletIds = [...new Set(pendingBets.map((b: any) => b.wallet_id))]

    for (const walletId of walletIds) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .single()

      if (wallet) {
        const winRate = Number(wallet.total_bets) > 0
          ? (Number(wallet.total_won) / Number(wallet.total_bets) * 100).toFixed(2)
          : '0'
        const roi = Number(wallet.initial_balance) > 0
          ? (Number(wallet.total_profit) / Number(wallet.initial_balance) * 100).toFixed(2)
          : '0'

        await supabase
          .from('wallets')
          .update({ win_rate: Number(winRate), roi: Number(roi) })
          .eq('id', walletId)
      }
    }

    await logOperation('settle-bets', 'success', {
      affectedCount: settled,
      durationMs: Date.now() - startTime
    })

    return {
      success: true,
      settled,
      won: totalWon,
      lost: totalLost,
      totalProfit: totalProfit.toFixed(2)
    }
  } catch (error: any) {
    await logOperation('settle-bets', 'error', {
      errorMessage: error.message,
      durationMs: Date.now() - startTime
    })
    throw createError({ statusCode: 500, message: error.message })
  }
})
