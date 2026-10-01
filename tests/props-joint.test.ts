import { describe, expect, it } from 'vitest'
import { jointProbability, type JointLeg } from '../utils/props-joint'

const leg = (over: Partial<JointLeg> = {}): JointLeg => ({
  eventId: 'g1',
  team_id: 1,
  player_key: 'a',
  market: 'pts',
  side: 'over',
  p: 0.5,
  ...over,
})

// P(both of two standard normals with correlation rho exceed 0) = 1/4 + asin(rho) / 2π.
const orthant = (rho: number) => 0.25 + Math.asin(rho) / (2 * Math.PI)

describe('jointProbability', () => {
  it('is 0 for an empty slip and the leg itself for a single leg', () => {
    expect(jointProbability([], {})).toBe(0)
    expect(jointProbability([leg({ p: 0.62 })], {})).toBe(0.62)
  })

  it('is the exact product when every leg is in a different game', () => {
    const table = { 'mate|pts|pts': { rho: 0.9, n: 500 } }
    const legs = [
      leg({ eventId: 'g1', player_key: 'a', p: 0.6 }),
      leg({ eventId: 'g2', player_key: 'b', p: 0.55 }),
      leg({ eventId: 'g3', player_key: 'c', p: 0.7 }),
    ]
    expect(jointProbability(legs, table)).toBe(0.6 * 0.55 * 0.7)
  })

  it('is the exact product within one game when the table has no entry for the pair', () => {
    const legs = [leg({ player_key: 'a', p: 0.6 }), leg({ player_key: 'b', p: 0.5 })]
    expect(jointProbability(legs, {})).toBe(0.3)
  })

  it('matches the bivariate-normal orthant probability for two correlated teammate overs', () => {
    const table = { 'mate|pts|pts': { rho: 0.3, n: 400 } }
    const legs = [leg({ player_key: 'a' }), leg({ player_key: 'b' })]
    expect(Math.abs(jointProbability(legs, table) - orthant(0.3))).toBeLessThan(0.01)
  })

  it('reflects an UNDER leg: a positive rho becomes a negative one', () => {
    const table = { 'mate|pts|pts': { rho: 0.3, n: 400 } }
    const legs = [leg({ player_key: 'a' }), leg({ player_key: 'b', side: 'under' })]
    expect(Math.abs(jointProbability(legs, table) - orthant(-0.3))).toBeLessThan(0.01)
  })

  it('keys opponents and teammates apart', () => {
    const table = { 'opp|pts|pts': { rho: -0.2, n: 400 } }
    const mates = [leg({ player_key: 'a' }), leg({ player_key: 'b', team_id: 1 })]
    const opps = [leg({ player_key: 'a' }), leg({ player_key: 'b', team_id: 2 })]
    expect(jointProbability(mates, table)).toBe(0.25)
    expect(Math.abs(jointProbability(opps, table) - orthant(-0.2))).toBeLessThan(0.01)
  })

  it('reads the table with the two markets sorted', () => {
    const table = { 'self|ast|pts': { rho: 0.26, n: 400 } }
    const forward = [leg({ market: 'pts' }), leg({ market: 'ast' })]
    const backward = [leg({ market: 'ast' }), leg({ market: 'pts' })]
    expect(jointProbability(forward, table)).toBe(jointProbability(backward, table))
    expect(jointProbability(forward, table)).toBeGreaterThan(0.25)
  })

  it('gives the same number every time (fixed seed)', () => {
    const table = { 'mate|pts|pts': { rho: 0.3, n: 400 } }
    const legs = [leg({ player_key: 'a', p: 0.58 }), leg({ player_key: 'b', p: 0.47 })]
    expect(jointProbability(legs, table)).toBe(jointProbability(legs, table))
  })

  it('stays inside [0, 1] and cannot beat its least likely leg', () => {
    const table = { 'mate|pts|pts': { rho: 0.8, n: 400 } }
    const legs = [leg({ player_key: 'a', p: 0.9 }), leg({ player_key: 'b', p: 0.3 })]
    const j = jointProbability(legs, table)
    expect(j).toBeGreaterThanOrEqual(0)
    expect(j).toBeLessThanOrEqual(0.3 + 0.01)
  })

  it('an over and an under on the same player and stat cannot both win', () => {
    const legs = [leg({ side: 'over' }), leg({ side: 'under' })]
    expect(jointProbability(legs, {})).toBeLessThan(0.05)
  })
})
