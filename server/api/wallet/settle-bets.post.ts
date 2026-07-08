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

    // Accumulate per-wallet deltas to batch the wallet updates
    const walletDeltas = new Map<number, { balanceDelta: number; wonDelta: number; lostDelta: number; profitDelta: number }>()

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

      // Update bet status
      await supabase
        .from('bets')
        .update({
          status,
          profit,
          actual_result: actualResult,
          settled_at: new Date().toISOString()
        })
        .eq('id', bet.id)

      // Accumulate wallet delta (avoids N+1 wallet queries)
      const wid = bet.wallet_id
      const d = walletDeltas.get(wid) || { balanceDelta: 0, wonDelta: 0, lostDelta: 0, profitDelta: 0 }
      d.profitDelta += profit
      if (betWon) {
        // Return stake + winnings to balance
        d.balanceDelta += Number(bet.stake) + profit
        d.wonDelta += 1
        totalWon++
      } else {
        d.lostDelta += 1
        totalLost++
      }
      walletDeltas.set(wid, d)

      totalProfit += profit
      settled++
    }

    // Apply accumulated deltas — one SELECT + one UPDATE per unique wallet
    for (const [walletId, deltas] of walletDeltas) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, total_won, total_lost, total_profit, total_bets, initial_balance')
        .eq('id', walletId)
        .single()

      if (!wallet) continue

      const newBalance = Number(wallet.balance) + deltas.balanceDelta
      const newWon = Number(wallet.total_won) + deltas.wonDelta
      const newLost = Number(wallet.total_lost) + deltas.lostDelta
      const newProfit = Number(wallet.total_profit) + deltas.profitDelta
      const totalBets = Number(wallet.total_bets) || 0
      const winRate = totalBets > 0 ? (newWon / totalBets) * 100 : 0
      const roi = Number(wallet.initial_balance) > 0
        ? (newProfit / Number(wallet.initial_balance)) * 100
        : 0

      await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_won: newWon,
          total_lost: newLost,
          total_profit: newProfit,
          win_rate: Number(winRate.toFixed(2)),
          roi: Number(roi.toFixed(2))
        })
        .eq('id', walletId)
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
