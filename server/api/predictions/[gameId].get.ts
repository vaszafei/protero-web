import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const gameId = parseInt(getRouterParam(event, 'gameId') || '0')
  
  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID is required'
    })
  }

  const supabase = getSupabase()

  try {
    // Fetch prediction with game details
    const { data: prediction, error } = await supabase
      .from('predictions')
      .select(`
        *,
        game:games!inner(
          id,
          date,
          status,
          home_goals,
          away_goals,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        )
      `)
      .eq('game_id', gameId)
      .maybeSingle()

    if (error || !prediction) {
      return {
        success: false,
        message: 'No prediction found for this game'
      }
    }

    // Parse model details if exists
    let modelDetails = null
    if (prediction.model_details) {
      try {
        modelDetails = typeof prediction.model_details === 'string' 
          ? JSON.parse(prediction.model_details as string)
          : prediction.model_details
      } catch (e) {
        console.error('Failed to parse model_details JSON:', e)
      }
    }

    return {
      success: true,
      game: {
        id: prediction.game.id,
        date: prediction.game.date,
        status: prediction.game.status,
        homeTeam: prediction.game.home_team.name,
        awayTeam: prediction.game.away_team.name,
        homeGoals: prediction.game.home_goals,
        awayGoals: prediction.game.away_goals
      },
      prediction: {
        outcome: prediction.prediction,
        confidence: prediction.confidence,
        homeWinProb: prediction.home_win_prob,
        drawProb: prediction.draw_prob,
        awayWinProb: prediction.away_win_prob,
        over25Probability: prediction.over25_prob,
        bttsProbability: prediction.btts_prob,
        expectedValue: prediction.expected_value,
        kellyPercentage: prediction.kelly_percentage,
        createdAt: prediction.created_at,
        modelVersion: prediction.model_version,
        details: modelDetails
      }
    }
  } catch (error) {
    console.error('Error fetching prediction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch prediction'
    })
  }
})
