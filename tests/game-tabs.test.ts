import { describe, expect, it } from 'vitest'
import { defaultTabKey, gameTabs, type TabInputs } from '../utils/game-tabs'

const base: TabInputs = {
  state: 'scheduled', sport: 'football', matchEventCount: 0,
  hasShots: false, shotCount: null, hasFantasy: false, isAdmin: false,
}
const keys = (i: Partial<TabInputs>) => gameTabs({ ...base, ...i }).map((t) => t.key)

describe('gameTabs', () => {
  it('scheduled football: Market, Analysis, Prediction', () => {
    expect(keys({})).toEqual(['market', 'analysis', 'prediction'])
  })

  it('scheduled basketball has no Market; Fantasy and Props only when their data exists', () => {
    expect(keys({ sport: 'basketball' })).toEqual(['analysis', 'prediction'])
    expect(keys({ sport: 'basketball', hasFantasy: true, isAdmin: true }))
      .toEqual(['analysis', 'prediction', 'fantasy', 'props'])
  })

  it('shared tabs keep the same order and names across sports', () => {
    const fb = gameTabs(base).filter((t) => t.key !== 'market')
    const bb = gameTabs({ ...base, sport: 'basketball' })
    expect(bb).toEqual(fb)
  })

  it('football never gets fantasy or props, even for an admin with fantasy rows', () => {
    expect(keys({ hasFantasy: true, isAdmin: true })).toEqual(['market', 'analysis', 'prediction'])
  })

  it('completed football: Timeline (badged or hinted) then Post-mortem', () => {
    expect(gameTabs({ ...base, state: 'completed', matchEventCount: 7 }))
      .toEqual([
        { key: 'timeline', label: 'Timeline', badge: 7 },
        { key: 'postmortem', label: 'Post-mortem', badge: null },
      ])
    expect(gameTabs({ ...base, state: 'completed' })[0]).toEqual({ key: 'timeline', label: 'Timeline', badge: null, hint: 'not recorded' })
  })

  it('completed basketball has the Shot Chart only when shots (or a shot error) exist', () => {
    expect(keys({ state: 'completed', sport: 'basketball' })).toEqual([])
    const t = gameTabs({ ...base, state: 'completed', sport: 'basketball', hasShots: true, shotCount: 163 })
    expect(t).toEqual([{ key: 'shots', label: 'Shot Chart', badge: 163 }])
  })
})

describe('defaultTabKey', () => {
  it('opens a completed football game with no events on the post-mortem', () => {
    expect(defaultTabKey({ ...base, state: 'completed' })).toBe('postmortem')
    expect(defaultTabKey({ ...base, state: 'completed', matchEventCount: 3 })).toBe('timeline')
  })

  it('otherwise opens the first tab, and null when there is none', () => {
    expect(defaultTabKey(base)).toBe('market')
    expect(defaultTabKey({ ...base, sport: 'basketball' })).toBe('analysis')
    expect(defaultTabKey({ ...base, state: 'completed', sport: 'basketball' })).toBeNull()
  })
})
