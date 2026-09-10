#!/usr/bin/env node
/**
 * pw-stoiximan-capture.mjs — Phase A (Playwright edition): headful capture of
 * Stoiximan's bet-history traffic for the user_real_bets export
 * (handoff 2026-09-08-stoiximan-bet-history-export.md).
 *
 * Replaces the Puppeteer capture with a PERSISTENT Playwright context that also
 * exposes CDP on --remote-debugging-port=9222, so the agent can attach and
 * inspect pages live (capture-attach.mjs precedent).
 *
 * WE NEVER TYPE OR CAPTURE CREDENTIALS. The owner logs in by hand in the visible
 * window. This script only listens to the network and snapshots bet-history DOM.
 *
 * USAGE
 *   node bin/pw-stoiximan-capture.mjs            # launch + capture (run in bg)
 *   node bin/pw-stoiximan-capture.mjs --summary  # analyse the JSONL
 *
 * Files (all under protero-tools/data/):
 *   pw-stoiximan-profile/            persistent Chromium profile
 *   pw-stoiximan-traffic.jsonl      one JSON per line: {ts,method,url,status,contentType,body?}
 *   pw-stoiximan-dom.jsonl          DOM text snapshots of bet-history-looking pages
 */

// Playwright is only installed under protero-frontend/node_modules (undeclared
// dep, per the handoff) — this script MUST live in and run from that dir.
import { chromium } from 'playwright'
import {
  mkdirSync, existsSync, readFileSync, appendFileSync, statSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'protero-tools', 'data')
const PROFILE = join(DATA, 'pw-stoiximan-profile')
const CAPTURE = join(DATA, 'pw-stoiximan-traffic.jsonl')
const DOMDUMP = join(DATA, 'pw-stoiximan-dom.jsonl')
const CDP_PORT = 9222

const URL_HINT = /(bet|history|transaction|slip|coupon|wager|statement|my-?account|my-?bets|balance|settled|open-bets)/i
const DOM_HINT = /(history|transaction|statement|my-?account|my-?bets|mybets)/i
const SKIP_EXT = /\.(png|jpe?g|gif|svg|webp|woff2?|css|js|ico|mp4|webm)(\?|$)/i
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function summarize() {
  if (!existsSync(CAPTURE)) { console.log('No capture file yet:', CAPTURE); return }
  const hits = readFileSync(CAPTURE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const byUrl = new Map()
  for (const h of hits) {
    const u = new URL(h.url)
    const key = `${u.origin}${u.pathname}`
    const cur = byUrl.get(key) || { count: 0, methods: new Set(), hasBody: false }
    cur.count++; cur.methods.add(h.method); if (h.body) cur.hasBody = true
    byUrl.set(key, cur)
  }
  const rows = [...byUrl.entries()].sort((a, b) => b[1].count - a[1].count)
  console.log(`\n${hits.length} captured requests, ${rows.length} unique endpoints:\n`)
  for (const [key, v] of rows) {
    console.log(`  ${String(v.count).padStart(4)}  [${[...v.methods].join(',')}]${v.hasBody ? '  JSON' : ''}  ${key}`)
  }
  console.log('\nJSON bodies (first 800 chars each, deduped by endpoint):')
  const seen = new Set()
  for (const h of hits) {
    if (!h.body) continue
    const u = new URL(h.url)
    const key = `${u.origin}${u.pathname}`
    if (seen.has(key)) continue
    seen.add(key)
    console.log(`\n--- ${h.method} ${key} (status ${h.status}) ---`)
    console.log(String(h.body).slice(0, 800))
  }
}

async function main() {
  if (process.argv.includes('--summary')) { summarize(); return }

  mkdirSync(PROFILE, { recursive: true })
  mkdirSync(DATA, { recursive: true })

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1400, height: 1600 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    args: [
      `--remote-debugging-port=${CDP_PORT}`,
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
    ],
  })

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  ctx.on('response', async (res) => {
    try {
      const req = res.request()
      const url = req.url()
      if (SKIP_EXT.test(url)) return
      if (!URL_HINT.test(url)) return
      const rt = req.resourceType()
      if (rt !== 'xhr' && rt !== 'fetch' && rt !== 'document') return
      let body = null
      const ct = (res.headers()['content-type'] || '')
      if (ct.includes('json')) {
        const txt = await res.text().catch(() => null)
        if (txt && txt.length < 3_000_000) body = txt
      }
      appendFileSync(CAPTURE, JSON.stringify({
        ts: new Date().toISOString(),
        method: req.method(), url, status: res.status(), contentType: ct, body,
      }) + '\n')
    } catch { /* never let a listener kill the session */ }
  })

  const page = ctx.pages()[0] || (await ctx.newPage())

  const dumped = new Set()
  const domSweep = async () => {
    try {
      const url = page.url()
      if (!DOM_HINT.test(url) || dumped.has(url)) return
      const text = await page.evaluate(() => document.body.innerText.slice(0, 500_000))
      appendFileSync(DOMDUMP, JSON.stringify({ ts: new Date().toISOString(), url, text }) + '\n')
      dumped.add(url)
      console.log(`[dom] captured ${url} (${text.length} chars)`)
    } catch { /* */ }
  }

  console.log('▶ Playwright headful Chromium. DISPLAY:', process.env.DISPLAY)
  console.log('  CDP:            http://127.0.0.1:' + CDP_PORT)
  console.log('  Profile:        ', PROFILE)
  console.log('  Traffic file:   ', CAPTURE)
  await page.goto('https://www.stoiximan.gr/el/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    .catch((e) => console.log('  (initial nav note:', e.message, ')'))

  await page.evaluate(() => {
    ;[...document.querySelectorAll('button, a')].forEach((b) => {
      if (/Αποδοχή|Accept|Συμφωνώ|ΔΕΧΟΜΑΙ/i.test(b.innerText || '')) { try { b.click() } catch (_) {} }
    })
  }).catch(() => {})

  console.log('\n════════════════════════════════════════════════════════════════')
  console.log('  LOG IN MANUALLY, then open My Bets / Bet History.')
  console.log('  Filter FROM 2026-01-01 and paginate/scroll to the end.')
  console.log('  Network capture is running. Tell the agent when done.')
  console.log('════════════════════════════════════════════════════════════════\n')

  let n = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(8000)
    await domSweep()
    n += 8
    if (n % 64 === 0) {
      const size = existsSync(CAPTURE) ? (statSync(CAPTURE).size / 1024).toFixed(1) : '0'
      console.log(`[capture] ${n}s elapsed, traffic ${size} KB`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
