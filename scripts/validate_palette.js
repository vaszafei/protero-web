#!/usr/bin/env node
/**
 * Palette validator for the dark operator console.
 *
 * `utils/viz.ts` has documented this command since the chart palette landed, but
 * the script itself never existed — so "re-run the validator before changing a
 * hex" was unenforceable. This is that script.
 *
 * It runs five computable checks against a named surface:
 *
 *   1. LIGHTNESS BAND   OKLCH L inside [lo, hi] for the mode. A mark darker than
 *                       the band disappears into a dark surface; lighter and it
 *                       glares.
 *   2. CHROMA FLOOR     OKLCH C >= floor. Below it a "colour" reads as grey and
 *                       stops carrying identity.
 *   3. CONTRAST         WCAG 2.1 contrast ratio vs the surface. >= 3.0 is the
 *                       graphical-object threshold; >= 4.5 also clears text.
 *   4. CVD SEPARATION   Every pair simulated under protanopia and deuteranopia
 *                       (Viénot 1999 LMS projection), then compared in OKLab
 *                       ΔE. Two series a red-green dichromat cannot separate are
 *                       not two series.
 *   5. NORMAL-VISION    The same ΔE floor without simulation, so a pair that is
 *      SEPARATION       CVD-safe but near-identical to everyone still fails.
 *   6. LIGHTNESS        --balanced only. A CATEGORICAL set encodes identity, not
 *      BALANCE          rank, so its members must sit at the same OKLCH L or the
 *                       lighter one reads as more important. The pair this app
 *                       shipped until 2026-09-02 (#2d6fd4 / #fd2528) passed every
 *                       other check with ΔL = 0.081, which is exactly why its
 *                       "Home vs Away" bar read as an alert rather than a series.
 *                       Do NOT pass --balanced for a sequential ramp: monotone
 *                       lightness is the whole point there.
 *
 * Usage:
 *   node scripts/validate_palette.js "#3987e5,#d95926,#199e70" \
 *        --mode dark --surface "#1c1f27" --pairs all --balanced
 *
 *   --mode      dark | light          (default dark)
 *   --surface   hex                   (default #1c1f27, the chart surface)
 *   --pairs     all | none            (default all — check every 2-combination)
 *   --text                            also require 4.5:1, not just 3:1
 *   --balanced                        categorical set: require matched lightness
 *
 * Exit code 0 when every check passes, 1 otherwise, so it can gate a commit.
 */

// ── colour maths ────────────────────────────────────────────────────────────

const clamp01 = (x) => Math.min(1, Math.max(0, x))

