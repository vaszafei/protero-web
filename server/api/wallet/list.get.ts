import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = Number(query.userId)
  if (!userId) throw createError({ statusCode: 400, message: 'userId required' })

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, balance, initial_balance, is_active')
    .eq('user_id', userId)
    .order('id', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { wallets: data || [] }
})
