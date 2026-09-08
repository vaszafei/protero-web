/**
 * POST /api/fantasy/slates/[id]/manual-pick
 *
 * Admin enters a user's fantasy pick by hand. The pick is stored in
 * `fantasy_entries` with `entry_type='manual'` and `user_id`, so:
 *   - it is attributed to a real user (the owner selects the user in the UI);
 *   - it is NEVER replaced by "Generate picks" — the generator deletes only
 *     `entry_type='generated'` rows.
 *
 * Body: { user_id: number, lineup: [{ source_id, name, club_code, position,
 *         price_m }] }
 */
import { requireAdmin } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const adminId = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'missing slate id' })

  const body = await readBody<{ user_id: number; lineup: any[] }>(event)
  if (!body?.user_id || !Array.isArray(body.lineup) || body.lineup.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'user_id and a non-empty lineup are required' })
  }

  const supabase = getSupabase()

  // The lineup is picked from the slate's own players; only keep the keys the
  // lineup JSONB carries (source_id is the stable join key).
  const lineup = body.lineup.map(p => ({
    source_id: p.source_id,
    name: p.name,
    club_code: p.club_code,
    position: p.position,
    price_m: p.price_m,
  }))

  const { data: entry, error } = await supabase
    .from('fantasy_entries')
    .insert({
      slate_id: Number(id),
      name: 'manual',
      lineup,
      projected_score: null,
      p_in_money: null,
      entry_type: 'manual',
      user_id: body.user_id,
      created_by: adminId,
    })
    .select('id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { entry_id: entry.id }
})
