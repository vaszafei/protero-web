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
 *   2. The three CLI gates — settlement_audit, wallet_reconcile, verify_masks.
 *      These run via `bash scripts/gates.sh` and persist NOTHING to the DB
 *      (there is no operation_logs table). The frontend cannot import a Python
 *      CLI, so they must render as "not recorded" with the exact command to
 *      run them — never as a fabricated green tick.
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

  return {
    pipelines,
    cli_gates: [
      {
        key: 'settlement_audit',
        label: 'Settlement audit (verdicts)',
        command: 'cd protero-ml && python3 -m common.settlement_audit --strict',
        recorded: false,
        reason: 'CLI-only; writes nothing to the database.',
      },
      {
        key: 'wallet_reconcile',
        label: 'Wallet reconcile (money)',
        command: 'cd protero-ml && python3 -m common.wallet_reconcile',
        recorded: false,
        reason: 'CLI-only; writes nothing to the database.',
      },
      {
        key: 'verify_masks',
        label: 'Mask verification (evidence)',
        command: 'cd protero-ml && python3 -m ml.v6.verify_masks',
        recorded: false,
        reason: 'CLI-only; writes nothing to the database.',
      },
    ],
  }
})
