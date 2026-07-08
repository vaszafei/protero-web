/**
 * Shared formatting and display helpers — avoid duplication across components
 */

/** Safe number conversion: returns 0 for NaN/null/undefined */
export function toNum(val: any): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

/** Format currency (USD, no decimals) */
export function formatCurrency(val: number | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNum(val))
}

/** Format number with 2 decimal places and locale separators */
export function formatNum(val: number | string): string {
  return toNum(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Format ROI percentage with sign */
export function formatROI(val: number | string): string {
  const n = toNum(val)
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

/** Format short date: "17 Apr" */
export function formatShortDate(d: string | Date | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Status dot Tailwind classes */
export function statusDotClass(status: string): string {
  switch (status) {
    case 'won': return 'bg-emerald-400'
    case 'lost': return 'bg-red-400'
    case 'pending': return 'bg-amber-400 animate-pulse'
    case 'push': return 'bg-zinc-400'
    default: return 'bg-zinc-500'
  }
}

/** Status badge Tailwind classes (for pills/badges) */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'won': return 'bg-emerald-500/15 text-emerald-400'
    case 'lost': return 'bg-red-500/15 text-red-400'
    case 'pending': return 'bg-amber-500/10 text-amber-400'
    case 'push': return 'bg-zinc-500/15 text-zinc-400'
    default: return 'bg-zinc-700 text-zinc-400'
  }
}

/** Compute ROI from initial and current balance */
export function computeROI(initial: number | string, current: number | string): number {
  const init = toNum(initial) || 1
  return ((toNum(current) - init) / init) * 100
}

/** Compute P/L from initial and current balance */
export function computePL(initial: number | string, current: number | string): number {
  return toNum(current) - toNum(initial)
}

/** Detect sport from league_key */
export function sportFromLeague(leagueKey: string): 'basketball' | 'football' {
  const basketballLeagues = ['nba', 'euroleague', 'eurocup', 'basketball_cl', 'greek_basket_league', 'spanish_acb']
  return basketballLeagues.includes(leagueKey) ? 'basketball' : 'football'
}

/** Format bet type for display — uses notes if short, else maps bet_type */
export function formatBetType(bet: { bet_type?: string; notes?: string }): string {
  const notes = bet.notes || ''
  if (notes.length > 0 && notes.length < 40) return notes

  const labels: Record<string, string> = {
    'OVER': 'Over', 'UNDER': 'Under',
    'OVER_ALT': 'Over (alt)', 'UNDER_ALT': 'Under (alt)',
    'HOME_WIN': 'Home ML', 'AWAY_WIN': 'Away ML',
    'SPREAD_COVER': 'Spread', 'SPREAD_HOME': 'Spread H', 'SPREAD_AWAY': 'Spread A',
    'SGP_HOME_ML_HOME_COVERS': 'SGP: Home+Spread',
    'SGP_AWAY_ML_AWAY_COVERS': 'SGP: Away+Spread',
    'SGP_SAME_SIDE': 'SGP: Same Side',
    'DRAW': 'Draw', 'BTTS_YES': 'BTTS Yes', 'BTTS_NO': 'BTTS No',
    'OVER_15': 'Over 1.5', 'UNDER_15': 'Under 1.5',
    'OVER_25': 'Over 2.5', 'UNDER_25': 'Under 2.5',
    'OVER_35': 'Over 3.5', 'UNDER_35': 'Under 3.5',
  }
  return labels[bet.bet_type || ''] || bet.bet_type || ''
}
