import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache, invalidateCache } from '~/server/utils/cache'
import { getOptionalUserId } from '~/server/utils/auth'
import {
  fetchActiveSubscribedWalletIds,
  modelVersionsForWallets,
  pickBestPrediction,
} from '~/server/utils/wallet-models'
import { currentSeason } from '~/utils/season'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const { round, season } = getQuery(event)
  const supabase = getSupabase()

  // Resolve who is asking — included in the cache key so two users with
  // different access don't share the same payload.
  //
  // The operator (admin) sees every model's predictions. Regular users see
  // only the wallets they are actively subscribed to; anonymous callers see
  // none. Before 2026-08-22 an admin with an empty subscription set (which is
  // every admin — the only subscription row is user 3, wallet 6, inactive)
  // fell through to an empty allowed set and every prediction was stripped.
  const userId = await getOptionalUserId(event)
  let isAdmin = false
  if (userId) {
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    isAdmin = userRow?.role === 'admin'
  }
  const subscribedWalletIds = userId && !isAdmin
    ? await fetchActiveSubscribedWalletIds(supabase, userId)
    : []
  const allowedModelVersions = isAdmin ? null : modelVersionsForWallets(subscribedWalletIds)
  const subKey = isAdmin
    ? 'admin'
    : subscribedWalletIds.length
      ? subscribedWalletIds.slice().sort((a, b) => a - b).join('-')
      : 'anon'

  // Cache key based on slug + season + subscription set
  const cacheKey = `league:${slug}:${round || 'all'}:${season || 'current'}:${subKey}`
  const cached = getCached(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Season can come from URL; fall back to current season
    const targetSeason = (season as string) || currentSeason(slug)

    // ── Round 1: fire league + games + standings in PARALLEL ──────────────
    let gamesQuery = supabase
      .from('games')
      .select(`
        id, league_key, season, round, date, status,
        home_team_id, away_team_id,
        home_goals, away_goals,
        home_xg, away_xg,
        home_possession_pct, away_possession_pct,
        odds_home, odds_draw, odds_away,
        odds_over_15, odds_under_15,
        odds_over_25, odds_under_25,
        odds_over_35, odds_under_35,
        predictions (
          id,
          prediction,
          confidence,
          model_version,
          over_15_prob,
          over_25_prob,
          over_35_prob,
          over_85_corners_prob,
          over_95_corners_prob,
          over_105_corners_prob,
          odds_over_25,
          odds_under_25,
          expected_value
        )
      `)
      .eq('league_key', slug)
      .eq('season', targetSeason)
      .order('date', { ascending: true })

    if (round && round !== 'all') {
      gamesQuery = gamesQuery.eq('round', round)
    }

    const [leagueResult, gamesResult, standingsResult] = await Promise.all([
      supabase.from('leagues').select('*').eq('key', slug).single(),
      gamesQuery,
      supabase
        .from('standings')
        .select('*, teams!inner(name, team_key)')
        .eq('league_key', slug)
        .eq('season', targetSeason)
        .order('pts', { ascending: false })
    ])

    const { data: league, error: leagueError } = leagueResult
    if (leagueError || !league) {
      throw createError({ statusCode: 404, message: 'League not found' })
    }

    // Fail loud, not empty. A games/standings query error here was silently
    // swallowed into `games: []` for at least the two months the invalid
    // `home_possession` column lived in the select — the route rendered zero
    // games while reporting success.
    if (gamesResult.error) throw gamesResult.error
    if (standingsResult.error) throw standingsResult.error

    const games = gamesResult.data || []
    const standings = standingsResult.data || []

    // ── Round 2: fetch teams by IDs extracted from games ──────────────────
    const uniqueTeamIds = new Set<number>()
    games.forEach((g: any) => {
      if (g.home_team_id) uniqueTeamIds.add(g.home_team_id)
      if (g.away_team_id) uniqueTeamIds.add(g.away_team_id)
    })

    let teamsMap = new Map<number, any>()
    if (uniqueTeamIds.size > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, team_key, league_key')
        .in('id', Array.from(uniqueTeamIds))
      if (teams) {
        teamsMap = new Map(teams.map((t: any) => [t.id, t]))
      }
    }

    // Map standings to include team info at top level
    const standingsWithTeams = standings.map((s: any) => ({
      ...s,
      team_name: s.teams?.name,
      team_key: s.teams?.team_key
    }))

    // `leagues.current_round` is stale — it last advanced a season ago and the
    // ML pipeline doesn't maintain it (2026-2027 games carry NULL rounds).
    // Derive the current round from the games we already fetched: the highest
    // completed round, else the lowest scheduled round, else null.
    const completedRoundNumbers = games
      .filter((g: any) => g.status === 'completed' && g.round != null)
      .map((g: any) => g.round)
    const scheduledRoundNumbers = games
      .filter((g: any) => g.status === 'scheduled' && g.round != null)
      .map((g: any) => g.round)
    const derivedRound = completedRoundNumbers.length
      ? Math.max(...completedRoundNumbers)
      : scheduledRoundNumbers.length
        ? Math.min(...scheduledRoundNumbers)
        : null
    
    // Enrich games with team names and flatten predictions
    const enrichedGames = games.map((game: any) => {
      const homeTeam = teamsMap.get(game.home_team_id)
      const awayTeam = teamsMap.get(game.away_team_id)

      // Pick the highest-priority prediction the user is allowed to see.
      // Admin: every model. Subscribed user: their wallets' families.
      // Anonymous / unsubscribed user: no AI prediction at all.
      const prediction = pickBestPrediction(game.predictions, allowedModelVersions)

      return {
        ...game,
        home_name: homeTeam?.name,
        home_key: homeTeam?.team_key,
        away_name: awayTeam?.name,
        away_key: awayTeam?.team_key,
        home_odds: game.odds_home,
        draw_odds: game.odds_draw,
        away_odds: game.odds_away,
        over_15_odds: game.odds_over_15,
        under_15_odds: game.odds_under_15,
        over_25_odds: game.odds_over_25,
        under_25_odds: game.odds_under_25,
        over_35_odds: game.odds_over_35,
        under_35_odds: game.odds_under_35,
        prediction_id: prediction?.id,
        prediction: prediction?.prediction,
        confidence: prediction?.confidence,
        model_version: prediction?.model_version,
        over_15_prob: prediction?.over_15_prob,
        over_25_prob: prediction?.over_25_prob,
        over_35_prob: prediction?.over_35_prob,
        over_85_corners_prob: prediction?.over_85_corners_prob,
        over_95_corners_prob: prediction?.over_95_corners_prob,
        over_105_corners_prob: prediction?.over_105_corners_prob,
        odds_over_25: prediction?.odds_over_25,
        odds_under_25: prediction?.odds_under_25,
        expected_value: prediction?.expected_value
      }
    })

    const response = {
      league,
      standings: standingsWithTeams,
      games: enrichedGames,
      round: round || derivedRound || null
    }

    // Cache 10 min for past seasons, 3 min for current
    const ttl = targetSeason < currentSeason(slug) ? 600 : 180
    setCache(cacheKey, response, ttl)

    return response
  } catch (error: any) {
    if (error.statusCode === 404) throw error
    
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch league: ' + error.message
    })
  }
})

// Helper function to invalidate cache when data changes
// Call this from update endpoints
export function invalidateLeagueCache(leagueKey: string) {
  return invalidateCache(`league:${leagueKey}`)
}
