import { expect, test } from '@playwright/test'
import { signIn } from './auth'
import { completedBasketballPerLeague } from './ids'

/**
 * #58 / #59: the centre-column court and each team's stat tiles come from the same reader
 * (`utils/basketball-box`). They disagreed on every EuroLeague game because the stat bars read a
 * schema they did not understand and fell through to 0.
 */

const games = completedBasketballPerLeague()

test('discovery found a completed game for every basketball league that has box scores', () => {
  expect(games.length).toBeGreaterThanOrEqual(6)
})

const ZONE: Record<string, 'fg2' | 'fg3' | 'ft'> = { '2PT': 'fg2', '3PT': 'fg3', FT: 'ft' }

for (const { league, id } of games) {
  test(`${league} #${id}: court zone totals equal each team's stat tiles`, async ({ page }) => {
    await signIn(page)
    await page.goto(`/game/${id}`, { waitUntil: 'networkidle' })

    const court = page.locator('[data-testid="bball-court"]')
    await expect(court, 'one court').toHaveCount(1)
    await expect(page.locator('[data-testid="bball-rail-shooting"]'), 'no shooting panel left in the rails').toHaveCount(0)

    const zoneText = async (side: 'home' | 'away') => {
      const out: Record<string, string> = {}
      for (const [zone, key] of Object.entries(ZONE)) {
        const t = (await court.locator(`g[data-side="${side}"][data-zone="${zone}"] .z-vol`).textContent() ?? '').replace(/\s+/g, ' ').trim()
        out[key] = t.replace(` ${zone}`, '')
      }
      return out
    }
    const rail = { home: await zoneText('home'), away: await zoneText('away') }

    for (const side of ['home', 'away'] as const) {
      const stats = page.locator(`[data-testid="bball-team-stats-${side}"]`)
      await expect(stats, `${side} team stats`).toHaveCount(1)
      for (const key of ['fg2', 'fg3', 'ft'] as const) {
        const tile = stats.locator(`[data-testid="tile-${key}"] [data-testid="tile-value"]`)
        expect((await tile.innerText()).trim(), `${league} ${side} ${key}`).toBe(rail[side][key])
      }
    }

    const body = await page.locator('main').innerText()
    expect(body, 'no NaN on the page').not.toMatch(/\bNaN\b/)

    // The rebound tiles carry a number, not a fabricated 0 or a dash, wherever the shooting is there.
    for (const side of ['home', 'away'] as const) {
      const reb = (await page.locator(`[data-testid="bball-team-stats-${side}"] [data-testid="tile-reb"] [data-testid="tile-value"]`).innerText()).trim()
      expect(reb, `${league} ${side} rebounds`).toMatch(/^\d+$/)
    }

    // Each team's players sit under its own stats, in the same column.
    for (const side of ['home', 'away'] as const) {
      await expect(page.locator(`[data-testid="bball-players-${side}"]`), `${side} players`).toHaveCount(1)
    }
  })
}
