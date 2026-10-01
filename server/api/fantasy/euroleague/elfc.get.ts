/**
 * GET /api/fantasy/euroleague/elfc
 *
 * Latest computed squad portfolio for the official EuroLeague Fantasy Challenge
 * (`fantasy.elfc_round`), read from the JSON file the last run wrote.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { requireUserId } from '~/server/utils/auth'

const RESULT_PATH = '/tmp/protero-fantasy-euroleague-elfc.json'

export default defineEventHandler(async (event) => {
  await requireUserId(event)

  if (!existsSync(RESULT_PATH)) {
    return { status: 'none' }
  }
  const stat = statSync(RESULT_PATH)
  const body = JSON.parse(readFileSync(RESULT_PATH, 'utf-8'))
  if (body.error) {
    return { status: 'error', error: body.error, computed_at: stat.mtime.toISOString() }
  }
  return { status: 'ready', computed_at: stat.mtime.toISOString(), result: body }
})
