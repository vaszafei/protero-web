/**
 * DELETE /api/user-real-bets/:id
 *
 * Removes a user's bet entry. Authorization is implicit — the supabase query
 * scopes to user_id, so a user can only delete their own rows.
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const supabase = getSupabase()
  const { error } = await supabase
    .from('user_real_bets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
