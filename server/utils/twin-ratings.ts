import { toNum } from './team-form'

/**
 * Shared `twin_team` read — attack/defence ratings plus the league's own peer
 * mean/SD, so a rating is never rendered without the distribution it came
 * from. Extracted out of `preview.get.ts` so `analysis.get.ts` reads the same
 * ratings the pre-match rail already shows, never a second copy.
 */

export interface TwinPeerStat {
  mean: number
  sd: number
  n: number
  min: number
  max: number
}

export interface TwinSide {
  attack: number | null
  defence: number | null
  attack_sd: number | null
  defence_sd: number | null
  effective_games: number | null
  total_games: number | null
  league_changed: boolean
  current_league: string | null
  evidence_league: string | null
  /** The twin writes a row with NULL ratings for a club it declined to fit —
   * a deliberate abstention, not missing data. */
  fitted: boolean
}

export async function fetchTwinRatings(supabase: any, teamIds: number[], leagueKey: string) {
  const [twinRes, peerRes] = await Promise.all([
    supabase
      .from('twin_team')
      .select('team_id, name, attack, defence, attack_var, defence_var, effective_games, league_changed, current_league, evidence_league, total_games')
      .in('team_id', teamIds),
    // The peer distribution the ratings are read against.
    supabase
      .from('twin_team')
      .select('attack, defence')
      .eq('current_league', leagueKey)
      .not('attack', 'is', null),
  ])

  if (twinRes.error) throw createError({ statusCode: 500, message: `twin_team query failed: ${twinRes.error.message}` })
  if (peerRes.error) throw createError({ statusCode: 500, message: `twin_team peers query failed: ${peerRes.error.message}` })

  const twinById = new Map<number, any>()
  for (const t of (twinRes.data || []) as any[]) twinById.set(Number(t.team_id), t)

  const peers = (peerRes.data || []) as any[]
  const stat = (key: 'attack' | 'defence'): TwinPeerStat | null => {
    const xs = peers.map((p) => toNum(p[key])).filter((x): x is number => x != null)
    if (xs.length < 4) return null
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
    return { mean, sd, n: xs.length, min: Math.min(...xs), max: Math.max(...xs) }
  }

  function sideFor(teamId: number): TwinSide | null {
    const t = twinById.get(teamId)
    if (!t) return null
    const attack = toNum(t.attack)
    const defence = toNum(t.defence)
    return {
      attack,
      defence,
      attack_sd: toNum(t.attack_var) != null ? Math.sqrt(Math.max(toNum(t.attack_var)!, 0)) : null,
      defence_sd: toNum(t.defence_var) != null ? Math.sqrt(Math.max(toNum(t.defence_var)!, 0)) : null,
      effective_games: toNum(t.effective_games),
      total_games: toNum(t.total_games),
      league_changed: !!t.league_changed,
      current_league: t.current_league,
      evidence_league: t.evidence_league,
      fitted: attack != null && defence != null,
    }
  }

  return {
    league: { attack: stat('attack'), defence: stat('defence') },
    sideFor,
  }
}
