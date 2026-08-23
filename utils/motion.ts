/**
 * Motion system — single source of truth for the game/player/league pages.
 *
 * No third-party animation library. Everything below is consumed by `<style>`
 * blocks and the `useCountUp` composable. Every animation must ship with a
 * `@media (prefers-reduced-motion: reduce)` kill-switch at its call site.
 */

export const MOTION = {
  /** Entrances, bar growth — the "rise" easing. */
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** Tab indicator glide. */
  glide: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Exits. */
  exit: 'cubic-bezier(0.55, 0, 0.55, 0.2)',
  /** Durations, ms. */
  fast: 160,
  normal: 240,
  slow: 420,
} as const

/** A per-index staggered delay for `Reveal` (ms). */
export function stagger(index: number, step = 60): number {
  return Math.max(0, index * step)
}