function hexToRgb(hex) {
  const h = String(hex).trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a 6-digit hex colour: ${hex}`)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

/** sRGB 0-255 → linear-light 0-1. */
const toLinear = (c) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** linear-light 0-1 → sRGB 0-255. */
const toSrgb = (v) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * clamp01(v) ** (1 / 2.4) - 0.055
  return Math.round(clamp01(c) * 255)
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio. */
function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** linear sRGB → OKLab (Björn Ottosson). */
function linearRgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

function oklab(hex) {
  return linearRgbToOklab(hexToRgb(hex).map(toLinear))
}

function oklch(hex) {
  const [L, a, b] = oklab(hex)
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }
}

/** Perceptual distance in OKLab. Roughly: <0.02 identical, >0.10 clearly distinct. */
function deltaE(hexA, hexB) {
  const [l1, a1, b1] = oklab(hexA)
  const [l2, a2, b2] = oklab(hexB)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

// ── colour-vision-deficiency simulation ─────────────────────────────────────
// Viénot, Brettel & Mollon (1999): project onto the dichromat's reduced plane
// in LMS. Matrices are the standard Hunt-Pointer-Estevez pipeline.

const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
]
const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
]
const DICHROMAT = {
  // L cone missing — red appears dark.
  protanopia: [
    [0, 1.05118294, -0.05116099],
    [0, 1, 0],
    [0, 0, 1],
  ],
  // M cone missing — the common one, ~6% of men.
  deuteranopia: [
    [1, 0, 0],
    [0.9513092, 0, 0.04866992],
    [0, 0, 1],
  ],
}

const apply = (m, v) => m.map((row) => row.reduce((acc, k, i) => acc + k * v[i], 0))

function simulate(hex, kind) {
  const lin = hexToRgb(hex).map(toLinear)
  const rgb = apply(LMS_TO_RGB, apply(DICHROMAT[kind], apply(RGB_TO_LMS, lin)))
  return '#' + rgb.map(toSrgb).map((c) => c.toString(16).padStart(2, '0')).join('')
}

// ── thresholds ──────────────────────────────────────────────────────────────

const BANDS = {
  // A mark on a dark ground must be light enough to read but not blow out.
  dark: { L: [0.55, 0.85] },
  light: { L: [0.35, 0.70] },
}
const CHROMA_FLOOR = 0.05
const DELTA_E_FLOOR = 0.10
const CONTRAST_FLOOR = 3.0
const CONTRAST_TEXT = 4.5
/** Max OKLCH L spread across a categorical set before one member out-shouts the rest. */
const LIGHTNESS_SPREAD = 0.03

// ── runner ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const positional = []
  const opts = { mode: 'dark', surface: '#1c1f27', pairs: 'all', text: false, balanced: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--text') opts.text = true
    else if (a === '--balanced') opts.balanced = true
    else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i]
    else positional.push(a)
  }
  return { colours: positional.join(',').split(',').map((s) => s.trim()).filter(Boolean), opts }
}

const PASS = '  ok  '
const FAIL = ' FAIL '

function main() {
  const { colours, opts } = parseArgs(process.argv.slice(2))
  if (!colours.length) {
    console.error('usage: node scripts/validate_palette.js "#aabbcc,#ddeeff" [--mode dark] [--surface "#1c1f27"] [--pairs all|none] [--text]')
    process.exit(2)
  }

  const band = BANDS[opts.mode]
  if (!band) throw new Error(`unknown mode: ${opts.mode} (expected dark or light)`)
  const floor = opts.text ? CONTRAST_TEXT : CONTRAST_FLOOR

  let failures = 0
  const fail = () => { failures++; return FAIL }

  console.log(`\nsurface ${opts.surface}   mode ${opts.mode}   contrast floor ${floor.toFixed(1)}:1\n`)
  console.log('colour     L      C      hue      contrast   band   chroma  contrast')
  console.log('─'.repeat(72))

  for (const hex of colours) {
    const { L, C, h } = oklch(hex)
    const cr = contrastRatio(hex, opts.surface)
    const inBand = L >= band.L[0] && L <= band.L[1]
    const hasChroma = C >= CHROMA_FLOOR
    const readable = cr >= floor
    console.log(
      `${hex}  ${L.toFixed(3)}  ${C.toFixed(3)}  ${h.toFixed(1).padStart(5)}°   ` +
      `${cr.toFixed(2).padStart(5)}:1   ` +
      `${inBand ? PASS : fail()} ${hasChroma ? PASS : fail()} ${readable ? PASS : fail()}`
    )
  }

  if (opts.pairs !== 'none' && colours.length > 1) {
    console.log('\npair                    ΔE normal   ΔE protan   ΔE deutan   verdict')
    console.log('─'.repeat(72))
    for (let i = 0; i < colours.length; i++) {
      for (let j = i + 1; j < colours.length; j++) {
        const a = colours[i]
        const b = colours[j]
        const dn = deltaE(a, b)
        const dp = deltaE(simulate(a, 'protanopia'), simulate(b, 'protanopia'))
        const dd = deltaE(simulate(a, 'deuteranopia'), simulate(b, 'deuteranopia'))
        const ok = dn >= DELTA_E_FLOOR && dp >= DELTA_E_FLOOR && dd >= DELTA_E_FLOOR
        console.log(
          `${a} / ${b}    ${dn.toFixed(3)}       ${dp.toFixed(3)}       ${dd.toFixed(3)}    ${ok ? PASS : fail()}`
        )
      }
    }
  }

  if (opts.balanced && colours.length > 1) {
    const ls = colours.map((c) => oklch(c).L)
    const spread = Math.max(...ls) - Math.min(...ls)
    const ok = spread <= LIGHTNESS_SPREAD
    console.log('\nlightness balance (categorical set)')
    console.log('─'.repeat(72))
    console.log(
      `ΔL across ${colours.length} colours = ${spread.toFixed(3)}   ` +
      `(max ${LIGHTNESS_SPREAD})   ${ok ? PASS : fail()}`
    )
    if (!ok) {
      const sorted = colours.map((c, i) => ({ c, L: ls[i] })).sort((a, b) => b.L - a.L)
      console.log(`          lightest ${sorted[0].c} L=${sorted[0].L.toFixed(3)} will read as ranked above ` +
                  `${sorted[sorted.length - 1].c} L=${sorted[sorted.length - 1].L.toFixed(3)}`)
    }
  }

  console.log(
    `\n${failures === 0 ? 'ALL CHECKS PASS' : `${failures} CHECK${failures === 1 ? '' : 'S'} FAILED`}` +
    `   (L band ${band.L[0]}–${band.L[1]}, C ≥ ${CHROMA_FLOOR}, ΔE ≥ ${DELTA_E_FLOOR}, contrast ≥ ${floor}:1` +
    `${opts.balanced ? `, ΔL ≤ ${LIGHTNESS_SPREAD}` : ''})\n`
  )
  process.exit(failures === 0 ? 0 : 1)
}

main()
