/**
 * Chart palette for the dark operator console.
 *
 * These are not "colours that looked nice". Every set below was run through the
 * computable data-viz checks (OKLCH lightness band for a dark surface, chroma
 * floor, protan/deutan ΔE separation, normal-vision floor, WCAG contrast) against
 * this app's own chart surface `#1c1f27`. Re-run before changing any value:
 *
 *   node scripts/validate_palette.js "#3987e5,#d95926,#199e70" \
 *        --mode dark --surface "#1c1f27" --pairs all --balanced
 *
 * That script did not exist until 2026-09-02 — this comment documented a command
 * nobody could run, so "validated" was an assertion rather than a result. It
 * exists now and exits non-zero on a failure, so it can gate a commit.
 *
 * The app's existing W/D/L chips keep their Tailwind greens/ambers/reds — those
 * are status chips carrying a letter, so identity is never colour-alone. What is
 * here is for MARKS: bars, meters, sparklines, histogram columns.
 *
 * The CSS mirror of these values lives in `assets/css/tokens.css` (`--viz-*`,
 * `--brand-*`). This file stays the source for anything computed in JS.
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
 * Brand pair — the ΠΡΟΤΕΡΟ wordmark's own blue/red. Re-sampled from
 * `public/proteroLogo.png` 2026-09-02: the opaque pixels are 60.4% white,
 * 23.5% red #f02020, 8.7% blue #0040a0. Both raw inks are far too dark for a
 * dark surface (the blue scores 1.76:1 on `#1c1f27`, under even the 3:1
 * graphical-object floor), so each is stepped up in lightness at constant hue.
 *
 * The previous pair — #2d6fd4 / #fd2528 — passed every individual check and
 * still looked wrong, because its two members differ in OKLCH lightness by
 * 0.081. A categorical pair encodes identity, not rank: the lighter member
 * reads as the more important one, which is why the league Analysis "Home vs
 * Away" bar looked like an alert. The validator now has a `--balanced` check
 * for exactly this, and the old pair fails it.
 *
 *   node scripts/validate_palette.js "#4d8fff,#f8514f" --balanced
 *   → L 0.662 / 0.666 (ΔL 0.004), C 0.180 / 0.204, contrast 5.25:1 / 4.93:1,
 *     ΔE normal 0.340, protan 0.261, deutan 0.308 — all pass.
 *
 * Scoped to charts that are explicitly "the two sides of this app" (Home vs
 * Away, us vs the market). Not a general-purpose swap for VIZ_CAT: three
 * series still need the blue/orange/green set, which separates further.
 */
export const VIZ_BRAND_HOME = '#4d8fff'
export const VIZ_BRAND_AWAY = '#f8514f'

/** The raw wordmark inks. Legible on WHITE only — never a mark on a dark surface. */
export const VIZ_BRAND_HOME_PURE = '#0040a0'
export const VIZ_BRAND_AWAY_PURE = '#f02020'

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
