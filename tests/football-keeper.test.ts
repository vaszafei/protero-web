import { describe, expect, it } from 'vitest'
import { keeperOf } from '../utils/football-keeper'

const xi = (positions: string[]) => positions.map((position, i) => ({ player_name: `P${i + 1}`, position, jersey_number: i + 1 }))
const OUTFIELD = Array(10).fill('Unknown')

describe('keeperOf', () => {
  it('takes the flagged keeper in any of the feed spellings', () => {
    for (const flag of ['G', 'GK', 'Goalkeeper']) expect(keeperOf(xi([flag, ...OUTFIELD]))?.player_name).toBe('P1')
  })

  it('a keeper who captains is marked C, not G: the single C is the keeper when no one is flagged', () => {
    const side = xi([...OUTFIELD.slice(0, 4), 'C', ...OUTFIELD.slice(4)])
    expect(keeperOf(side)?.player_name).toBe('P5')
  })

  it('a flagged keeper wins over a captain', () => {
    const side = xi(['G', 'C', ...OUTFIELD.slice(1)])
    expect(keeperOf(side)?.player_name).toBe('P1')
  })

  it('guesses nobody when there is no flag and not exactly one captain', () => {
    expect(keeperOf(xi(Array(11).fill('Unknown')))).toBeNull()
    expect(keeperOf(xi(['C', 'C', ...OUTFIELD.slice(1)]))).toBeNull()
  })
})
