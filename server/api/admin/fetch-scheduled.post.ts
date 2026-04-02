import { getSupabase } from '~/server/utils/supabase'

// API-Football Configuration
const RAPIDAPI_KEY = "a2c93fa021mshda33fad170583f4p146558jsn8ae48020d8ea"
const RAPIDAPI_HOST = "api-football-v1.p.rapidapi.com"
const BASE_URL = "https://api-football-v1.p.rapidapi.com/v3"

const LEAGUES = {
  'premier_league': { league_id: 39, season: 2025 },
  'la_liga': { league_id: 140, season: 2025 },
  'la_liga_2': { league_id: 141, season: 2025 },
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

async function getOrCreateTeam(leagueKey: string, teamName: string): Promise<number | null> {
  const supabase = getSupabase()
  const teamKey = teamName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  
  // Try to find existing team
  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('league_key', leagueKey)
    .eq('team_key', teamKey)
    .single()
  
  if (existing) {
    return existing.id
  }
  
  // Create new team
  const { data: newTeam } = await supabase
    .from('teams')
    .insert({ league_key: leagueKey, name: teamName, team_key: teamKey })
    .select('id')
    .single()
  
  return newTeam?.id || null
}

async function gameExists(leagueKey: string, round: number, homeTeamId: number, awayTeamId: number): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('games')
    .select('id')
    .eq('league_key', leagueKey)
    .eq('round', round)
    .eq('home_team_id', homeTeamId)
    .eq('away_team_id', awayTeamId)
    .single()
  
  return !!data
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

    // API quota info (static - API-Football doesn't provide real-time status)
    const apiQuota = {
      requests: {
        current: 'Unknown',
        limit_day: 100
      },
      remaining: 'Check RapidAPI Dashboard',
      warning: 'Monitor your usage at: https://rapidapi.com/api-sports/api/api-football'
    }

    if (action === 'preview') {
      // Fetch scheduled fixtures for preview
      const league = LEAGUES[leagueKey as keyof typeof LEAGUES]
      if (!league) {
        throw createError({ statusCode: 400, message: 'Invalid league key' })
      }

      const fixturesData = await makeAPIRequest('/fixtures', {
        league: league.league_id,
        season: league.season,
        status: 'NS'  // Not Started
      })

      if (!fixturesData || !fixturesData.response) {
        return {
          success: false,
          message: 'Failed to fetch fixtures',
          apiQuota
        }
      }

      // Group fixtures by round
      const roundsMap: Record<number, any[]> = {}

      for (const fixture of fixturesData.response) {
        const roundNum = extractRoundNumber(fixture.league.round)
        if (!roundNum) continue

        const homeTeam = fixture.teams.home.name
        const awayTeam = fixture.teams.away.name
        const date = fixture.fixture.date

        // Check if already exists
        const homeTeamId = await getOrCreateTeam(leagueKey, homeTeam)
        const awayTeamId = await getOrCreateTeam(leagueKey, awayTeam)
        
        if (homeTeamId && awayTeamId) {
          const exists = await gameExists(leagueKey, roundNum, homeTeamId, awayTeamId)
          
          if (!exists) {
            if (!roundsMap[roundNum]) {
              roundsMap[roundNum] = []
            }
            roundsMap[roundNum].push({
              home: homeTeam,
              away: awayTeam,
              date,
              round: roundNum
            })
          }
        }
      }

      const rounds = Object.keys(roundsMap).map(round => ({
        round: parseInt(round),
        games: roundsMap[parseInt(round)]
      })).sort((a, b) => a.round - b.round)

      const totalNewGames = rounds.reduce((sum, r) => sum + r.games.length, 0)

      return {
        success: true,
        apiQuota,
        preview: {
          rounds,
          totalNewGames,
          leagueKey
        }
      }
    }

    if (action === 'save') {
      // Save the games to database
      const { games } = body
      
      if (!games || !Array.isArray(games)) {
        throw createError({ statusCode: 400, message: 'No games provided' })
      }

      const supabase = getSupabase()
      let addedCount = 0

      for (const game of games) {
        const homeTeamId = await getOrCreateTeam(leagueKey, game.home)
        const awayTeamId = await getOrCreateTeam(leagueKey, game.away)

        if (homeTeamId && awayTeamId) {
          const exists = await gameExists(leagueKey, game.round, homeTeamId, awayTeamId)
          
          if (!exists) {
            await supabase
              .from('games')
              .insert({
                league_key: leagueKey,
                round: game.round,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                date: game.date,
                status: 'scheduled',
                season: '2025-2026'
              })
            addedCount++
          }
        }
      }

      return {
        success: true,
        message: `Added ${addedCount} scheduled games`,
        addedCount,
        apiQuota
      }
    }

    throw createError({ statusCode: 400, message: 'Invalid action' })

  } catch (error: any) {
    console.error('Fetch scheduled error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch scheduled games'
    })
  }
})
