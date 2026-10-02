import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { boxPlayer, boxScore, didNotPlay, fmtMadeAtt, hasBox, pctOf } from '../utils/basketball-box'

const DIR = new URL('./fixtures/basketball-box/', import.meta.url)
const load = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, DIR), 'utf8'))
const score = (g: any) => ({ home: g.home_goals, away: g.away_goals })
const box = (name: string) => { const g = load(name); return { g, b: boxScore(g.sport_stats, score(g)) } }

const NUMERIC = ['fgm', 'fga', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf'] as const

describe('Hapoel Tel Aviv 102-98 Real Madrid (the 0/0 defect, 2026-10-02)', () => {
  const { b } = box('hapoel-real-madrid')

  it('reads the EuroLeague `totals` schema', () => {
    expect(b.home.source).toBe('totals')
    expect(b.home.fg2).toEqual({ made: 23, att: 38 })
    expect(b.home.fg3).toEqual({ made: 12, att: 28 })
    expect(b.home.ft).toEqual({ made: 20, att: 26 })
  })

  it('has the rebound split the stat bars printed as 0', () => {
    expect(b.home).toMatchObject({ reb: 33, oreb: 8, dreb: 25, ast: 16, stl: 4, blk: 1, tov: 9 })
    expect(b.away).toMatchObject({ reb: 35, oreb: 11, dreb: 24, ast: 22, stl: 2, blk: 2, tov: 12 })
  })

  it('takes fouls from the player rows, since `totals` has none', () => {
    expect(b.home.pf).not.toBeNull()
  })

  it('formats made/attempted and a rate', () => {
    expect(fmtMadeAtt(b.home.fg3)).toBe('12/28')
    expect(pctOf(b.home.ft)).toBe(77)
  })
})

describe('every stored schema', () => {
  const names = readdirSync(DIR).map(f => f.replace('.json', ''))

  it('covers every league family', () => {
    for (const n of ['euroleague-totals', 'euroleague-team-long', 'nba-team-short', 'nba-players-only',
      'acb', 'bcl', 'eurocup', 'lkl', 'greek_basket_league', 'fiba_world_cup']) expect(names).toContain(n)
  })

  for (const name of names) {
    describe(name, () => {
      const { g, b } = box(name)

      it('has a box score and no NaN or fabricated value', () => {
        expect(hasBox(b)).toBe(true)
        for (const side of [b.home, b.away]) {
          for (const k of NUMERIC) expect(side[k] === null || Number.isFinite(side[k]), `${k}`).toBe(true)
          for (const z of [side.fg2, side.fg3, side.ft]) {
            if (z) { expect(Number.isFinite(z.made)).toBe(true); expect(z.att).toBeGreaterThanOrEqual(z.made) }
          }
        }
      })

      it('makes added up equal the final score, unless it is flagged partial', () => {
        for (const side of ['home', 'away'] as const) {
          const s = b[side]
          if (!s.fg2 || !s.fg3 || !s.ft) continue
          const total = 2 * s.fg2.made + 3 * s.fg3.made + s.ft.made
          if (b.partial.some(p => p.side === side)) expect(total).toBeLessThan(g[`${side}_goals`])
          else expect(total, `${name} ${side}`).toBe(g[`${side}_goals`])
        }
      })

      it('keeps field goals consistent with twos plus threes', () => {
        for (const s of [b.home, b.away]) {
          if (s.fg2 && s.fg3 && s.fgm != null && s.fga != null) {
            expect(s.fgm).toBe(s.fg2.made + s.fg3.made)
            expect(s.fga).toBe(s.fg2.att + s.fg3.att)
          }
        }
      })
    })
  }

  it('euroleague-team-long and nba-team-short use their own team-level source', () => {
    expect(box('euroleague-team-long').b.home.source).toBe('team-long')
    expect(box('nba-team-short').b.home.source).toBe('team-short')
    expect(box('nba-players-only').b.home.source).toBe('players')
  })
})

describe('gaps are never filled with 0', () => {
  it('an ACB game whose rows carry no aggregate FG still gets twos and threes', () => {
    const { b } = box('acb-no-aggregate-fg')
    expect(b.home.fg2).not.toBeNull()
    expect(b.home.fg3).not.toBeNull()
    expect(b.home.fgm).toBe(b.home.fg2!.made + b.home.fg3!.made)
  })

  it('flags a box whose player rows do not reach the final score', () => {
    const { b } = box('acb-partial')
    expect(b.partial.length).toBeGreaterThan(0)
    for (const p of b.partial) expect(p.have).toBeLessThan(p.of)
  })

  it('no sport_stats at all: every stat is null and the reason says so', () => {
    const b = boxScore(null)
    expect(hasBox(b)).toBe(false)
    expect(b.home.reb).toBeNull()
    expect(b.home.fg3).toBeNull()
    expect(fmtMadeAtt(b.home.fg3)).toBe('—')
    expect(b.reason('home', 'reb')).toMatch(/no box score/i)
  })

  it('player rows that carry nothing are an unfilled box, not a 0-0 game', () => {
    const empty = { home: { players: [{ name: 'A', minutes: '0:00' }, { name: 'B' }] }, away: {} }
    expect(boxScore(empty).home.source).toBe('none')
  })

  it('a feed that really says 0 attempts stays 0/0, with no rate', () => {
    const b = boxScore({ home: { totals: { fg2m: 1, fg2a: 2, fg3m: 0, fg3a: 0, ftm: 0, fta: 0 } }, away: {} })
    expect(b.home.fg3).toEqual({ made: 0, att: 0 })
    expect(fmtMadeAtt(b.home.fg3)).toBe('0/0')
    expect(pctOf(b.home.fg3)).toBeNull()
  })

  it('a stat the feed omits is null: no assists key anywhere means no assists', () => {
    const b = boxScore({ home: { totals: { fg2m: 1, fg2a: 2, fg3m: 0, fg3a: 0, ftm: 0, fta: 0 } }, away: {} })
    expect(b.home.ast).toBeNull()
    expect(b.reason('home', 'ast')).toMatch(/assists/)
  })
})

describe('boxPlayer', () => {
  it('reads EuroLeague totals-era rows (trb, fg2m/fg3m, is_starter, plus_minus)', () => {
    const p = boxPlayer({ name: 'WARREN, TJ', points: 14, trb: 2, ast: 0, fg2m: 6, fg2a: 6, fg3m: 0, fg3a: 4,
      ftm: 2, fta: 2, tov: 1, pf: 5, minutes: '15:43', is_starter: true, plus_minus: 6 })
    expect(p).toMatchObject({ pts: 14, reb: 2, fgm: 6, fga: 10, fg3m: 0, fg3a: 4, pm: 6, starter: true, tov: 1 })
    expect(p.minutes).toBeCloseTo(15.72, 1)
    expect(p.clock).toBe('15:43')
  })

  it('reads NBA short and long names alike', () => {
    expect(boxPlayer({ pts: 20, reb: 5, fgm: 8, fga: 15, pm: -3, min: '30:00' })).toMatchObject({ pts: 20, reb: 5, fgm: 8, pm: -3 })
    expect(boxPlayer({ points: 20, rebounds: 5, field_goals_made: 8, field_goals_attempted: 15, plus_minus: -3 }))
      .toMatchObject({ pts: 20, reb: 5, fgm: 8, fga: 15, pm: -3 })
  })

  it('a missing stat is null, and DNP is still recognised', () => {
    const p = boxPlayer({ name: 'X', minutes: '0:00' })
    expect(p.pts).toBeNull()
    expect(p.fgm).toBeNull()
    expect(didNotPlay(p)).toBe(true)
  })

  it('every fixture player row parses with no NaN', () => {
    for (const name of readdirSync(DIR).map(f => f.replace('.json', ''))) {
      const g = load(name)
      for (const side of ['home', 'away']) {
        for (const row of g.sport_stats[side]?.players ?? []) {
          const p = boxPlayer(row)
          for (const [k, v] of Object.entries(p)) if (typeof v === 'number') expect(Number.isFinite(v), `${name} ${k}`).toBe(true)
        }
      }
    }
  })
})

describe('swapped made/attempted (EuroCup 2026-27)', () => {
  it('puts a made count above its attempts back, and the points then add up', () => {
    const { g, b } = box('eurocup')
    expect(b.home.repairedRows + b.away.repairedRows).toBeGreaterThan(0)
    for (const side of ['home', 'away'] as const) {
      const s = b[side]
      expect(s.ft!.att).toBeGreaterThanOrEqual(s.ft!.made)
      expect(2 * s.fg2!.made + 3 * s.fg3!.made + s.ft!.made).toBe(g[`${side}_goals`])
    }
  })

  it('repairs a single row: made 9 of 6 is 6 of 9', () => {
    expect(boxPlayer({ points: 14, two_pointers_made: 4, two_pointers_attempted: 8, free_throws_made: 9, free_throws_attempted: 6 }))
      .toMatchObject({ ftm: 6, fta: 9 })
  })

  it('leaves clean rows alone', () => {
    const b = boxScore(load('hapoel-real-madrid').sport_stats)
    expect(b.home.repairedRows).toBe(0)
    expect(b.away.repairedRows).toBe(0)
  })
})
