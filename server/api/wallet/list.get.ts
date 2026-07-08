import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) throw createError({ statusCode: 401, message: 'Not authenticated' })

  const query = getQuery(event)
  const supabase = getSupabase()

  // Verify session
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id, users!inner(role)')
    .eq('token', sessionId)
    .gt('expires_at', new Date().toISOString())
    .eq('users.is_active', true)
    .maybeSingle()

  if (!session) throw createError({ statusCode: 401, message: 'Invalid or expired session' })

  // All authenticated users see all wallets (admin-only tool)
  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, balance, initial_balance, is_active, total_bets, win_rate, roi, total_profit')
    .eq('is_active', true)
    .order('id', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { wallets: data || [] }
})
