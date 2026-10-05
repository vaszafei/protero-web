import { describe, expect, it } from 'vitest'
import { buildExpectedSide, EXPECTED_XI_FORM_GAMES } from '#logic/game-expected-xi'

const TEAM = 7
const game = (id: number, date: string, home = true) => ({
  id, date, home_team_id: home ? TEAM : 99, home_formation: '4-3-3', away_formation: '5-3-2',
})
/** An XI of eleven named P1..P11, plus any extra rows. */
const xi = (gameId: number, extra: any[] = [], rating: number | null = null) => [
  ...Array.from({ length: 11 }, (_, i) => ({
    game_id: gameId, player_name: `P${i + 1}`, jersey_number: i + 1, position: 'Unknown', is_starting_xi: true, rating,
  })),
  ...extra,
]

describe('buildExpectedSide', () => {
  it('has no history when the club has no game with a whole XI', () => {
    const side = buildExpectedSide(TEAM, 'A', [game(1, '2026-09-01')], xi(1).slice(0, 4))
    expect(side.status).toBe('no_history')
    expect(side.players).toEqual([])
    expect(side.formation).toBeNull()
  })

  it('skips a newer game whose starter set is inflated past eleven by legacy rows', () => {
    const games = [game(2, '2026-09-10'), game(1, '2026-09-01')]
    const extra = [{ game_id: 2, player_name: 'Legacy', jersey_number: null, position: '', is_starting_xi: true, rating: null }]
    const side = buildExpectedSide(TEAM, 'A', games, [...xi(2, extra), ...xi(1)])
    expect(side.source?.game_id).toBe(1)
  })

  it('reads the newest game with a whole XI, skipping a newer partial one', () => {
    const games = [game(3, '2026-09-20'), game(2, '2026-09-10'), game(1, '2026-09-01')]
    const side = buildExpectedSide(TEAM, 'A', games, [...xi(3).slice(0, 3), ...xi(2), ...xi(1)])
    expect(side.source).toEqual({ game_id: 2, date: '2026-09-10' })
    expect(side.players).toHaveLength(11)
  })

  it('takes the formation of the side the club played on', () => {
    const home = buildExpectedSide(TEAM, 'A', [game(1, '2026-09-01', true)], xi(1))
    const away = buildExpectedSide(TEAM, 'A', [game(1, '2026-09-01', false)], xi(1))
    expect([home.formation, away.formation]).toEqual(['4-3-3', '5-3-2'])
  })

  it('counts starts and appearances over the form window only, not the whole lookback', () => {
    const games = Array.from({ length: EXPECTED_XI_FORM_GAMES + 2 }, (_, i) => game(100 - i, `2026-09-${20 - i}`))
    const rows = games.flatMap((g) => xi(g.id))
    const side = buildExpectedSide(TEAM, 'A', games, rows)
    expect(side.players[0].form).toEqual({ appearances: EXPECTED_XI_FORM_GAMES, starts: EXPECTED_XI_FORM_GAMES, of: EXPECTED_XI_FORM_GAMES })
  })

  it('separates a bench cameo from a start', () => {
    const games = [game(2, '2026-09-10'), game(1, '2026-09-01')]
    const rows = [
      ...xi(2),
      // P1 came off the bench in game 1; P12 started in his place, so game 1 still has a whole XI.
      ...xi(1, [{ game_id: 1, player_name: 'P12', jersey_number: 12, position: 'Unknown', is_starting_xi: true, rating: null }])
        .map((r) => (r.player_name === 'P1' ? { ...r, is_starting_xi: false } : r)),
    ]
    const p1 = buildExpectedSide(TEAM, 'A', games, rows).players.find((p) => p.player_name === 'P1')!
    expect(p1.form).toEqual({ appearances: 2, starts: 1, of: 2 })
  })

  it('averages only real ratings: a missing or zero rating is not a 0', () => {
    const games = [game(2, '2026-09-10'), game(1, '2026-09-01')]
    const rows = [...xi(2, [], 7), ...xi(1, [], null)]
    expect(buildExpectedSide(TEAM, 'A', games, rows).players[0].rating).toBe(7)
    expect(buildExpectedSide(TEAM, 'A', [game(1, '2026-09-01')], xi(1, [], 0)).players[0].rating).toBeNull()
  })
})
