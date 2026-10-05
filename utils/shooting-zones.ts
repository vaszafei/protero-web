/**
 * How a shooting zone is judged and tinted. Shared by the player page's half court and the game
 * page's full court, so one zone is never coloured two ways.
 */
import { VIZ_STATUS, VIZ_BRAND_HOME } from '~/utils/viz'

export interface Zone {
  zone: string
  made: number
  att: number
  pct: number | null
  /** Rank within a cohort, when there is one (the player page). */
  percentile?: number | null
  /** The reference rate this zone is judged against. */
  cohortMedian?: number | null
  n?: number | null
}

export const ZONE_NAMES: Record<string, string> = {
  '2PT': 'Two-point field goals',
  '3PT': 'Three-point field goals',
  FT: 'Free throws',
}

/**
 * How far above or below the reference this zone is, on a −1…+1 scale.
 *
 * Two reference kinds. A percentile (the player page's position cohort) maps
 * straight off 50. A raw reference rate (the game page's opposing team) is
 * scaled by 10 percentage points, which is a large edge for a single game.
 * Returns null when there is nothing to compare against, and the zone then
 * renders neutral rather than picking a colour it has not earned.
 */
export function zoneDeviation(z: Zone | undefined): number | null {
  if (!z || !z.att) return null
  if (z.percentile != null) return (z.percentile - 50) / 50
  if (z.cohortMedian != null && z.pct != null) {
    return Math.max(-1, Math.min(1, (z.pct - z.cohortMedian) / 10))
  }
  return null
}

/**
 * Green above the reference, blue below. Blue rather than red for "below" on
 * purpose — a cold shooting zone is not an error, and red is reserved in this
 * app for the away side and for losses.
 */
export function zoneColor(z: Zone | undefined): string {
  const d = zoneDeviation(z)
  if (d == null) return 'var(--ink-soft)'
  if (d >= 0.2) return VIZ_STATUS.good
  if (d <= -0.2) return VIZ_BRAND_HOME
  return 'var(--ink-soft)'
}

/**
 * Intensity carries distance from the reference. Kept deliberately low — the
 * court lines and the numbers are the content; the wash is a background cue,
 * and above ~0.2 it swallows both.
 */
export function zoneOpacity(z: Zone | undefined): number {
  const d = zoneDeviation(z)
  if (d == null) return 0.035
  return 0.05 + Math.abs(d) * 0.13
}
