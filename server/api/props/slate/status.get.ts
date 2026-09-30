/**
 * GET /api/props/slate/status?league=euroleague|eurocup&date=YYYY-MM-DD
 *
 * What exists for this date's player-props slate — injury snapshot, capture,
 * research freeze, candidate tiers — plus the state and log tail of each step's
 * last job. Read-only; see server/utils/props-slate.ts.
 */
import { requireAdmin } from '~/server/utils/auth'
import { LEAGUES, slateStatus, type League } from '~/server/utils/props-slate'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const league = String(q.league || '') as League
  const date = String(q.date || '')
  if (!(league in LEAGUES)) throw createError({ statusCode: 400, statusMessage: `unknown league ${q.league}` })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, statusMessage: 'date must be YYYY-MM-DD' })
  return slateStatus(league, date)
})
