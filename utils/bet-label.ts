/**
 * Bet label formatters — short (chip-friendly) and long (full description).
 * Shared between Wallet bet list, Game detail prediction card, and My Bets.
 *
 * Input shape (loose):
 *   { bet_type: string, notes?: string, sport?: string,
 *     home_name?: string, away_name?: string, bet_subject?: string }
 */

type AnyBet = {
  bet_type?: string | null
  notes?: any
  sport?: string | null
  home_name?: string | null
  away_name?: string | null
  bet_subject?: string | null
}

const PROP_MARKET_LABEL: Record<string, string> = {
  PTS: 'pts',
  REB: 'reb',
  AST: 'ast',
  STL: 'stl',
  BLK: 'blk',
  TOV: 'to',
  THREES: '3pt',
  PRA: 'pra',
}

function parseNotes(raw: any): any | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

/**
 * Parse a PROP_<MARKET>_<DIRECTION> bet_type, optionally enriched by JSON
 * notes ({player, line, direction, market}). Returns short + long label or null.
 */
function parseProp(bet: AnyBet): { short: string; long: string } | null {
  const key = (bet.bet_type || '').toUpperCase()
  const meta = parseNotes(bet.notes)

  if (!key.startsWith('PROP_') && !meta?.market) return null

  // PROP_<MARKET>_<DIRECTION>
  let market = ''
  let direction = ''
  if (key.startsWith('PROP_')) {
    const parts = key.replace(/^PROP_/, '').split('_')
    if (parts.length >= 2) {
      direction = parts[parts.length - 1] // OVER / UNDER
      market = parts.slice(0, -1).join('_')
    }
  }
  if (meta?.market) market = String(meta.market).toUpperCase()
  if (meta?.direction) direction = String(meta.direction).toUpperCase()

  const marketLabel = PROP_MARKET_LABEL[market] || market.toLowerCase()
  const sideShort = direction === 'OVER' ? 'O' : direction === 'UNDER' ? 'U' : direction
  const sideLong  = direction === 'OVER' ? 'Over' : direction === 'UNDER' ? 'Under' : direction

  const line = meta?.line != null ? Number(meta.line) : null
  const player = meta?.player ? String(meta.player) : null

  const linePart = line != null ? ` ${line}` : ''
  const short = `${sideShort}${linePart} ${marketLabel}`.trim()
  const long  = player
    ? `${player} ${sideLong}${linePart} ${marketLabel}`.trim()
    : `${sideLong}${linePart} ${marketLabel}`.trim()

  return { short, long }
}

const SHORT_MAP: Record<string, string> = {
  // Football / generic
  HOME_WIN: 'Home',
  AWAY_WIN: 'Away',
  DRAW: 'Draw',
  BTTS_YES: 'BTTS',
  BTTS_NO: 'BTTS No',
  OVER: 'Over',
  UNDER: 'Under',
  OVER_05: 'O 0.5',
  OVER_15: 'O 1.5',
  OVER_25: 'O 2.5',
  OVER_35: 'O 3.5',
  UNDER_05: 'U 0.5',
  UNDER_15: 'U 1.5',
  UNDER_25: 'U 2.5',
  UNDER_35: 'U 3.5',
  // Basketball / spreads
  OVER_ALT: 'Over (alt)',
  UNDER_ALT: 'Under (alt)',
  SPREAD_COVER: 'Spread',
  SPREAD_HOME: 'Spread H',
  SPREAD_AWAY: 'Spread A',
  SGP_HOME_ML_HOME_COVERS: 'SGP H+',
  SGP_AWAY_ML_AWAY_COVERS: 'SGP A+',
  SGP_SAME_SIDE: 'SGP same',
  // Cross-game
  XGAME_PARLAY: 'X-Game Parlay',
}

const LONG_MAP: Record<string, string> = {
  ...SHORT_MAP,
  HOME_WIN: 'Home Win',
  AWAY_WIN: 'Away Win',
  DRAW: 'Draw',
  BTTS_YES: 'Both Teams to Score',
  BTTS_NO: 'No BTTS',
  OVER_15: 'Over 1.5 Goals',
  OVER_25: 'Over 2.5 Goals',
  OVER_35: 'Over 3.5 Goals',
  UNDER_15: 'Under 1.5 Goals',
  UNDER_25: 'Under 2.5 Goals',
  UNDER_35: 'Under 3.5 Goals',
  OVER_ALT: 'Over (alt line)',
  UNDER_ALT: 'Under (alt line)',
  SPREAD_HOME: 'Home covers spread',
  SPREAD_AWAY: 'Away covers spread',
  SGP_HOME_ML_HOME_COVERS: 'SGP — Home ML + Home spread',
  SGP_AWAY_ML_AWAY_COVERS: 'SGP — Away ML + Away spread',
  SGP_SAME_SIDE: 'SGP — same-side spread',
}

