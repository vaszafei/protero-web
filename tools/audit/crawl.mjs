import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.PROTERO_BASE || 'http://localhost:3000'
const TOKEN = process.env.PROTERO_SESSION
if (!TOKEN) { console.error('set PROTERO_SESSION — see tools/audit/README.md'); process.exit(1) }

const ROUTES = [
  { name: 'login',             path: '/login' },
  { name: 'dashboard',         path: '/' },
  { name: 'leagues',           path: '/leagues' },
  { name: 'league-football',   path: '/league/premier_league' },
  { name: 'league-basketball', path: '/league/nba' },
  { name: 'game-scheduled',    path: '/game/52032' },
  { name: 'game-completed-fb', path: '/game/52002' },
  { name: 'game-completed-bb', path: '/game/48382' },
  { name: 'wallet',            path: '/wallet' },
  { name: 'entities',          path: '/entities' },
  { name: 'team',              path: '/team/342' },
  { name: 'my-real-bets',      path: '/my-real-bets' },
  { name: 'credits',           path: '/credits' },
  { name: 'account',           path: '/account' },
  { name: 'preferences',       path: '/preferences' },
  { name: 'notifications',     path: '/notifications' },
  { name: 'admin',             path: '/admin' },
  { name: 'player',            path: '/player/1627750?league=nba' },
]

const VIEWPORTS = [
  { key: 'mobile',  width: 390,  height: 844 },
  { key: 'desktop', width: 1440, height: 900 },
]

const results = []

const browser = await chromium.launch()

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  })
  await ctx.addCookies([{ name: 'session_id', value: TOKEN, domain: 'localhost', path: '/' }])

  for (const route of ROUTES) {
    const page = await ctx.newPage()
    const consoleErrors = []
    const pageErrors = []
    const failedRequests = []

    page.on('console', m => {
      if (m.type() === 'error' || m.type() === 'warning') {
        consoleErrors.push(`[${m.type()}] ${m.text().slice(0, 300)}`)
      }
    })
    page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)))
    page.on('response', async r => {
      if (r.status() >= 400) {
        failedRequests.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`)
      }
    })

    const t0 = Date.now()
    let navError = null
    try {
      await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 45000 })
    } catch (e) {
      navError = String(e).slice(0, 200)
    }
    const loadMs = Date.now() - t0

    // settle async renders
    await page.waitForTimeout(2500)

    const metrics = await page.evaluate(() => {
      const de = document.documentElement
      const body = document.body
      const text = (body.innerText || '').trim()
      // horizontal overflow detection
      const overflowing = []
      for (const el of Array.from(document.querySelectorAll('*')).slice(0, 4000)) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2)) {
          const sel = el.tagName.toLowerCase() +
            (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,3).join('.') : '')
          overflowing.push(`${sel} [${Math.round(r.left)}..${Math.round(r.right)}]`)
        }
      }
      return {
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
        hasHScroll: de.scrollWidth > de.clientWidth + 2,
        textLen: text.length,
        textHead: text.slice(0, 400),
        overflowing: [...new Set(overflowing)].slice(0, 8),
        url: location.pathname + location.search,
        emptyish: text.length < 120,
      }
    })

    const shot = `shots/${route.name}-${vp.key}.png`
    try {
      await page.screenshot({ path: shot, fullPage: true })
    } catch { /* ignore */ }

    results.push({
      route: route.name, path: route.path, viewport: vp.key,
      loadMs, navError, ...metrics,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 12),
      pageErrors: [...new Set(pageErrors)].slice(0, 8),
      failedRequests: [...new Set(failedRequests)].slice(0, 12),
    })

    console.log(`${vp.key.padEnd(7)} ${route.name.padEnd(20)} ${String(loadMs).padStart(6)}ms  ` +
      `text=${String(metrics.textLen).padStart(6)}  ` +
      `hscroll=${metrics.hasHScroll ? 'YES' : 'no '}  ` +
      `err=${consoleErrors.length}/${pageErrors.length}  net4xx=${failedRequests.length}` +
      (metrics.url !== route.path.split('?')[0] && !route.path.includes('?') ? `  ->REDIR ${metrics.url}` : '') +
      (navError ? `  NAV_ERR` : ''))

    await page.close()
  }
  await ctx.close()
}

await browser.close()
fs.writeFileSync('results.json', JSON.stringify(results, null, 2))
console.log('\nwrote results.json')
