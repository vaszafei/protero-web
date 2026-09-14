import { getSupabase } from '~/server/utils/supabase'
import { fetchRawRecentFixtures, buildFormSide } from '~/server/utils/team-form'
import { fetchTwinRatings } from '~/server/utils/twin-ratings'

/**
 * Pre-match context for the two side rails.
 *
 * `TeamStatsRail` reads `home_shots` / `home_possession_pct` / `home_corners`,
 * which do not exist until a game is played — so on a scheduled fixture both
 * rails rendered "No stats recorded" and the page gave half its width to two
 * empty boxes. This is the same structural defect the basketball rails had, and
 * the fix is the same: show what the fixture actually carries beforehand.
 *
 * Two things exist before kick-off and both are already in the database:
 *
 *   FORM  the club's last six completed fixtures, in ANY competition. Restricting
 *         form to the league in question would drop cup ties and European nights,
 *         which are matches the club played — each entry carries its own
 *         competition so the tooltip can say where it came from.
 *   TWIN  `twin_team.attack` / `.defence`, the league-invariant ratings, with the
 *         standard deviation the twin fits alongside them. Both are on a log
 *         scale and BOTH ARE HIGHER-IS-BETTER: `defence` is log-rate suppression,
 *         not goals conceded (Arsenal 1.309 → 27 conceded; Tottenham 0.658 → 57).
 *
 * A rating means nothing without its peers, so the league's own mean and spread
 * ride along and the rail plots the club against them. `effective_games` is the
 * twin's own honesty column — a rating fitted on very little evidence is shown
 * with that fact attached rather than as a confident number.
 *
 * The form/twin queries themselves live in `server/utils/team-form.ts` and
 * `server/utils/twin-ratings.ts` — shared with `analysis.get.ts` so the two
 * endpoints can never disagree about a club's recent record or rating.
 */

export default defineEventHandler(async (event) => {
  const gameId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(gameId)) {
    throw createError({ statusCode: 400, message: 'Numeric game id required' })
  }

  const supabase = getSupabase()

  const gameRes = await supabase
    .from('games')
    .select('id, league_key, sport, status, date, home_team_id, away_team_id, home_name:teams!home_team_id(name), away_name:teams!away_team_id(name)')
    .eq('id', gameId)
    .maybeSingle()

  if (gameRes.error) {
    throw createError({ statusCode: 500, message: `games query failed: ${gameRes.error.message}` })
  }
  const game: any = gameRes.data
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' })

  const teamIds = [game.home_team_id, game.away_team_id].filter((t) => t != null)
  if (teamIds.length !== 2) {
    return { game_id: gameId, league_key: game.league_key, home: null, away: null, league: null }
  }

  const [rawFixtures, twin] = await Promise.all([
    fetchRawRecentFixtures(supabase, teamIds, game.date),
    fetchTwinRatings(supabase, teamIds, game.league_key),
  ])

  function sideFor(teamId: number, name: string) {
    const { form } = buildFormSide(teamId, name, rawFixtures, game.date)
    return { team_id: teamId, name, form, twin: twin.sideFor(teamId) }
  }

  return {
    game_id: gameId,
    league_key: game.league_key,
    kickoff: game.date,
    home: sideFor(Number(game.home_team_id), game.home_name?.name || ''),
    away: sideFor(Number(game.away_team_id), game.away_name?.name || ''),
    league: twin.league,
  }
})
