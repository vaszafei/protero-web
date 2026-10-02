import { expect, test } from '@playwright/test'
import { mintToken, signIn } from './auth'
import { discover, mirrorWalletId, roundWithFixtures, rpcPnl } from './ids'
import { LEAGUE_ENABLED_MARKETS } from '../../server/utils/football-masks'

/**
 * Cross-page parity: one fact, one number, wherever it is rendered. Each of these was a real
 * disagreement found on 2026-10-01 (three P&L figures for W26, two verdicts for one wallet).
 */

const id = discover()
const authHeaders = () => ({ Authorization: `Bearer ${mintToken()}` })

/** `+€1,234.50` / `−€70.20` → number. */
const money = (t: string) => Number(t.replace(/[^0-9.\-−+]/g, '').replace('−', '-').replace('+', ''))
const text = async (loc: import('@playwright/test').Locator) => (await loc.first().innerText()).trim()

test.describe('verdict parity', () => {
  for (const w of id.wallets) {
    test(`W${w}: one verdict on /, /wallet and /wallet/${w}`, async ({ page }) => {
      await signIn(page)
      const seen: Record<string, string> = {}

      await page.goto(`/wallet?w=${w}`, { waitUntil: 'networkidle' })
      const roster = page.locator(`[data-testid="roster-${w}"] [data-testid="verdict"]`)
      await expect(roster, 'roster row').toHaveCount(1)
      seen['/wallet'] = await text(roster)

      await page.goto(`/wallet/${w}`, { waitUntil: 'networkidle' })
      const hero = page.locator('[data-testid="verdict"]')
      if (await hero.count()) seen[`/wallet/${w}`] = await text(hero)

      await page.goto('/', { waitUntil: 'networkidle' })
      const fleet = page.locator(`[data-testid="fleet-${w}"] [data-testid="verdict"]`)
      if (await fleet.count()) seen['/'] = await text(fleet)

      expect(new Set(Object.values(seen)).size, `verdicts differ: ${JSON.stringify(seen)}`).toBe(1)
    })
  }

  test('the calendar card shows the roster verdict for its wallet (or none at n<10)', async ({ page }) => {
    await signIn(page)
    await page.goto('/calendar', { waitUntil: 'networkidle' })
    const card = page.locator('[data-testid="calendar-wallet-card"]')
    await expect(card).toHaveCount(1)
    const walletId = await card.getAttribute('data-wallet-id')
    const cardVerdict = card.locator('[data-testid="verdict"]')

    await page.goto(`/wallet?w=${walletId}`, { waitUntil: 'networkidle' })
    const roster = await text(page.locator(`[data-testid="roster-${walletId}"] [data-testid="verdict"]`))
    if (roster === 'n<10') return // the card deliberately hides a non-result
    await page.goto('/calendar', { waitUntil: 'networkidle' })
    await expect(cardVerdict).toHaveText(roster)
  })
})

