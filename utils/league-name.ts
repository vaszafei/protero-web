/**
 * A readable name for a league_key the league registry has no row for.
 *
 * The calendar and day panel fall back to the raw key when `leagues` has no
 * name — which is every coverage league and most cups (CD #39), so the grid
 * read `efl_cup`, `usa_mls`, `colombia_primera_a`. This is the fallback only:
 * a registry name always wins.
 */
const UPPER = new Set(['efl', 'fa', 'usa', 'mls', 'knvb', 'uefa', 'acb', 'nba', 'gbl', 'bcl', 'dfb', 'mx', 'j1', 'j2', 'k1'])
const LOWER = new Set(['de', 'del', 'da', 'do', 'la', 'di', 'of', 'the'])

export function prettyLeagueKey(key: string | null | undefined): string {
  if (!key) return ''
  return key
    .split('_')
    .map((w, i) => {
      if (UPPER.has(w)) return w.toUpperCase()
      if (i > 0 && LOWER.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}
