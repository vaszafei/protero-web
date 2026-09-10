import { getRecentOperations } from '~/server/utils/operations'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Operator-only surface: this runs on the service-role client, which bypasses RLS.
  await requireAdmin(event)

  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 20
    
    const logs = await getRecentOperations(limit)
    
    return {
      logs: logs.map((log: any) => ({
        id: log.id,
        operation: log.operation,
        status: log.status,
        affectedCount: log.affected_count,
        details: log.details,
        errorMessage: log.error_message,
        startedAt: log.started_at,
        completedAt: log.completed_at,
        durationMs: log.duration_ms
      }))
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})
