import { initializeUserCredits } from '~/server/utils/credits'
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userId } = body

  if (!userId || typeof userId !== 'number') {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }

  const supabase = getSupabase()

  // Verify user exists
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Check if credits already initialized
  const { data: existing } = await supabase
    .from('credit_balances')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return { success: true, credits: 0, message: 'Credits already initialized' }
  }

  try {
    const credits = await initializeUserCredits(userId)
    return { success: true, credits }
  } catch (err: any) {
    console.error('Credits init error:', err)
    return { success: true, credits: 0, message: 'Credits init failed (non-fatal)' }
  }
})
