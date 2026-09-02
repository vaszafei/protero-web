import { getSupabase } from '~/server/utils/supabase'

/**
 * One player's season profile.
 *
 * This route used to fetch 500 whole `games` rows with their entire
 * `sport_stats` JSONB and scan them in JavaScript for a single player, then
 * return `{ games: [], averages: null }` for basically everyone — because it
 * defaulted the season to `currentSeason()`, which for NBA is a season with no
 * completed fixtures. All of that is now three Postgres functions
 * (`20260902100000_player_profile_rpc.sql`) reading the purpose-built indexed
 * tables: `lineups` for football, `basketball_player_games` for basketball.
 *
 * The `?league=` parameter is GONE. It defaulted to `nba` for every id, which
 * is why a football player id rendered as "NBA · 0 games" with three empty
 * charts. Sport is resolved from which corpus holds the player.
 */
export default defineEventHandler(async (event) => {
  const rawId = (getRouterParam(event, 'id') || '').trim()
  if (!rawId) {
    throw createError({ statusCode: 400, message: 'Player id required' })
  }

  const query = getQuery(event)
  const season = (query.season as string) || null
  const logLimit = Math.min(Math.max(parseInt(query.limit as string) || 40, 1), 100)

  const supabase = getSupabase()

  // 1 — Resolve. Accepts a FlashScore text id or a stats.nba.com numeric id.
  const { data: resolved, error: resolveError } = await supabase
    .rpc('player_resolve', { p_id: rawId })

  // Fail loud. A swallowed PostgREST error rendering as an empty page is a
  // documented failure mode in this project; do not fall through to `null`.
  if (resolveError) {
    throw createError({
      statusCode: 500,
      message: `player_resolve failed: ${resolveError.message}`,
    })
  }

  const row = Array.isArray(resolved) ? resolved[0] : resolved
  const playerId: string | null = row?.player_id ?? null
  const sport: string | null = row?.sport ?? null

  if (!playerId || !sport) {
    // A real "we do not hold this player" — distinct from an error, and the
    // page renders it as such rather than as an empty chart.
    return {
      found: false,
      requestedId: rawId,
      sport: null,
      player: null,
      axes: [],
      log: [],
    }
  }

  // 2 — Profile.
  const fn = sport === 'basketball'
    ? 'player_profile_basketball'
    : 'player_profile_football'

  const { data: profile, error: profileError } = await supabase.rpc(fn, {
    p_player_id: playerId,
    p_season: season,
    p_log_limit: logLimit,
  })

  if (profileError) {
    throw createError({
      statusCode: 500,
      message: `${fn} failed: ${profileError.message}`,
    })
  }

  return {
    found: true,
    requestedId: rawId,
    canonicalId: playerId,
    ...(profile || {}),
  }
})
