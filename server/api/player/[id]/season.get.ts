import { getSupabase } from '~/server/utils/supabase'
import { currentSeason } from '~/utils/season'

export default defineEventHandler(async (event) => {
  const playerId = getRouterParam(event, 'id') || ''
  const query = getQuery(event)
  const leagueKey = (query.league as string) || 'nba'
  const limit = Math.min(parseInt(query.limit as string) || 30, 50)

  if (!playerId) {
    throw createError({ statusCode: 400, message: 'Player ID required' })
  }

  const supabase = getSupabase()

  try {
    // Basketball player stats live in sport_stats JSONB, not lineups table.
    // Query completed games and search for the player by ID in home/away players array.
    const season = (query.season as string) || currentSeason(leagueKey)

    const { data: allGames, error } = await supabase
      .from('games')
      .select('id, date, home_team_id, away_team_id, home_goals, away_goals, sport_stats, home_team:teams!home_team_id(name, team_key), away_team:teams!away_team_id(name, team_key)')
      .eq('league_key', leagueKey)
      .eq('season', season)
      .not('sport_stats', 'is', null)
      .not('home_goals', 'is', null)
      .order('date', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Player season query error:', JSON.stringify(error))
      throw createError({ statusCode: 500, message: `Failed to fetch player season data: ${error.message}` })
    }

    const pid = parseInt(playerId)
    const games: any[] = []
    let playerName = ''

    for (const game of (allGames || [])) {
      const ss = game.sport_stats as any
      if (!ss) continue

      // Search both home and away player arrays
      for (const side of ['home', 'away'] as const) {
        const players = ss[side]?.players
        if (!Array.isArray(players)) continue

        const player = players.find((p: any) => p.id === pid || p.player_id === pid || String(p.id) === playerId || String(p.player_id) === playerId)
        if (!player) continue

        if (!playerName && player.name) playerName = player.name

        const isHome = side === 'home'
        const opponent = isHome
          ? (game.away_team as any)?.name || 'Unknown'
          : (game.home_team as any)?.name || 'Unknown'
        const scoreFor = isHome ? game.home_goals : game.away_goals
        const scoreAgainst = isHome ? game.away_goals : game.home_goals
        const result = scoreFor! > scoreAgainst! ? 'W' : scoreFor! < scoreAgainst! ? 'L' : 'D'

        games.push({
          game_id: game.id,
          game_date: game.date,
          side: side === 'home' ? 'home' : 'away',
          opponent,
          score_for: scoreFor,
          score_against: scoreAgainst,
          result,
          player_stats: {
            pts: player.pts ?? player.points ?? 0,
            reb: player.reb ?? player.rebounds ?? 0,
            ast: player.ast ?? player.assists ?? 0,
            stl: player.stl ?? player.steals ?? 0,
            blk: player.blk ?? player.blocks ?? 0,
            tov: player.tov ?? player.to ?? player.turnovers ?? 0,
            min: player.min ?? player.minutes ?? 0,
            fgm: player.fgm ?? player.field_goals_made ?? ((player.fg2m ?? 0) + (player.fg3m ?? 0)),
            fga: player.fga ?? player.field_goals_attempted ?? ((player.fg2a ?? 0) + (player.fg3a ?? 0)),
            fg3m: player.fg3m ?? player.three_pointers_made ?? 0,
            fg3a: player.fg3a ?? player.three_pointers_attempted ?? 0,
            ftm: player.ftm ?? player.free_throws_made ?? 0,
            fta: player.fta ?? player.free_throws_attempted ?? 0,
            pm: player.pm ?? player.plus_minus ?? 0,
          }
        })
        break // found in this game
      }

      if (games.length >= limit) break
    }

    if (games.length === 0) {
      return { games: [], averages: null, gameCount: 0 }
    }

    // Compute season averages
    const totals = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, pm: 0 }

    for (const g of games) {
      const s = g.player_stats
      totals.pts += s.pts
      totals.reb += s.reb
      totals.ast += s.ast
      totals.stl += s.stl
      totals.blk += s.blk
      totals.tov += s.tov
      totals.fgm += s.fgm
      totals.fga += s.fga
      totals.fg3m += s.fg3m
      totals.fg3a += s.fg3a
      totals.ftm += s.ftm
      totals.fta += s.fta
      totals.pm += s.pm

      const minVal = s.min
      if (typeof minVal === 'number') {
        totals.min += minVal
      } else if (typeof minVal === 'string' && minVal.includes(':')) {
        const parts = minVal.split(':')
        totals.min += parseInt(parts[0]) + parseInt(parts[1]) / 60
      }
    }

    const n = games.length
    const averages = {
      pts: +(totals.pts / n).toFixed(1),
      reb: +(totals.reb / n).toFixed(1),
      ast: +(totals.ast / n).toFixed(1),
      stl: +(totals.stl / n).toFixed(1),
      blk: +(totals.blk / n).toFixed(1),
      tov: +(totals.tov / n).toFixed(1),
      min: +(totals.min / n).toFixed(1),
      fgm: +(totals.fgm / n).toFixed(1),
      fga: +(totals.fga / n).toFixed(1),
      fg3m: +(totals.fg3m / n).toFixed(1),
      fg3a: +(totals.fg3a / n).toFixed(1),
      ftm: +(totals.ftm / n).toFixed(1),
      fta: +(totals.fta / n).toFixed(1),
      pm: +(totals.pm / n).toFixed(1),
      fgPct: totals.fga > 0 ? +((totals.fgm / totals.fga) * 100).toFixed(1) : 0,
      fg3Pct: totals.fg3a > 0 ? +((totals.fg3m / totals.fg3a) * 100).toFixed(1) : 0,
      ftPct: totals.fta > 0 ? +((totals.ftm / totals.fta) * 100).toFixed(1) : 0,
    }

    return {
      games,
      averages,
      gameCount: n,
      playerName,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('Player season error:', err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
