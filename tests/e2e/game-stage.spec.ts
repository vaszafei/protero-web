import { expect, test } from '@playwright/test'
import { signIn } from './auth'
import { discover } from './ids'

/**
 * #63: football and basketball, scheduled and completed, share ONE three-column stage. The header's
 * place, the rail widths and the centre anchor are the same in all four, the page fits one screen,
 * and the tab rail comes from the one matrix.
 */

const id = discover()

const FIXTURES = [
  { name: 'scheduled football', id: id.scheduledFootball, layout: 'flow' },
  { name: 'scheduled basketball', id: id.scheduledBasketball, layout: 'flow' },
  { name: 'completed football', id: id.completedWithLineup, layout: 'fit-fixed' },
  { name: 'completed basketball', id: id.completedBasketball, layout: 'fit-fill' },
]

type Box = { left: number; top: number; width: number; height: number }

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const box = (e: Element | null): Box | null => {
      if (!e) return null
      const b = e.getBoundingClientRect()
      return { left: Math.round(b.left), top: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) }
    }
    const q = (s: string) => document.querySelector(s)
    const main = q('main')!
    return {
      layout: q('[data-testid="game-stage"]')?.getAttribute('data-layout'),
      left: box(q('[data-testid="stage-left"]')),
      centre: box(q('[data-testid="stage-centre"]')),
      right: box(q('[data-testid="stage-right"]')),
      header: box(q('[data-testid="stage-centre"] .game-header-card')),
      tabs: box(q('[data-testid="stage-tabs"]')),
      pageScroll: main.scrollHeight - main.clientHeight,
      text: main.innerText,
    }
  })
}

const seen: Record<string, Awaited<ReturnType<typeof measure>>> = {}

for (const f of FIXTURES) {
  test(`${f.name}: one stage, one screen, no NaN`, async ({ page }) => {
    await signIn(page)
    await page.goto(`/game/${f.id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await expect(page.locator('[data-testid="game-stage"]')).toHaveCount(1)

    const m = await measure(page)
    seen[f.name] = m
    expect(m.layout).toBe(f.layout)
    expect(m.pageScroll, 'page scroll').toBe(0)
    expect(m.text, 'no NaN').not.toMatch(/\bNaN\b/)
    for (const part of [m.left, m.centre, m.right, m.header]) expect(part).not.toBeNull()
  })
}

test('the four states share header position, rail widths and the centre anchor', () => {
  const all = FIXTURES.map((f) => seen[f.name])
  expect(all.every(Boolean), 'all four measured').toBe(true)
  const ref = all[0]
  for (const m of all) {
    expect(m.centre!.left, 'centre left').toBe(ref.centre!.left)
    expect(m.centre!.width, 'centre width').toBe(ref.centre!.width)
    expect(m.header!.left, 'header left').toBe(ref.header!.left)
    expect(m.header!.top, 'header top').toBe(ref.header!.top)
    expect(m.header!.width, 'header width').toBe(ref.header!.width)
    expect(m.left!.left, 'left rail left').toBe(ref.left!.left)
    expect(m.left!.width, 'left rail width').toBe(ref.left!.width)
    expect(m.right!.left, 'right rail left').toBe(ref.right!.left)
    expect(m.right!.width, 'right rail width').toBe(ref.right!.width)
  }
})

test('the tab rail names come from the matrix, in the same order for both sports', async ({ page }) => {
  await signIn(page)
  const rail = async (gid: string) => {
    await page.goto(`/game/${gid}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    return page.locator('[data-testid="stage-tabs"] .tabs-head [role="tab"], [data-testid="stage-tabs"] .tabs-head button')
      .allInnerTexts()
  }
  const fb = (await rail(id.scheduledFootball)).map((t) => t.trim().split(/\s+/)[0])
  const bb = (await rail(id.scheduledBasketball)).map((t) => t.trim().split(/\s+/)[0])
  expect(fb.slice(0, 3)).toEqual(['Market', 'Analysis', 'Prediction'])
  expect(bb.slice(0, 2)).toEqual(['Analysis', 'Prediction'])
})
