/**
 * GET /api/fixtures/search?q=Home - Away&date=YYYY-MM-DD&sport=football
 *
 * Candidate `games` rows for a hand-typed match string around a date, for the
 * Add-bet modal's per-leg "bind to fixture" step. Returns candidates only —
 * the operator picks; see `server/utils/fixture-search.ts`.
 */
import { requireUserId } from '~/server/utils/auth'
import { searchFixtures } from '~/server/utils/fixture-search'

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const { q, date, sport } = getQuery(event) as Record<string, string | undefined>
  if (!q || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: 'q and date=YYYY-MM-DD are required' })
  }
  const sp = sport === 'basketball' ? 'basketball' : 'football'
  return { candidates: await searchFixtures(q.slice(0, 120), date, sp) }
})
