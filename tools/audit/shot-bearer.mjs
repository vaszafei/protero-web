#!/usr/bin/env node
/**
 * Screenshot one page signed in the way the app really signs in: a Bearer JWT in
 * localStorage, no session cookie. `check.mjs` injects a `session_id` cookie instead, which
 * passes on pages whose endpoints read the cookie and hides a 401 on those that send the
 * Bearer header (props slate buttons, 2026-09-30).
 *
 *   node tools/audit/shot-bearer.mjs /wallet/29 out.png 'tab:Slate' 'tab:Slips' 'Yam Madar'
 *
 * Each extra argument is a click: `tab:<name>` = the button with exactly that name, anything
 * else = the first element containing that text. Prints page/viewport dimensions (a page fits
 * one screen when sh == ch) plus console errors and failed requests. `npm run dev` must be up.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .filter(l => /^[A-Z_]+=/.test(l))
  .map(l => [l.split('=')[0], l.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')]))

const b64 = x => Buffer.from(x).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const now = Math.floor(Date.now() / 1000)
const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const body = b64(JSON.stringify({ iss: 'protero', sub: '1', role: 'authenticated', user_id: 1, iat: now, exp: now + 900 }))
const sig = createHmac('sha256', env.SUPABASE_JWT_SECRET).update(`${head}.${body}`).digest('base64')
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const token = `${head}.${body}.${sig}`

const [, , path = '/', out = 'shot.png', ...clicks] = process.argv
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1918, height: 989 } })
const problems = []
page.on('console', m => { if (m.type() === 'error') problems.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`) })
await page.addInitScript(t => localStorage.setItem('protero.access_token', t), token)
await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
for (const c of clicks) {
  if (c.startsWith('tab:')) await page.getByRole('button', { name: c.slice(4), exact: true }).first().click()
  else await page.getByText(c, { exact: false }).first().click()
  await page.waitForTimeout(600)
}
const dims = await page.evaluate(() => {
  const m = document.querySelector('main') || document.body
  return { sh: m.scrollHeight, ch: m.clientHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
})
await page.screenshot({ path: out })
console.log(JSON.stringify({ dims, problems }))
await browser.close()
