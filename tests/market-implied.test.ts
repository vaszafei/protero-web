import { describe, expect, it } from 'vitest'
import { bookMargin, fitImpliedGoals } from '#logic/market-implied'

// Independent of the module under test: its own Poisson, summed far past the
// module's MAX_GOALS so truncation cannot be what the fit is recovering.
function boardFrom(lh: number, la: number): Record<string, number> {
  const N = 25
  const pmf = (l: number) => {
    const out = [Math.exp(-l)]
    for (let k = 1; k <= N; k++) out.push((out[k - 1] * l) / k)
    return out
  }
  const ph = pmf(lh)
  const pa = pmf(la)
  const b = { home_win: 0, draw: 0, away_win: 0, over_15: 0, over_25: 0, over_35: 0, btts: 0 }
  for (let h = 0; h <= N; h++) {
    for (let a = 0; a <= N; a++) {
      const p = ph[h] * pa[a]
      if (h > a) b.home_win += p
      else if (h === a) b.draw += p
      else b.away_win += p
      if (h + a > 1.5) b.over_15 += p
      if (h + a > 2.5) b.over_25 += p
      if (h + a > 3.5) b.over_35 += p
      if (h > 0 && a > 0) b.btts += p
    }
  }
  return b
}

describe('fitImpliedGoals', () => {
  it.each([
    [1.5, 1.1],
    [2.3, 0.7],
    [0.9, 1.8],
    [1.2, 1.2],
  ])('recovers λ_home=%f λ_away=%f from a known Poisson board', (lh, la) => {
    const fit = fitImpliedGoals(boardFrom(lh, la))
    expect(fit).not.toBeNull()
    expect(Math.abs(fit!.home_xg - lh)).toBeLessThanOrEqual(0.02)
    expect(Math.abs(fit!.away_xg - la)).toBeLessThanOrEqual(0.02)
    expect(fit!.rmse_pp).toBeLessThan(0.5)
  })

  it('returns a 6x6 grid carrying at least 0.98 of the mass', () => {
    const fit = fitImpliedGoals(boardFrom(1.4, 1.0))!
    expect(fit.grid).toHaveLength(6)
    for (const row of fit.grid) expect(row).toHaveLength(6)
    const mass = fit.grid.flat().reduce((s, p) => s + p, 0)
    expect(mass).toBeGreaterThanOrEqual(0.98)
    expect(mass).toBeLessThanOrEqual(1.0001)
  })

  it('returns null without the full 1X2 triple', () => {
    const board = boardFrom(1.4, 1.0)
    for (const drop of ['home_win', 'draw', 'away_win']) {
      const { [drop]: _gone, ...rest } = board
      expect(fitImpliedGoals(rest)).toBeNull()
    }
  })

  it('returns null with no total', () => {
    const { over_15: _a, over_25: _b, over_35: _c, ...rest } = boardFrom(1.4, 1.0)
    expect(fitImpliedGoals(rest)).toBeNull()
  })

  it('returns null on an empty board and ignores non-finite targets', () => {
    expect(fitImpliedGoals({})).toBeNull()
    expect(fitImpliedGoals({ ...boardFrom(1.4, 1.0), draw: Number.NaN })).toBeNull()
  })

  it('counts every target it fitted', () => {
    expect(fitImpliedGoals(boardFrom(1.4, 1.0))!.n_targets).toBe(7)
  })
})

describe('bookMargin', () => {
  it('is Σ(1/price) − 1 on a complete market', () => {
    expect(bookMargin([2.0, 4.0, 4.0])).toBe(0)
    expect(bookMargin([1.9, 1.9])).toBeCloseTo(2 / 1.9 - 1, 4)
  })

  it.each([
    ['a price of exactly 1', [1.0, 3.0, 4.0]],
    ['a price below 1', [0.9, 3.0, 4.0]],
    ['a null price', [2.0, null, 4.0]],
    ['no prices at all', []],
  ])('returns null on %s', (_label, prices) => {
    expect(bookMargin(prices as (number | null)[])).toBeNull()
  })

  it('halves a double-chance book (coverage=2)', () => {
    // 1X / X2 / 12 cover the outcome space twice: fair probs sum to 2.
    const fair = [0.75, 0.65, 0.6]
    const prices = fair.map((p) => 1 / (p * 1.05))
    expect(bookMargin(prices, 2)).toBeCloseTo(0.05, 3)
    expect(bookMargin(prices, 1)).toBeCloseTo(1.1, 3)
  })
})
