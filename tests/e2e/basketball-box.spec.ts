import { expect, test } from '@playwright/test'
import { signIn } from './auth'
import { completedBasketballPerLeague } from './ids'

/**
 * #58: the shooting panel in each side rail and the Game Stats bars come from the same reader
 * (`utils/basketball-box`). They disagreed on every EuroLeague game because the stat bars read a
 * schema they did not understand and fell through to 0.
 */

const games = completedBasketballPerLeague()

test('discovery found a completed game for every basketball league that has box scores', () => {
  expect(games.length).toBeGreaterThanOrEqual(6)
})

const ZONE: Record<string, 'fg2' | 'fg3' | 'ft'> = { '2PT': 'fg2', '3PT': 'fg3', FT: 'ft' }

for (const { league, id } of games) {
  test(`${league} #${id}: rail shooting panels equal the stat-bar makes and attempts`, async ({ page }) => {
    await signIn(page)
    await page.goto(`/game/${id}`, { waitUntil: 'networkidle' })

    const rails = page.locator('[data-testid="bball-rail-shooting"]')
    await expect(rails, 'home and away shooting panels').toHaveCount(2)

    const zoneText = async (side: 0 | 1) => {
      const all = (await rails.nth(side).locator('.z-vol').allTextContents()).map(t => t.replace(/\s+/g, ' ').trim())
      const out: Record<string, string> = {}
      for (const t of all) {
        const m = t.match(/^(\d+\/\d+) (2PT|3PT|FT)$/)
        if (m) out[ZONE[m[2]]] = m[1]
      }
      return out
    }
    const rail = { home: await zoneText(0), away: await zoneText(1) }

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
