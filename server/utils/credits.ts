/**
 * Credits System Utilities
 * 
 * Dynamic config reader for the credits system.
 * All credit values are stored in the `credits_config` table so they can be
 * tuned at runtime without code changes.
 * 
 * Config keys:
 *   signup_bonus, top_tier_cost, mid_tier_cost, max_contributors_per_task,
 *   base_task_reward, first_contributor_bonus, top_league_task_multiplier,
 *   unlock_duration_days, referral_reward, daily_task_limit
 */

import { getSupabase } from './supabase'

// In-memory cache: key → { value, fetchedAt }
const configCache = new Map<string, { value: any; fetchedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get a single config value from the credits_config table.
 * Returns a cached value if fresh enough, otherwise fetches from DB.
 */
export async function getCreditsConfig<T = number>(key: string): Promise<T> {
  const cached = configCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value as T
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('credits_config')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    throw new Error(`credits_config key "${key}" not found: ${error?.message}`)
  }

  // JSONB values are stored as raw JSON — parse them out
  const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  configCache.set(key, { value: parsed, fetchedAt: Date.now() })
  return parsed as T
}

/**
 * Get all config values at once (bulk fetch).
 * Useful for returning public config to the frontend.
 */
export async function getAllCreditsConfig(): Promise<Record<string, any>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('credits_config')
    .select('key, value')

  if (error) {
    throw new Error(`Failed to fetch credits config: ${error.message}`)
  }

  const result: Record<string, any> = {}
  for (const row of data || []) {
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
    result[row.key] = parsed
    // Update cache while we're at it
    configCache.set(row.key, { value: parsed, fetchedAt: Date.now() })
  }
  return result
}

/**
 * Invalidate the config cache (e.g. after an admin changes values).
 */
export function clearCreditsConfigCache(): void {
  configCache.clear()
}

/**
 * Helper: validate session and return user_id.
 * Shared by all credits-related endpoints.
 */
export async function getAuthenticatedUserId(event: any): Promise<number> {
  const sessionId = getCookie(event, 'session_id')
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const supabase = getSupabase()
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', sessionId)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  return session.user_id
}

/**
 * Award credits to a user (creates transaction + updates balance).
 * Returns the new balance.
 */
export async function awardCredits(
  userId: number,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<number> {
  const supabase = getSupabase()

  // Insert transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount,
    type,
    description,
    reference_id: referenceId || null
  })

  // Fetch current balance (may not exist yet)
  const { data: existing } = await supabase
    .from('credit_balances')
    .select('balance, total_earned, total_spent')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Update existing balance
    const newBalance = existing.balance + amount
    const newEarned = existing.total_earned + (amount > 0 ? amount : 0)
    const newSpent = existing.total_spent + (amount < 0 ? Math.abs(amount) : 0)

    await supabase
      .from('credit_balances')
      .update({
        balance: newBalance,
        total_earned: newEarned,
        total_spent: newSpent,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    return newBalance
  } else {
    // Create new balance row
    await supabase.from('credit_balances').insert({
      user_id: userId,
      balance: amount,
      total_earned: amount > 0 ? amount : 0,
      total_spent: amount < 0 ? Math.abs(amount) : 0
    })

    return amount
  }
}

/**
 * Spend credits from a user's balance.
 * Throws if insufficient balance.
 * Returns the new balance.
 */
export async function spendCredits(
  userId: number,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<number> {
  const supabase = getSupabase()

  // Check current balance
  const { data: bal } = await supabase
    .from('credit_balances')
    .select('balance')
    .eq('user_id', userId)
    .single()

  const currentBalance = bal?.balance ?? 0
  if (currentBalance < amount) {
    throw createError({
      statusCode: 400,
      statusMessage: `Insufficient credits. You have ${currentBalance}, need ${amount}.`
    })
  }

  // Deduct (use negative amount in transaction)
  return awardCredits(userId, -amount, type, description, referenceId)
}

/**
 * Initialize credit balance for a new user (called during registration).
 */
export async function initializeUserCredits(userId: number): Promise<number> {
  const signupBonus = await getCreditsConfig<number>('signup_bonus')
  const supabase = getSupabase()

  // Create balance row
  await supabase.from('credit_balances').insert({
    user_id: userId,
    balance: signupBonus,
    total_earned: signupBonus,
    total_spent: 0
  })

  // Record transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: signupBonus,
    type: 'signup_bonus',
    description: `Welcome bonus: ${signupBonus} credits`
  })

  return signupBonus
}
