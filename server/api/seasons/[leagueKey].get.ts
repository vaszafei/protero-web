import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const leagueKey = getRouterParam(event, 'leagueKey')
  
  if (!leagueKey) {
    throw createError({
      statusCode: 400,
      message: 'League key is required'
    })
  }

  try {
    const supabase = getSupabase()

    // Get all games for this league
    const { data: games } = await supabase
      .from('games')
      .select('season, home_goals')
      .eq('league_key', leagueKey)
      .not('season', 'is', null)

    // Group by season
    const seasonMap = new Map()
    games?.forEach(game => {
      const season = game.season
      if (!seasonMap.has(season)) {
        seasonMap.set(season, { total: 0, completed: 0 })
      }
      const stats = seasonMap.get(season)
      stats.total++
      if (game.home_goals !== null) stats.completed++
    })

    const seasons = Array.from(seasonMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([season, stats]) => ({
        season,
        label: formatSeasonLabel(season),
        totalGames: stats.total,
        completedGames: stats.completed
      }))

    return {
      success: true,
      leagueKey,
      seasons
    }
  } catch (error: any) {
    console.error('Error fetching seasons:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch seasons'
    })
  }
})

// Convert season year to display format (e.g., 2024 -> "2024/25")
function formatSeasonLabel(season: number): string {
  const startYear = season
  const endYear = (season + 1) % 100
  return `${startYear}/${endYear.toString().padStart(2, '0')}`
}
