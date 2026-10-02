import { expect, test } from '@playwright/test'
import { signIn } from './auth'
import { completedBasketballPerLeague } from './ids'

/**
 * #58 / #59: the centre-column court and the Game Stats bars come from the same reader
 * (`utils/basketball-box`). They disagreed on every EuroLeague game because the stat bars read a
 * schema they did not understand and fell through to 0.
 */

const games = completedBasketballPerLeague()

test('discovery found a completed game for every basketball league that has box scores', () => {
  expect(games.length).toBeGreaterThanOrEqual(6)
})

const ZONE: Record<string, 'fg2' | 'fg3' | 'ft'> = { '2PT': 'fg2', '3PT': 'fg3', FT: 'ft' }

for (const { league, id } of games) {
  test(`${league} #${id}: court zone totals equal the stat-bar makes and attempts`, async ({ page }) => {
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

    for (const key of ['fg2', 'fg3', 'ft'] as const) {
      const row = page.locator(`[data-testid="bball-shot-${key}"]`)
      await expect(row, `stat bar ${key}`).toHaveCount(1)
      expect((await row.locator('[data-testid="shot-home"]').innerText()).trim(), `${league} home ${key}`).toBe(rail.home[key])
      expect((await row.locator('[data-testid="shot-away"]').innerText()).trim(), `${league} away ${key}`).toBe(rail.away[key])
    }

    const body = await page.locator('main').innerText()
    expect(body, 'no NaN on the page').not.toMatch(/\bNaN\b/)

    // The rebound bars carry a number, not a fabricated 0, whenever the shooting does.
    const rebounds = (await page.locator('[data-testid="bball-rebounds"]').first().innerText())
    expect(rebounds).not.toMatch(/\bNaN\b/)
    expect(rebounds.replace(/Total Rebounds|Offensive Reb|Defensive Reb/g, '')).toMatch(/\d/)
  })
}
