import { spawn, spawnSync, ChildProcess } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'

/**
 * Spawns the production bash pipeline (`protero-tools/pipeline/protero-<sport>.sh`),
 * the same script the systemd timer runs. It writes one `pipeline_runs` row and
 * its step rows in `phase_runs` when it finishes (pipeline-report.js), which is
 * what the console's "what was run" modal reads. It used to spawn the Python DAG
 * runner, archived 2026-09-22 (#17).
 *
 * The child is detached and unref'd so the Nitro request returns immediately
 * while the pipeline keeps running. Progress is read back from `pipeline_runs`
 * / `phase_runs` by the client polling `/api/pipeline/runs` — never from the
 * child's stdout.
 *
 * Safety: one run per pipeline at a time. `activeRuns` is in-process state, and
 * the systemd unit is asked too, so the button cannot start a second run over
 * the timer's.
 */

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
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
  const args = [`${REPO}/protero-tools/pipeline/protero-${pipeline}.sh`]
  if (dryRun) args.push('--dry-run')

  const logPath = `/tmp/protero-pipeline-${pipeline}-${Date.now()}.log`
  const out = openSync(logPath, 'a')

  const child: ChildProcess = spawn('/bin/bash', args, {
    cwd: REPO,
    detached: true,
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
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

/** Is a run of this pipeline in flight? (in-process OR the systemd unit) */
export function isPipelineActive(pipeline: Pipeline): boolean {
  const run = activeRuns.get(pipeline)
  if (run) {
    // A live child keeps the entry; an exited one is removed on 'exit'.
    if (Date.now() - run.startedAt < MAX_RUN_MS) return true
    activeRuns.delete(pipeline)
  }
  // `is-active` exits 0 only while the timer's run is going (also 'activating').
  return spawnSync('systemctl', ['is-active', '--quiet', `protero-${pipeline}.service`]).status === 0
}

export function activeLogPath(pipeline: Pipeline): string | null {
  return activeRuns.get(pipeline)?.logPath ?? null
}
