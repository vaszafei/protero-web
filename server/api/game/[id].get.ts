import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const gameId = parseInt(getRouterParam(event, 'id') || '0')
  
  if (!gameId) {
    throw createError({ statusCode: 400, message: 'Game ID required' })
  }

  const supabase = getSupabase()

  try {
    // Fetch game details with team names
    const { data: games, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id(id, name, league_key, team_key),
        away_team:teams!away_team_id(id, name, league_key, team_key)
      `)
      .eq('id', gameId)
      .single()

    if (gameError || !games) {
      throw createError({ statusCode: 404, message: 'Game not found' })
    }

    const game = games

    // Fetch lineups with player stats
    const { data: lineups } = await supabase
      .from('lineups')
      .select('*')
      .eq('game_id', gameId)
      .order('position', { ascending: true })

    // Separate lineups by team
    const homeLineup = lineups?.filter((p: any) => p.team_id === game.home_team_id) || []
    const awayLineup = lineups?.filter((p: any) => p.team_id === game.away_team_id) || []

    // Fetch prediction if exists
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('game_id', gameId)
      .maybeSingle()

    const prediction = predictions

    // Parse match events if they exist
    let matchEvents = null
    if (game.match_events) {
      try {
        matchEvents = JSON.parse(game.match_events as string)
      } catch (e) {
        console.error('Error parsing match events:', e)
      }
    }

    return {
      game: {
        id: game.id,
        sport: game.sport || 'football',
        league_key: game.league_key,
        league_name: game.league_name,
        league_flag: game.league_flag,
        round: game.round,
        date: game.date,
        status: game.status,
        home_team_id: game.home_team_id,
        home_name: game.home_name || game.home_team?.name || 'Home',
        home_key: game.home_team?.team_key || null,
        home_goals: game.home_goals,
        home_formation: game.home_formation,
        away_team_id: game.away_team_id,
        away_name: game.away_name || game.away_team?.name || 'Away',
        away_key: game.away_team?.team_key || null,
        away_goals: game.away_goals,
        away_formation: game.away_formation,
        // Stats
        home_possession: game.home_possession,
        away_possession: game.away_possession,
        home_shots: game.home_shots,
        away_shots: game.away_shots,
        home_shots_on_target: game.home_shots_on_target,
        away_shots_on_target: game.away_shots_on_target,
        home_corners: game.home_corners,
        away_corners: game.away_corners,
        home_fouls: game.home_fouls,
        away_fouls: game.away_fouls,
        home_yellow_cards: game.home_yellow_cards,
        away_yellow_cards: game.away_yellow_cards,
        home_red_cards: game.home_red_cards,
        away_red_cards: game.away_red_cards,
        // Additional stats
        home_offsides: game.home_offsides,
        away_offsides: game.away_offsides,
        home_xg: game.home_xg,
        away_xg: game.away_xg,
        home_passes_completed: game.home_passes_completed,
        home_passes_attempted: game.home_passes_attempted,
        away_passes_completed: game.away_passes_completed,
        away_passes_attempted: game.away_passes_attempted,
        home_saves: game.home_saves,
        away_saves: game.away_saves,
        home_big_chances: game.home_big_chances,
        away_big_chances: game.away_big_chances,
        // Odds
        odds_home: game.odds_home,
        odds_draw: game.odds_draw,
        odds_away: game.odds_away,
        odds_over: game.odds_over,
        odds_under: game.odds_under,
        // Referee
        referee: game.referee_name ? {
          name: game.referee_name,
          total_games: game.referee_games,
          avg_yellow_cards: game.referee_avg_yellow,
          avg_red_cards: game.referee_avg_red,
          avg_fouls: game.referee_avg_fouls
        } : null,
        // Match events
        match_events: matchEvents,
        // URL
        flashscore_url: game.flashscore_url,
        // Basketball-specific stats (JSONB)
        sport_stats: game.sport_stats || null
      },
      lineups: {
        home: homeLineup,
        away: awayLineup
      },
      prediction
    }

  } catch (error: any) {
    console.error('Error fetching game details:', error)
    throw createError({ 
      statusCode: 500, 
      message: error.message || 'Failed to fetch game details' 
    })
  }
})
