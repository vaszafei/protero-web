import { getSupabase } from '~/server/utils/supabase'

/**
 * GET /api/gates — the gate-status readout for the operator console.
 *
 * Two classes of data, kept honest about the difference:
 *
 *   1. Pipeline health — the most recent `pipeline_runs` row per pipeline.
 *      These are written daily by the production pipeline's finalize step
 *      (`pipeline-report.js`), so they are a live signal.
 *
 *   2. Regression gates — `bash scripts/gates.sh`, run unattended by
 *      `protero-gates.timer` every 6h via `common.gate_recorder`, which
 *      persists one `gate_runs` row per invocation (roadmap A4). The latest
 *      row is reported here. If no row exists yet (the timer hasn't fired, or
 *      the recorder was never run), the gates render as "not recorded" with
 *      the exact command to run them — never as a fabricated green tick.
 */
export default defineEventHandler(async () => {
  const supabase = getSupabase()

  // Latest run per pipeline, newest first.
  const { data: runs, error } = await supabase
    .from('pipeline_runs')
    .select('pipeline, status, errors, warnings, started_at, finished_at')
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) throw createError({ statusCode: 500, message: error.message })

  const latest = new Map<string, any>()
  for (const r of (runs || [])) {
    if (!latest.has(r.pipeline)) latest.set(r.pipeline, r)
  }

  const pipelines = [...latest.values()].map((r: any) => ({
    pipeline: r.pipeline,
    status: r.status,
    errors: r.errors ?? 0,
    warnings: r.warnings ?? 0,
    started_at: r.started_at,
    finished_at: r.finished_at,
  }))

  // Latest regression-gate run, if the timer has fired at least once.
  const { data: gateRun, error: gateError } = await supabase
    .from('gate_runs')
    .select('status, passed, failed, started_at, finished_at, gates')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (gateError) throw createError({ statusCode: 500, message: gateError.message })

  const recorded = gateRun?.gates ?? null

  return {
    pipelines,
    gate_run: gateRun
      ? {
          status: gateRun.status,
          passed: gateRun.passed ?? 0,
          failed: gateRun.failed ?? 0,
          started_at: gateRun.started_at,
          finished_at: gateRun.finished_at,
        }
      : null,
    // Per-gate rows for the table. If nothing recorded, render the canonical
    // six gates with the command to run them, marked "not recorded".
    cli_gates: recorded
      ? (recorded as any[]).map((g: any) => ({
          key: g.label,
          label: g.label,
          status: g.status === 'ok' ? 'ok' : 'failed',
          recorded: true,
        }))
      : [
          {
            key: 'settlement_audit',
            label: 'Settlement audit (verdicts)',
            status: 'unrecorded',
            recorded: false,
            reason: 'run `bash scripts/gates.sh`',
          },
          {
            key: 'wallet_reconcile',
            label: 'Wallet reconcile (money)',
            status: 'unrecorded',
            recorded: false,
            reason: 'run `bash scripts/gates.sh`',
          },
          {
            key: 'verify_masks',
            label: 'Mask verification (evidence)',
            status: 'unrecorded',
            recorded: false,
            reason: 'run `bash scripts/gates.sh`',
          },
        ],
  }
})
