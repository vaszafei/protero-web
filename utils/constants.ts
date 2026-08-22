/**
 * Shared constants — single source of truth for magic strings
 */

export const BET_STATUSES = ['pending', 'won', 'lost', 'push', 'void'] as const
export type BetStatus = (typeof BET_STATUSES)[number]

export const BET_TYPE_LABELS: Record<string, string> = {
  'OVER': 'Over',
  'UNDER': 'Under',
  'OVER_ALT': 'Over (alt)',
  'UNDER_ALT': 'Under (alt)',
  'HOME_WIN': 'Home ML',
  'AWAY_WIN': 'Away ML',
  'SPREAD_COVER': 'Spread',
  'SPREAD_HOME': 'Spread H',
  'SPREAD_AWAY': 'Spread A',
  'SGP_HOME_ML_HOME_COVERS': 'SGP: Home+Spread',
  'SGP_AWAY_ML_AWAY_COVERS': 'SGP: Away+Spread',
  'SGP_SAME_SIDE': 'SGP: Same Side',
  'DRAW': 'Draw',
  'BTTS_YES': 'BTTS Yes',
  'BTTS_NO': 'BTTS No',
  'OVER_15': 'Over 1.5',
  'UNDER_15': 'Under 1.5',
  'OVER_25': 'Over 2.5',
  'UNDER_25': 'Under 2.5',
  'OVER_35': 'Over 3.5',
  'UNDER_35': 'Under 3.5',
}

export const SPORTS = ['football', 'basketball'] as const
export type Sport = (typeof SPORTS)[number]

/**
 * Every basketball league_key that appears in `games`.
 *
 * Two of these were wrong until 2026-08-22: the list said 'spanish_acb' and
 * 'basketball_cl', keys that exist nowhere in the database — the real ones are
 * 'acb' and 'bcl'. That is the same key mismatch that left W14 with three
 * lifetime bets. The constant happened to be unused, so nothing broke; the
 * three places that actually detect sport had each hardcoded
 * `nba || euroleague` instead, which classified ACB, BCL, EuroCup and Greek
 * Basket League games as football. Use sportOf() below, not a literal list.
 */
export const BASKETBALL_LEAGUES = [
  'nba', 'euroleague', 'eurocup', 'bcl', 'greek_basket_league', 'acb',
] as const

const BASKETBALL_LEAGUE_SET: ReadonlySet<string> = new Set(BASKETBALL_LEAGUES)

/**
 * The sport of a game. Trusts the `sport` column when present and falls back to
 * the league key, which is what rows written before the column existed carry.
 */
export function sportOf(game: { sport?: string | null; league_key?: string | null }): Sport {
  if (game.sport === 'basketball' || game.sport === 'football') return game.sport
  return game.league_key && BASKETBALL_LEAGUE_SET.has(game.league_key) ? 'basketball' : 'football'
}

export const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
] as const

/** Max leagues shown per calendar cell before truncation */
export const CALENDAR_MAX_LEAGUES_PER_CELL = 4
