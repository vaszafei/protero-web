/**
 * Player-props slate behind "Load props" on W29 (EuroLeague) and W58 (EuroCup)
 * (docs/sessions/2026-09-30-props-analyst-console-HANDOFF.md §2).
 *
 * One job per league runs the existing scripts in order — injury snapshot
 * (EuroLeague only: BasketNews has no EuroCup page), Stoiximan capture, the
 * props board (every line + each player's own games), candidate legs at both
 * tiers — detached, the way generate.post.ts does; the client polls `status`.
 * Nothing here prices, grades or ranks a leg: the scripts write artifacts and
 * this module only reads them back.
 *
 * The research forward-test freeze (`research.props.el_forward_freeze`) is not
 * a button: it is not part of building a slip, and it stays a session step.
 */
import { spawn } from 'node:child_process'
import { closeSync, existsSync, openSync, readdirSync, readFileSync, statSync } from 'node:fs'

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const VENV_PY = `${REPO}/.venv/bin/python3`
const NODE = '/home/zafnitlab/.nvm/versions/node/v22.22.0/bin/node'
const ML = `${REPO}/protero-ml`
const ML_BB = `${ML}/ml-basketball`
const TOOLS = `${REPO}/protero-tools`
const CAPTURE_DIR = `${ML_BB}/props/data/stoiximan`
const INJURY_DIR = `${ML_BB}/fantasy/data/injuries`
const ARTIFACTS = `${ML}/artifacts/props`

export const LEAGUES = {
  euroleague: { path: '/sport/basket/euroleague/euroleague/439g/', prefix: 'el', injuries: true },
  eurocup: { path: '/sport/basket/diorganoseis/eurocup/11458/', prefix: 'eurocup', injuries: false },
} as const
export type League = keyof typeof LEAGUES

/** Handoff §3: strict = the 09-24 selection, relaxed = the 09-29 second tier. */
export const TIERS = {
  strict: { hit: 0.65, last10: 7, suffix: '' },
  relaxed: { hit: 0.58, last10: 6, suffix: '_hit0.58_l6' },
} as const
export type Tier = keyof typeof TIERS

interface Job {
  league: League
  date: string
  state: 'running' | 'ok' | 'failed'
  startedAt: number
  finishedAt: number | null
  exitCode: number | null
  logPath: string
}

const jobs = new Map<League, Job>()
const MAX_RUN_MS = 15 * 60 * 1000

const capturePath = (league: League, date: string) => `${CAPTURE_DIR}/player_props_${league}_${date}.json`
const gameLinesPath = (league: League, date: string) => `${CAPTURE_DIR}/game_lines_${league}_${date}.json`
const boardPath = (league: League, date: string) => `${ARTIFACTS}/${LEAGUES[league].prefix}_board_${date}.json`
const candidatesPath = (league: League, date: string, tier: Tier) =>
  `${ARTIFACTS}/${LEAGUES[league].prefix}_safe_legs_${date}${TIERS[tier].suffix}.json`

const readJson = (path: string) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null)

