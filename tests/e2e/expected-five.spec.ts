import { expect, test } from '@playwright/test'
import { edgeCall, signIn } from './auth'
import { discover } from './ids'

/**
 * #62: the scheduled basketball expected five. A projection from each club's last game, labelled
 * Expected; a club with no game this season keeps an empty column and says so; a league whose feed
 * names no starters says the five is by minutes. There is no Confirmed state: basketball has no lineup
 * table to confirm against. The failure and no-history states are driven by rewriting the `game-page`
 * response, because the test must not write to the database.
 */

const id = discover()
const BUNDLE = /\/functions\/v1\/game-page/

test('EuroLeague: the bundle carries a starting five per club, from the feed\'s own flag', async ({ request }) => {
  const res = await edgeCall(request, 'game-page', { gameId: id.scheduledEuroleagueWithFive })
  expect(res.status()).toBe(200)
  const x = (await res.json()).expectedFive
  expect(x.error, 'expectedFive error').toBeNull()
  expect(x.data.availability).toBe('no_feed')
  for (const s of ['home', 'away'] as const) {
    expect(x.data[s].status).toBe('ok')
    expect(x.data[s].basis, `${s} basis`).toBe('starters')
    expect(x.data[s].players, `${s} five`).toHaveLength(5)
    for (const p of x.data[s].players) {
      expect(p.form.starts, `${p.player_name} starts`).toBeGreaterThanOrEqual(1)
      expect(p.form.starts).toBeLessThanOrEqual(p.form.of)
    }
  }
})

test('a league with no starter flag is built by minutes and says so', async ({ request }) => {
  const res = await edgeCall(request, 'game-page', { gameId: id.scheduledBasketballMinutesBasis })
  const x = (await res.json()).expectedFive
  expect(x.error).toBeNull()
  for (const s of ['home', 'away'] as const) {
    expect(x.data[s].basis, `${s} basis`).toBe('minutes')
    expect(x.data[s].players).toHaveLength(5)
    expect(x.data[s].players[0].form.starts, 'no flag to count').toBeNull()
  }
})

test('a completed basketball fixture has no expected five', async ({ request }) => {
  const res = await edgeCall(request, 'game-page', { gameId: id.completedBasketball })
  expect((await res.json()).expectedFive).toBeNull()
})

test('scheduled basketball: both fives, labelled Expected, one screen', async ({ page }) => {
  await signIn(page)
  await page.goto(`/game/${id.scheduledEuroleagueWithFive}`, { waitUntil: 'networkidle' })
  const panel = page.locator('[data-testid="expected-five-panel"]')
  await expect(panel.locator('[data-testid="five-state"]')).toHaveText('Expected')
  await expect(panel.locator('[data-testid="five-player"]'), 'both fives').toHaveCount(10)
  const m = await page.evaluate(() => {
    const main = document.querySelector('main')!
    const strip = document.querySelector('[data-testid="five-strip"]') as HTMLElement
    return { page: main.scrollHeight - main.clientHeight, strip: strip.scrollHeight - strip.clientHeight }
  })
  expect(m.page, 'page scroll').toBe(0)
  expect(m.strip, 'the notes strip clips nothing').toBeLessThanOrEqual(0)
})

test('a club with no game this season keeps an empty column and says so', async ({ page }) => {
  await signIn(page)
  await page.goto(`/game/${id.scheduledBasketballNoHistory}`, { waitUntil: 'networkidle' })
  const panel = page.locator('[data-testid="expected-five-panel"]')
  await expect(panel.locator('[data-testid="five-player"]')).toHaveCount(0)
  await expect(panel).toContainText('No lineup history for')
  await expect(panel.locator('[data-testid="five-state"]')).toHaveText('Expected')
})

test('a failed expected-five part is reported, not shown as an empty column', async ({ page }) => {
  await signIn(page)
  await page.route(BUNDLE, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.expectedFive = { data: null, error: 'games (expected five) query failed: boom' }
    await route.fulfill({ response: res, json: body })
  })
  await page.goto(`/game/${id.scheduledEuroleagueWithFive}`, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-testid="expected-five-panel"]')).toContainText('The expected five failed to load')
  await expect(page.locator('[data-testid="five-player"]')).toHaveCount(0)
})
