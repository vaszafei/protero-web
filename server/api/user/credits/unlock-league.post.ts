/**
 * POST /api/user/credits/unlock-league
 * Spend credits to unlock a premium league for the configured duration.
 * Body: { league_key: string }
 */
import { getSupabase } from '~/server/utils/supabase'
import { getAuthenticatedUserId, spendCredits, getCreditsConfig } from '~/server/utils/credits'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const { league_key } = await readBody(event)

  if (!league_key) {
    throw createError({ statusCode: 400, statusMessage: 'league_key is required' })
  }

  const supabase = getSupabase()

  // Check if it's the user's free league
  const { data: userData } = await supabase
    .from('users')
    .select('free_league_key')
    .eq('id', userId)
    .single()

  if (userData?.free_league_key === league_key) {
    throw createError({ statusCode: 400, statusMessage: 'This is your free league — no unlock needed' })
  }

  // Check if already unlocked (active)
  const { data: existing } = await supabase
    .from('league_unlocks')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('league_key', league_key)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 400,
      statusMessage: `League already unlocked until ${new Date(existing.expires_at).toLocaleDateString()}`
    })
  }

  // Get league cost
  const { data: league } = await supabase
    .from('leagues')
    .select('credit_cost, credit_tier, name')
    .eq('key', league_key)
    .single()

  if (!league) {
    throw createError({ statusCode: 404, statusMessage: 'League not found' })
  }

  const cost = league.credit_cost
  const durationDays = await getCreditsConfig<number>('unlock_duration_days')

  // Spend credits (throws if insufficient)
  const newBalance = await spendCredits(
    userId,
    cost,
    'league_unlock',
    `Unlocked ${league.name} for ${durationDays} days`,
    league_key
  )

  // Create unlock record
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  await supabase.from('league_unlocks').upsert(
    {
      user_id: userId,
      league_key,
      unlocked_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      credits_spent: cost
    },
    { onConflict: 'user_id,league_key' }
  )

  // Also subscribe the user to the league
  await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      league_key,
      sport: league.credit_tier === 'top' ? 'football' : 'football', // will be corrected by league lookup
      is_active: true
    },
    { onConflict: 'user_id,league_key' }
  )

  return {
    success: true,
    league_key,
    credits_spent: cost,
    new_balance: newBalance,
    expires_at: expiresAt.toISOString()
  }
})
