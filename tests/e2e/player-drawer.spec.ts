import { expect, test } from '@playwright/test'
import { signIn } from './auth'
import { completedBasketballPerLeague } from './ids'

/**
 * #65: the player peek is a right-hand drawer (`UiDrawer`), not a bottom sheet.
 * Open from a player row in a completed basketball game, assert the drawer is
 * anchored to the right edge at full viewport height, Esc and backdrop click
 * close it, focus returns to the row, and the page does not scroll behind it.
 */

const game = completedBasketballPerLeague()[0]

test.describe('player season drawer', () => {
  test('opens right-anchored, closes on Esc and backdrop, restores focus', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`) })
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`))
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`) })

    await signIn(page)
    await page.goto(`/game/${game.id}`, { waitUntil: 'networkidle' })

    const row = page.locator('[data-testid="bball-players-home"] tbody tr').first()
    await row.waitFor()
    await row.click()

    const panel = page.locator('.ui-drawer-panel')
    await expect(panel, 'drawer panel opens').toBeVisible()

    // Let the 240ms slide-in settle before measuring geometry.
    await page.waitForTimeout(400)

    // Anchored to the right edge at full viewport height.
    const box = await panel.boundingBox()
    const viewport = page.viewportSize()
    expect(box, 'drawer bounding box').not.toBeNull()
    if (box && viewport) {
      expect(Math.round(box.x + box.width), 'right edge flush with viewport').toBe(viewport.width)
      expect(Math.round(box.y), 'top flush with viewport').toBe(0)
      expect(Math.round(box.height), 'full viewport height').toBe(viewport.height)
    }

    // The page itself does not scroll behind the drawer.
    const overflow = await page.evaluate(() => {
      const m = document.querySelector('main') || document.body
      return m.scrollHeight - m.clientHeight
    })
    expect(overflow, 'main does not scroll with the drawer open').toBe(0)

    // Focus is inside the drawer.
    const focusedInPanel = await page.evaluate(() => {
      const p = document.querySelector('.ui-drawer-panel')
      return !!p && p.contains(document.activeElement)
    })
    expect(focusedInPanel, 'focus moved into the drawer').toBe(true)

    // Esc closes and focus returns to the row.
    await page.keyboard.press('Escape')
    await expect(panel, 'drawer closes on Esc').toHaveCount(0)
    await expect(row, 'focus returns to the opener row').toBeFocused()

    // Backdrop click closes it again.
    await row.click()
    await expect(panel, 'drawer reopens').toBeVisible()
    await page.locator('.ui-drawer-overlay').click({ position: { x: 5, y: 5 } })
    await expect(panel, 'drawer closes on backdrop click').toHaveCount(0)

    const text = await page.locator('main').innerText()
    expect(text, 'no NaN on the page').not.toMatch(/\bNaN\b/)
    expect(problems, 'console errors / 4xx / 5xx').toEqual([])
  })
})
