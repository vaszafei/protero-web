/**
 * POST /api/user-real-bets
 *
 * Creates a new real-money bet entry. Idempotent on
 * (user_id, bookmaker, bookmaker_external_id) when external_id is provided —
 * re-uploading the same Stoiximan slip will UPDATE not duplicate.
 *
 * Body:
 *   {
 *     placed_at: string (ISO)
 *     bookmaker: string ('Stoiximan' default)
 *     bookmaker_external_id?: string
 *     bet_type: 'single'|'parlay'|'system'|'bet_builder'
 *     stake: number
 *     total_odds: number
 *     status: 'pending'|'won'|'lost'|'void'|'cashout'|'partial'
 *     legs: [
 *       { sport, league, match, match_date, market, selection, odds, result, score? }
 *     ]
 *     notes?: string
 *     screenshot_url?: string
 *   }
 *
 * Computed server-side:
 *   payout = (status === 'won') ? stake * total_odds : 0
 *   profit = payout - stake (lost: -stake, won: stake*(odds-1), pending: 0)
 */
import { requireUserId } from '~/server/utils/auth'
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

function computePayoutAndProfit(stake: number, total_odds: number, status: string): { payout: number; profit: number } {
  const s = Number(stake) || 0
  const o = Number(total_odds) || 1
  if (status === 'won') {
    const payout = +(s * o).toFixed(2)
    return { payout, profit: +(payout - s).toFixed(2) }
  }
  if (status === 'lost') return { payout: 0, profit: -s }
  if (status === 'void' || status === 'cashout') return { payout: s, profit: 0 }
  // pending / partial
  return { payout: 0, profit: 0 }
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<Body>(event)

  if (!body || !body.placed_at || !body.bet_type || body.stake == null || body.total_odds == null || !Array.isArray(body.legs) || body.legs.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: placed_at, bet_type, stake, total_odds, legs[]' })
  }
  if (body.bet_type === 'single' && body.legs.length !== 1) {
    throw createError({ statusCode: 400, statusMessage: 'Single bet must have exactly 1 leg' })
  }
  if (body.bet_type !== 'single' && body.legs.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Multi-leg bet must have ≥2 legs' })
  }

  const status = body.status || 'pending'
  const { payout, profit } = computePayoutAndProfit(body.stake, body.total_odds, status)
  const bookmaker = body.bookmaker || 'Stoiximan'

  const supabase = getSupabase()

  const row = {
    user_id: userId,
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

  // Upsert pattern when external_id is provided (idempotent)
  if (body.bookmaker_external_id) {
    // Try to find existing
    const { data: existing } = await supabase
      .from('user_real_bets')
      .select('id')
      .eq('user_id', userId)
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
