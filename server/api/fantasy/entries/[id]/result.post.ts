/**
 * POST /api/fantasy/entries/[id]/result
 *
 * Result capture (§F.5) — the owner enters the actual finishing rank and
 * winning score after a contest. This is the settlement-equivalent for DFS:
 * the only real validation the system will ever get.
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    actual_rank: number | null
    winning_score: number | null
    own_score: number | null
    field_size: number | null
  }>(event)

  if (!id) throw createError({ statusCode: 400, statusMessage: 'missing entry id' })
  if (body.actual_rank == null && body.winning_score == null && body.own_score == null) {
    throw createError({ statusCode: 400, statusMessage: 'nothing to record' })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('fantasy_entry_results')
    .insert({
      entry_id: Number(id),
      actual_rank: body.actual_rank,
      winning_score: body.winning_score,
      own_score: body.own_score,
      field_size: body.field_size,
    })
    .select('id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { result_id: data.id }
})
