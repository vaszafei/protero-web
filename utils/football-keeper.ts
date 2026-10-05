/**
 * Which starter is the goalkeeper. The feed names the keeper in `position` (`G` / `GK` /
 * `Goalkeeper`), but a keeper who captains his side is marked `C` instead, and every other outfield
 * player is `Unknown`. Measured on 2025-26 starting XIs of exactly eleven: of 140 with no keeper flag,
 * ALL 140 had exactly one `C`, 75 of them wearing shirt 1. No name carries a "(GK)" marker.
 *
 * So: a flagged keeper wins; otherwise the single `C` is the keeper; otherwise nobody is guessed.
 */
const KEEPER_POSITIONS = ['G', 'GK', 'Goalkeeper']

export const isFlaggedKeeper = (p: Record<string, any>): boolean =>
  KEEPER_POSITIONS.includes(String(p.position || '').trim())

export function keeperOf<T extends Record<string, any>>(starters: T[]): T | null {
  const flagged = starters.find(isFlaggedKeeper)
  if (flagged) return flagged
  const captains = starters.filter((p) => String(p.position || '').trim() === 'C')
  return captains.length === 1 ? captains[0] : null
}
