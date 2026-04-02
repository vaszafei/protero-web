import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Fetch Games from API-Football
 * 
 * Usage:
 * POST https://your-project.supabase.co/functions/v1/fetch-games
 * Body: { "league": "premier_league", "season": "2025" }
 * 
 * Can be triggered:
 * - Manually via API call
 * - Scheduled via cron job
 * - From your Nuxt frontend
 */

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get API-Football key
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY')
    if (!apiFootballKey) {
      throw new Error('API_FOOTBALL_KEY not configured')
    }
    
    // Parse request
    const { league, season } = await req.json()
    
    if (!league || !season) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing league or season parameter' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // League ID mapping (API-Football IDs)
    const leagueIds = {
      'premier_league': 39,
      'championship': 40,
      'la_liga': 140,
      'la_liga_2': 141,
      'bundesliga': 78,
      'bundesliga_2': 79,
      'serie_a': 135,
      'serie_b': 136,
      'ligue1': 61,
      'ligue_2': 62,
      'liga_portugal': 94,
      'greek_super_league': 197
    }
    
    const leagueId = leagueIds[league]
    if (!leagueId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown league: ${league}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Fetching games for ${league} (${leagueId}), season ${season}`)
    
    // Fetch from API-Football
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}`,
      {
        headers: {
          'X-RapidAPI-Key': apiFootballKey,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status}`)
    }
    
    const data = await response.json()
    const fixtures = data.response || []
    
    console.log(`Received ${fixtures.length} fixtures`)
    
    // First, ensure teams exist
    const teams = new Map()
    
    for (const fixture of fixtures) {
      const homeTeam = fixture.teams.home
      const awayTeam = fixture.teams.away
      
      if (!teams.has(homeTeam.id)) {
        teams.set(homeTeam.id, {
          id: homeTeam.id,
          name: homeTeam.name,
          league_key: league
        })
      }
      
      if (!teams.has(awayTeam.id)) {
        teams.set(awayTeam.id, {
          id: awayTeam.id,
          name: awayTeam.name,
          league_key: league
        })
      }
    }
    
    // Upsert teams
    const teamArray = Array.from(teams.values())
    const { error: teamsError } = await supabase
      .from('teams')
      .upsert(teamArray, { onConflict: 'id' })
    
    if (teamsError) {
      console.error('Teams upsert error:', teamsError)
    } else {
      console.log(`Upserted ${teamArray.length} teams`)
    }
    
    // Process fixtures
    const games = fixtures.map((fixture) => {
      const status = fixture.fixture.status.short
      let gameStatus = 'scheduled'
      
      if (status === 'FT' || status === 'AET' || status === 'PEN') {
        gameStatus = 'completed'
      } else if (status === 'PST' || status === 'CANC' || status === 'ABD') {
        gameStatus = 'postponed'
      }
      
      return {
        external_id: `api-football-${fixture.fixture.id}`,
        home_team_id: fixture.teams.home.id,
        away_team_id: fixture.teams.away.id,
        date: fixture.fixture.date,
        league_key: league,
        season: `${season}-${parseInt(season) + 1}`,
        round: fixture.league.round ? parseInt(fixture.league.round.replace(/\D/g, '')) : null,
        status: gameStatus,
        home_goals: fixture.goals.home,
        away_goals: fixture.goals.away,
        source: 'api-football'
      }
    })
    
    // Insert games (duplicates will be handled by trigger or on conflict)
    let inserted = 0
    let updated = 0
    let errors = 0
    
    for (const game of games) {
      const { error } = await supabase
        .from('games')
        .upsert(game, { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        })
      
      if (error) {
        // Check if it's a duplicate error from trigger
        if (error.message.includes('Duplicate game detected')) {
          updated++
        } else {
          console.error('Game insert error:', error)
          errors++
        }
      } else {
        inserted++
      }
    }
    
    console.log(`Results: ${inserted} inserted, ${updated} updated, ${errors} errors`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        league,
        season,
        total_fixtures: fixtures.length,
        inserted,
        updated,
        errors,
        teams_processed: teamArray.length
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
    
  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
