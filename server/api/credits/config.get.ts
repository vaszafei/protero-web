/**
 * GET /api/credits/config
 * Returns all public-facing credits config values.
 * No authentication required — these are display values for the UI.
 */
import { getAllCreditsConfig } from '~/server/utils/credits'

export default defineEventHandler(async () => {
  const config = await getAllCreditsConfig()
  return { config }
})
