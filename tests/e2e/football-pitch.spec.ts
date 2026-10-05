import { expect, test } from '@playwright/test'
import { signIn } from './auth'
import { discover } from './ids'

/**
 * #60: a completed football game always has the pitch in the centre column, with or without a
 * lineup, in the same place at the same size, and the page fits one screen.
 */

const id = discover()

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main')!
    const panel = document.querySelector('[data-testid="football-pitch-panel"]')!
    const centre = panel.parentElement!
    const b = panel.getBoundingClientRect()
    return {
      pageScroll: main.scrollHeight - main.clientHeight,
      centreScroll: centre.scrollHeight - centre.clientHeight,
      left: Math.round(b.left), width: Math.round(b.width), height: Math.round(b.height),
      state: panel.getAttribute('data-state'),
    }
  })
}

const FIXTURES = [
  { name: 'with a lineup', id: id.completedWithLineup, state: 'lineup' },
  { name: 'without a lineup', id: id.completedNoLineup, state: 'empty' },
]

const seen: Record<string, Awaited<ReturnType<typeof measure>>> = {}

for (const f of FIXTURES) {
  test(`completed football ${f.name}: pitch panel in the centre, one screen, no NaN`, async ({ page }) => {
    await signIn(page)
    await page.goto(`/game/${f.id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await expect(page.locator('[data-testid="football-pitch-panel"]'), 'pitch panel').toHaveCount(1)
    const m = await measure(page)
    seen[f.name] = m
    expect(m.state).toBe(f.state)
    expect(m.pageScroll, 'page scroll').toBe(0)
    expect(m.centreScroll, 'centre column scroll').toBe(0)
    expect(await page.locator('main').innerText(), 'no NaN').not.toMatch(/\bNaN\b/)

    // The label that read as "overtime".
    expect(await page.locator('main').innerText()).not.toMatch(/\(\d+ OT\)/)
  })
}

test('the pitch panel is the same size and place with and without a lineup (no layout jump)', () => {
  const a = seen['with a lineup']
  const b = seen['without a lineup']
  expect(a && b, 'both fixtures measured').toBeTruthy()
  expect(b.left).toBe(a.left)
  expect(b.width).toBe(a.width)
  expect(b.height).toBe(a.height)
})

test('without a lineup the strip says what is missing, and the timeline says it has no events', async ({ page }) => {
  await signIn(page)
  await page.goto(`/game/${id.completedNoLineup}`, { waitUntil: 'networkidle' })
  const missing = page.locator('[data-testid="pitch-missing"]')
  await expect(missing).toContainText('No lineup recorded')
  await expect(missing).toContainText('Match events not recorded')
  // With no events the panel opens on the post-mortem; the Timeline tab is still there and says so.
  await page.getByRole('tab', { name: /^Timeline/ }).click()
  await expect(page.locator('[data-testid="timeline-band"]')).toContainText('not recorded')
})

test('a keeper who captains his side (marked C, not G) is still the keeper on the pitch', async ({ page }) => {
  await signIn(page)
  await page.goto(`/game/${id.completedKeeperIsCaptain}`, { waitUntil: 'networkidle' })
  const panel = page.locator('[data-testid="football-pitch-panel"]')
  await expect(panel.locator('.player')).not.toHaveCount(0)
  // Exactly one keeper token per half, in the outermost line: home draws GK first (left edge), away is reversed.
  const keepers = await panel.evaluate((el) => {
    const half = (sel: string) => {
      const h = el.querySelector(sel)!
      const lines = [...h.querySelectorAll('.line')]
      return { gk: h.querySelectorAll('.player-gk').length, first: lines[0]?.querySelectorAll('.player-gk').length ?? 0, last: lines[lines.length - 1]?.querySelectorAll('.player-gk').length ?? 0 }
    }
    return { home: half('.half-home'), away: half('.half-away') }
  })
  expect(keepers.home.gk, 'home keeper tokens').toBe(1)
  expect(keepers.away.gk, 'away keeper tokens').toBe(1)
  expect(keepers.home.first, 'home keeper in the first line').toBe(1)
  expect(keepers.away.last, 'away keeper in the last line').toBe(1)
})
