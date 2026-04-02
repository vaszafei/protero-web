/**
 * GET /api/credits/leagues
 * Returns all leagues with their credit tiers and costs,
 * along with the authenticated user's unlock status for each.
 */
import { getSupabase } from '~/server/utils/supabase'
import { getAuthenticatedUserId } from '~/server/utils/credits'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const supabase = getSupabase()

  // Fetch leagues, user's active unlocks, and free league key in parallel
  const [leaguesRes, unlocksRes, userRes] = await Promise.all([
    supabase
      .from('leagues')
      .select('key, name, sport, country, flag, credit_tier, credit_cost')
      .order('sport')
      .order('name'),

    supabase
      .from('league_unlocks')
      .select('league_key, expires_at')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString()),

    supabase
      .from('users')
      .select('free_league_key')
      .eq('id', userId)
      .single()
  ])

  const unlockedKeys = new Set((unlocksRes.data || []).map(u => u.league_key))
  const unlockExpiry = new Map((unlocksRes.data || []).map(u => [u.league_key, u.expires_at]))
  const freeLeague = userRes.data?.free_league_key

  const leagues = (leaguesRes.data || []).map(league => ({
    ...league,
    is_free: league.key === freeLeague,
    is_unlocked: league.key === freeLeague || unlockedKeys.has(league.key),
    unlock_expires_at: unlockExpiry.get(league.key) || null
  }))

  return { leagues }
})
