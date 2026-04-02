import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const homeTeam = decodeURIComponent(getRouterParam(event, 'homeTeam') || '')
  const awayTeam = decodeURIComponent(getRouterParam(event, 'awayTeam') || '')
  const query = getQuery(event)
  const limit = parseInt(query.limit as string) || 10

  if (!homeTeam || !awayTeam) {
    throw createError({
      statusCode: 400,
      message: 'Both homeTeam and awayTeam are required'
    })
  }

  try {
    const db = getSupabase()

    // First get team IDs from team names
    const { data: teams, error: teamsError } = await db
      .from('teams')
      .select('id, name')
      .or(`name.eq.${homeTeam},name.eq.${awayTeam}`)

    if (teamsError || !teams || teams.length < 2) {
      return {
        success: true,
        homeTeam,
        awayTeam,
        matches: [],
        summary: {
          totalMatches: 0,
          homeTeamWins: 0,
          awayTeamWins: 0,
          draws: 0,
          totalGoals: 0,
          avgGoalsPerMatch: '0.00',
          homeTeamGoals: 0,
          awayTeamGoals: 0
        }
      }
    }

    const homeTeamId = teams.find(t => t.name === homeTeam)?.id
    const awayTeamId = teams.find(t => t.name === awayTeam)?.id

    if (!homeTeamId || !awayTeamId) {
      return {
        success: true,
        homeTeam,
        awayTeam,
        matches: [],
        summary: {
          totalMatches: 0,
          homeTeamWins: 0,
          awayTeamWins: 0,
          draws: 0,
          totalGoals: 0,
          avgGoalsPerMatch: '0.00',
          homeTeamGoals: 0,
          awayTeamGoals: 0
        }
      }
    }

    // Get all H2H matches between these two teams (either home or away)
    const { data: games, error: gamesError } = await db
      .from('games')
      .select(`
        id,
        season,
        round,
        date,
        home_goals,
        away_goals,
        home_team_id,
        away_team_id,
        home_possession_pct,
        away_possession_pct,
        home_shots,
        away_shots,
        home_corners,
        away_corners
      `)
      .not('home_goals', 'is', null)
      .or(`and(home_team_id.eq.${homeTeamId},away_team_id.eq.${awayTeamId}),and(home_team_id.eq.${awayTeamId},away_team_id.eq.${homeTeamId})`)
      .order('season', { ascending: false })
      .order('round', { ascending: false })
      .limit(limit)

    if (gamesError || !games) {
      throw new Error(gamesError?.message || 'Failed to fetch games')
    }

    const matches = games.map(row => {
      const isHomeTeamHome = row.home_team_id === homeTeamId
      const matchHomeTeam = isHomeTeamHome ? homeTeam : awayTeam
      const matchAwayTeam = isHomeTeamHome ? awayTeam : homeTeam
      
      return {
        id: row.id,
        season: row.season,
        round: row.round,
        date: row.date,
        homeTeam: matchHomeTeam,
        awayTeam: matchAwayTeam,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        // Determine result from perspective of the requested home team
        result: isHomeTeamHome
          ? (row.home_goals > row.away_goals ? 'W' : row.home_goals < row.away_goals ? 'L' : 'D')
          : (row.away_goals > row.home_goals ? 'W' : row.away_goals < row.home_goals ? 'L' : 'D'),
        stats: {
          possession: { home: row.home_possession_pct, away: row.away_possession_pct },
          shots: { home: row.home_shots, away: row.away_shots },
          corners: { home: row.home_corners, away: row.away_corners }
        }
      }
    })

    // Calculate summary stats
    const summary = {
      totalMatches: matches.length,
      homeTeamWins: matches.filter(m => m.result === 'W').length,
      awayTeamWins: matches.filter(m => m.result === 'L').length,
      draws: matches.filter(m => m.result === 'D').length,
      totalGoals: matches.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0),
      avgGoalsPerMatch: matches.length > 0 
        ? (matches.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0) / matches.length).toFixed(2)
        : '0.00',
      homeTeamGoals: matches.reduce((sum, m) => {
        return sum + (m.homeTeam === homeTeam ? m.homeGoals : m.awayGoals)
      }, 0),
      awayTeamGoals: matches.reduce((sum, m) => {
        return sum + (m.homeTeam === awayTeam ? m.homeGoals : m.awayGoals)
      }, 0)
    }

    return {
      success: true,
      homeTeam,
      awayTeam,
      matches,
      summary
    }

  } catch (error: any) {
    console.error('H2H fetch error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch H2H data'
    })
  }
})
