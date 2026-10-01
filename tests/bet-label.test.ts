import { describe, expect, it } from 'vitest'
import { betLabelLong, betLabelShort, legParts, propParts } from '../utils/bet-label'

describe('betLabelShort', () => {
  it.each([
    ['HOME_WIN', 'Home'],
    ['AWAY_WIN', 'Away'],
    ['DRAW', 'Draw'],
    ['BTTS_YES', 'BTTS'],
    ['OVER_25', 'O 2.5'],
    ['UNDER_35', 'U 3.5'],
    ['OVER_ALT', 'Over (alt)'],
    ['SPREAD_HOME', 'Spread H'],
    ['SGP_HOME_ML_HOME_COVERS', 'SGP H+'],
    ['XGAME_PARLAY', 'X-Game Parlay'],
  ])('maps bet_type %s to %s', (bet_type, expected) => {
    expect(betLabelShort({ bet_type })).toBe(expected)
  })

  it('is case-insensitive on bet_type', () => {
    expect(betLabelShort({ bet_type: 'home_win' })).toBe('Home')
  })

  it.each([
    ['UNDER (Under 216.5)', 'U 216.5'],
    ['OVER (Over 1.5)', 'O 1.5'],
    ['OVER (Over 220.5 (shift +5))', 'O 220.5'],
    ['UNDER (UNDER 216.5) + OVER (OVER 221.5)', 'U 216.5 + O 221.5'],
    ['Over 2.5', 'O 2.5'],
    ['Home Win', 'Home'],
    ['Lakers +5.5', 'Lakers +5.5'],
  ])('parses notes %j to %j', (notes, expected) => {
    expect(betLabelShort({ bet_type: 'CUSTOM', notes })).toBe(expected)
  })

  it('does not split a "(shift +5)" qualifier into a second leg', () => {
    expect(betLabelShort({ bet_type: 'CUSTOM', notes: 'OVER (Over 220.5 (shift +5))' })).not.toContain('5))')
  })

  it('does not split a handicap sign into two legs', () => {
    expect(betLabelShort({ bet_type: 'CUSTOM', notes: 'Lakers +5.5' })).not.toContain(' + ')
  })

  it('falls back to the raw bet_type, and is empty for nothing', () => {
    expect(betLabelShort({ bet_type: 'MYSTERY' })).toBe('MYSTERY')
    expect(betLabelShort({})).toBe('')
  })

  it('labels a prop from its bet_type and its notes', () => {
    expect(betLabelShort({ bet_type: 'PROP_PTS_OVER', notes: { player: 'A. Player', line: 21.5 } })).toBe('O 21.5 pts')
    expect(betLabelShort({ bet_type: 'PROP_REB_UNDER', notes: '{"line":9.5}' })).toBe('U 9.5 reb')
  })
})

describe('betLabelLong', () => {
  it('names the team on a moneyline and a spread when it knows them', () => {
    expect(betLabelLong({ bet_type: 'HOME_WIN', home_name: 'Arsenal' })).toBe('Arsenal to win')
    expect(betLabelLong({ bet_type: 'AWAY_WIN', away_name: 'Chelsea' })).toBe('Chelsea to win')
    expect(betLabelLong({ bet_type: 'SPREAD_HOME', home_name: 'Arsenal' })).toBe('Arsenal covers')
    expect(betLabelLong({ bet_type: 'SPREAD_AWAY', away_name: 'Chelsea' })).toBe('Chelsea covers')
  })

  it('uses the long map without a team', () => {
    expect(betLabelLong({ bet_type: 'HOME_WIN' })).toBe('Home Win')
    expect(betLabelLong({ bet_type: 'OVER_25' })).toBe('Over 2.5 Goals')
    expect(betLabelLong({ bet_type: 'DC_1X' })).toBe('Double chance 1X')
  })

  it('prefixes a prop with its player', () => {
    expect(betLabelLong({ bet_type: 'PROP_PTS_OVER', notes: { player: 'A. Player', line: 21.5 } })).toBe(
      'A. Player Over 21.5 pts',
    )
  })

  it('is empty for nothing', () => {
    expect(betLabelLong({})).toBe('')
  })
})

describe('propParts', () => {
  it('splits a prop into player and selection', () => {
    expect(propParts({ bet_type: 'PROP_PRA_UNDER', notes: { player: 'B. Guard', line: 30.5 } })).toEqual({
      player: 'B. Guard',
      selection: 'Under 30.5 pra',
    })
  })

  it('lets notes override the market and direction in the bet_type', () => {
    expect(propParts({ bet_type: 'PROP_PTS_OVER', notes: { market: 'REBOUNDS', direction: 'under', line: 8.5 } })).toEqual({
      player: null,
      selection: 'Under 8.5 reb',
    })
  })

  it('returns null for a bet that is not a prop, and ignores unparseable notes', () => {
    expect(propParts({ bet_type: 'HOME_WIN' })).toBeNull()
    expect(propParts({ bet_type: 'HOME_WIN', notes: '{not json' })).toBeNull()
  })
})

describe('legParts', () => {
  it('is one selection for a prop', () => {
    expect(legParts({ bet_type: 'PROP_AST_OVER', notes: { player: 'C. Wing', line: 4.5 } })).toEqual([
      { player: 'C. Wing', selection: 'Over 4.5 ast' },
    ])
  })

  it('expands a bet builder from notes.raw_legs, parsed and unparsed', () => {
    const notes = {
      raw_legs: [
        { bb: { kind: 'player', player: 'D. Big', side: 'over', stat: 'REB', line: 7.5 } },
        { market_text: 'Total points', selection_text: 'Under 160.5' },
      ],
    }
    expect(legParts({ bet_type: 'XGAME_PARLAY', notes })).toEqual([
      { player: 'D. Big', selection: 'Over 7.5 reb' },
      { player: null, selection: 'Total points Under 160.5' },
    ])
  })

  it('reads a game total from bet_type + line', () => {
    expect(legParts({ bet_type: 'OVER_TOTAL', line: 221.5 })).toEqual([{ player: null, selection: 'Over 221.5' }])
    expect(legParts({ bet_type: 'UNDER_TOTAL', line: '9.5' })).toEqual([{ player: null, selection: 'Under 9.5' }])
  })

  it('falls back to the long label', () => {
    expect(legParts({ bet_type: 'HOME_WIN', home_name: 'Arsenal' })).toEqual([
      { player: null, selection: 'Arsenal to win' },
    ])
  })
})
