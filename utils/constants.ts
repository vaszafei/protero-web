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

export const BASKETBALL_LEAGUES = ['nba', 'euroleague', 'eurocup', 'basketball_cl', 'greek_basket_league', 'spanish_acb'] as const

export const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
] as const

/** Max leagues shown per calendar cell before truncation */
export const CALENDAR_MAX_LEAGUES_PER_CELL = 4
