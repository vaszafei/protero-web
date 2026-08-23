/**
 * Chart palette for the dark operator console.
 *
 * These are not "colours that looked nice". Every set below was run through the
 * computable data-viz checks (OKLCH lightness band for a dark surface, chroma
 * floor, protan/deutan ΔE separation, normal-vision floor, WCAG contrast) against
 * this app's own chart surface `#1c1f27`. Re-run before changing any value:
 *
 *   node scripts/validate_palette.js "#3987e5,#d95926,#199e70" \
 *        --mode dark --surface "#1c1f27" --pairs all
 *
 * The app's existing W/D/L chips keep their Tailwind greens/ambers/reds — those
 * are status chips carrying a letter, so identity is never colour-alone. What is
 * here is for MARKS: bars, meters, sparklines, histogram columns.
 */

/**
 * Categorical — identity. Assign in fixed order, never cycled. Two series is the
 * common case on this page (home vs away); three is the ceiling before the marks
 * stop separating under simulated colour-vision deficiency.
 */
export const VIZ_CAT = ['#3987e5', '#d95926', '#199e70'] as const

/** Home / away, named so a template never has to remember the slot order. */
export const VIZ_HOME = VIZ_CAT[0]
export const VIZ_AWAY = VIZ_CAT[1]

/**
 * Sequential — magnitude. One hue, light → dark, validated as an ordinal ramp
 * (monotone lightness, ≥0.06 ΔL between steps, light end clear of the surface).
 */
export const VIZ_SEQ = ['#6da7ec', '#3987e5', '#256abf', '#184f95'] as const

/**
 * Status — state. Reserved: never reuse one of these as "series 4". Always shipped
 * beside a word ("won", "pending"), never as the only carrier of meaning.
 */
export const VIZ_STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

/** Recessive grid / axis ink — one step off the surface, never competing with data. */
export const VIZ_GRID = '#343a47'

/** The chart surface itself. Marks touching each other are separated by a 2px gap of it. */
export const VIZ_SURFACE = '#1c1f27'

/**
 * A magnitude → sequential step. `t` is 0…1; below-zero and above-one clamp.
 * Used by the goals histogram so a tall column reads darker, not louder.
 */
export function seqStep(t: number): string {
  const i = Math.min(VIZ_SEQ.length - 1, Math.max(0, Math.round(t * (VIZ_SEQ.length - 1))))
  return VIZ_SEQ[i]
}
