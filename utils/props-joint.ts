/**
 * A player-prop slip's joint win probability — the browser twin of
 * protero-ml/ml-basketball/props/correlation.py::joint_probability, so ticking legs
 * prices the slip without a round trip.
 *
 * Legs in different games are independent. Legs in one game join through a Gaussian
 * copula on box-score residual correlations (`correlation_<league>.json`, keyed
 * 'relation|statA|statB'); an UNDER leg's latent is the over's reflected. Fixed-seed
 * Monte Carlo, so the same slip always shows the same number.
 */

export interface JointLeg {
  eventId: string
  team_id: number | null
  player_key: string
  market: string
  side: 'over' | 'under'
  p: number
}

type CorrTable = Record<string, { rho: number, n: number }>

const N_SIMS = 40_000

function rhoOf(table: CorrTable, a: JointLeg, b: JointLeg): number {
  if (a.eventId !== b.eventId) return 0
  const same = a.player_key === b.player_key
  if (same && a.market === b.market) return 1
  const rel = same ? 'self' : a.team_id != null && a.team_id === b.team_id ? 'mate' : 'opp'
  const [s1, s2] = [a.market, b.market].sort()
  return table[`${rel}|${s1}|${s2}`]?.rho ?? 0
}

/** Acklam's inverse normal CDF (|error| < 1.2e-9). */
function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const lo = 0.02425
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - lo) return -normInv(1 - p)
  const q = p - 0.5
  const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/** Cholesky of a correlation matrix, nudged toward the identity until it factors. */
function cholesky(R: number[][]): number[][] {
  for (let shrink = 0; shrink < 1; shrink += 0.05) {
    const n = R.length
    const L = Array.from({ length: n }, () => new Array(n).fill(0))
    let ok = true
    for (let i = 0; i < n && ok; i++) {
      for (let j = 0; j <= i; j++) {
        let s = (i === j ? 1 : R[i][j] * (1 - shrink))
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
        if (i === j) {
          if (s <= 1e-9) { ok = false; break }
          L[i][i] = Math.sqrt(s)
        } else {
          L[i][j] = s / L[j][j]
        }
      }
    }
    if (ok) return L
  }
  return R.map((_, i) => R.map((__, j) => (i === j ? 1 : 0)))
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function jointProbability(legs: JointLeg[], table: CorrTable): number {
  if (!legs.length) return 0
  if (legs.length === 1) return legs[0].p
  const n = legs.length
  const sign = legs.map(l => (l.side === 'over' ? 1 : -1))
  const R = legs.map((a, i) => legs.map((b, j) => (i === j ? 1 : sign[i] * sign[j] * rhoOf(table, a, b))))
  // Independent across games and no same-game pair: the product is exact.
  if (R.every((row, i) => row.every((v, j) => i === j || v === 0))) return legs.reduce((p, l) => p * l.p, 1)
  const L = cholesky(R)
  const thresh = legs.map(l => normInv(1 - l.p))
  const rnd = mulberry32(7)
  let hits = 0
  const z = new Array(n)
  const e = new Array(n)
  for (let s = 0; s < N_SIMS; s++) {
    for (let i = 0; i < n; i += 2) {
      const u1 = Math.max(rnd(), 1e-12)
      const u2 = rnd()
      const r = Math.sqrt(-2 * Math.log(u1))
      e[i] = r * Math.cos(2 * Math.PI * u2)
      if (i + 1 < n) e[i + 1] = r * Math.sin(2 * Math.PI * u2)
    }
    let all = true
    for (let i = 0; i < n && all; i++) {
      let v = 0
      for (let k = 0; k <= i; k++) v += L[i][k] * e[k]
      z[i] = v
      if (v <= thresh[i]) all = false
    }
    if (all) hits++
  }
  return hits / N_SIMS
}
