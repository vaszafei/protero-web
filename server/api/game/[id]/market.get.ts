import { getSupabase } from '~/server/utils/supabase'
import { requireUserId } from '~/server/utils/auth'
import { buildGameBoard, fetchBoardInputs } from '~/server/utils/market-board'

/**
 * The market board for one fixture. Every builder lives in `server/utils/market-board.ts`, so
 * this endpoint and `GET /api/league/[key]/round-board` cannot disagree about a number.
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const gameId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(gameId)) {
    throw createError({ statusCode: 400, message: 'Numeric game id required' })
  }

  const inputs = await fetchBoardInputs(getSupabase(), [gameId])
  return buildGameBoard(gameId, inputs)
})
