import { getSupabase } from '~/server/utils/supabase'
import { requireAdmin } from '~/server/utils/auth'
import { PIPELINES, isPipelineActive } from '~/server/utils/pipeline'

/**
 * GET /api/pipeline/runs?pipeline=football — one pipeline's latest run plus
 * the phases it executed.
 *
 * The Python DAG runner writes `pipeline_runs` + `phase_runs`; the bash
 * pipeline writes only a `pipeline_runs` summary. Phases render only where
 * they exist — a bash-only run shows its summary row and "no phase telemetry",
 * never a fabricated breakdown.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const pipeline = query.pipeline as string
  if (!PIPELINES.includes(pipeline)) {
    throw createError({ statusCode: 400, message: `Unknown pipeline: ${pipeline}` })
  }

  const supabase = getSupabase()

  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .select('id, pipeline, status, errors, warnings, elapsed_s, started_at, finished_at, details')
    .eq('pipeline', pipeline)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: error.message })

  let phases: any[] = []
  if (run?.id) {
    const { data: phaseRows, error: phaseErr } = await supabase
      .from('phase_runs')
      .select('phase_name, status, elapsed_s, gate_failed, error_msg, stdout_tail, stderr_tail, started_at, finished_at')
      .eq('pipeline_run_id', run.id)
      .order('started_at', { ascending: true })
      .limit(500)
    if (phaseErr) throw createError({ statusCode: 500, message: phaseErr.message })
    phases = phaseRows || []
  }

  return {
    pipeline,
    active: isPipelineActive(pipeline),
    run: run || null,
    phases,
  }
})
