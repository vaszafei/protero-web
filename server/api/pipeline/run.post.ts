import { requireAdmin } from '~/server/utils/auth'
import { PIPELINES, isPipelineActive, spawnPipelineRun } from '~/server/utils/pipeline'

/**
 * POST /api/pipeline/run — kick off a pipeline from the control room.
 *
 * Runs the production bash pipeline, the same script the systemd timer runs;
 * its steps land in `phase_runs` when it finishes, so the "what was run" modal
 * lists them. Guard: one run per pipeline at a time — in-process, or the
 * systemd unit already running (`isPipelineActive`).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const pipeline = body?.pipeline
  const dryRun = body?.dry_run === true

  if (!PIPELINES.includes(pipeline)) {
    throw createError({ statusCode: 400, message: `Unknown pipeline: ${pipeline}` })
  }

  if (isPipelineActive(pipeline)) {
    throw createError({ statusCode: 409, message: `${pipeline} is already running` })
  }

  const run = spawnPipelineRun(pipeline, dryRun)
  return {
    started: true,
    pipeline,
    dry_run: dryRun,
    pid: run.pid,
    log_path: run.logPath,
  }
})
