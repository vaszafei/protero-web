import { getSupabase } from '~/server/utils/supabase'
import { updateEloRatings } from '~/server/utils/elo'

// API-Football Configuration
const RAPIDAPI_KEY = "a2c93fa021mshda33fad170583f4p146558jsn8ae48020d8ea"
const RAPIDAPI_HOST = "api-football-v1.p.rapidapi.com"
const BASE_URL = "https://api-football-v1.p.rapidapi.com/v3"

const LEAGUES = {
  'premier_league': { league_id: 39, season: 2025 },
  'la_liga': { league_id: 140, season: 2025 },
  'serie_a': { league_id: 135, season: 2025 },
  'bundesliga': { league_id: 78, season: 2025 },
  'ligue_1': { league_id: 61, season: 2025 },
  'champions_league': { league_id: 2, season: 2024 }
}

interface APIFootballResponse {
  get: string
  parameters: any
  errors: any[]
  results: number
  paging: { current: number; total: number }
  response: any[]
}

async function makeAPIRequest(endpoint: string, params: any = {}): Promise<APIFootballResponse | null> {
  const headers = {
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': RAPIDAPI_KEY
  }
  
  const queryString = new URLSearchParams(params).toString()
  const url = `${BASE_URL}${endpoint}?${queryString}`
  
  try {
    const response = await fetch(url, { headers })
    const data = await response.json()
    
    if (data.errors && data.errors.length > 0) {
      console.error('API-Football errors:', data.errors)
      return null
    }
    
    return data
  } catch (error) {
    console.error('API request failed:', error)
    return null
  }
}

function extractRoundNumber(roundString: string): number | null {
  try {
    if (roundString.includes('-')) {
      const parts = roundString.split('-')
      return parseInt(parts[parts.length - 1].trim())
    }
    return parseInt(roundString.trim())
  } catch {
    return null
  }
}

async function findTeamByName(leagueKey: string, teamName: string): Promise<number | null> {
  const supabase = getSupabase()
  const teamKey = teamName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  
  const { data } = await supabase
    .from('teams')
    .select('id')
    .eq('league_key', leagueKey)
    .eq('team_key', teamKey)
    .single()
  
  return data?.id || null
}

export default defineEventHandler(async (event) => {
  try {
    const authCookie = getCookie(event, 'admin_auth')
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev && authCookie !== 'authenticated') {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { action, leagueKey } = body

    const apiQuota = {
      requests: {
        limit_day: 100
      },
      warning: 'Monitor your usage at: https://rapidapi.com/api-sports/api/api-football'
    }

    if (action === 'preview') {
      const league = LEAGUES[leagueKey as keyof typeof LEAGUES]
      if (!league) {
        throw createError({ statusCode: 400, message: 'Invalid league key' })
      }

      // Fetch finished fixtures
      const fixturesData = await makeAPIRequest('/fixtures', {
        league: league.league_id,
        season: league.season,
        status: 'FT'  // Full Time (finished games)
      })

      if (!fixturesData || !fixturesData.response) {
        return {
          success: false,
          message: 'Failed to fetch fixtures',
          apiQuota
        }
      }

      const supabase = getSupabase()
      const gamesToUpdate: any[] = []

      for (const fixture of fixturesData.response) {
        const roundNum = extractRoundNumber(fixture.league.round)
        if (!roundNum) continue

        const homeTeam = fixture.teams.home.name
        const awayTeam = fixture.teams.away.name
        const homeGoals = fixture.goals.home
        const awayGoals = fixture.goals.away
        const date = fixture.fixture.date

        const homeTeamId = await findTeamByName(leagueKey, homeTeam)
        const awayTeamId = await findTeamByName(leagueKey, awayTeam)
        
        if (homeTeamId && awayTeamId) {
          // Check if game exists and needs update
          const { data: game } = await supabase
            .from('games')
            .select('id, home_goals, away_goals, status')
            .eq('league_key', leagueKey)
            .eq('round', roundNum)
            .eq('home_team_id', homeTeamId)
            .eq('away_team_id', awayTeamId)
            .single()
          
          if (game) {
            const needsUpdate = 
              game.home_goals !== homeGoals || 
              game.away_goals !== awayGoals || 
              game.status !== 'completed'
            
            if (needsUpdate) {
              gamesToUpdate.push({
                id: game.id,
                round: roundNum,
                home: homeTeam,
                away: awayTeam,
                homeGoals,
                awayGoals,
                date,
                oldScore: `${game.home_goals ?? '?'}-${game.away_goals ?? '?'}`,
                newScore: `${homeGoals}-${awayGoals}`
              })
            }
          }
        }
      }

      // Group by round
      const roundsMap: Record<number, any[]> = {}
      for (const game of gamesToUpdate) {
        if (!roundsMap[game.round]) {
          roundsMap[game.round] = []
        }
        roundsMap[game.round].push(game)
      }

      const rounds = Object.keys(roundsMap).map(round => ({
        round: parseInt(round),
        games: roundsMap[parseInt(round)]
      })).sort((a, b) => a.round - b.round)

      return {
        success: true,
        apiQuota,
        preview: {
          rounds,
          totalUpdates: gamesToUpdate.length,
          leagueKey
        }
      }
    }

    if (action === 'save') {
      const { games } = body
      
      if (!games || !Array.isArray(games)) {
        throw createError({ statusCode: 400, message: 'No games provided' })
      }

      const supabase = getSupabase()
      let updatedCount = 0

      for (const game of games) {
        // Get team IDs before updating
        const { data: gameInfo } = await supabase
          .from('games')
          .select('home_team_id, away_team_id')
          .eq('id', game.id)
          .single()
        
        // Update game score
        await supabase
          .from('games')
          .update({
            home_goals: game.homeGoals,
            away_goals: game.awayGoals,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id)
        
        // Update Elo ratings for both teams
        if (gameInfo) {
          await updateEloRatings(
            Number(gameInfo.home_team_id),
            Number(gameInfo.away_team_id),
            Number(game.homeGoals),
            Number(game.awayGoals)
          )
        }
        
        updatedCount++
      }

      return {
        success: true,
        message: `Updated ${updatedCount} game scores`,
        updatedCount,
        apiQuota
      }
    }

    throw createError({ statusCode: 400, message: 'Invalid action' })

  } catch (error: any) {
    console.error('Fetch scores error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch scores'
    })
  }
})
