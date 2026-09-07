/**
 * GET /api/fantasy/slates/[id]
 *
 * One slate with its players and the D3 join status, for the console's
 * projections table + lineup output.
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'missing slate id' })

  const supabase = getSupabase()

  const { data: slate, error: sErr } = await supabase
    .from('fantasy_slates')
    .select('*')
    .eq('id', id)
    .single()
  if (sErr || !slate) throw createError({ statusCode: 404, statusMessage: 'slate not found' })

  const { data: players, error: pErr } = await supabase
    .from('fantasy_slate_players')
    .select('*')
    .eq('slate_id', id)
    .order('lineup_status')
    .order('price', { ascending: false })
  if (pErr) throw createError({ statusCode: 500, statusMessage: pErr.message })

  const { data: entries, error: eErr } = await supabase
    .from('fantasy_entries')
    .select('*')
    .eq('slate_id', id)
  if (eErr) throw createError({ statusCode: 500, statusMessage: eErr.message })

  return { slate, players: players ?? [], entries: entries ?? [] }
})
