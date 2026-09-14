/**
 * Shared "last N completed fixtures, any competition" logic — used by both
 * `preview.get.ts` (pre-match side rails) and `analysis.get.ts` (the unified
 * analysis record). One query, one builder, so the two endpoints can never
 * disagree about what a club's recent form was.
 */

const FORM_N = 6
/** Trailing window for the "congestion" reading — matches played in the last
 * N days before kickoff, any competition. */
const CONGESTION_WINDOW_DAYS = 10

export const toNum = (v: any): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export interface FormEntry {
  game_id: number
  date: string
  league_key: string
  opponent: string
  home: boolean
  gf: number
  ga: number
  result: 'W' | 'D' | 'L'
}

export interface FormSide {
  team_id: number
  name: string
  form: FormEntry[]
  last_match_date: string | null
  rest_days: number | null
  matches_last_10_days: number
}

/** Both clubs' recent fixtures in one round trip, ordered newest first. */
export async function fetchRawRecentFixtures(supabase: any, teamIds: number[], beforeDate: string) {
  const res = await supabase
    .from('games')
    .select('id, date, league_key, status, home_team_id, away_team_id, home_goals, away_goals, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
    .eq('status', 'completed')
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .limit(FORM_N * 8)

  if (res.error) throw createError({ statusCode: 500, message: `games (form) query failed: ${res.error.message}` })
  return (res.data || []) as any[]
}

/**
 * Builds one side's form line plus rest-days/congestion, from the raw fixture
 * list `fetchRawRecentFixtures` already pulled (no extra query per side).
 */
export function buildFormSide(teamId: number, name: string, rawFixtures: any[], beforeDate: string): FormSide {
  const form: FormEntry[] = []
  let lastMatchDate: string | null = null
  let matchesLast10Days = 0
  const windowStart = new Date(beforeDate).getTime() - CONGESTION_WINDOW_DAYS * 86400_000

  for (const g of rawFixtures) {
    const isHome = Number(g.home_team_id) === teamId
    const isAway = Number(g.away_team_id) === teamId
    if (!isHome && !isAway) continue

    if (lastMatchDate == null) lastMatchDate = g.date
    if (new Date(g.date).getTime() >= windowStart) matchesLast10Days++

    if (form.length >= FORM_N) continue
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

  const restDays = lastMatchDate
    ? Math.round((new Date(beforeDate).getTime() - new Date(lastMatchDate).getTime()) / 86400_000)
    : null

  return { team_id: teamId, name, form, last_match_date: lastMatchDate, rest_days: restDays, matches_last_10_days: matchesLast10Days }
}

export { FORM_N }
