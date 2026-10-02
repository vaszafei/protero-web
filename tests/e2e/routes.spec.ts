import { expect, test } from '@playwright/test'
import { allowlist, DEFAULT_REQUEST_BUDGET } from './allowlist'
import { signIn } from './auth'
import { routes } from './routes'

const BANNED_TEXT = [/\bNaN\b/, /\bundefined\b/, /\bInfinity\b/, /\bnull%/, /\[object Object\]/, /Invalid Date/]

const isDataRequest = (url: string) => /\/api\/|\/rest\/v1\//.test(url)

for (const route of routes()) {
  test(`${route.key} (${route.path})`, async ({ page }) => {
    const problems: string[] = []
    let dataRequests = 0
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`) })
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`))
    page.on('request', (r) => { if (isDataRequest(r.url())) dataRequests++ })
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`) })

    await signIn(page)
    await page.goto(route.path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    const allowed = allowlist[route.key]
    const overflow = await page.evaluate(() => {
      const m = document.querySelector('main') || document.body
      return m.scrollHeight - m.clientHeight
    })
    const text = await page.evaluate(() => document.body.innerText)

    console.log(`MEASURE ${route.key} overflow=${overflow} requests=${dataRequests} problems=${problems.length}`)
    expect(problems, 'console errors / 4xx / 5xx').toEqual([])
    for (const re of BANNED_TEXT) expect(text, `body text matches ${re}`).not.toMatch(re)
    expect(overflow, `main overflows by ${overflow}px${allowed ? ` (allowlisted to ${allowed.overflow ?? 0}, ${allowed.ticket})` : ''}`)
      .toBeLessThanOrEqual(allowed?.overflow ?? 0)
    expect(dataRequests, 'data requests').toBeLessThanOrEqual(allowed?.requests ?? DEFAULT_REQUEST_BUDGET)
  })
}
