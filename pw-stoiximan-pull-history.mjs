#!/usr/bin/env node
/**
 * pw-stoiximan-pull-history.mjs — attach to the logged-in Playwright Chromium
 * (CDP :9222) and pull Stoiximan's bet-history-v3 for a date range.
 *
 * The API caps a query at ~180 days (search-settings.LargestSearchPeriodInDays)
 * and cursor-paginates within the window:
 *   bet-history-v3?startDate=<ISO>&endDate=<ISO>&settled=<bool>&page=<n>&lastId=<Result.LastId>
 * Result.LastId is the BetId of the last row; feed it back as lastId. Stop a
 * window when Bets is empty or the cursor repeats.
 *
 * We walk 150-day windows backward from --to to --from.
 *
 * USAGE
 *   node pw-stoiximan-pull-history.mjs --from=2026-01-01 --to=2026-09-09
 *   node pw-stoiximan-pull-history.mjs --from=2026-01-01 --to=2026-09-09 --settled-only
 *
 * OUTPUT (data/):
 *   pw-stoiximan-history-settled.jsonl   one line per API batch (raw)
 *   pw-stoiximan-history-open.jsonl
 *   pw-stoiximan-history-all.json        merged + deduped by BetId
 */

import { chromium } from 'playwright'
import { writeFileSync, appendFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'protero-tools', 'data')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`))
  return hit ? hit.split('=')[1] : d
}
const FROM = new Date(arg('from', '2026-01-01') + 'T00:00:00.000Z')
const TO = new Date(arg('to', new Date().toISOString().slice(0, 10)) + 'T23:59:59.000Z')
const SETTLED_ONLY = process.argv.includes('--settled-only')
const WINDOW_DAYS = 150

function windows() {
  const out = []
  let end = new Date(TO)
  while (end > FROM) {
    const start = new Date(Math.max(FROM.getTime(), end.getTime() - WINDOW_DAYS * 864e5))
    out.push({ start: new Date(start), end: new Date(end) })
    end = new Date(start.getTime() - 1000)
  }
  return out
}

async function pullWindow(page, settled, start, end, byId, out) {
  let cursor = null
  let batch = 0
  const seen = new Set()
  const label = `${settled ? 'settled' : 'open'} ${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`
  while (batch < 4000) {
    const params = new URLSearchParams({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      settled: String(settled),
      page: String(batch + 1),
    })
    if (cursor) params.set('lastId', String(cursor))
    const url = `/myaccount/api/ma/bet/bet-history-v3?${params}`
    let res
    try {
      res = await page.evaluate(async (u) => {
        const r = await fetch(u, { headers: { accept: 'application/json' }, credentials: 'include' })
        return { status: r.status, text: await r.text() }
      }, url)
    } catch (e) { console.log(`[${label}] evaluate error: ${e.message}`); break }
    if (res.status !== 200) { console.log(`[${label}] HTTP ${res.status}: ${res.text.slice(0, 160)}`); break }
    let json
    try { json = JSON.parse(res.text) } catch { console.log(`[${label}] non-JSON: ${res.text.slice(0, 160)}`); break }
    const bets = json?.Result?.Bets || []
    const next = json?.Result?.LastId ?? null
    appendFileSync(out, JSON.stringify({ window: [start, end], batch, cursor, next, count: bets.length, json }) + '\n')
    for (const b of bets) byId.set(b.BetId, b)
    const oldest = bets.length ? (bets.at(-1).PlacedAt || '').slice(0, 10) : '—'
    console.log(`[${label}] batch ${batch}: ${bets.length} bets (running total ${byId.size}), oldest ${oldest}`)
    if (bets.length === 0 || next == null) break
    if (seen.has(String(next))) { console.log(`[${label}] cursor repeated — window done`); break }
    seen.add(String(next))
    cursor = next
    batch++
    await sleep(450)
  }
}

async function pull(page, settled) {
  const tag = settled ? 'settled' : 'open'
  const out = join(DATA, `pw-stoiximan-history-${tag}.jsonl`)
  if (existsSync(out)) rmSync(out)
  const byId = new Map()
  for (const w of windows()) await pullWindow(page, settled, w.start, w.end, byId, out)
  const all = [...byId.values()].sort((a, b) => (a.PlacedAt < b.PlacedAt ? 1 : -1))
  console.log(`[${tag}] TOTAL unique: ${all.length}  range ${all.at(-1)?.PlacedAt?.slice(0, 10)} .. ${all[0]?.PlacedAt?.slice(0, 10)}`)
  return all
}

async function main() {
  console.log(`range ${FROM.toISOString().slice(0, 10)} .. ${TO.toISOString().slice(0, 10)}  (${windows().length} windows of ${WINDOW_DAYS}d)`)
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
  const ctx = browser.contexts()[0]
  if (!ctx) throw new Error('no browser context over CDP')
  let page = ctx.pages().find((p) => p.url().includes('stoiximan.gr')) || ctx.pages()[0]
  if (!page) page = await ctx.newPage()
  console.log('attached. page:', page.url())
  if (!/stoiximan\.gr/.test(page.url())) {
    await page.goto('https://www.stoiximan.gr/myaccount/bethistory/open', { waitUntil: 'domcontentloaded' })
  }

  const settled = await pull(page, true)
  const open = SETTLED_ONLY ? [] : await pull(page, false)

  writeFileSync(
    join(DATA, 'pw-stoiximan-history-all.json'),
    JSON.stringify({ pulledAt: new Date().toISOString(), from: FROM, to: TO, settled, open }, null, 2),
  )
  console.log(`\nWrote ${settled.length} settled + ${open.length} open → data/pw-stoiximan-history-all.json`)
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
