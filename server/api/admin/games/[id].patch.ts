import { getSupabase } from '~/server/utils/supabase'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Operator-only surface: this runs on the service-role client, which bypasses RLS.
  await requireAdmin(event)

  // Check authentication (allow if cookie exists or in development)
  const authCookie = getCookie(event, 'admin_auth')
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev && authCookie !== 'authenticated') {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const gameId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const supabase = getSupabase()
  
  try {
    // Get game details before update
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    
    if (fetchError || !game) {
      throw createError({ statusCode: 404, message: 'Game not found' })
    }
    
    console.log(`📝 Updating game ${gameId}`)
    console.log(`📦 Request body:`, body)
    
    const oldHomeGoals = game.home_goals
    const oldAwayGoals = game.away_goals
    
    // Extract all possible fields from body
    const {
      home_goals, away_goals, status, flashscore_url,
      // Tier 1: Essential Statistics
      home_shots, away_shots,
      home_shots_on_target, away_shots_on_target,
      home_possession_pct, away_possession_pct,
      home_corners, away_corners,
      home_fouls, away_fouls,
      home_yellow_cards, away_yellow_cards,
      home_red_cards, away_red_cards,
      home_days_rest, away_days_rest,
      // Tier 2: Advanced Statistics
      home_xg, away_xg,
      home_passes_completed, home_passes_attempted,
      away_passes_completed, away_passes_attempted,
      home_offsides, away_offsides,
      // Tier 3: Expert Statistics
      home_saves, away_saves,
      home_aerials_won, home_aerials_total,
      away_aerials_won, away_aerials_total,
      home_big_chances, away_big_chances
    } = body
    
    // Check if this data was scraped (if any advanced stats are provided, mark as scraped)
    const isScraped = !!(home_shots || away_shots || home_possession_pct || body.home_odds || body.over_2_5)
    
    // Determine status: if both scores provided, mark as completed
    const gameStatus = (home_goals !== null && away_goals !== null) ? 'completed' : 'scheduled'
    
    // Build update object for Supabase
    const updateData: any = {}
    
    // Always update these if provided
    if (home_goals !== undefined) updateData.home_goals = home_goals
    if (away_goals !== undefined) updateData.away_goals = away_goals
    if (flashscore_url !== undefined) {
      console.log(`🔗 Setting flashscore_url: "${flashscore_url}"`)
      updateData.flashscore_url = flashscore_url
    }
    if (status !== undefined) updateData.status = status || gameStatus
    
    // Set scraped flag if applicable
    if (isScraped) updateData.is_scraped = true
    
    // Tier 1 stats
    if (home_shots !== undefined) updateData.home_shots = home_shots
    if (away_shots !== undefined) updateData.away_shots = away_shots
    if (home_shots_on_target !== undefined) updateData.home_shots_on_target = home_shots_on_target
    if (away_shots_on_target !== undefined) updateData.away_shots_on_target = away_shots_on_target
    if (home_possession_pct !== undefined) updateData.home_possession_pct = home_possession_pct
    if (away_possession_pct !== undefined) updateData.away_possession_pct = away_possession_pct
    if (home_corners !== undefined) updateData.home_corners = home_corners
    if (away_corners !== undefined) updateData.away_corners = away_corners
    if (home_fouls !== undefined) updateData.home_fouls = home_fouls
    if (away_fouls !== undefined) updateData.away_fouls = away_fouls
    if (home_yellow_cards !== undefined) updateData.home_yellow_cards = home_yellow_cards
    if (away_yellow_cards !== undefined) updateData.away_yellow_cards = away_yellow_cards
    if (home_red_cards !== undefined) updateData.home_red_cards = home_red_cards
    if (away_red_cards !== undefined) updateData.away_red_cards = away_red_cards
    if (home_days_rest !== undefined) updateData.home_days_rest = home_days_rest
    if (away_days_rest !== undefined) updateData.away_days_rest = away_days_rest
    
    // Tier 2 stats
    if (home_xg !== undefined) updateData.home_xg = home_xg
    if (away_xg !== undefined) updateData.away_xg = away_xg
    if (home_passes_completed !== undefined) updateData.home_passes_completed = home_passes_completed
    if (home_passes_attempted !== undefined) updateData.home_passes_attempted = home_passes_attempted
    if (away_passes_completed !== undefined) updateData.away_passes_completed = away_passes_completed
    if (away_passes_attempted !== undefined) updateData.away_passes_attempted = away_passes_attempted
    if (home_offsides !== undefined) updateData.home_offsides = home_offsides
    if (away_offsides !== undefined) updateData.away_offsides = away_offsides
    
    // Tier 3 stats
    if (home_saves !== undefined) updateData.home_saves = home_saves
    if (away_saves !== undefined) updateData.away_saves = away_saves
    if (home_aerials_won !== undefined) updateData.home_aerials_won = home_aerials_won
    if (home_aerials_total !== undefined) updateData.home_aerials_total = home_aerials_total
    if (away_aerials_won !== undefined) updateData.away_aerials_won = away_aerials_won
    if (away_aerials_total !== undefined) updateData.away_aerials_total = away_aerials_total
    if (home_big_chances !== undefined) updateData.home_big_chances = home_big_chances
    if (away_big_chances !== undefined) updateData.away_big_chances = away_big_chances
    
    updateData.updated_at = new Date().toISOString()
    
    console.log(`✏️  Update data to be saved:`, updateData)
    
    // Update game with all provided stats
    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
    
    if (updateError) {
      console.error(`❌ Supabase update error:`, updateError)
      throw updateError
    }
    
    console.log(`✅ Game ${gameId} updated successfully`)
    
    return {
      success: true,
      message: 'Game updated successfully'
    }
  } catch (error: any) {
    console.error('Game update error:', error)
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      message: 'Failed to update game: ' + error.message
    })
  }
})