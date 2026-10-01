/**
 * POST /api/fantasy/slates/[id]/generate
 *
 * Generate picks for a stored slate. Shells out to the Python Track O core —
 * `ml.fantasy.generate` for football leagues, `fantasy.generate` (ml-basketball) for
 * EuroLeague/NBA — which reads the slate + its players from the DB, runs the optimiser,
 * and writes the resulting lineups to `fantasy_entries` (same table/shape for both sports,
 * so the slate-detail page renders either without branching).
 *
 * The child is detached and unref'd (same pattern as pipeline.ts) so the
 * request returns immediately; the client re-polls the slate to see the
 * entries appear. One generation per slate at a time is enforced in-process.
 *
 * Neither sport's projection has a demonstrated edge (football failed its M4 holdout;
 * basketball's points b=+0.08, rebounds hint fails k=115), so generated lineups are
 * honest-labelled as mean-projection picks, not a result.
 */
import { spawn } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const VENV_PY = `${REPO}/.venv/bin/python3`
const FOOTBALL_ML_DIR = `${REPO}/protero-ml`
const BASKETBALL_ML_DIR = `${REPO}/protero-ml/ml-basketball`
const BASKETBALL_LEAGUES = new Set(['euroleague', 'nba'])

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

  const { data: slate } = await getSupabase()
    .from('fantasy_slates')
    .select('league_key')
    .eq('id', slateId)
    .maybeSingle()
  const isBasketball = BASKETBALL_LEAGUES.has(slate?.league_key || '')
  const mlModule = isBasketball ? 'fantasy.generate' : 'ml.fantasy.generate'
  const mlDir = isBasketball ? BASKETBALL_ML_DIR : FOOTBALL_ML_DIR

  const logPath = `/tmp/protero-fantasy-${slateId}-${now}.log`
  const out = openSync(logPath, 'a')
  const child = spawn(
    VENV_PY,
    ['-m', mlModule, '--slate-id', String(slateId), '--n-lineups', String(nLineups)],
    {
      cwd: mlDir,
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
