/**
 * The one basketball box-score reader. `games.sport_stats` is stored in four shapes, and every
 * component that wants a team total or a player line goes through here, so they cannot disagree.
 *
 * Team-level shapes (checked in this order, a team-level value beats a player sum):
 *   totals      EuroLeague, newest: `side.totals` = { fg2m fg2a fg3m fg3a ftm fta orb drb trb ast stl tov blk points }
 *   team-long   EuroLeague, older:  `side` = { fg2_made fg2_att fg3_made … total_reb off_reb … blocks_for fouls }
 *   team-short  NBA:                `side` = { fgm fga fg3m fg3a ftm fta reb oreb dreb ast stl tov blk pf }
 * Player rows (`side.players[]`) are the fallback and the only source for ACB, BCL, EuroCup, LKL,
 * Greek League and FIBA. Their keys come in long names (`field_goals_made`) and short names (`fgm`).
 *
 * A stat the feed does not carry is `null`, never 0. `0/0` only comes out when the feed said 0.
 */

export type BoxSource = 'totals' | 'team-long' | 'team-short' | 'players' | 'none'

export interface Shooting { made: number; att: number }

export interface BoxSide {
  source: BoxSource
  fg2: Shooting | null
  fg3: Shooting | null
  ft: Shooting | null
  /** Field goals made / attempted, twos and threes together. */
  fgm: number | null
  fga: number | null
  reb: number | null
  oreb: number | null
  dreb: number | null
  ast: number | null
  stl: number | null
  blk: number | null
  tov: number | null
  pf: number | null
  /** Sum of the player rows' points, when they carry any. */
  playerPoints: number | null
  playerRows: number
  /** Player rows whose made and attempted counts were swapped in the feed and put back. */
  repairedRows: number
}

export interface BoxScore {
  home: BoxSide
  away: BoxSide
  /**
   * Set when a side's numbers are summed from player rows that do not add up to the final score,
   * i.e. the scrape missed players. The sums are real but short of the whole team.
   */
  partial: { side: 'home' | 'away'; have: number; of: number }[]
  /** Why a stat is `—`, for a tooltip. */
  reason: (side: 'home' | 'away', stat: StatKey) => string
}

type BaseKey =
  | 'pts' | 'fgm' | 'fga' | 'fg2m' | 'fg2a' | 'fg3m' | 'fg3a' | 'ftm' | 'fta'
  | 'reb' | 'oreb' | 'dreb' | 'ast' | 'stl' | 'blk' | 'tov' | 'pf'

export type StatKey = 'fg2' | 'fg3' | 'ft' | 'reb' | 'oreb' | 'dreb' | 'ast' | 'stl' | 'blk' | 'tov' | 'pf'

type Raw = Partial<Record<BaseKey, number>>

const STAT_LABEL: Record<StatKey, string> = {
  fg2: '2-point shooting', fg3: '3-point shooting', ft: 'free throws', reb: 'rebounds',
  oreb: 'offensive rebounds', dreb: 'defensive rebounds', ast: 'assists', stl: 'steals',
  blk: 'blocks', tov: 'turnovers', pf: 'fouls',
}

/** Every key a feed uses for one stat, in the order they are tried. */
const PLAYER_KEYS: Record<BaseKey, string[]> = {
  pts: ['points', 'pts'],
  fgm: ['field_goals_made', 'fgm'],
  fga: ['field_goals_attempted', 'fga'],
  fg2m: ['two_pointers_made', 'fg2m'],
  fg2a: ['two_pointers_attempted', 'fg2a'],
  fg3m: ['three_pointers_made', 'fg3m'],
  fg3a: ['three_pointers_attempted', 'fg3a'],
  ftm: ['free_throws_made', 'ftm'],
  fta: ['free_throws_attempted', 'fta'],
  reb: ['rebounds', 'reb', 'trb'],
  oreb: ['offensive_rebounds', 'oreb', 'orb'],
  dreb: ['defensive_rebounds', 'dreb', 'drb'],
  ast: ['assists', 'ast'],
  stl: ['steals', 'stl'],
  blk: ['blocks', 'blk'],
  tov: ['turnovers', 'tov', 'to'],
  pf: ['personal_fouls', 'pf'],
}

const TEAM_KEYS: Record<'totals' | 'team-long' | 'team-short', Partial<Record<BaseKey, string>>> = {
  totals: {
    pts: 'points', fg2m: 'fg2m', fg2a: 'fg2a', fg3m: 'fg3m', fg3a: 'fg3a', ftm: 'ftm', fta: 'fta',
    reb: 'trb', oreb: 'orb', dreb: 'drb', ast: 'ast', stl: 'stl', blk: 'blk', tov: 'tov',
  },
  'team-long': {
    fg2m: 'fg2_made', fg2a: 'fg2_att', fg3m: 'fg3_made', fg3a: 'fg3_att', ftm: 'ft_made', fta: 'ft_att',
    reb: 'total_reb', oreb: 'off_reb', dreb: 'def_reb', ast: 'assists', stl: 'steals', blk: 'blocks_for',
    tov: 'turnovers', pf: 'fouls',
  },
  'team-short': {
    fgm: 'fgm', fga: 'fga', fg3m: 'fg3m', fg3a: 'fg3a', ftm: 'ftm', fta: 'fta',
    reb: 'reb', oreb: 'oreb', dreb: 'dreb', ast: 'ast', stl: 'stl', blk: 'blk', tov: 'tov', pf: 'pf',
  },
}

