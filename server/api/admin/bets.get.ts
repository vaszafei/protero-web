import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  try {
    // Get all bets from active wallets (2=Football V18, 4=NBA V4 RL, 5=EuroLeague V4 RL)
    const { data: bets, error } = await supabase
      .from('bets')
      .select(`
        *,
        games (
          id,
          home_team_id,
          away_team_id,
          league_key,
          date,
          status,
          home_goals,
          away_goals,
          season,
          home_team:teams!home_team_id (
            name
          ),
          away_team:teams!away_team_id (
            name
          )
        ),
        wallets (
          id,
          name
        )
      `)
      .in('wallet_id', [2, 4, 5])

    if (error) throw error

    // Flatten the structure
    const flattenedBets = (bets || []).map((bet: any) => ({
      ...bet,
      game_id: bet.games?.id,
      home_team_id: bet.games?.home_team_id,
      away_team_id: bet.games?.away_team_id,
      home_name: bet.games?.home_team?.name,
      away_name: bet.games?.away_team?.name,
      league_key: bet.games?.league_key,
      date: bet.games?.date,
      status: bet.games?.status,
      home_goals: bet.games?.home_goals,
      away_goals: bet.games?.away_goals,
      season: bet.games?.season,
      wallet_name: bet.wallets?.name
    }))

    return {
      bets: flattenedBets
    }
  } catch (error: any) {
    console.error('Error fetching bets:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch bets'
    })
  }
})
