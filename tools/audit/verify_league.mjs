import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE = 'http://127.0.0.1:3000'
const TOKEN = fs.readFileSync('/tmp/claude-1000/-home-zafnitlab-Desktop-Projects-protero/ef3d8023-acba-45d7-9cf4-cd469d28deff/scratchpad/token.txt', 'utf8').trim()
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } })
await ctx.addCookies([{ name: 'session_id', value: TOKEN, domain: '127.0.0.1', path: '/' }])
const p = await ctx.newPage()
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) })
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 300)))
await p.goto(BASE + '/league/la_liga', { waitUntil: 'networkidle', timeout: 45000 })
await p.waitForTimeout(2500)
const roundText = await p.locator('.panel-title').first().innerText().catch(() => 'NOT FOUND')
const seasonBarText = await p.locator('text=Opening rounds, text=In progress, text=Run-in, text=Not started, text=Complete').first().innerText().catch(() => 'N/A')
console.log('roundText (panel-title, RD N):', JSON.stringify(roundText))
;[...new Set(errs)].slice(0, 10).forEach(e => console.log('ERR', e))
await p.screenshot({ path: 'shots/verify-la-liga.png', fullPage: true })
await b.close()
