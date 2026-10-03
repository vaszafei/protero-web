import { requireUserId } from '~/server/utils/auth'
import { fetchGameCorrelations } from '~/server/utils/slip-sim'

/**
 * The Monte-Carlo same-game joint sim (`ml/slips/slip_sim.py`) for one football fixture. It stays on
 * Nitro because it spawns a host Python process, which the Edge runtime's container cannot reach —
 * every other part of the game page is in the `game-page` Edge Function. Computed live per request, no
 * DB write (2026-09-14 scoping decision); descriptive only (C2): it never feeds a mask, a stake or a
 * probability. The page merges the result into the bundle's analysis record.
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const gameId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(gameId)) {
    throw createError({ statusCode: 400, message: 'Numeric game id required' })
  }

  const sim = await fetchGameCorrelations(gameId)
  return sim
    ? { status: 'available' as const, ...sim }
    : { status: 'insufficient_data' as const, note: 'simulation unavailable for this fixture' }
})
