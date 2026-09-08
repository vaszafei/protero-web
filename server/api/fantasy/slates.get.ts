/**
 * GET /api/fantasy/slates
 *
 * List all DFS slates for the console index.
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('fantasy_slates')
    .select('id, tournament, league_key, contest_name, field_size, prize_pool, salary_cap, salary_cap_unit, lineup_size, formation, target_date, created_at')
    .order('target_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { slates: data ?? [] }
})
