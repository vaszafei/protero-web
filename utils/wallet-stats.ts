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
 *   ours    — a strategy we run (`lifecycle='trader'`, not a mirror)
 *   mirror  — an external tipster's published picks replayed at a flat unit
 *   legacy  — our own history, frozen at the 2026-07-28 cutover
 */
export function cohortOf(w: { archetype?: string | null; lifecycle?: string | null }): 'ours' | 'mirror' | 'legacy' {
  if (w.archetype === 'external_tipster') return 'mirror'
  return w.lifecycle === 'trader' ? 'ours' : 'legacy'
}

export const COHORT_LABEL: Record<ReturnType<typeof cohortOf>, string> = {
  ours: 'Trader personas',
  mirror: 'Mirrored tipsters',
  legacy: 'Legacy',
}
