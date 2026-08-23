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

    // Every game row for this league, PAGED.
    //
    // PostgREST caps a response at 1,000 rows and says nothing about it — no
    // error, no truncation flag, just a short array. This route counted the
    // rows it got back, so for any league with more than 1,000 fixtures it
    // reported a wrong total AND silently dropped whole seasons: on 2026-08-23
    // `nba` has 7,000+ rows across nine seasons and this returned the first
    // 1,000, which held neither 2026-2027 nor most of 2025-2026. The league
    // page then set its <select> to a season that was not among its options,
    // so the picker displayed the wrong one while reading the right one.
    const PAGE = 1000
    const MAX_PAGES = 60 // 60k fixtures — far beyond any single competition
    const games: Array<{ season: string; home_goals: number | null }> = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await supabase
        .from('games')
        .select('season, home_goals')
        .eq('league_key', leagueKey)
        .not('season', 'is', null)
        .order('id', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1)

      if (error) throw error
      if (!data?.length) break
      games.push(...(data as any))
      if (data.length < PAGE) break
    }

    // Group by season
    const seasonMap = new Map()
    games.forEach(game => {
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

// Season year to display format: '2026-2027' → '2026/27', legacy '2024' → '2024/25'
function formatSeasonLabel(season: string | number): string {
  const m = String(season).match(/^(\d{4})-(\d{4})$/)
  if (m) return `${m[1]}/${m[2].slice(2)}`
  const startYear = Number(season)
  if (!Number.isNaN(startYear)) {
    const endYear = (startYear + 1) % 100
    return `${startYear}/${endYear.toString().padStart(2, '0')}`
  }
  return String(season)
}
