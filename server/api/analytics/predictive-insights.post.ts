import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache } from '~/server/utils/cache'

/**
 * Predictive Analytics API Endpoint
 * Provides actionable insights for upcoming matches based on historical performance
 * 
 * POST /api/analytics/predictive-insights
 * Body: { leagueKey: string, season?: number }
 */

export default defineEventHandler(async (event) => {
  const body = await readBody(event) || {}
  const { leagueKey, season = 2025 } = body
  
  if (!leagueKey) {
    throw createError({ statusCode: 400, message: 'leagueKey is required' })
  }
  
  // Generate cache key
  const cacheKey = `predictive-insights:${leagueKey}:${season}`
  
  // Check cache first (5 minute TTL for predictions)
  const cached = getCached(cacheKey)
  if (cached) {
    return cached
  }
  
  const db = getSupabase()
  
  try {
    // Get upcoming matches (next 7 days)
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: upcomingMatches, error: upcomingError } = await db
      .from('games')
      .select('id, round, home_team_id, away_team_id, date')
      .eq('league_key', leagueKey)
      .eq('season', season)
      .is('home_goals', null)
      .gte('date', today)
      .lte('date', nextWeek)
      .order('date', { ascending: true })
      .limit(20)
    
    if (upcomingError) {
      throw new Error(upcomingError.message)
    }
    
    if (!upcomingMatches || upcomingMatches.length === 0) {
      return {
        upcomingMatches: [],
        insights: [],
        teamForm: {},
        patterns: {},
        message: 'No upcoming matches in the next 7 days'
      }
    }
    
    // Get team names separately
    const teamIdsSet = new Set<number>()
    upcomingMatches.forEach((m: any) => {
      teamIdsSet.add(m.home_team_id)
      teamIdsSet.add(m.away_team_id)
    })
    
    const teamIds = Array.from(teamIdsSet)
    const { data: teams, error: teamsError } = await db
      .from('teams')
      .select('id, name')
      .in('id', teamIds)
    
    if (teamsError) {
      throw new Error(teamsError.message)
    }
    
    const teamsMap: Record<number, string> = {}
    teams?.forEach((t: any) => {
      teamsMap[t.id] = t.name
    })
    
    // Add team names to upcoming matches
    upcomingMatches.forEach((m: any) => {
      m.home_team = teamsMap[m.home_team_id] || 'Unknown'
      m.away_team = teamsMap[m.away_team_id] || 'Unknown'
    })
    
    // Get all completed games for this season to analyze patterns
    const { data: completedGames, error: completedError } = await db
      .from('games')
      .select('*')
      .eq('league_key', leagueKey)
      .eq('season', season)
      .not('home_goals', 'is', null)
      .order('date', { ascending: false })
    
    if (completedError) {
      throw new Error(completedError.message)
    }
    
    // Add team names to completed games
    completedGames.forEach((g: any) => {
      g.home_team = teamsMap[g.home_team_id] || 'Unknown'
      g.away_team = teamsMap[g.away_team_id] || 'Unknown'
    })
    
    // Build team statistics for predictions
    const teamStats: Record<string, any> = {}
    
    completedGames.forEach((game: any) => {
      const homeTeam = game.home_team
      const awayTeam = game.away_team
      
      // Initialize team stats
      if (!teamStats[homeTeam]) {
        teamStats[homeTeam] = {
          name: homeTeam,
          homeGames: 0,
          awayGames: 0,
          homeWins: 0,
          homeDraws: 0,
          homeLosses: 0,
          awayWins: 0,
          awayDraws: 0,
          awayLosses: 0,
          homeGoalsFor: 0,
          homeGoalsAgainst: 0,
          awayGoalsFor: 0,
          awayGoalsAgainst: 0,
          recentForm: [], // last 5 games
          avgHomeShots: 0,
          avgAwayShots: 0,
          homeShotCount: 0,
          awayShotCount: 0
        }
      }
      if (!teamStats[awayTeam]) {
        teamStats[awayTeam] = {
          name: awayTeam,
          homeGames: 0,
          awayGames: 0,
          homeWins: 0,
          homeDraws: 0,
          homeLosses: 0,
          awayWins: 0,
          awayDraws: 0,
          awayLosses: 0,
          homeGoalsFor: 0,
          homeGoalsAgainst: 0,
          awayGoalsFor: 0,
          awayGoalsAgainst: 0,
          recentForm: [],
          avgHomeShots: 0,
          avgAwayShots: 0,
          homeShotCount: 0,
          awayShotCount: 0
        }
      }
      
      // Home team stats
      teamStats[homeTeam].homeGames++
      teamStats[homeTeam].homeGoalsFor += game.home_goals
      teamStats[homeTeam].homeGoalsAgainst += game.away_goals
      
      if (game.home_shots) {
        teamStats[homeTeam].avgHomeShots += game.home_shots
        teamStats[homeTeam].homeShotCount++
      }
      
      if (game.home_goals > game.away_goals) {
        teamStats[homeTeam].homeWins++
        teamStats[homeTeam].recentForm.unshift('W')
      } else if (game.home_goals === game.away_goals) {
        teamStats[homeTeam].homeDraws++
        teamStats[homeTeam].recentForm.unshift('D')
      } else {
        teamStats[homeTeam].homeLosses++
        teamStats[homeTeam].recentForm.unshift('L')
      }
      
      // Away team stats
      teamStats[awayTeam].awayGames++
      teamStats[awayTeam].awayGoalsFor += game.away_goals
      teamStats[awayTeam].awayGoalsAgainst += game.home_goals
      
      if (game.away_shots) {
        teamStats[awayTeam].avgAwayShots += game.away_shots
        teamStats[awayTeam].awayShotCount++
      }
      
      if (game.away_goals > game.home_goals) {
        teamStats[awayTeam].awayWins++
        teamStats[awayTeam].recentForm.unshift('W')
      } else if (game.away_goals === game.home_goals) {
        teamStats[awayTeam].awayDraws++
        teamStats[awayTeam].recentForm.unshift('D')
      } else {
        teamStats[awayTeam].awayLosses++
        teamStats[awayTeam].recentForm.unshift('L')
      }
    })
    
    // Calculate averages
    Object.values(teamStats).forEach((team: any) => {
      team.avgHomeShots = team.homeShotCount > 0 ? (team.avgHomeShots / team.homeShotCount).toFixed(1) : 0
      team.avgAwayShots = team.awayShotCount > 0 ? (team.avgAwayShots / team.awayShotCount).toFixed(1) : 0
      team.recentForm = team.recentForm.slice(0, 5)
      team.homeAvgGoalsFor = team.homeGames > 0 ? (team.homeGoalsFor / team.homeGames).toFixed(2) : 0
      team.homeAvgGoalsAgainst = team.homeGames > 0 ? (team.homeGoalsAgainst / team.homeGames).toFixed(2) : 0
      team.awayAvgGoalsFor = team.awayGames > 0 ? (team.awayGoalsFor / team.awayGames).toFixed(2) : 0
      team.awayAvgGoalsAgainst = team.awayGames > 0 ? (team.awayGoalsAgainst / team.awayGames).toFixed(2) : 0
      
      // Form score: W=3, D=1, L=0
      team.formScore = team.recentForm.reduce((sum: number, result: string) => {
        if (result === 'W') return sum + 3
        if (result === 'D') return sum + 1
        return sum
      }, 0)
    })
    
    // Generate insights for each upcoming match
    const matchInsights = upcomingMatches.map((match: any) => {
      const homeTeam = teamStats[match.home_team] || {}
      const awayTeam = teamStats[match.away_team] || {}
      
      const insights: string[] = []
      
      // Form comparison
      const formDiff = (homeTeam.formScore || 0) - (awayTeam.formScore || 0)
      if (formDiff >= 5) {
        insights.push(`🔥 ${match.home_team} in much better form (${homeTeam.formScore} vs ${awayTeam.formScore} points in last 5)`)
      } else if (formDiff <= -5) {
        insights.push(`🔥 ${match.away_team} in much better form (${awayTeam.formScore} vs ${homeTeam.formScore} points in last 5)`)
      }
      
      // Home/Away strength
      const homeWinRate = homeTeam.homeGames > 0 ? (homeTeam.homeWins / homeTeam.homeGames * 100) : 0
      const awayWinRate = awayTeam.awayGames > 0 ? (awayTeam.awayWins / awayTeam.awayGames * 100) : 0
      
      if (homeWinRate >= 60) {
        insights.push(`🏠 ${match.home_team} strong at home (${homeWinRate.toFixed(0)}% win rate)`)
      }
      if (awayWinRate >= 40) {
        insights.push(`✈️ ${match.away_team} dangerous away (${awayWinRate.toFixed(0)}% win rate)`)
      }
      
      // Goals prediction
      const expectedGoals = (parseFloat(homeTeam.homeAvgGoalsFor || 0) + parseFloat(awayTeam.awayAvgGoalsFor || 0))
      if (expectedGoals >= 3) {
        insights.push(`⚽ High-scoring game expected (${expectedGoals.toFixed(1)} avg goals)`)
      } else if (expectedGoals <= 1.5) {
        insights.push(`🔒 Low-scoring game likely (${expectedGoals.toFixed(1)} avg goals)`)
      }
      
      // BTTS likelihood
      const homeScoringRate = homeTeam.homeGames > 0 ? (homeTeam.homeGoalsFor / homeTeam.homeGames) : 0
      const awayScoringRate = awayTeam.awayGames > 0 ? (awayTeam.awayGoalsFor / awayTeam.awayGames) : 0
      
      if (homeScoringRate >= 1.2 && awayScoringRate >= 0.8) {
        insights.push(`🎯 Both teams likely to score`)
      }
      
      return {
        match: {
          id: match.id,
          home: match.home_team,
          away: match.away_team,
          date: match.date,
          round: match.round
        },
        homeTeamStats: {
          form: homeTeam.recentForm?.join('') || '',
          formScore: homeTeam.formScore || 0,
          homeWinRate: homeWinRate.toFixed(0),
          avgGoalsFor: homeTeam.homeAvgGoalsFor || 0,
          avgGoalsAgainst: homeTeam.homeAvgGoalsAgainst || 0,
          avgShots: homeTeam.avgHomeShots || 0
        },
        awayTeamStats: {
          form: awayTeam.recentForm?.join('') || '',
          formScore: awayTeam.formScore || 0,
          awayWinRate: awayWinRate.toFixed(0),
          avgGoalsFor: awayTeam.awayAvgGoalsFor || 0,
          avgGoalsAgainst: awayTeam.awayAvgGoalsAgainst || 0,
          avgShots: awayTeam.avgAwayShots || 0
        },
        prediction: {
          expectedGoals: expectedGoals.toFixed(1),
          over25Likelihood: expectedGoals >= 2.5 ? 'High' : expectedGoals >= 2 ? 'Medium' : 'Low',
          bttsLikelihood: (homeScoringRate >= 1 && awayScoringRate >= 0.8) ? 'High' : 'Medium',
          recommendation: formDiff >= 5 ? `Home Win (${match.home_team})` : 
                         formDiff <= -5 ? `Away Win (${match.away_team})` : 'Draw or Close Match'
        },
        insights
      }
    })
    
    // League patterns
    const totalGames = completedGames.length
    const over25Count = completedGames.filter((g: any) => (g.home_goals + g.away_goals) > 2.5).length
    const bttsCount = completedGames.filter((g: any) => g.home_goals > 0 && g.away_goals > 0).length
    const homeWins = completedGames.filter((g: any) => g.home_goals > g.away_goals).length
    
    const patterns = {
      over25Percentage: totalGames > 0 ? ((over25Count / totalGames) * 100).toFixed(1) : 0,
      bttsPercentage: totalGames > 0 ? ((bttsCount / totalGames) * 100).toFixed(1) : 0,
      homeWinPercentage: totalGames > 0 ? ((homeWins / totalGames) * 100).toFixed(1) : 0,
      avgGoalsPerGame: totalGames > 0 ? (completedGames.reduce((sum: number, g: any) => sum + g.home_goals + g.away_goals, 0) / totalGames).toFixed(2) : 0
    }
    
    const response = {
      upcomingMatches: matchInsights,
      patterns,
      teamStats: Object.values(teamStats).sort((a: any, b: any) => b.formScore - a.formScore).slice(0, 10),
      metadata: {
        leagueKey,
        season,
        upcomingGamesCount: upcomingMatches.length,
        analyzedGamesCount: completedGames.length,
        generatedAt: new Date().toISOString()
      }
    }
    
    // Cache for 5 minutes
    setCache(cacheKey, response, 300)
    
    return response
    
  } catch (error: any) {
    console.error('Error generating predictive insights:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to generate predictive insights: ' + (error?.message || 'Unknown error')
    })
  }
})
