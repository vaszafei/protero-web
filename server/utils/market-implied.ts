/**
 * What the PRICE says about a football fixture — not what we say.
 *
 * Fits two independent Poisson goal rates (home, away) to the de-vigged market
 * probabilities in `line_scores` (Shin, CD #40), then reads the rest of the
 * match off that grid: the likeliest scorelines, each side's clean-sheet
 * chance, BTTS. This is the standard "market-implied xG" read (e.g.
 * opisthokonta.net, "Expected goals from over/under odds").
 *
 * Descriptive only. It never feeds a mask, a stake or a probability, and it is
 * NOT a price for a same-game combination: independent Poisson ignores the
 * low-score dependence Dixon-Coles corrects for, and the book's builder
 * margin is 10–14 % on the joint (root CLAUDE.md, 2026-09-18). The fit
 * residual is returned so the page can say how well two numbers explain the
 * whole board.
 */

const MAX_GOALS = 10
/** Rows/columns returned for the heatmap: 0–5 goals a side covers ~99 % of mass. */
const GRID_N = 6

/** The markets the fit reads, as `line_scores.market` keys. */
const FIT_MARKETS = ['home_win', 'draw', 'away_win', 'over_15', 'over_25', 'over_35', 'btts'] as const
type FitMarket = typeof FIT_MARKETS[number]

function poissonPmf(lambda: number): number[] {
  const out = new Array(MAX_GOALS + 1)
  let p = Math.exp(-lambda)
  out[0] = p
  for (let k = 1; k <= MAX_GOALS; k++) {
    p = (p * lambda) / k
    out[k] = p
  }
  return out
}

function gridProbs(lh: number, la: number, keepGrid = false): Record<FitMarket, number> & { grid: number[][] } {
  const ph = poissonPmf(lh)
  const pa = poissonPmf(la)
  const grid: number[][] = []
  let hw = 0, dr = 0, aw = 0, o15 = 0, o25 = 0, o35 = 0, btts = 0
  for (let h = 0; h <= MAX_GOALS; h++) {
    if (keepGrid) grid.push([])
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph[h] * pa[a]
      if (keepGrid) grid[h].push(p)
      if (h > a) hw += p
      else if (h === a) dr += p
      else aw += p
      const t = h + a
      if (t > 1.5) o15 += p
      if (t > 2.5) o25 += p
      if (t > 3.5) o35 += p
      if (h > 0 && a > 0) btts += p
    }
  }
  return { home_win: hw, draw: dr, away_win: aw, over_15: o15, over_25: o25, over_35: o35, btts, grid }
}

function loss(lh: number, la: number, targets: Partial<Record<FitMarket, number>>): number {
  const g = gridProbs(lh, la)
  let s = 0
  for (const k of FIT_MARKETS) {
    const t = targets[k]
    if (t == null) continue
    s += (g[k] - t) ** 2
  }
  return s
}

export interface ImpliedGoals {
  home_xg: number
  away_xg: number
  total_xg: number
  /** Root-mean-square gap between the fitted grid and the de-vigged board, in percentage points. */
  rmse_pp: number
  n_targets: number
  scorelines: { home: number; away: number; p: number }[]
  /** P(home = h, away = a) for h, a in 0..GRID_N-1 — the correct-score heatmap. */
  grid: number[][]
  home_clean_sheet: number
  away_clean_sheet: number
  btts: number
}

/**
 * Needs the 1X2 triple and at least one total — two rates from fewer than
 * three independent facts would be an under-determined guess, not a read.
 */
export function fitImpliedGoals(targets: Partial<Record<string, number>>): ImpliedGoals | null {
  const t: Partial<Record<FitMarket, number>> = {}
  for (const k of FIT_MARKETS) {
    const v = targets[k]
    if (typeof v === 'number' && Number.isFinite(v)) t[k] = v
  }
  const hasResult = t.home_win != null && t.away_win != null && t.draw != null
  const hasTotal = t.over_15 != null || t.over_25 != null || t.over_35 != null
  if (!hasResult || !hasTotal) return null

  // Coarse grid, then a fine pass around the best cell. Two parameters on a
  // smooth surface — no optimiser dependency needed.
  let best = { lh: 1.3, la: 1.1, l: Infinity }
  for (let lh = 0.05; lh <= 4.5; lh += 0.05) {
    for (let la = 0.05; la <= 4.5; la += 0.05) {
      const l = loss(lh, la, t)
      if (l < best.l) best = { lh, la, l }
    }
  }
  const c = { ...best }
  for (let lh = Math.max(0.01, c.lh - 0.05); lh <= c.lh + 0.05; lh += 0.0025) {
    for (let la = Math.max(0.01, c.la - 0.05); la <= c.la + 0.05; la += 0.0025) {
      const l = loss(lh, la, t)
      if (l < best.l) best = { lh, la, l }
    }
  }

  const g = gridProbs(best.lh, best.la, true)
  const scorelines: { home: number; away: number; p: number }[] = []
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) scorelines.push({ home: h, away: a, p: g.grid[h][a] })
  }
  scorelines.sort((x, y) => y.p - x.p)

  const nTargets = Object.keys(t).length
  const round = (v: number, d = 4) => Number(v.toFixed(d))
  return {
    home_xg: round(best.lh, 2),
    away_xg: round(best.la, 2),
    total_xg: round(best.lh + best.la, 2),
    rmse_pp: round(Math.sqrt(best.l / nTargets) * 100, 2),
    n_targets: nTargets,
    scorelines: scorelines.slice(0, 8).map((s) => ({ ...s, p: round(s.p) })),
    grid: g.grid.slice(0, GRID_N).map((row) => row.slice(0, GRID_N).map((p) => round(p))),
    // P(the other side scores 0).
    home_clean_sheet: round(g.grid.reduce((s, row) => s + row[0], 0)),
    away_clean_sheet: round(g.grid[0].reduce((s, p) => s + p, 0)),
    btts: round(g.btts),
  }
}

/**
 * The book's margin on a complete market: Σ(1/price) − 1. Double chance is
 * three overlapping selections that cover the outcome space twice, so its
 * book sums to 2 and is halved.
 */
export function bookMargin(prices: (number | null)[], coverage = 1): number | null {
  if (!prices.length || prices.some((p) => p == null || !(p > 1))) return null
  const s = prices.reduce((acc: number, p) => acc + 1 / (p as number), 0)
  return Number((s / coverage - 1).toFixed(4))
}
