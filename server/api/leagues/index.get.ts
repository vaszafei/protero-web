import { getSupabase } from '~/server/utils/supabase'
import { requireUserId } from '~/server/utils/auth'
import { currentSeason } from '~/utils/season'

/** Cached data function; the handler stays uncached so `requireUserId` runs on every request. */
const loadLeagues = defineCachedFunction(async (season: string) => {
  const supabase = getSupabase()

  try {
    // Fetch leagues first
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select('*')
      .order('name')

    if (error) throw error

    // Single query: fetch league_key + home_goals for all season games
    // Then aggregate in JS — 1 query instead of 2 * N (was 48 queries for 24 leagues)
    const { data: gamesMinimal } = await supabase
      .from('games')
      .select('league_key, home_goals')
      .eq('season', season)

    const totalMap: Record<string, number> = {}
    const playedMap: Record<string, number> = {}
    for (const g of (gamesMinimal || [])) {
      totalMap[g.league_key] = (totalMap[g.league_key] || 0) + 1
      if (g.home_goals != null) {
        playedMap[g.league_key] = (playedMap[g.league_key] || 0) + 1
      }
    }

    const leaguesWithStats = (leagues || []).map((league: any) => ({
      ...league,
      games_count: totalMap[league.key] || 0,
      played_count: playedMap[league.key] || 0,
    }))

    return { leagues: leaguesWithStats, season, cached_at: new Date().toISOString() }

  } catch (error: any) {
    throw createError({ statusCode: 500, message: 'Failed to fetch leagues: ' + error.message })
  }
}, { name: 'leagues-list', getKey: (season: string) => season, maxAge: 180, swr: true })

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const season = (getQuery(event).season as string) || currentSeason()
  return loadLeagues(season)
})
