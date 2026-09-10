/**
 * Family-wise correction for a roster of wallets scored at once.
 *
 * `get_wallet_performance` returns a per-wallet p(luck). Reading a roster of
 * them and picking the small ones is the multiple-comparisons error, and it
 * stopped being hypothetical on 2026-08-23: projecting the mirrored tipster
 * picks into the ledger created **15 wallets scored simultaneously**, and one
 * of them (W44, n=90, +24.0%) came back at p=0.010. Uncorrected that reads
 * EDGE. At k=15 the Bonferroni threshold is p<0.0033 and it is not close.
 *
 * The method is the one `common/sim_significance.py` already applies to
 * simulation runs — Bonferroni for the strict answer, Benjamini-Hochberg for
 * the lenient one — so the console and the CLI cannot disagree.
 *
 * k is the size of the family being scored TOGETHER, which is why this takes a
 * cohort rather than the whole roster: our own strategies and a mirrored
 * tipster archive are separate searches and must not inflate each other's k.
 * It is still a lower bound — a wallet retired before it was scored consumed a
 * hypothesis nothing here can see.
 */

export const ALPHA = 0.05

export type FamilyVerdict =
  | 'EDGE'          // survives Bonferroni at this k
  | 'BH'            // survives Benjamini-Hochberg only
  | 'multiplicity'  // p<0.05 alone, dies on the family
  | 'LUCK'
  | 'n<10'

export interface Scored {
  wallet_id: number
  p_luck: number | null
  n_wagers: number
}

export interface FamilyResult {
  /** Wallets in the family that carry a p-value at all. */
  k: number
  bonferroni: number
  verdictById: Map<number, FamilyVerdict>
}

/**
 * Benjamini-Hochberg step-up: the largest rank i with p(i) <= i/m * alpha
 * rejects that hypothesis and every smaller p.
 */
function benjaminiHochberg(ps: number[], alpha = ALPHA): boolean[] {
  const m = ps.length
  const order = ps.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0])
  const keep = new Array<boolean>(m).fill(false)
  let cutoff = -1
  for (let rank = 0; rank < m; rank++) {
    if (order[rank][0] <= ((rank + 1) / m) * alpha) cutoff = rank
  }
  for (let rank = 0; rank <= cutoff; rank++) keep[order[rank][1]] = true
  return keep
}

export function scoreFamily(rows: Scored[], alpha = ALPHA): FamilyResult {
  const scored = rows.filter(r => r.p_luck != null && Number.isFinite(Number(r.p_luck)))
  const k = scored.length
  const verdictById = new Map<number, FamilyVerdict>()

  if (k === 0) {
    for (const r of rows) verdictById.set(r.wallet_id, 'n<10')
    return { k: 0, bonferroni: alpha, verdictById }
  }

  const bonferroni = alpha / k
  const ps = scored.map(r => Number(r.p_luck))
  const bh = benjaminiHochberg(ps, alpha)

  scored.forEach((r, i) => {
    const p = ps[i]
    verdictById.set(
      r.wallet_id,
      p < bonferroni ? 'EDGE' : bh[i] ? 'BH' : p < alpha ? 'multiplicity' : 'LUCK',
    )
  })
  for (const r of rows) if (!verdictById.has(r.wallet_id)) verdictById.set(r.wallet_id, 'n<10')

  return { k, bonferroni, verdictById }
}

/** Tailwind classes per verdict — one definition, used by roster and hero. */
export const VERDICT_CLASS: Record<FamilyVerdict, string> = {
  EDGE:          'bg-emerald-500/15 text-emerald-300',
  BH:            'bg-sky-500/15 text-sky-300',
  multiplicity:  'bg-amber-500/15 text-amber-300',
  LUCK:          'bg-zinc-700/40 text-zinc-400',
  'n<10':        'bg-zinc-800/60 text-zinc-600',
}

export const VERDICT_LABEL: Record<FamilyVerdict, string> = {
  EDGE:          'EDGE',
  BH:            'BH only',
  multiplicity:  'dies on k',
  LUCK:          'LUCK',
  'n<10':        'n<10',
}

export const VERDICT_TITLE: Record<FamilyVerdict, string> = {
  EDGE:          'Survives Bonferroni across the whole cohort scored here.',
  BH:            'Survives Benjamini-Hochberg but not Bonferroni — suggestive, not evidence.',
  multiplicity:  'p<0.05 on its own, but dies once the cohort it was picked from is counted.',
  LUCK:          'Indistinguishable from a bettor with no edge.',
  'n<10':        'Too few settled wagers for a p-value to mean anything.',
}

