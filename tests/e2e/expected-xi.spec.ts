import { expect, test } from '@playwright/test'
import { edgeCall, signIn } from './auth'
import { discover } from './ids'

/**
 * #61: the scheduled football pitch. A projection from each club's last starting XI is labelled
 * Expected; a fixture that carries official lineups of its own is Confirmed; a club with no prior XI
 * keeps an empty half and says so. The flip and the no-history state are driven by rewriting the
 * `game-page` response, because the database has no scheduled fixture with official lineups to show
 * and the test must not write `lineups`.
 */

const id = discover()
const BUNDLE = /\/functions\/v1\/game-page/

test('the bundle carries the expected XI for a scheduled fixture, and says there is no availability feed', async ({ request }) => {
  const res = await edgeCall(request, 'game-page', { gameId: id.scheduledFootballWithXi })
  expect(res.status()).toBe(200)
  const body = await res.json()
  const x = body.expectedXi
  expect(x.error, 'expectedXi error').toBeNull()
  expect(x.data.availability).toBe('no_feed')
  for (const s of ['home', 'away'] as const) {
    expect(x.data[s].status).toBe('ok')
    expect(x.data[s].players, `${s} starters`).toHaveLength(11)
    expect(x.data[s].source.date, `${s} source date`).toBeTruthy()
  }
})

test('a completed fixture has no expected XI', async ({ request }) => {
  const res = await edgeCall(request, 'game-page', { gameId: id.completedWithLineup })
  expect((await res.json()).expectedXi).toBeNull()
})

test('scheduled football: both XIs on the pitch, labelled Expected, one screen', async ({ page }) => {
  await signIn(page)
  await page.goto(`/game/${id.scheduledFootballWithXi}`, { waitUntil: 'networkidle' })
  const panel = page.locator('[data-testid="expected-xi-panel"]')
  await expect(panel).toHaveAttribute('data-state', 'expected')
  await expect(panel.locator('[data-testid="xi-state"]')).toHaveText('Expected')
  await expect(panel.locator('.player'), 'both XIs').toHaveCount(22)
  const m = await page.evaluate(() => {
    const main = document.querySelector('main')!
    const strip = document.querySelector('[data-testid="xi-strip"]') as HTMLElement
    return { page: main.scrollHeight - main.clientHeight, strip: strip.scrollHeight - strip.clientHeight }
  })
  expect(m.page, 'page scroll').toBe(0)
  expect(m.strip, 'the notes strip clips nothing').toBeLessThanOrEqual(0)
})

test('the label flips to Confirmed when the fixture has lineups of its own', async ({ page }) => {
  await signIn(page)
  await page.route(BUNDLE, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    const players = (side: 'home' | 'away') => body.expectedXi.data[side].players.map((p: any, i: number) => ({
      id: `${side}${i}`, player_name: p.player_name, jersey_number: p.jersey_number, position: p.position, is_starting_xi: true,
    }))
    body.detail.lineups = { home: players('home'), away: players('away') }
    body.expectedXi = null
    await route.fulfill({ response: res, json: body })
  })
  await page.goto(`/game/${id.scheduledFootballWithXi}`, { waitUntil: 'networkidle' })
  const panel = page.locator('[data-testid="expected-xi-panel"]')
  await expect(panel).toHaveAttribute('data-state', 'confirmed')
  await expect(panel.locator('[data-testid="xi-state"]')).toHaveText('Confirmed')
  await expect(panel.locator('.player')).toHaveCount(22)
})

test('a club with no prior XI keeps an empty half and says so', async ({ page }) => {
  await signIn(page)
  await page.route(BUNDLE, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.expectedXi.data.home = { ...body.expectedXi.data.home, status: 'no_history', formation: null, source: null, players: [] }
    await route.fulfill({ response: res, json: body })
  })
  await page.goto(`/game/${id.scheduledFootballWithXi}`, { waitUntil: 'networkidle' })
  const panel = page.locator('[data-testid="expected-xi-panel"]')
  await expect(panel.locator('.player'), 'only the away XI').toHaveCount(11)
  await expect(panel.locator('[data-testid="xi-strip"]')).toContainText('No lineup history')
  await expect(panel.locator('[data-testid="xi-state"]')).toHaveText('Expected')
})

test('a failed expected-XI part is reported, not shown as an empty pitch', async ({ page }) => {
  await signIn(page)
  await page.route(BUNDLE, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.expectedXi = { data: null, error: 'lineups (expected XI) query failed: boom' }
    await route.fulfill({ response: res, json: body })
  })
  await page.goto(`/game/${id.scheduledFootballWithXi}`, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-testid="expected-xi-panel"]')).toContainText('The expected lineup failed to load')
  await expect(page.locator('[data-testid="expected-xi-panel"] .player')).toHaveCount(0)
})
