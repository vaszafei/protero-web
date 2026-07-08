import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const walletId = Number(query.walletId)
  if (!walletId) throw createError({ statusCode: 400, message: 'walletId is required' })

  const status = query.status as string || ''
  const limit = Math.min(Number(query.limit) || 200, 500)
  const offset = Number(query.offset) || 0

  const cacheKey = `wallet-bets-${walletId}-${status}-${limit}-${offset}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const supabase = getSupabase()

  let q = supabase
    .from('bets')
    .select(`
      id, bet_type, stake, odds, status, profit, placed_at, notes, sport, strategy, game_id,
      games!inner(id, date, league_key, home_goals, away_goals, status,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      )
    `, { count: 'exact' })
    .eq('wallet_id', walletId)
    .order('placed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && ['pending', 'won', 'lost', 'push', 'void'].includes(status)) {
    q = q.eq('status', status)
  }

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  const bets = (data || []).map((b: any) => ({
    ...b,
    home_name: b.games?.home_team?.name || 'TBD',
    away_name: b.games?.away_team?.name || 'TBD',
    date: b.games?.date,
    league_key: b.games?.league_key,
    game_status: b.games?.status,
    home_goals: b.games?.home_goals,
    away_goals: b.games?.away_goals,
  }))

  const result = { bets, total: count || 0 }
  setCache(cacheKey, result, 180) // 3 min
  return result
})
