/**
 * GET /api/user-real-bets
 *
 * Returns the authenticated user's logged real-money bets.
 *
 * Query params:
 *   ?status=pending|won|lost|void   filter by status
 *   ?from=YYYY-MM-DD                inclusive lower bound on placed_at
 *   ?to=YYYY-MM-DD                  inclusive upper bound on placed_at
 *   ?limit=N                        default 100, max 500
 *
 * Returns:
 *   { bets: [...], summary: { total, won, lost, pending, staked, profit, roi } }
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const q = getQuery(event)
  const status = q.status as string | undefined
  const from = q.from as string | undefined
  const to = q.to as string | undefined
  const limit = Math.min(parseInt((q.limit as string) || '100', 10), 500)

  const supabase = getSupabase()

  let query = supabase
    .from('user_real_bets')
    .select('*')
    .eq('user_id', userId)
    .order('placed_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('placed_at', from)
  if (to) query = query.lte('placed_at', to + 'T23:59:59Z')

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const bets = data || []
  const summary = bets.reduce(
    (s, b) => {
      s.total++
      if (b.status === 'won') s.won++
      else if (b.status === 'lost') s.lost++
      else if (b.status === 'pending') s.pending++
      else if (b.status === 'void') s.void++
      s.staked += Number(b.stake || 0)
      s.profit += Number(b.profit || 0)
      return s
    },
    { total: 0, won: 0, lost: 0, pending: 0, void: 0, staked: 0, profit: 0, roi: 0 }
  )
  summary.roi = summary.staked > 0 ? (summary.profit / summary.staked) * 100 : 0

  return { bets, summary }
})
