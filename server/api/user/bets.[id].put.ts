/**
 * PUT /api/user/bets/:id
 * Update a user's bet (status, profit, notes)
 * Body: { status?, profit?, notes? }
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const betId = getRouterParam(event, 'id')
  if (!betId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing bet id' })
  }

  const body = await readBody(event)
  const { status, profit, notes } = body

  if (!status && profit == null && notes == null) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const supabase = getSupabase()

  // Validate session
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', sessionId)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  // Build update object
  const update: Record<string, any> = {}
  if (status) {
    const validStatuses = ['pending', 'won', 'lost', 'void', 'cashout']
    if (!validStatuses.includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      })
    }
    update.status = status
    if (status !== 'pending') {
      update.settled_at = new Date().toISOString()
    }
  }
  if (profit != null) update.profit = parseFloat(profit)
  if (notes != null) update.notes = notes

  // Update only the user's own bet (RLS enforced + explicit check)
  const { data: bet, error } = await supabase
    .from('user_bets')
    .update(update)
    .eq('id', betId)
    .eq('user_id', session.user_id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({ statusCode: 404, statusMessage: 'Bet not found' })
    }
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { bet }
})
