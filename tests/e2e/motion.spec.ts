import { expect, test } from '@playwright/test'
import { signIn } from './auth'

/** The motion contract (#46): reduced motion means no animation, and the splash never lingers. */

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const path of ['/', '/wallet/26', '/wallet', '/leagues']) {
    test(`${path} runs no animation once loaded`, async ({ page }) => {
      await signIn(page)
      await page.goto(path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      const running = await page.evaluate(() =>
        document.getAnimations().filter(a => a.playState === 'running').map(a => (a as any).animationName || (a as any).transitionProperty || 'unnamed'))
      expect(running, 'animations still running').toEqual([])
    })
  }

  test('the splash is skipped', async ({ page }) => {
    await signIn(page)
    await page.goto('/wallet/26', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.splash-screen')).toHaveCount(0)
  })
})

test('a hard reload shows content with no splash left once data has arrived', async ({ page }) => {
  await signIn(page)
  await page.goto('/wallet/26', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await expect(page.locator('.splash-screen')).toHaveCount(0)
  await expect(page.locator('[data-testid="pnl"]').first()).toBeVisible()
})