function fromNotes(bet: AnyBet): string | null {
  const notes = typeof bet.notes === 'string' ? bet.notes.trim() : ''
  if (notes.length > 0 && notes.length < 50) return notes
  return null
}

/**
 * Parse a verbose bet description into a short chip label.
 * Examples:
 *   "UNDER (Under 216.5)"                       -> "U 216.5"
 *   "OVER (Over 1.5)"                           -> "O 1.5"
 *   "UNDER (UNDER 216.5) + OVER (OVER 221.5)"   -> "U 216.5 + O 221.5"
 *   "Home Win"                                  -> "Home"
 *   "Lakers +5.5"                               -> "Lakers +5.5"
 * Returns null when no recognised pattern.
 */
function parseShortFromText(raw: string): string | null {
  if (!raw) return null
  const text = raw.trim()
  if (!text) return null

  // Multi-leg combos joined by '+' (SGP)
  if (text.includes('+')) {
    const parts = text.split('+').map(p => parseShortFromText(p.trim()) || p.trim())
    const joined = parts.join(' + ')
    if (joined.length <= 24) return joined
  }

  // Pattern: OVER/UNDER (... <number> ...)
  const ouMatch = text.match(/(OVER|UNDER)\s*\(?[^()]*?(\d+(?:\.\d+)?)/i)
  if (ouMatch) {
    const side = ouMatch[1].toUpperCase().startsWith('O') ? 'O' : 'U'
    return `${side} ${ouMatch[2]}`
  }

  // Bare "Over 2.5" / "Under 216.5"
  const bareOu = text.match(/^(OVER|UNDER)\s+(\d+(?:\.\d+)?)/i)
  if (bareOu) {
    const side = bareOu[1].toUpperCase().startsWith('O') ? 'O' : 'U'
    return `${side} ${bareOu[2]}`
  }

  // 1X2 / moneyline keywords
  if (/^home\s*win$/i.test(text)) return 'Home'
  if (/^away\s*win$/i.test(text)) return 'Away'
  if (/^draw$/i.test(text)) return 'Draw'

  // Spread-like "TeamName ±x.y" — keep if short
  if (/[+-]\d+(?:\.\d+)?/.test(text) && text.length <= 14) return text

  return null
}

/**
 * Short label for chips/badges. Always <= 14 chars (or <= 24 for combos).
 * Order of preference:
 *   1. bet_type mapped via SHORT_MAP
 *   2. parsed short form of notes ("UNDER (Under 216.5)" -> "U 216.5")
 *   3. parsed short form of bet_type itself
 *   4. raw notes if already short
 *   5. raw bet_type
 */
export function betLabelShort(bet: AnyBet): string {
  if (!bet) return ''
  const prop = parseProp(bet)
  if (prop) return prop.short

  const key = (bet.bet_type || '').toUpperCase()
  const mapped = SHORT_MAP[key]
  if (mapped) return mapped

  const notesText = typeof bet.notes === 'string' ? bet.notes : ''
  const parsedNotes = parseShortFromText(notesText)
  if (parsedNotes) return parsedNotes

  const parsedType = parseShortFromText(bet.bet_type || '')
  if (parsedType) return parsedType

  const trimmed = notesText.trim()
  if (trimmed && trimmed.length <= 14) return trimmed

  if (key && key.length <= 14) return key
  return key || trimmed || ''
}

/**
 * Long label for inline rows / detail views.
 * Includes team context for moneyline picks when available.
 */
export function betLabelLong(bet: AnyBet): string {
  if (!bet) return ''
  const prop = parseProp(bet)
  if (prop) return prop.long

  const key = (bet.bet_type || '').toUpperCase()
  const base = LONG_MAP[key] || fromNotes(bet) || key || ''

  if (key === 'HOME_WIN' && bet.home_name) return `${bet.home_name} to win`
  if (key === 'AWAY_WIN' && bet.away_name) return `${bet.away_name} to win`
  if (key === 'SPREAD_HOME' && bet.home_name) return `${bet.home_name} covers`
  if (key === 'SPREAD_AWAY' && bet.away_name) return `${bet.away_name} covers`

  return base
}
