import { describe, expect, it } from 'vitest'
import { formatMoney } from '../utils/formatters'
import { rangePnl, rangePnlPct, type BalancePoint } from '../utils/wallet-pnl'

const M = '−'

describe('formatMoney', () => {
  it('formats euros to 2 dp with grouping, symbol first', () => {
    expect(formatMoney(1181)).toBe('€1,181.00')
    expect(formatMoney(7.275)).toMatch(/^€7\.2[78]$/)
    expect(formatMoney('4.25')).toBe('€4.25')
  })

  it('puts the sign before the symbol and uses U+2212 for minus', () => {
    expect(formatMoney(-4.25)).toBe(`${M}€4.25`)
    expect(formatMoney(-4.25, { signed: true })).toBe(`${M}€4.25`)
    expect(formatMoney(7.28, { signed: true })).toBe('+€7.28')
    expect(formatMoney(7.28)).toBe('€7.28')
  })

  it('shows a ledger column consistently: −€4.25 beside +€7.28', () => {
    expect([-4.25, 7.28].map(v => formatMoney(v, { signed: true }))).toEqual([`${M}€4.25`, '+€7.28'])
  })

  it('never prints a signed zero, including a negative that rounds to zero', () => {
    expect(formatMoney(0, { signed: true })).toBe('€0.00')
    expect(formatMoney(-0.001, { signed: true })).toBe('€0.00')
    expect(formatMoney(0.004, { signed: true })).toBe('€0.00')
  })

  it('drops the cents with whole', () => {
    expect(formatMoney(1055.4, { whole: true })).toBe('€1,055')
    expect(formatMoney(-12.6, { signed: true, whole: true })).toBe(`${M}€13`)
  })

  it('renders null / blank / non-numeric as a dash, never €0.00', () => {
    for (const v of [null, undefined, '', 'abc', NaN]) expect(formatMoney(v as any)).toBe('—')
  })

  it('never renders a dollar sign', () => {
    expect(formatMoney(1234.5, { signed: true })).not.toContain('$')
  })
})

describe('rangePnl', () => {
  // W26's opening wager lost 7.45; the series starts after it.
  const seed = 1000
  const pts: BalancePoint[] = [
    { ts: '2026-07-01', balance: 992.55 },
    { ts: '2026-07-02', balance: 1010.0 },
    { ts: '2026-07-03', balance: 1047.24 },
  ]

  it('"All" measures from the seed, so the first wager is counted', () => {
    expect(rangePnl(pts, seed)).toBeCloseTo(47.24, 10)
    expect(rangePnl(pts, seed, null)).toBeCloseTo(47.24, 10)
  })

  it('measuring from points[0] would drop the first wager (the bug)', () => {
    const wrong = pts[pts.length - 1].balance - pts[0].balance
    expect(wrong).toBeCloseTo(54.69, 10)
    expect(rangePnl(pts, seed)).not.toBeCloseTo(wrong, 2)
  })

  it('a window measures from the balance just before it opens', () => {
    expect(rangePnl(pts.slice(1), seed, 992.55)).toBeCloseTo(54.69, 10)
    expect(rangePnl(pts.slice(2), seed, 1010.0)).toBeCloseTo(37.24, 10)
  })

  it('a single wager in the window is its own P&L', () => {
    expect(rangePnl([pts[0]], seed, 1000)).toBeCloseTo(-7.45, 10)
  })

  it('returns 0 for an empty window', () => {
    expect(rangePnl([], seed)).toBe(0)
    expect(rangePnlPct([], seed)).toBe(0)
  })

  it('the percentage is relative to the window start balance', () => {
    expect(rangePnlPct(pts, seed)).toBeCloseTo(4.724, 3)
    expect(rangePnlPct(pts.slice(2), seed, 1010)).toBeCloseTo((37.24 / 1010) * 100, 6)
  })
})
