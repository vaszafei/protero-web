import { getSupabase } from '~/server/utils/supabase'

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
 */

const FORM_N = 6

const toNum = (v: any): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

interface FormEntry {
  game_id: number
  date: string
  league_key: string
  opponent: string
  home: boolean
  gf: number
  ga: number
  result: 'W' | 'D' | 'L'
}

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

  const [formRes, twinRes, peerRes] = await Promise.all([
    // Both clubs' recent fixtures in one round trip. `FORM_N * 3` is a ceiling
    // per club before filtering, not a page — the slice to six happens below,
    // after the two clubs are separated.
    supabase
      .from('games')
      .select('id, date, league_key, status, home_team_id, away_team_id, home_goals, away_goals, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .eq('status', 'completed')
      .lt('date', game.date)
      .order('date', { ascending: false })
      .limit(FORM_N * 8),
    supabase
      .from('twin_team')
      .select('team_id, name, attack, defence, attack_var, defence_var, effective_games, league_changed, current_league, evidence_league, total_games')
      .in('team_id', teamIds),
    // The peer distribution the ratings are read against.
    supabase
      .from('twin_team')
      .select('attack, defence')
      .eq('current_league', game.league_key)
      .not('attack', 'is', null),
  ])

  for (const [name, res] of [['games', formRes], ['twin_team', twinRes], ['peers', peerRes]] as const) {
    if (res.error) {
      throw createError({ statusCode: 500, message: `${name} query failed: ${res.error.message}` })
    }
  }

  const twinById = new Map<number, any>()
  for (const t of (twinRes.data || []) as any[]) twinById.set(Number(t.team_id), t)

  /** Mean and SD of the competition's fitted ratings, for the rail's scale. */
  const peers = (peerRes.data || []) as any[]
  const stat = (key: 'attack' | 'defence') => {
    const xs = peers.map((p) => toNum(p[key])).filter((x): x is number => x != null)
    if (xs.length < 4) return null
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
    return { mean, sd, n: xs.length, min: Math.min(...xs), max: Math.max(...xs) }
  }

  function sideFor(teamId: number, name: string) {
    const form: FormEntry[] = []
    for (const g of (formRes.data || []) as any[]) {
      if (form.length >= FORM_N) break
      const isHome = Number(g.home_team_id) === teamId
      const isAway = Number(g.away_team_id) === teamId
      if (!isHome && !isAway) continue
      const hg = toNum(g.home_goals)
      const ag = toNum(g.away_goals)
      // A completed row with no score is not a result. Skipping it keeps a
      // scoreless scrape out of the form line instead of scoring it 0-0.
      if (hg == null || ag == null) continue
      const gf = isHome ? hg : ag
      const ga = isHome ? ag : hg
      form.push({
        game_id: Number(g.id),
        date: g.date,
        league_key: g.league_key,
        opponent: (isHome ? g.away_team : g.home_team)?.name || 'Unknown',
        home: isHome,
        gf,
        ga,
        result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
      })
    }

    const t = twinById.get(teamId) || null
    const attack = t ? toNum(t.attack) : null
    const defence = t ? toNum(t.defence) : null
    return {
      team_id: teamId,
      name,
      form,
      twin: t
        ? {
            attack,
            defence,
            attack_sd: toNum(t.attack_var) != null ? Math.sqrt(Math.max(toNum(t.attack_var)!, 0)) : null,
            defence_sd: toNum(t.defence_var) != null ? Math.sqrt(Math.max(toNum(t.defence_var)!, 0)) : null,
            effective_games: toNum(t.effective_games),
            total_games: toNum(t.total_games),
            league_changed: !!t.league_changed,
            current_league: t.current_league,
            evidence_league: t.evidence_league,
            // The twin writes a row with NULL ratings for a club it declined to
            // fit. That is a deliberate abstention, not missing data.
            fitted: attack != null && defence != null,
          }
        : null,
    }
  }

  return {
    game_id: gameId,
    league_key: game.league_key,
    kickoff: game.date,
    home: sideFor(Number(game.home_team_id), game.home_name?.name || ''),
    away: sideFor(Number(game.away_team_id), game.away_name?.name || ''),
    league: { attack: stat('attack'), defence: stat('defence') },
  }
})
