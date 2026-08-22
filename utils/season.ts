/**
 * Season resolution.
 *
 * Every fetcher in this app used to default to the literal string '2025-2026'
 * — 18 of them. That season ended, so on 2026-08-22 the dashboard fetched a
 * window containing 1,537 real fixtures and matched none of them, rendering
 * "No matches found · Add leagues to your profile"; league pages opened on
 * "Rd 38/38" of the prior season. Nothing was broken except the constant, and
 * it would have broken again every August.
 *
 * Two conventions live in `games.season`, confirmed against the table:
 *
 *   split-year   'YYYY-YYYY+1'  European football, NBA, EuroLeague and the
 *                               UEFA cups. Rolls over in July — the earliest
 *                               2026-2027 fixture is champions_league on
 *                               2026-07-07.
 *   calendar     'YYYY-YYYY'    Leagues played inside one calendar year:
 *                               argentina_primera, brazil_serie_a, plus the
 *                               world_cup / national_team_form pseudo-leagues.
 */

/** Leagues whose season is a single calendar year, written 'YYYY-YYYY'. */
export const CALENDAR_YEAR_LEAGUES = new Set([
  'argentina_primera',
  'brazil_serie_a',
  'world_cup',
  'national_team_form',
])

/**
 * The month a split-year season rolls over (1-indexed). July, because the UEFA
 * cups start their qualifiers then — a league-specific first fixture is always
 * later, so July is safe for all of them.
 */
const SPLIT_YEAR_ROLLOVER_MONTH = 7

/**
 * The season a league is currently playing.
 *
 * @param leagueKey  Omit for the app-wide default (split-year).
 * @param now        Injectable for tests.
 */
export function currentSeason(leagueKey?: string | null, now: Date = new Date()): string {
  const year = now.getFullYear()

  if (leagueKey && CALENDAR_YEAR_LEAGUES.has(leagueKey)) {
    return `${year}-${year}`
  }

  // Month is 0-indexed on Date; compare against the 1-indexed rollover.
  return now.getMonth() + 1 >= SPLIT_YEAR_ROLLOVER_MONTH
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`
}

/**
 * Both season strings that can carry current fixtures, for queries spanning
 * leagues of both conventions (the dashboard's date window, for one).
 */
export function currentSeasons(now: Date = new Date()): string[] {
  const year = now.getFullYear()
  return [currentSeason(undefined, now), `${year}-${year}`]
}

/** The season before `season`, in whichever convention it uses. */
export function previousSeason(season: string): string {
  const [a, b] = season.split('-').map(Number)
  if (!a || !b) return season
  return `${a - 1}-${b - 1}`
}

/**
 * The `count` most recent seasons, newest first — for history windows that want
 * "this season and the couple before it" without naming them.
 */
export function recentSeasons(count: number, leagueKey?: string | null, now: Date = new Date()): string[] {
  const out: string[] = []
  let s = currentSeason(leagueKey, now)
  for (let i = 0; i < count; i++) {
    out.push(s)
    s = previousSeason(s)
  }
  return out
}
