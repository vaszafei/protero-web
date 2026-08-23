/**
 * Static logo resolution for teams and competitions.
 *
 * Files live under `/public/data/logos/` in a flat, league-independent layout
 * written by `protero-tools/bin/scrape-logos.js`:
 *
 *   logos/leagues/<league_key>.png   competition logo
 *   logos/teams/<team_key>.png       team logo
 *
 * Keying teams by `team_key` (globally unique) instead of the old per-league
 * folders is what lets a caller resolve a logo from a game row that carries
 * only team_key — no league lookup needed. Every file the scraper writes is a
 * PNG, so resolution is a single deterministic path; callers already render a
 * text-circle fallback via `@error` when a file is missing.
 */

/**
 * URL of a team's logo, or null when there is no team_key. League-independent:
 * a `team_key` is unique across the whole corpus, so a game's `home_key`
 * resolves without knowing which competition it belongs to.
 */
export function getTeamLogoUrl(teamKey: string | null | undefined): string | null {
  if (!teamKey) return null
  return `/data/logos/teams/${teamKey}.png`
}

/**
 * URL of a competition's logo, or null when there is no league_key.
 */
export function getLeagueLogoUrl(leagueKey: string | null | undefined): string | null {
  if (!leagueKey) return null
  return `/data/logos/leagues/${leagueKey}.png`
}

/**
 * 2-3 char abbreviation from a team name (fallback when logo missing).
 * "Los Angeles Lakers" → "LL", "Olympiacos" → "OLY"
 */
export function teamAbbreviation(name: string | null | undefined): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return name.slice(0, 3).toUpperCase()
  return words
    .slice(-2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
}
