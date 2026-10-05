import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { signIn } from './auth'

/**
 * Who Realtime thinks each live subscription belongs to. A channel can report SUBSCRIBED while joined as
 * `anon` (the supabase-js `accessToken` option does not reach the websocket): public tables still deliver,
 * but `pipeline_runs`/`phase_runs` are admin-read under RLS and deliver nothing — a pill that says `live`
 * over a modal that never updates. Reading `realtime.subscription` proves the join without writing a row.
 */
function subscriptionIssuers(table: string): string[] {
  const out = execFileSync('docker', [
    'exec', 'supabase_db_supabase-local', 'psql', '-U', 'postgres', '-tAc',
    `select coalesce(claims->>'iss','?') from realtime.subscription where entity = 'public.${table}'::regclass`,
  ]).toString().trim()
  return out ? out.split('\n') : []
}

const psql = (sql: string) => execFileSync('docker', [
  'exec', 'supabase_db_supabase-local', 'psql', '-U', 'postgres', '-tAc', sql,
]).toString().trim()

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
  expect(subscriptionIssuers('bets'), 'bets subscriptions joined as').toContain('protero')
  expect(subscriptionIssuers('bets'), 'bets subscriptions joined as').not.toContain('supabase-demo')
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
  expect(subscriptionIssuers('phase_runs'), 'phase_runs subscriptions joined as').toEqual(['protero'])
  await page.waitForTimeout(6_000)
  // The old modal polled every 2 s then every 15 s; a live one makes no further reads.
  expect(reads, 'pipeline/runs reads while live').toBe(afterLive)
})

test('the pipeline modal follows a run written while it is open', async ({ page }) => {
  await signIn(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Run pipeline/ }).click()
  await expect(page.getByTitle(/Subscribed to pipeline_runs \+ phase_runs/)).toHaveText('live', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Basketball' }).click()
  const rows = () => page.locator('div.fixed table tbody tr').count()
  await expect.poll(rows, { timeout: 10_000 }).toBeGreaterThan(3)

  // A throwaway run in the ops tables (never `bets`/`parlays`), removed in `finally`; the cascade drops its phases.
  const id = psql(`insert into pipeline_runs(pipeline, status, details) values ('basketball', 'ok', '{"realtime_test":true}') returning id`).split('\n')[0]
  try {
    psql(`insert into phase_runs(pipeline_run_id, pipeline, phase_name, status) values (${id}, 'basketball', 'rt-a', 'ok'), (${id}, 'basketball', 'rt-b', 'ok'), (${id}, 'basketball', 'rt-c', 'ok')`)
    await expect.poll(rows, { timeout: 10_000, message: 'modal rows after a run lands over Realtime' }).toBe(3)
  } finally {
    psql(`delete from pipeline_runs where id = ${id}`)
  }
})
