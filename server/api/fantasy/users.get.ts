/**
 * GET /api/fantasy/users
 *
 * List active users for the manual-pick form (an admin attributes a DFS entry
 * to a real user). Operator-only surface — the sidebar already hides the
 * fantasy console from non-admins, and this endpoint re-checks the role
 * server-side.
 */
import { requireAdmin } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, display_name, name, role')
    .eq('is_active', true)
    .order('id')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    users: (data ?? []).map(u => ({
      id: u.id,
      label: u.display_name || u.name || u.username || u.email || `user #${u.id}`,
      username: u.username,
      email: u.email,
    })),
  }
})
