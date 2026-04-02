import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache, invalidateCache } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const { round, season } = getQuery(event)
  const supabase = getSupabase()

  // Cache key based on slug + season
  const cacheKey = `league:${slug}:${round || 'all'}:${season || 'current'}`
  const cached = getCached(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Season can come from URL; fall back to current season
    const targetSeason = (season as string) || '2025-2026'

    // ── Round 1: fire league + games + standings in PARALLEL ──────────────
    let gamesQuery = supabase
      .from('games')
      .select(`
        id, league_key, season, round, date, status,
        home_team_id, away_team_id,
        home_goals, away_goals,
        home_xg, away_xg,
        home_possession, away_possession,
        odds_home, odds_draw, odds_away,
        odds_over_15, odds_under_15,
        odds_over_25, odds_under_25,
        odds_over_35, odds_under_35,
        predictions (
          id,
          prediction,
          confidence,
          model_version,
          over_15_prob,
          over_25_prob,
          over_35_prob,
          over_85_corners_prob,
          over_95_corners_prob,
          over_105_corners_prob,
          odds_over_25,
          odds_under_25,
          expected_value,
          bets (
            id,
            bet_type,
            stake,
            odds,
            status
          )
        )
      `)
      .eq('league_key', slug)
      .eq('season', targetSeason)
      .order('date', { ascending: true })

    if (round && round !== 'all') {
      gamesQuery = gamesQuery.eq('round', round)
    }

    const [leagueResult, gamesResult, standingsResult] = await Promise.all([
      supabase.from('leagues').select('*').eq('key', slug).single(),
      gamesQuery,
      supabase
        .from('standings')
        .select('*, teams!inner(name, team_key)')
        .eq('league_key', slug)
        .eq('season', targetSeason)
        .order('pts', { ascending: false })
    ])

    const { data: league, error: leagueError } = leagueResult
    if (leagueError || !league) {
      throw createError({ statusCode: 404, message: 'League not found' })
    }

    const games = gamesResult.data || []
    const standings = standingsResult.data || []

    // ── Round 2: fetch teams by IDs extracted from games ──────────────────
    const uniqueTeamIds = new Set<number>()
    games.forEach((g: any) => {
      if (g.home_team_id) uniqueTeamIds.add(g.home_team_id)
      if (g.away_team_id) uniqueTeamIds.add(g.away_team_id)
    })

    let teamsMap = new Map<number, any>()
    if (uniqueTeamIds.size > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, team_key, league_key')
        .in('id', Array.from(uniqueTeamIds))
      if (teams) {
        teamsMap = new Map(teams.map((t: any) => [t.id, t]))
      }
    }

    // Map standings to include team info at top level
    const standingsWithTeams = standings.map((s: any) => ({
      ...s,
      team_name: s.teams?.name,
      team_key: s.teams?.team_key
    }))
    
    // Enrich games with team names and flatten predictions
    const enrichedGames = games.map((game: any) => {
      const homeTeam = teamsMap.get(game.home_team_id)
      const awayTeam = teamsMap.get(game.away_team_id)

      // Prefer V18 predictions, fall back to any
      const v18Preds = game.predictions?.filter((p: any) => p.model_version === 'v18') || []
      const prediction = v18Preds[0] || game.predictions?.[0]
      const bet = prediction?.bets?.[0]

      return {
        ...game,
        home_name: homeTeam?.name,
        home_key: homeTeam?.team_key,
        away_name: awayTeam?.name,
        away_key: awayTeam?.team_key,
        home_odds: game.odds_home,
        draw_odds: game.odds_draw,
        away_odds: game.odds_away,
        over_15_odds: game.odds_over_15,
        under_15_odds: game.odds_under_15,
        over_25_odds: game.odds_over_25,
        under_25_odds: game.odds_under_25,
        over_35_odds: game.odds_over_35,
        under_35_odds: game.odds_under_35,
        prediction_id: prediction?.id,
        prediction: prediction?.prediction,
        confidence: prediction?.confidence,
        model_version: prediction?.model_version,
        over_15_prob: prediction?.over_15_prob,
        over_25_prob: prediction?.over_25_prob,
        over_35_prob: prediction?.over_35_prob,
        over_85_corners_prob: prediction?.over_85_corners_prob,
        over_95_corners_prob: prediction?.over_95_corners_prob,
        over_105_corners_prob: prediction?.over_105_corners_prob,
        odds_over_25: prediction?.odds_over_25,
        odds_under_25: prediction?.odds_under_25,
        expected_value: prediction?.expected_value,
        bet_id: bet?.id,
        bet_type: bet?.bet_type,
        stake: bet?.stake,
        bet_odds: bet?.odds,
        bet_status: bet?.status
      }
    })

    const response = {
      league,
      standings: standingsWithTeams,
      games: enrichedGames,
      round: round || league.current_round
    }

    // Cache 10 min for past seasons, 3 min for current
    const ttl = targetSeason < '2025-2026' ? 600 : 180
    setCache(cacheKey, response, ttl)

    return response
  } catch (error: any) {
    if (error.statusCode === 404) throw error
    
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch league: ' + error.message
    })
  }
})

// Helper function to invalidate cache when data changes
// Call this from update endpoints
export function invalidateLeagueCache(leagueKey: string) {
  return invalidateCache(`league:${leagueKey}`)
}
