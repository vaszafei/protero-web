/**
 * POST /api/fantasy/euroleague/elfc
 *
 * Recompute the official EuroLeague Fantasy Challenge squad portfolio
 * (`fantasy.elfc_round`) from already-captured artifacts on disk.
 *
 * The official price list needs a token from the operator's OWN logged-in
 * fantaking.dunkest.com session (docstring of elfc_round.py) — nothing here
 * attaches to that account or scrapes it (see the `feedback_no_account_scraping`
 * rule: fresh explicit OK only, never automatic). The operator must supply a
 * `prices` CSV path they already exported by hand; there is no auto-discovery
 * fallback for it the way there is for the Stoiximan side.
 */
import { spawn } from 'node:child_process'
import { openSync, closeSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireUserId } from '~/server/utils/auth'

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const VENV_PY = `${REPO}/.venv/bin/python3`
const ML_DIR = `${REPO}/protero-ml/ml-basketball`
const PROPS_DIR = `${REPO}/protero-ml/ml-basketball/props/data/stoiximan`
const RESULT_PATH = '/tmp/protero-fantasy-euroleague-elfc.json'
const LOG_PATH = '/tmp/protero-fantasy-euroleague-elfc.log'

let running = false

function newestMatching(dir: string, pattern: RegExp): string | null {
  if (!existsSync(dir)) return null
  const hits = readdirSync(dir)
    .filter(f => pattern.test(f))
    .map(f => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return hits.length ? join(dir, hits[0].f) : null
}

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const body = await readBody<{
    matchday?: number; prices?: string; crosswalk?: string; stoiximan_csv?: string
    game_lines?: string; props?: string; teams?: number
  }>(event) ?? {}

  if (running) {
    throw createError({ statusCode: 409, statusMessage: 'a recompute is already running' })
  }
  if (!body.matchday) {
    throw createError({ statusCode: 422, statusMessage: 'matchday is required' })
  }
  if (!body.prices || !existsSync(body.prices)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'a fresh official price-list CSV is required — export it from your logged-in '
        + 'fantaking.dunkest.com session and pass its path as `prices`. Nothing here logs in on your behalf.',
    })
  }

  const gameLines = body.game_lines || newestMatching(PROPS_DIR, /^game_lines_euroleague_.*\.json$/i)
  if (!gameLines) {
    throw createError({ statusCode: 422, statusMessage: 'no captured game_lines_euroleague_*.json found' })
  }
  const props = body.props || newestMatching(PROPS_DIR, /^player_props_euroleague_.*\.json$/i)
  const stoiximanCsv = body.stoiximan_csv || null

  running = true
  const out = openSync(LOG_PATH, 'w')
  const args = [
    '-m', 'fantasy.elfc_round',
    '--matchday', String(body.matchday),
    '--prices', body.prices,
    '--book', gameLines,
    '--teams', String(body.teams ?? 3),
    '--json', RESULT_PATH,
  ]
  if (body.crosswalk) args.push('--crosswalk', body.crosswalk)
  if (stoiximanCsv) args.push('--stoiximan-csv', stoiximanCsv)
  if (props) args.push('--props', props)

  const child = spawn(VENV_PY, args, {
    cwd: ML_DIR,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })
  child.on('exit', (code) => {
    running = false
    try { closeSync(out) } catch { /* already closed */ }
    if (code !== 0) {
      writeFileSync(RESULT_PATH, JSON.stringify({ error: `elfc_round exited ${code} — see ${LOG_PATH}` }))
    }
  })
  child.on('error', () => { running = false })
  child.unref()

  return { started: true, matchday: body.matchday, game_lines: gameLines, props, log_path: LOG_PATH }
})
