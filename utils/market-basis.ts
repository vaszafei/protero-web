/**
 * Which price a market board was built from.
 *
 * `line_scores` carries one probability per (fixture, market, source) and the
 * board takes the most accurate source each MARKET has — the close if it exists,
 * else the open, else our scraped book price. So two rows on the same board can
 * come from different bases (1X2 off the close, totals off the book), and a
 * single "Price" label taken from the first row describes rows it did not back.
 * This is the one place the board's basis is summarised; the endpoint and both
 * tabs read it.
 */

/** Most to least accurate. Also the order a mixed board lists its bases in. */
export const BASIS_ORDER = ['close_avg', 'open_avg', 'book'] as const
export type Basis = (typeof BASIS_ORDER)[number]

export const BASIS_LABEL: Record<Basis, string> = {
  close_avg: 'Closing price',
  open_avg: 'Opening price',
  book: 'Our scraped price',
}

/** The short form used inside "Mixed · close / book". */
export const BASIS_SHORT: Record<Basis, string> = {
  close_avg: 'close',
  open_avg: 'open',
  book: 'book',
}

export interface BasisRow {
  group: string
  marketSource: string | null
}

export interface BasisSummary {
  /** Distinct bases actually in use, in BASIS_ORDER. Empty when no row has a price. */
  bases: Basis[]
  /** basis → the board groups it backs, in the order the groups first appear. */
  groups: Partial<Record<Basis, string[]>>
}

const isBasis = (s: unknown): s is Basis => (BASIS_ORDER as readonly string[]).includes(s as string)

export function summariseBases(rows: BasisRow[]): BasisSummary {
  const groups: Partial<Record<Basis, string[]>> = {}
  for (const r of rows) {
    if (!isBasis(r.marketSource)) continue
    const held = (groups[r.marketSource] ??= [])
    if (!held.includes(r.group)) held.push(r.group)
  }
  return { bases: BASIS_ORDER.filter((b) => groups[b]), groups }
}

/** The pill text: one basis by name, several as `Mixed · close / book`. */
export function basisLabel(bases: readonly string[]): string {
  const known = bases.filter(isBasis)
  if (!known.length) return 'No price'
  if (known.length === 1) return BASIS_LABEL[known[0]]
  return `Mixed · ${known.map((b) => BASIS_SHORT[b]).join(' / ')}`
}

/** Naming which group came from which basis — the tooltip on a mixed board. */
export function mixedNote(summary: BasisSummary): string {
  const parts = summary.bases.map((b) => `${BASIS_LABEL[b]}: ${(summary.groups[b] ?? []).join(', ')}`)
  return `This board mixes price bases, so rows are not comparable across groups. ${parts.join('. ')}.`
}
