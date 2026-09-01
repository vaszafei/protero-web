import { spawn, ChildProcess } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'

/**
 * Spawns the Python DAG runner (`python3 -m protero_pipeline run <sport>`),
 * which is the only pipeline that persists per-phase telemetry to
 * `phase_runs`. The bash pipelines write one `pipeline_runs` summary row but
 * no phase detail, so the console's "what was run" modal reads the DAG
 * runner's phases.
 *
 * The child is detached and unref'd so the Nitro request returns immediately
 * while the pipeline keeps running. Progress is read back from `pipeline_runs`
 * / `phase_runs` by the client polling `/api/pipeline/runs` — never from the
 * child's stdout.
 *
 * Safety: one run per pipeline at a time. `activeRuns` is in-process state and
 * is also re-checked against a live `running` row in `pipeline_runs` (a row
 * written by the runner the moment it starts), so a crashed Nitro process
 * cannot leave a second runner running over the first.
 */

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const VENV_PY = `${REPO}/.venv/bin/python3`
const NVM_BIN = '/home/zafnitlab/.nvm/versions/node/v22.22.0/bin'

export const PIPELINES = ['football', 'basketball'] as const
export type Pipeline = (typeof PIPELINES)[number]

interface ActiveRun {
  pid: number
  startedAt: number
  logPath: string
}

const activeRuns = new Map<Pipeline, ActiveRun>()

/** A pipeline run that has been going for more than this is treated as dead. */
const MAX_RUN_MS = 2 * 60 * 60 * 1000 // 2h

export function spawnPipelineRun(pipeline: Pipeline, dryRun: boolean): ActiveRun {
  const args = ['-m', 'protero_pipeline', 'run', pipeline]
  if (dryRun) args.push('--dry-run')

  const logPath = `/tmp/protero-pipeline-${pipeline}-${Date.now()}.log`
  const out = openSync(logPath, 'a')

  const child: ChildProcess = spawn(VENV_PY, args, {
    cwd: REPO,
    detached: true,
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      // The runner shells out to psql (persistence.py) and node (phase cmds).
      PATH: `${NVM_BIN}:/usr/local/bin:/usr/bin:/bin`,
    },
  })

  const run: ActiveRun = { pid: child.pid!, startedAt: Date.now(), logPath }
  activeRuns.set(pipeline, run)

  child.on('exit', () => {
    const cur = activeRuns.get(pipeline)
    // Only clear if this is still the run we registered (no newer spawn).
    if (cur && cur.pid === run.pid) activeRuns.delete(pipeline)
    try { closeSync(out) } catch { /* already closed */ }
  })
  child.on('error', () => {
    if (activeRuns.get(pipeline)?.pid === run.pid) activeRuns.delete(pipeline)
  })
  child.unref()

  return run
}

/** Is a run of this pipeline in flight? (in-process OR a live DB row) */
export function isPipelineActive(pipeline: Pipeline): boolean {
  const run = activeRuns.get(pipeline)
  if (run) {
    // A live child keeps the entry; an exited one is removed on 'exit'.
    if (Date.now() - run.startedAt < MAX_RUN_MS) return true
    activeRuns.delete(pipeline)
  }
  return false
}

export function activeLogPath(pipeline: Pipeline): string | null {
  return activeRuns.get(pipeline)?.logPath ?? null
}
