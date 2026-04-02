import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )
  
  try {
    // Fetch all parlays with their legs, bets, games, and team names
    const { data: parlays, error } = await supabase
      .from('parlays')
      .select(`
        *,
        parlay_legs (
          id,
          leg_number,
          bets (
            id,
            game_id,
            bet_type,
            odds,
            predicted_prob,
            status,
            games:game_id (
              id,
              date,
              league_key,
              status,
              home_goals,
              away_goals,
              home_team:home_team_id ( id, name ),
              away_team:away_team_id ( id, name )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching parlays:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch parlays'
      })
    }
    
    return {
      success: true,
      parlays: parlays || []
    }
  } catch (error: any) {
    console.error('Parlays API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch parlays'
    })
  }
})