/** A finite number, or null. Strings from the feed are accepted; blanks and NaN are not. */
export function finite(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function readKeys(row: any, keys: string[]): number | null {
  if (!row || typeof row !== 'object') return null
  for (const k of keys) {
    const n = finite(row[k])
    if (n != null) return n
  }
  return null
}

function teamLevel(side: any): { source: 'totals' | 'team-long' | 'team-short'; raw: Raw } | null {
  if (!side || typeof side !== 'object') return null
  const source = side.totals && typeof side.totals === 'object'
    ? 'totals'
    : 'fg2_made' in side ? 'team-long' : 'fgm' in side ? 'team-short' : null
  if (!source) return null
  const holder = source === 'totals' ? side.totals : side
  const raw: Raw = {}
  for (const [base, key] of Object.entries(TEAM_KEYS[source]) as [BaseKey, string][]) {
    const n = finite(holder[key])
    if (n != null) raw[base] = n
  }
  return { source, raw }
}

const SHOT_PAIRS: [BaseKey, BaseKey][] = [['fgm', 'fga'], ['fg2m', 'fg2a'], ['fg3m', 'fg3a'], ['ftm', 'fta']]

/**
 * One player row, every stat the row carries. A made count above its attempts is impossible;
 * the 2026-27 EuroCup rows (117 of them, 16 games) carry the two swapped, and swapping them back
 * makes `2·2PM + 3·3PM + FT` equal the row's points on all 117. `repaired` counts those rows.
 */
function readRow(p: any): { raw: Raw; repaired: boolean } {
  const raw: Raw = {}
  for (const base of Object.keys(PLAYER_KEYS) as BaseKey[]) {
    const n = readKeys(p, PLAYER_KEYS[base])
    if (n != null) raw[base] = n
  }
  let repaired = false
  for (const [m, a] of SHOT_PAIRS) {
    // A null attempts column beside a made count is a 0, the same null-for-zero as everywhere else.
    if (raw[m] != null && raw[m]! > (raw[a] ?? 0)) {
      ;[raw[m], raw[a]] = [raw[a] ?? 0, raw[m]]
      repaired = true
    }
  }
  return { raw, repaired }
}

/**
 * A stat is "provided" once any row carries it; a row without it then counts 0, because
 * FlashScore stores a player's 0 as `null`. A stat no row carries stays undefined.
 */
function sumPlayers(players: any[]): { raw: Raw; repaired: number } {
  const raw: Raw = {}
  let repaired = 0
  for (const p of players) {
    const row = readRow(p)
    if (row.repaired) repaired++
    for (const [k, v] of Object.entries(row.raw) as [BaseKey, number][]) raw[k] = (raw[k] ?? 0) + v
  }
  return { raw, repaired }
}

const shooting = (made?: number, att?: number): Shooting | null =>
  made != null && att != null ? { made, att } : null

function resolve(team: Raw, players: Raw) {
  const r: Raw = { ...players, ...team }
  // Derive in both directions so a feed with aggregate FG and threes, or with twos and threes, both work.
  const fg2m = r.fg2m ?? (r.fgm != null && r.fg3m != null ? r.fgm - r.fg3m : undefined)
  const fg2a = r.fg2a ?? (r.fga != null && r.fg3a != null ? r.fga - r.fg3a : undefined)
  // Field goals are the twos plus the threes whenever the split exists, so a panel's 2PT and 3PT
  // can never disagree with its FG line (the Greek feed's own `fga` is 1 off its split in places).
  const fgm = fg2m != null && r.fg3m != null ? fg2m + r.fg3m : r.fgm
  const fga = fg2a != null && r.fg3a != null ? fg2a + r.fg3a : r.fga
  const reb = r.reb ?? (r.oreb != null && r.dreb != null ? r.oreb + r.dreb : undefined)
  return { r, fg2m, fg2a, fgm, fga, reb }
}

function emptySide(playerRows: number, playerPoints: number | null): BoxSide {
  return {
    source: 'none', fg2: null, fg3: null, ft: null, fgm: null, fga: null, reb: null, oreb: null,
    dreb: null, ast: null, stl: null, blk: null, tov: null, pf: null, playerPoints, playerRows,
    repairedRows: 0,
  }
}

function normalizeSide(side: any): BoxSide {
  const players: any[] = Array.isArray(side?.players) ? side.players : []
  const { raw: fromPlayers, repaired } = players.length ? sumPlayers(players) : { raw: {} as Raw, repaired: 0 }
  const playerPoints = fromPlayers.pts ?? null
  const team = teamLevel(side)

  // Rows that exist but carry nothing (0 points, 0 shots) are a box score that was never filled in.
  const rowsEmpty = !team && !((fromPlayers.pts ?? 0) > 0 || (fromPlayers.fga ?? 0) > 0 || (fromPlayers.fg2a ?? 0) > 0)
  if (!team && (!players.length || rowsEmpty)) return emptySide(players.length, playerPoints)

  const { r, fg2m, fg2a, fgm, fga, reb } = resolve(team?.raw ?? {}, fromPlayers)
  return {
    source: team ? team.source : 'players',
    fg2: shooting(fg2m, fg2a),
    fg3: shooting(r.fg3m, r.fg3a),
    ft: shooting(r.ftm, r.fta),
    fgm: fgm ?? null,
    fga: fga ?? null,
    reb: reb ?? null,
    oreb: r.oreb ?? null,
    dreb: r.dreb ?? null,
    ast: r.ast ?? null,
    stl: r.stl ?? null,
    blk: r.blk ?? null,
    tov: r.tov ?? null,
    pf: r.pf ?? null,
    playerPoints,
    playerRows: players.length,
    repairedRows: repaired,
  }
}

export function boxScore(
  sportStats: any,
  score: { home: unknown; away: unknown } | null = null,
): BoxScore {
  const home = normalizeSide(sportStats?.home)
  const away = normalizeSide(sportStats?.away)

  const partial: BoxScore['partial'] = []
  if (score) {
    for (const side of ['home', 'away'] as const) {
      const b = side === 'home' ? home : away
      const of = finite(score[side])
      // Only a player-summed side can be short; a team-level total is the whole team by construction.
      if (b.source === 'players' && b.playerPoints != null && of != null && b.playerPoints !== of) {
        partial.push({ side, have: b.playerPoints, of })
      }
    }
  }

  const reason = (side: 'home' | 'away', stat: StatKey) => {
    const b = side === 'home' ? home : away
    return b.source === 'none'
      ? 'No box score is stored for this game'
      : `The feed carries no ${STAT_LABEL[stat]} for this game`
  }

  return { home, away, partial, reason }
}

/** True once either side has anything to show. */
export const hasBox = (b: BoxScore) => b.home.source !== 'none' || b.away.source !== 'none'

/** `12/28`, or `—` when the feed has no such stat. */
export const fmtMadeAtt = (s: Shooting | null) => (s ? `${s.made}/${s.att}` : '—')

/** Percentage, 0 decimals. `null` for no attempts or no stat — a 0/0 has no rate. */
export const pctOf = (s: Shooting | null): number | null =>
  s && s.att > 0 ? Math.round((100 * s.made) / s.att) : null

// ── Player rows ─────────────────────────────────────────────────────────────

export interface BoxPlayer {
  id: string | null
  name: string
  /** Decimal minutes, null when the row has none. */
  minutes: number | null
  /** The feed's own clock string when it has one (`24:13`). */
  clock: string | null
  starter: boolean
  pts: number | null
  reb: number | null
  ast: number | null
  stl: number | null
  blk: number | null
  tov: number | null
  pf: number | null
  pm: number | null
  fgm: number | null
  fga: number | null
  fg3m: number | null
  fg3a: number | null
  ftm: number | null
  fta: number | null
}

export function parseMinutes(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw)
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number)
    return Number.isFinite(m) ? m + (Number.isFinite(sec) ? sec / 60 : 0) : null
  }
  return finite(s)
}

