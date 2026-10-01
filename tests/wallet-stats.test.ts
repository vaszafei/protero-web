import { describe, expect, it } from 'vitest'
import { ALPHA, cohortOf, scoreFamily, type Scored } from '../utils/wallet-stats'

// wallets.archetype / wallets.lifecycle as they stand in the local DB, 2026-10-01.
const T = 'trader'
const MIRROR = 'external_tipster'
const WALLETS: Record<number, { archetype: string | null; lifecycle: string }> = {
  26: { archetype: 'value_volume', lifecycle: T },
  27: { archetype: 'banker_low_odds', lifecycle: T },
  28: { archetype: 'value_volume', lifecycle: T },
  29: { archetype: 'manual_overlay', lifecycle: T },
  30: { archetype: 'sniper', lifecycle: 'incubation' },
  31: { archetype: 'value_volume', lifecycle: T },
  32: { archetype: 'niche_volume', lifecycle: T },
  52: { archetype: null, lifecycle: 'legacy' },
  53: { archetype: null, lifecycle: 'incubation' },
  54: { archetype: 'user_mirror', lifecycle: 'user_mirror' },
  55: { archetype: null, lifecycle: 'incubation' },
  56: { archetype: null, lifecycle: 'incubation' },
  57: { archetype: null, lifecycle: 'incubation' },
  58: { archetype: 'manual_overlay', lifecycle: T },
  59: { archetype: 'props_auto', lifecycle: 'incubation' },
}
for (let id = 33; id <= 51; id++) WALLETS[id] = { archetype: MIRROR, lifecycle: T }

const cohort = (id: number) => cohortOf(WALLETS[id])

describe('cohortOf', () => {
  it('puts the trader personas in ours', () => {
    for (const id of [26, 27, 28, 29, 31, 32, 58]) expect(cohort(id), `W${id}`).toBe('ours')
  })

  it('puts every tipster mirror W33-W51 in mirror, even though their lifecycle is trader', () => {
    for (let id = 33; id <= 51; id++) expect(cohort(id), `W${id}`).toBe('mirror')
  })

  it('puts the incubating wallets in incubation', () => {
    for (const id of [30, 53, 55, 56, 57, 59]) expect(cohort(id), `W${id}`).toBe('incubation')
  })

  it('puts W54 in user_mirror', () => {
    expect(cohort(54)).toBe('user_mirror')
  })

  it('lets a mirror archetype win over any lifecycle', () => {
    expect(cohortOf({ archetype: 'external_tipster', lifecycle: 'incubation' })).toBe('mirror')
  })

  it('falls back to legacy for anything it does not recognise', () => {
    expect(cohort(52)).toBe('legacy')
    expect(cohortOf({})).toBe('legacy')
    expect(cohortOf({ archetype: null, lifecycle: null })).toBe('legacy')
  })
})

const family = (ps: (number | null)[]): Scored[] =>
  ps.map((p, i) => ({ wallet_id: i + 1, p_luck: p, n_wagers: p == null ? 5 : 100 }))

describe('scoreFamily', () => {
  it('sets the Bonferroni bar to alpha / k', () => {
    const r = scoreFamily(family([0.9, 0.8, 0.7, 0.6]))
    expect(r.k).toBe(4)
    expect(r.bonferroni).toBeCloseTo(ALPHA / 4, 12)
  })

  it('does not call p=0.010 at k=11 an EDGE', () => {
    const r = scoreFamily(family([0.01, ...new Array(10).fill(0.5)]))
    expect(r.k).toBe(11)
    expect(r.bonferroni).toBeCloseTo(0.05 / 11, 12)
    expect(r.verdictById.get(1)).not.toBe('EDGE')
    expect(r.verdictById.get(1)).toBe('multiplicity')
  })

  it('calls a p below the bar EDGE', () => {
    const r = scoreFamily(family([0.004, ...new Array(9).fill(0.5)]))
    expect(r.verdictById.get(1)).toBe('EDGE')
  })

  it('separates EDGE, BH-only, multiplicity and LUCK in one family', () => {
    // k=10: Bonferroni bar 0.005. BH rank 2 allows 2/10 * 0.05 = 0.010.
    const r = scoreFamily(family([0.004, 0.009, 0.03, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]))
    expect(r.verdictById.get(1)).toBe('EDGE')
    expect(r.verdictById.get(2)).toBe('BH')
    expect(r.verdictById.get(3)).toBe('multiplicity')
    expect(r.verdictById.get(4)).toBe('LUCK')
  })

  it('applies BH as a step-up: a later rank passing rescues the earlier one', () => {
    // k=2. p=0.03 fails its own rank bar (1/2 * 0.05 = 0.025), but p=0.04 meets
    // rank 2 (2/2 * 0.05 = 0.05), so both are rejected.
    const r = scoreFamily(family([0.03, 0.04]))
    expect(r.verdictById.get(1)).toBe('BH')
    expect(r.verdictById.get(2)).toBe('BH')
  })

  it('is independent of the order the rows arrive in', () => {
    const rows = family([0.5, 0.009, 0.9, 0.004, 0.03, 0.4, 0.6, 0.7, 0.8, 0.95])
    const a = scoreFamily(rows)
    const b = scoreFamily([...rows].reverse())
    for (const r of rows) expect(b.verdictById.get(r.wallet_id)).toBe(a.verdictById.get(r.wallet_id))
  })

  it('leaves a wallet with no p-value at n<10 and does not count it in k', () => {
    const r = scoreFamily(family([0.002, null, 0.5]))
    expect(r.k).toBe(2)
    expect(r.verdictById.get(2)).toBe('n<10')
  })

  it('reads a string p_luck from PostgREST numerics', () => {
    const r = scoreFamily([{ wallet_id: 1, p_luck: '0.0001' as unknown as number, n_wagers: 200 }])
    expect(r.verdictById.get(1)).toBe('EDGE')
  })

  it('returns n<10 for every row when nobody has a p-value', () => {
    const r = scoreFamily(family([null, null]))
    expect(r.k).toBe(0)
    expect([...r.verdictById.values()]).toEqual(['n<10', 'n<10'])
  })
})