/**
 * Which cohort a wallet is scored in. One definition, because the roster, the
 * detail page and the fleet header must agree: two different splits would show
 * the same wallet two different verdicts.
 *
 *   ours       — a strategy we run (`lifecycle='trader'`, not a mirror)
 *   incubation — a strategy we run in incubation (`lifecycle='incubation'`):
 *                accrues settled rows but is never a track record, rendered
 *                with n and a p-value, never a headline ROI
 *   mirror     — an external tipster's PUBLISHED picks replayed at a flat unit
 *   user_mirror— a real bettor's ACTUAL Stoiximan slips at their real stakes
 *                (`lifecycle='user_mirror'`, W54). Real euros, not ours; scored
 *                as its own cohort with a coverage caveat, never as a claim.
 *   legacy     — kept as a fallback only. Wallets 2-25 were deleted 2026-08-23
 *                (CD #38) and every surviving wallet is `lifecycle='trader'`, so
 *                this branch returns nothing today. The roster drops empty
 *                cohorts, so an unexpected legacy row would surface rather than
 *                render silently as one of ours.
 */
export function cohortOf(w: { archetype?: string | null; lifecycle?: string | null }): 'ours' | 'incubation' | 'mirror' | 'user_mirror' | 'legacy' {
  if (w.archetype === 'external_tipster') return 'mirror'
  if (w.lifecycle === 'user_mirror') return 'user_mirror'
  if (w.lifecycle === 'incubation') return 'incubation'
  return w.lifecycle === 'trader' ? 'ours' : 'legacy'
}

export const COHORT_LABEL: Record<ReturnType<typeof cohortOf>, string> = {
  ours: 'Trader personas',
  incubation: 'Incubation',
  mirror: 'Mirrored tipsters',
  user_mirror: 'User mirror',
  legacy: 'Legacy',
}

/**
 * Price basis — whether a wallet's record was struck at prices a book actually
 * posted, or at prices we generated ourselves.
 *
 * This is not a nuance, it is the difference between a result and an artifact.
 * Measured over the whole corpus 2026-08-20: **every basketball game carries
 * exactly ONE total line and ONE handicap line** (15,402 games with 1 distinct
 * total, 0 games with 2 or more). So every `OVER_ALT` / `UNDER_ALT` / `SGP`
 * wager in the ledger was struck at a line no book quoted — the picker
 * generates them as `base * (1 + 0.09 * shift)`, roughly 16% above a ladder
 * that does not exist. `bets.line_source` carries the literal value `'none'`
 * on 286 rows.
 *
 * Split by price basis (2026-08-23 audit), the legacy ledger says one thing:
 *
 *   wallet   book-priced         synthetic
 *   W4       -14.0%  n=78        +45.5%  n=65  (p=0.0029)
 *   W6       no settled wagers   + 7.7%  n=593
 *   W8       -77.7%  n=25        - 2.7%  n=52
 *   W9       -41.8%  n=5         - 1.6%  n=31
 *   W7       +22.6%  n=103       -35.5%  n=25
 *
 * Every positive figure came from a price we set ourselves. W6's headline
 * "+5.0%, n=622" — the largest sample in the ledger — has ZERO settled
 * book-priced wagers: all 320 of its ML bets are void.
 *
 * Those wallets were DELETED on 2026-08-23 (CD #38) — not for their ROI, but
 * because no legacy pick was reproducible (0 of 1,480 settled bets carried a
 * line, 0 carried a calibrated probability, 0 were graded by settlement-v1).
 * Their rows live in the `archive_legacy` schema.
 *
 * The map below is therefore inert today: no live wallet id appears in it and
 * `priceBasisOf` answers 'book' for all 22. It is kept as the GUARD, not as a
 * record — the moment any wallet is found to be betting a line no book quoted,
 * its share goes here and its ROI stops rendering. That is the lesson CD #37
 * cost us, and deleting the map would delete the lesson with the wallets.
 */
export type PriceBasis = 'book' | 'mixed' | 'synthetic'

/** Share of settled wagers struck at a price we generated. Measured 2026-08-23. */
export const SYNTHETIC_SHARE: Record<number, number> = {
  4: 0.45,   // 65 of 144 settled
  6: 1.00,   // 593 of 622 — the other 29 are SPREAD_COVER at -48.9%
  8: 0.68,   // 52 of 77
  9: 0.86,   // 31 of 36
  13: 1.00,  // 14 of 14
  14: 1.00,  // 3 of 3
  16: 1.00,  // 1 of 1
  22: 1.00,  // 1 of 1
  7: 0.18,   // 25 of 140 — the rest is the book-priced +22.6% slice
}

export function priceBasisOf(walletId: number): PriceBasis {
  const share = SYNTHETIC_SHARE[walletId]
  if (share === undefined || share === 0) return 'book'
  return share >= 0.5 ? 'synthetic' : 'mixed'
}

/**
 * A majority-synthetic wallet has no scoreable ROI. Callers should render
 * `UNPRICED_LABEL` in place of the figure rather than suppressing the row —
 * the wallet still happened, and hiding it would lose the lesson.
 */
export const UNPRICED_LABEL = 'unpriced'
export const UNPRICED_TITLE =
  'Struck at prices no book quoted (alt-lines / SGP). The ROI measures our own ' +
  'model against itself and is not a result in either direction. CD #37.'

export const MIXED_PRICE_TITLE =
  'Part of this record was struck at prices we generated. Read the book-priced ' +
  'slice only — the blended figure is not comparable to a book-priced wallet.'