export function boxPlayer(p: any): BoxPlayer {
  const { raw: n } = readRow(p)
  const fgm = n.fg2m != null && n.fg3m != null ? n.fg2m + n.fg3m : n.fgm
  const fga = n.fg2a != null && n.fg3a != null ? n.fg2a + n.fg3a : n.fga
  const reb = n.reb ?? (n.oreb != null && n.dreb != null ? n.oreb + n.dreb : undefined)
  const rawMin = p?.min ?? p?.minutes
  return {
    id: p?.player_id != null ? String(p.player_id) : p?.id != null ? String(p.id) : null,
    name: String(p?.name ?? p?.player_name ?? ''),
    minutes: parseMinutes(rawMin),
    clock: typeof rawMin === 'string' && rawMin.includes(':') ? rawMin : null,
    starter: !!(p?.is_starter ?? p?.starter),
    pts: n.pts ?? null,
    reb: reb ?? null,
    ast: n.ast ?? null,
    stl: n.stl ?? null,
    blk: n.blk ?? null,
    tov: n.tov ?? null,
    pf: n.pf ?? null,
    pm: readKeys(p, ['plus_minus', 'pm']),
    fgm: fgm ?? null,
    fga: fga ?? null,
    fg3m: n.fg3m ?? null,
    fg3a: n.fg3a ?? null,
    ftm: n.ftm ?? null,
    fta: n.fta ?? null,
  }
}

/** A row that was on the roster but did not play: no minutes and nothing in the box. */
export function didNotPlay(p: BoxPlayer): boolean {
  return (p.minutes ?? 0) <= 0 && (p.pts ?? 0) === 0 && (p.reb ?? 0) === 0 && (p.ast ?? 0) === 0
}
