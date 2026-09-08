/**
 * POST /api/fantasy/slates/[id]/generate
 *
 * Generate picks for a stored slate. Shells out to the Python Track O core
 * (`ml.fantasy.generate`), which reads the slate + its players from the DB,
 * runs the optimiser, and writes the resulting lineups to `fantasy_entries`.
 *
 * The child is detached and unref'd (same pattern as pipeline.ts) so the
 * request returns immediately; the client re-polls the slate to see the
 * entries appear. One generation per slate at a time is enforced in-process.
 *
 * The projection is the M4-failed model, so the generated lineups are
 * honest-labelled as mean-projection picks, not a demonstrated edge.
 */
import { spawn } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'
import { requireUserId } from '~/server/utils/auth'

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const VENV_PY = `${REPO}/.venv/bin/python3`
const ML_DIR = `${REPO}/protero-ml`

const active = new Map<number, number>() // slate_id -> startedAt

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'missing slate id' })
  const body = await readBody<{ n_lineups?: number }>(event)
  const nLineups = Math.min(Math.max(body?.n_lineups ?? 5, 1), 10)

  const slateId = Number(id)
  const now = Date.now()
  const running = active.get(slateId)
  if (running && now - running < 10 * 60 * 1000) {
    throw createError({ statusCode: 409, statusMessage: 'generation already running for this slate' })
  }
  active.set(slateId, now)

  const logPath = `/tmp/protero-fantasy-${slateId}-${now}.log`
  const out = openSync(logPath, 'a')
  const child = spawn(
    VENV_PY,
    ['-m', 'ml.fantasy.generate', '--slate-id', String(slateId), '--n-lineups', String(nLineups)],
    {
      cwd: ML_DIR,
      detached: true,
      stdio: ['ignore', out, out],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    },
  )
  child.on('exit', () => {
    if (active.get(slateId) === now) active.delete(slateId)
    try { closeSync(out) } catch { /* already closed */ }
  })
  child.on('error', () => {
    if (active.get(slateId) === now) active.delete(slateId)
  })
  child.unref()

  return { started: true, slate_id: slateId, log_path: logPath }
})
