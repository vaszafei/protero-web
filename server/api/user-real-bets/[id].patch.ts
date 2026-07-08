/**
 * PATCH /api/user-real-bets/:id
 *
 * Partial update — typically used to grade a pending bet (set status + per-leg
 * results) once the user knows the outcome.
 *
 * Body: any subset of (status, legs, payout, profit, notes, screenshot_url).
 * If status changes from pending → won/lost, server recomputes payout/profit.
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

interface PatchBody {
  status?: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'partial'
  legs?: any[]
  payout?: number
  profit?: number
  notes?: string
  screenshot_url?: string
}

function recomputePayoutProfit(stake: number, total_odds: number, status: string) {
  const s = Number(stake) || 0
  const o = Number(total_odds) || 1
  if (status === 'won') {
    const payout = +(s * o).toFixed(2)
    return { payout, profit: +(payout - s).toFixed(2) }
  }
  if (status === 'lost') return { payout: 0, profit: -s }
  if (status === 'void' || status === 'cashout') return { payout: s, profit: 0 }
  return { payout: 0, profit: 0 }
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<PatchBody>(event)
  if (!id || !body) throw createError({ statusCode: 400, statusMessage: 'Missing id or body' })

  const supabase = getSupabase()

  // Fetch current row to recompute totals when status changes
  const { data: current } = await supabase
    .from('user_real_bets')
    .select('stake, total_odds, status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!current) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const updates: Record<string, any> = {}
  if (body.status && body.status !== current.status) {
    updates.status = body.status
    const r = recomputePayoutProfit(current.stake, current.total_odds, body.status)
    updates.payout = r.payout
    updates.profit = r.profit
  }
  if (body.legs !== undefined) updates.legs = body.legs
  if (body.payout !== undefined) updates.payout = body.payout
  if (body.profit !== undefined) updates.profit = body.profit
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.screenshot_url !== undefined) updates.screenshot_url = body.screenshot_url

  if (Object.keys(updates).length === 0) {
    return { bet: null, action: 'noop' }
  }

  const { data, error } = await supabase
    .from('user_real_bets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { bet: data, action: 'updated' }
})
