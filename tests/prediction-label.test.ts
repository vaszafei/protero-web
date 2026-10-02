import { describe, expect, it } from 'vitest'
import { parsePrediction, type PredictionSide } from '#logic/prediction-label'
import codes from './fixtures/prediction-codes.json'

// Every DISTINCT predictions.prediction in the local DB (284 on 2026-10-01; 284
// on 2026-09-14 too). Regenerate with:
//   SELECT json_agg(prediction ORDER BY prediction)
//   FROM (SELECT DISTINCT prediction FROM predictions WHERE prediction IS NOT NULL) t
const ALL = codes as string[]

const side = (code: string) => parsePrediction(code).side

// Independent family detector — word-boundary tokens, not the parser's own
// branch order. A letter glued to OVER/UNDER is a team name or COVERS, not a total.
const bounded = (word: string) => new RegExp(`(?<![A-Z])${word}(?![A-Z])`)
function familiesIn(code: string): Set<PredictionSide> {
  const p = code.toUpperCase().replace(/\s+/g, '_')
  const out = new Set<PredictionSide>()
  if (/SPREAD|COVERS/.test(p)) out.add('spread')
  if (bounded('OVER').test(p)) out.add('over')
  if (bounded('UNDER').test(p)) out.add('under')
  if (bounded('DRAW').test(p) || p === 'X') out.add('draw')
  // "AWAY_WIN_(Oklahoma_City_Thunder_ML)" -> "AWAY_WIN": the team name is not a token.
  const head = p.replace(/_\(.*$/, '')
  if (['HOME_WIN', 'ML_HOME', 'HOME', '1'].includes(head)) out.add('home')
  if (['AWAY_WIN', 'ML_AWAY', 'AWAY', '2'].includes(head)) out.add('away')
  return out
}

// One selection, not "leg + leg". A '+' inside a parenthesis is a line or a shift.
const SINGLES = ALL.filter((c) => !/\+/.test(c.replace(/\([^)]*\)/g, '')))

describe('parsePrediction against every code in the DB', () => {
  it('has the fixture it claims to have', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(284)
    expect(new Set(ALL).size).toBe(ALL.length)
  })

  it('classifies every code — none falls through to "other"', () => {
    const unclassified = ALL.filter((c) => side(c) === null)
    expect(unclassified).toEqual([])
  })

  it('never returns a side the code does not name', () => {
    const wrong = ALL.filter((c) => {
      const fams = familiesIn(c)
      // A team-name ML ("Detroit Pistons ML + OVER ...") names a side with no
      // token; only the tokens that are present can be checked.
      return fams.size > 0 && !fams.has(side(c))
    })
    expect(wrong).toEqual([])
  })

  it('a single-selection code names exactly one family', () => {
    expect(SINGLES.filter((c) => familiesIn(c).size > 1)).toEqual([])
    expect(SINGLES.length).toBeGreaterThan(200)
  })

  it('every single-selection code parses to the family it names', () => {
    const mismatched = SINGLES.filter((c) => {
      const fams = [...familiesIn(c)]
      return fams.length === 1 && side(c) !== fams[0]
    })
    expect(mismatched).toEqual([])
  })

  it('combo codes (leg + leg) are the only codes naming two families, and are pinned', () => {
    const multi = ALL.filter((c) => familiesIn(c).size > 1)
    // Each is a parlay/SGP/alt-pair code. The parser picks one side by branch
    // order (spread > over > under), so "UNDER (Under 174.5) + OVER (Over 179.5)"
    // reads as Over — 17 of these 25 name both totals. Pinned so a new combo
    // shape is a visible change, not a silent one.
    expect(multi.every((c) => c.includes('+'))).toBe(true)
    expect(multi.length).toBe(25)
  })
})

describe('parsePrediction regressions', () => {
  it('HOME_COVERS is a spread, not an OVER', () => {
    expect(side('HOME_COVERS (Boston Celtics -15.5)')).toBe('spread')
    expect(side('SGP_HOME_ML+HOME_COVERS')).toBe('spread')
  })

  it('a team called Thunder is not an UNDER', () => {
    expect(side('AWAY_WIN (Oklahoma City Thunder ML)')).toBe('away')
    expect(side('HOME_COVERS (Oklahoma City Thunder -18.5)')).toBe('spread')
  })

  it('reads a parenthetical total and annotates the line', () => {
    const p = parsePrediction('OVER (Over 183.5 (shift +5))', { ouLine: 183.5 })
    expect(p.side).toBe('over')
    expect(p.market).toBe('total')
    expect(p.label).toBe('Over 183.5')
    expect(parsePrediction('UNDER_2.5').side).toBe('under')
  })

  it('normalises spaces the way it normalises underscores', () => {
    expect(side('Home Win')).toBe('home')
    expect(side('Away Win')).toBe('away')
    expect(side('Draw')).toBe('draw')
  })

  it('labels a moneyline side with the team when one is given', () => {
    expect(parsePrediction('HOME_WIN', { homeTeam: 'Arsenal' }).label).toBe('Arsenal')
    expect(parsePrediction('ML_AWAY', { awayTeam: 'Chelsea' }).label).toBe('Chelsea')
  })

  it('treats null/empty as unknown rather than guessing', () => {
    expect(parsePrediction(null)).toEqual({ side: null, market: 'other', label: '?', raw: null })
    expect(parsePrediction('')).toEqual({ side: null, market: 'other', label: '?', raw: null })
  })
})
