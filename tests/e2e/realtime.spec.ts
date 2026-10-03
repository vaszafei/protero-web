import { expect, test } from '@playwright/test'
import { signIn } from './auth'

/**
 * Realtime (#52): the dashboard and the wallet ledger subscribe to bets + parlays, and the pipeline
 * modal to pipeline_runs + phase_runs. These specs prove the channel CONNECTS and that a live modal
 * does not poll. Delivery of a real change is verified by watching a real settlement or pipeline run
 * (never by writing to `bets`/`parlays` to test) — see docs/sessions/2026-10-02-realtime-52.md.
 */

test('the dashboard subscribes to Realtime and says so', async ({ page }) => {
  await signIn(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByTitle(/Subscribed to bets \+ parlays/)).toHaveText('live', { timeout: 10_000 })
})

test('a wallet page subscribes to its own wager changes', async ({ page }) => {
  await signIn(page)
  await page.goto('/wallet/26', { waitUntil: 'networkidle' })
  await expect(page.getByTitle(/Subscribed to this wallet/)).toHaveText('live', { timeout: 10_000 })
})

test('the pipeline modal is live and does not poll while live', async ({ page }) => {
  await signIn(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  let reads = 0
  page.on('request', (r) => { if (r.url().includes('/api/pipeline/runs')) reads++ })
  await page.getByRole('button', { name: /Run pipeline/ }).click()
  await expect(page.getByTitle(/Subscribed to pipeline_runs \+ phase_runs/)).toHaveText('live', { timeout: 10_000 })
  const afterLive = reads
  await page.waitForTimeout(6_000)
  // The old modal polled every 2 s then every 15 s; a live one makes no further reads.
  expect(reads, 'pipeline/runs reads while live').toBe(afterLive)
})
