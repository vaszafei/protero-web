import { getSupabase } from '~/server/utils/supabase'
import { requireAdmin } from '~/server/utils/auth'
import { PIPELINES, isPipelineActive, spawnPipelineRun } from '~/server/utils/pipeline'

/**
 * POST /api/pipeline/run — kick off a pipeline from the control room.
 *
 * Runs the Python DAG runner (`python3 -m protero_pipeline run <sport>`), the
 * only pipeline that writes per-phase telemetry to `phase_runs`, so the
 * "what was run" modal can list each phase as it lands. The bash pipelines are
 * still the scheduled production path; this is the operator's on-demand
 * trigger and shares the same DAG the runner has always used.
 *
 * Guard: one run per pipeline at a time. Both the in-process tracker and the
 * live `pipeline_runs` row are checked, so a stale `running` row (a runner
 * that died mid-flight) does not block a retry forever.
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

  // A live `running` row means the DAG runner is mid-flight (or crashed and
  // left the row stuck — allow a retry only if the row is clearly orphaned).
  const supabase = getSupabase()
  const { data: runningRows } = await supabase
    .from('pipeline_runs')
    .select('id, started_at')
    .eq('pipeline', pipeline)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)

  if (runningRows?.length) {
    const row = runningRows[0]
    const ageMs = Date.now() - new Date(row.started_at).getTime()
    // The runner closes its row within seconds of finishing; anything still
    // 'running' after 2h is an orphan, not a live pipeline.
    if (ageMs < 2 * 60 * 60 * 1000) {
      throw createError({ statusCode: 409, message: `${pipeline} is already running` })
    }
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
