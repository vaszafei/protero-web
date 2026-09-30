/**
 * POST /api/props/slate/run  { league, date }
 *
 * Loads one league's player-props slate for a date — injuries, Stoiximan capture,
 * props board, candidates — as one detached job; the client polls
 * /api/props/slate/status. See server/utils/props-slate.ts.
 */
import { requireAdmin } from '~/server/utils/auth'
import { LEAGUES, runLoad, type League } from '~/server/utils/props-slate'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ league?: string, date?: string }>(event)
  const league = body?.league as League
  if (!(league in LEAGUES)) throw createError({ statusCode: 400, statusMessage: `unknown league ${body?.league}` })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body?.date || '')) throw createError({ statusCode: 400, statusMessage: 'date must be YYYY-MM-DD' })

  const job = runLoad(league, body!.date!)
  return { started: true, league, date: job.date, log_path: job.logPath }
})
