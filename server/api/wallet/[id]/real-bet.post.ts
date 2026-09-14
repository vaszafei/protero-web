/**
 * POST /api/wallet/:id/real-bet
 *
 * Logs a real-money slip against a `user_mirror` wallet (W54 = Bill). Unlike
 * `POST /api/user-real-bets` — which always writes for the CALLER — this writes
 * for the wallet's own `user_id`, so the row lands in the same `user_real_bets`
 * partition (`user_id = 3`) that `stoiximan_leg_binding` and
 * `ml.tipsters.project_stoiximan` read. Admin only.
 *
 * The slip appears here immediately but becomes a W54 wager only after the
 * backend mirror chain runs: `bind_stoiximan.py` → `project_stoiximan --apply`
 * → `settle_stoiximan`. This endpoint does not trigger it.
 *
 * Body: identical to POST /api/user-real-bets (placed_at, bet_type, stake,
 * total_odds, status?, legs[], bookmaker?, bookmaker_external_id?, notes?,
 * screenshot_url?). Idempotent on (user_id, bookmaker, bookmaker_external_id).
 */
import { requireAdmin } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

interface Leg {
  sport?: string
  league?: string
  match?: string
  match_date?: string
  market?: string
  selection: string
  odds: number
  result?: 'pending' | 'won' | 'lost' | 'void'
  score?: string
}

interface Body {
  placed_at: string
  bookmaker?: string
  bookmaker_external_id?: string
  bet_type: 'single' | 'parlay' | 'system' | 'bet_builder'
  stake: number
  total_odds: number
  status?: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'partial'
  legs: Leg[]
  notes?: string
  screenshot_url?: string
}

function computePayoutAndProfit(stake: number, total_odds: number, status: string) {
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
  await requireAdmin(event)

  const walletId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(walletId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad wallet id' })
  }

  const body = await readBody<Body>(event)
  if (!body || !body.placed_at || !body.bet_type || body.stake == null || body.total_odds == null
      || !Array.isArray(body.legs) || body.legs.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: placed_at, bet_type, stake, total_odds, legs[]' })
  }
  if (body.bet_type === 'single' && body.legs.length !== 1) {
    throw createError({ statusCode: 400, statusMessage: 'Single bet must have exactly 1 leg' })
  }
  if (body.bet_type !== 'single' && body.legs.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Multi-leg bet must have ≥2 legs' })
  }

  const supabase = getSupabase()

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, lifecycle, user_id')
    .eq('id', walletId)
    .maybeSingle()

  if (!wallet) throw createError({ statusCode: 404, statusMessage: `No wallet ${walletId}` })
  if (wallet.lifecycle !== 'user_mirror') {
    throw createError({ statusCode: 422, statusMessage: `W${walletId} is not a user_mirror wallet` })
  }
  if (!wallet.user_id) {
    throw createError({ statusCode: 422, statusMessage: `W${walletId} has no user_id` })
  }

  const targetUserId = wallet.user_id
  const status = body.status || 'pending'
  const { payout, profit } = computePayoutAndProfit(body.stake, body.total_odds, status)
  const bookmaker = body.bookmaker || 'Stoiximan'

  const row = {
    user_id: targetUserId,
    placed_at: body.placed_at,
    bookmaker,
    bookmaker_external_id: body.bookmaker_external_id || null,
    bet_type: body.bet_type,
    stake: body.stake,
    total_odds: body.total_odds,
    status,
    payout,
    profit,
    legs: body.legs,
    notes: body.notes || null,
    screenshot_url: body.screenshot_url || null,
  }

  if (body.bookmaker_external_id) {
    const { data: existing } = await supabase
      .from('user_real_bets')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('bookmaker', bookmaker)
      .eq('bookmaker_external_id', body.bookmaker_external_id)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('user_real_bets')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { bet: data, action: 'updated' }
    }
  }

  const { data, error } = await supabase
    .from('user_real_bets')
    .insert(row)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { bet: data, action: 'created' }
})
