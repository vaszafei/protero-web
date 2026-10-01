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
const ML = `${REPO}/protero-ml`
const ML_BB = `${ML}/ml-basketball`
const CAPTURE_DIR = `${ML_BB}/props/data/stoiximan`
const INJURY_DIR = `${ML_BB}/fantasy/data/injuries`
const ARTIFACTS = `${ML}/artifacts/props`
/** The one definition of the load. `props.auto_poster` runs the same script for the wallet that posts itself. */
const LOAD_SCRIPT = `${REPO}/protero-tools/pipeline/props-load.sh`

export const LEAGUES = {
  euroleague: { prefix: 'el', injuries: true },
  eurocup: { prefix: 'eurocup', injuries: false },
} as const
export type League = keyof typeof LEAGUES

/** Handoff §3: strict = the 09-24 selection, relaxed = the 09-29 second tier. Must match props-load.sh: `markerKey` reads its `== candidates (hit …)` lines. */
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
const slipsPath = (league: League, date: string) => `${ARTIFACTS}/${LEAGUES[league].prefix}_slips_${date}.json`
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

export function runLoad(league: League, date: string): Job {
  const cur = jobs.get(league)
  if (cur?.state === 'running' && Date.now() - cur.startedAt < MAX_RUN_MS) {
    throw createError({ statusCode: 409, statusMessage: `${league} props are already loading` })
  }
  const logPath = `/tmp/protero-props-${league}-${date}-${Date.now()}.log`
  const out = openSync(logPath, 'a')
  const child = spawn('/bin/bash', [LOAD_SCRIPT, league, date], {
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

function readLog(path: string): string[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').trimEnd().split('\n')
}

type StepState = 'pending' | 'running' | 'done' | 'failed'
interface CaptureEvent { event: string, state: 'captured' | 'no_props' | 'skipped' | 'failed', rows?: number, players?: number, note: string }
interface Step { key: string, label: string, state: StepState, detail: string[], events?: CaptureEvent[], listed?: number }

/** The load's steps in the order props-load.sh runs them, each keyed by its `== ` marker. */
function plannedSteps(league: League): Step[] {
  const steps: Step[] = []
  if (LEAGUES[league].injuries) steps.push({ key: 'injuries', label: 'Injury report', state: 'pending', detail: [] })
  steps.push({ key: 'capture', label: 'Stoiximan capture', state: 'pending', detail: [] })
  steps.push({ key: 'board', label: 'Props board', state: 'pending', detail: [] })
  for (const [tier, t] of Object.entries(TIERS)) {
    steps.push({ key: `candidates:${tier}`, label: `Candidates — ${tier} (hit ≥ ${t.hit}, last 10 ≥ ${t.last10})`, state: 'pending', detail: [] })
  }
  steps.push({ key: 'spine', label: 'Line spine — every main line scored for learning', state: 'pending', detail: [] })
  steps.push({ key: 'slips', label: 'Legs and tickets at p*', state: 'pending', detail: [] })
  return steps
}

const markerKey = (line: string) =>
  line === '== injuries' ? 'injuries'
    : line === '== capture' ? 'capture'
      : line === '== board' ? 'board'
        : line === '== spine' ? 'spine'
          : line === '== slips' ? 'slips'
        : line.startsWith('== candidates') ? `candidates:${Object.entries(TIERS).find(([, t]) => line.includes(`hit ${t.hit},`))?.[0]}`
          : null

/**
 * The job's log read back as steps. Every script already prints what it did (the capture
 * one line per Stoiximan event); this only sorts those lines under the step that printed
 * them, so the modal shows progress without the scripts knowing it exists.
 */
function progressOf(league: League, log: string[], state: Job['state']): Step[] {
  const steps = plannedSteps(league)
  const byKey = new Map(steps.map(s => [s.key, s]))
  let cur: Step | undefined
  for (const raw of log) {
    const line = raw.trimEnd()
    const key = markerKey(line)
    if (key) {
      if (cur) cur.state = 'done'
      cur = byKey.get(key)
      if (cur) cur.state = 'running'
      continue
    }
    if (!cur || !line.trim()) continue
    const listed = line.match(/^\S+: (\d+) events listed/)
    const ev = line.match(/^ {2}(.+?): (.+)$/)
    if (cur.key === 'capture' && listed) {
      cur.listed = Number(listed[1])
      cur.events = []
      cur.detail.push(line)
    } else if (cur.key === 'capture' && ev) {
      const [, event, rest] = ev
      const got = rest.match(/^(\d+) rows, (\d+) players/)
      cur.events ??= []
      cur.events.push(got
        ? { event, state: 'captured', rows: Number(got[1]), players: Number(got[2]), note: rest }
        : {
            event,
            // Stoiximan lists the game but offers no players tab — no props yet, not a failure.
            state: /skipped/.test(rest) ? 'skipped' : /NO players-tab/.test(rest) ? 'no_props' : 'failed',
            note: /NO players-tab/.test(rest) ? 'no player props offered yet' : rest,
          })
    } else {
      cur.detail.push(line.replace(`${REPO}/`, ''))
    }
  }
  if (cur) cur.state = state === 'running' ? 'running' : state === 'ok' ? 'done' : 'failed'
  return steps
}

export function slateStatus(league: League, date: string) {
  const j = jobs.get(league)
  const log = j && j.date === date ? readLog(j.logPath) : []
  const job = j && j.date === date
    ? {
        state: j.state, startedAt: j.startedAt, finishedAt: j.finishedAt, exitCode: j.exitCode,
        log: log.slice(-10), steps: progressOf(league, log, j.state),
      }
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

  const slips = readJson(slipsPath(league, date))

  return { league, date, hasInjuries: LEAGUES[league].injuries, job, injuries, capture, board, candidates, slips }
}