/** The newest injury snapshot taken on or before `date`. */
function injurySnapshot(date: string): string | null {
  if (!existsSync(INJURY_DIR)) return null
  const days = readdirSync(INJURY_DIR)
    .map(f => f.match(/^euroleague_(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
    .filter((d): d is string => !!d && d <= date)
    .sort()
  return days.length ? `${INJURY_DIR}/euroleague_${days[days.length - 1]}.json` : null
}

/** The whole load as one shell script. A failed injury fetch falls back to the last snapshot. */
function loadScript(league: League, date: string): string {
  const cap = capturePath(league, date)
  const lines = ['set -e']
  if (LEAGUES[league].injuries) {
    lines.push(
      'echo "== injuries"',
      `(cd ${ML_BB} && ${VENV_PY} -m fantasy.injury_report) || echo "injuries: fetch failed — using the last snapshot"`,
      `INJ=$(ls -1 ${INJURY_DIR}/euroleague_*.json 2>/dev/null | awk -F'[_.]' '$(NF-1) <= "${date}"' | sort | tail -1)`,
    )
  }
  lines.push(
    'echo "== capture"',
    `cd ${TOOLS} && ${NODE} bin/capture-stoiximan-player-props.js --date=${date} --league=${league} --league-path=${LEAGUES[league].path}`,
    'echo "== board"',
    `cd ${ML_BB} && ${VENV_PY} -m props.board --league ${league} --props ${cap}`,
  )
  for (const t of Object.values(TIERS)) {
    lines.push(
      `echo "== candidates (hit ${t.hit}, last10 ${t.last10})"`,
      `cd ${ML} && ${VENV_PY} -m research.props.el_safe_legs --league ${league} --props ${cap}` +
        ` --min-hit-rate ${t.hit} --min-last10 ${t.last10}${LEAGUES[league].injuries ? ' ${INJ:+--injuries $INJ}' : ''}`,
    )
  }
  return lines.join('\n')
}

export function runLoad(league: League, date: string): Job {
  const cur = jobs.get(league)
  if (cur?.state === 'running' && Date.now() - cur.startedAt < MAX_RUN_MS) {
    throw createError({ statusCode: 409, statusMessage: `${league} props are already loading` })
  }
  const logPath = `/tmp/protero-props-${league}-${date}-${Date.now()}.log`
  const out = openSync(logPath, 'a')
  const child = spawn('/bin/bash', ['-c', loadScript(league, date)], {
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })
  const job: Job = { league, date, state: 'running', startedAt: Date.now(), finishedAt: null, exitCode: null, logPath }
  jobs.set(league, job)
  const finish = (code: number | null) => {
    job.state = code === 0 ? 'ok' : 'failed'
    job.exitCode = code
    job.finishedAt = Date.now()
    try { closeSync(out) } catch { /* already closed */ }
  }
  child.on('exit', finish)
  child.on('error', () => finish(null))
  child.unref()
  return job
}

function logTail(path: string, n = 10): string[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').trimEnd().split('\n').slice(-n)
}

export function slateStatus(league: League, date: string) {
  const j = jobs.get(league)
  const job = j && j.date === date
    ? { state: j.state, startedAt: j.startedAt, finishedAt: j.finishedAt, exitCode: j.exitCode, log: logTail(j.logPath) }
    : null

  const injPath = LEAGUES[league].injuries ? injurySnapshot(date) : null
  const inj = injPath ? readJson(injPath) : null
  const injuries = inj && {
    day: inj.day,
    listed: inj.rows.length,
    out: inj.rows.filter((r: any) => r.status === 'Out').length,
    takenAt: statSync(injPath!).mtimeMs,
  }

  // Tonight's games carry OUR clubs (name, team_key for the logo) wherever the board bound
  // the Stoiximan event to a fixture; Stoiximan names its clubs in Greek.
  const cap = readJson(capturePath(league, date))
  const lines = readJson(gameLinesPath(league, date))
  const b = readJson(boardPath(league, date))
  const boundEvents = new Map((b?.events || []).map((e: any) => [e.eventId, e]))
  const games = (lines?.games || []).map((g: any) => {
    const rows = (cap?.rows || []).filter((r: any) => r.eventId === g.eventId)
    const bound: any = boundEvents.get(g.eventId)
    return {
      eventId: g.eventId, event: g.event, start: g.start, gameId: bound?.game_id ?? null,
      home: bound?.home ?? null, away: bound?.away ?? null,
      rows: rows.length, players: new Set(rows.map((r: any) => r.player)).size,
    }
  })
  const capture = cap && { capturedAt: cap.captured_at, rows: cap.rows.length, games }

  const board = b && { builtAt: b.built_at, propsCapturedAt: b.props_captured_at, historyGames: b.history_games, games: b.games }

  const candidates = Object.fromEntries((Object.keys(TIERS) as Tier[]).map((t) => {
    const c = readJson(candidatesPath(league, date, t))
    return [t, c && { builtAt: c.built_at, propsCapturedAt: c.props_captured_at, rules: c.rules, slate: c.slate }]
  }))

  return { league, date, hasInjuries: LEAGUES[league].injuries, job, injuries, capture, board, candidates }
}