test.describe('P&L parity', () => {
  for (const w of id.wallets) {
    test(`W${w}: hero, roster and chart agree with get_wallet_performance`, async ({ page }) => {
      const rpc = rpcPnl(w)
      await signIn(page)

      await page.goto(`/wallet?w=${w}`, { waitUntil: 'networkidle' })
      const rosterPnl = money(await text(page.locator(`[data-testid="roster-${w}"] [data-testid="pnl"]`)))
      expect(rosterPnl, 'roster').toBeCloseTo(rpc, 2)

      await page.goto(`/wallet/${w}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      const hero = page.locator('[data-testid="pnl"]')
      await expect(hero, 'hero P&L').toHaveCount(1)
      expect(money(await text(hero)), 'hero').toBeCloseTo(rpc, 2)

      const all = page.getByRole('button', { name: 'All', exact: true })
      if (await all.count()) {
        await all.first().click()
        await page.waitForTimeout(400)
        const chart = page.locator('[data-testid="chart-range-pnl"]')
        if (await chart.count()) {
          const footer = money((await text(chart)).split('(')[0])
          expect(footer, 'chart "All" footer').toBeCloseTo(rpc, 2)
        }
      }
    })
  }
})

test('coverage: every mirrored wallet that shows an ROI also shows its coverage', async ({ page }) => {
  await signIn(page)
  await page.goto(`/wallet?w=${mirrorWalletId()}`, { waitUntil: 'networkidle' })
  const rows = page.locator('[data-testid^="roster-"]')
  const n = await rows.count()
  expect(n, 'mirror rows').toBeGreaterThan(0)
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i)
    const roi = await text(row.locator('[data-testid="roi"]'))
    if (/%/.test(roi)) {
      const covered = await text(row.locator('[data-testid="covered"]'))
      expect(covered, `row ${i} shows ROI ${roi}`).toMatch(/%/)
    }
  }
})

test('/leagues "Enabled" equals football-masks.ts for every football league', async ({ request, page }) => {
  const res = await request.get('/api/leagues/overview', { headers: authHeaders() })
  expect(res.status()).toBe(200)
  const leagues: any[] = (await res.json()).leagues
  const byName = new Map(leagues.map(l => [l.name, l]))

  for (const l of leagues.filter(l => l.sport === 'football')) {
    const expected = Object.keys(LEAGUE_ENABLED_MARKETS[l.key] ?? {}).length
    expect(l.enabled, `${l.key} enabled`).toBe(expected)
  }

  await signIn(page)
  await page.goto('/leagues', { waitUntil: 'networkidle' })
  const rows = page.locator('tbody tr')
  const n = await rows.count()
  expect(n).toBeGreaterThan(5)
  for (let i = 0; i < n; i++) {
    const cells = rows.nth(i).locator('td')
    const name = (await cells.nth(0).innerText()).split('\n')[0].trim()
    const league = byName.get(name)
    if (!league || league.sport !== 'football') continue
    const shown = (await text(cells.nth(8))).replace('—', '0')
    expect(Number(shown), `${league.key} on the page`).toBe(Object.keys(LEAGUE_ENABLED_MARKETS[league.key] ?? {}).length)
  }
})

test('round board: each row equals the same fixture on its Market tab', async ({ request }) => {
  const { season, round } = roundWithFixtures(id.footballLeague)
  const res = await request.get(`/api/league/${id.footballLeague}/round-board?season=${season}&round=${round}`, { headers: authHeaders() })
  expect(res.status()).toBe(200)
  const rows: any[] = (await res.json()).rows
  expect(rows.length).toBeGreaterThanOrEqual(5)

  for (const row of rows.slice(0, 5)) {
    const m = await (await request.get(`/api/game/${row.game_id}/market`, { headers: authHeaders() })).json()
    const byKey = new Map<string, any>(m.rows.map((r: any) => [r.key, r]))
    const same = (cell: any, key: string) => {
      const g = byKey.get(key)
      expect(cell?.market ?? null, `${row.game_id} ${key} market`).toBe(g?.market ?? null)
      expect(cell?.ours ?? null, `${row.game_id} ${key} ours`).toBe(g?.ours ?? null)
      expect(cell?.price ?? null, `${row.game_id} ${key} price`).toBe(g?.price ?? null)
      expect(cell?.enabled ?? false, `${row.game_id} ${key} enabled`).toBe(g?.enabled ?? false)
    }
    same(row.result.home, 'home_win')
    same(row.result.draw, 'draw')
    same(row.result.away, 'away_win')
    same(row.over_25.over, 'over_25')
    expect(row.fixture_status, `${row.game_id} status`).toEqual(m.fixture_status)
  }
})

test('the Premier League Predictions tab loads in at most 6 data requests (it was 50)', async ({ page }) => {
  await signIn(page)
  await page.goto(`/league/${id.footballLeague}`, { waitUntil: 'networkidle' })
  let n = 0
  page.on('request', (r) => { if (/\/api\/|\/rest\/v1\//.test(r.url())) n++ })
  await page.getByRole('tab', { name: /^Predictions/ }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  expect(n, 'data requests for the tab').toBeLessThanOrEqual(6)
  await expect(page.locator('.rb-data').first()).toBeVisible()
})
