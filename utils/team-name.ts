/**
 * A club name with its generic tokens dropped, for tight labels.
 *
 * Taking the last word turned "Dubai Basketball" into "Basketball" and both
 * Tel Aviv clubs into "Aviv". Dropping only the tokens that name the sport or
 * the legal form keeps the part people actually say — "Dubai", "Barcelona" —
 * and leaves every other name whole for CSS to truncate.
 */
const GENERIC = new Set([
  'fc', 'cf', 'afc', 'sc', 'ac', 'as', 'ss', 'sv', 'cd', 'ud', 'rc', 'bc', 'kk', 'bk', 'sk',
  'basketball', 'basket', 'baloncesto', 'football', 'calcio',
])

export function displayTeamName(name: string | null | undefined): string {
  if (!name) return ''
  const words = name.trim().split(/\s+/)
  const core = words.filter((w) => !GENERIC.has(w.toLowerCase().replace(/\./g, '')))
  return core.length ? core.join(' ') : name
}
