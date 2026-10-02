/**
 * Shared formatting and display helpers — avoid duplication across components
 */

/** Safe number conversion: returns 0 for NaN/null/undefined */
export function toNum(val: any): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

const EUR = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const EUR_WHOLE = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })

/**
 * The one money formatter. Every amount in the app is euros (owner, 2026-10-01);
 * the DB has no currency column, so this is a display convention and lives here.
 * The sign goes before the symbol and a minus is U+2212, so a ledger column reads
 * `−€4.25` next to `+€7.28`. `signed` adds `+` to positives; `whole` drops the
 * cents (chart axes, chips). Null / non-numeric renders as an em dash, never €0.00.
 */
export function formatMoney(val: number | string | null | undefined, opts: { signed?: boolean; whole?: boolean } = {}): string {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  const fmt = opts.whole ? EUR_WHOLE : EUR
  const body = fmt.format(Math.abs(n))
  const rounded = Number(fmt.format(n).replace(/[^\d.-]/g, ''))
  if (rounded < 0) return `\u2212${body}`
  return opts.signed && rounded > 0 ? `+${body}` : body
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
