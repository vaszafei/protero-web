// Mapping from team_key → filename in /public/data/greek_basket_league/
const GBL_LOGOS: Record<string, string> = {
  greek_basket_league_aek_athens:    'AEK.png',
  greek_basket_league_aris:          'ARIS.png',
  greek_basket_league_as_karditsas:  'KARDITSA.png',
  greek_basket_league_iraklis:       'IRAKLIS.png',
  greek_basket_league_kolossos_rhodes: 'KOLOSSOS.png',
  greek_basket_league_maroussi:      'MAROUSSI.png',
  greek_basket_league_mykonos:       'Mykonos.png',
  greek_basket_league_panionios:     'PANIONIOS_BC.png',
  greek_basket_league_paok:          'PAOK.png',
  greek_basket_league_peristeri:     'BC_Peristeri.png',
  greek_basket_league_promitheas:    'PROMITHEAS.png',
  // EuroLeague teams (Olympiacos/Panathinaikos) that also play GBL
  euroleague_oly:                    'OLY.webp',
  euroleague_pan:                    'PANATHINAIKOS.webp',
}

/**
 * Build the static logo URL for a team based on team_key and league_key.
 * Files live under public/data/{nba,euroleague,acb,bcl,eurocup,greek_basket_league}/.
 *
 * Convention for ACB/BCL/EuroCup: `<team_key>.png` (downloaded by
 * protero-tools/bin/scrape-team-logos.js). Returns null when no file
 * is expected to exist so callers can render the text-circle fallback.
 */
export function getTeamLogoUrl(
  teamKey: string | null | undefined,
  leagueKey?: string
): string | null {
  if (!teamKey) return null
  if (leagueKey === 'euroleague' || teamKey.startsWith('euroleague_')) {
    // EuroLeague team but also playing GBL — check GBL map first
    if (leagueKey === 'greek_basket_league' && GBL_LOGOS[teamKey])
      return `/data/greek_basket_league/${GBL_LOGOS[teamKey]}`
    return `/data/euroleague/${teamKey}.webp`
  }
  if (leagueKey === 'nba') return `/data/nba/${teamKey}.svg`
  if (leagueKey === 'greek_basket_league' || teamKey.startsWith('greek_basket_league_')) {
    const file = GBL_LOGOS[teamKey]
    return file ? `/data/greek_basket_league/${file}` : null
  }
  if (leagueKey === 'acb' || teamKey.startsWith('spanish_acb_'))
    return `/data/acb/${teamKey}.png`
  if (leagueKey === 'bcl' || teamKey.startsWith('basketball_cl_'))
    return `/data/bcl/${teamKey}.png`
  if (leagueKey === 'eurocup' || teamKey.startsWith('eurocup_'))
    return `/data/eurocup/${teamKey}.png`
  return null
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
