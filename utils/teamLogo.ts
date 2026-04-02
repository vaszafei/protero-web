/**
 * Build the static logo URL for a team based on team_key and league_key.
 * Files live under public/data/{nba,euroleague,teams}/.
 */
export function getTeamLogoUrl(
  teamKey: string | null | undefined,
  leagueKey?: string
): string | null {
  if (!teamKey) return null
  if (leagueKey === 'euroleague' || teamKey.startsWith('euroleague_'))
    return `/data/euroleague/${teamKey}.webp`
  if (leagueKey === 'nba') return `/data/nba/${teamKey}.svg`
  return `/data/teams/${teamKey}.png`
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
