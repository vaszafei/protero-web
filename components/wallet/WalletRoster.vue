<template>
  <div>
    <div v-for="group in groups" :key="group.key" class="mb-6 last:mb-0">
      <div class="flex items-baseline gap-2 mb-1.5 px-1 flex-wrap">
        <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{{ group.label }}</h3>
        <span class="text-[10px] text-zinc-600 tabular-nums">{{ group.rows.length }}</span>
        <span class="text-[10px] text-zinc-600">— {{ group.hint }}</span>
        <span
          v-if="group.family.k > 1"
          class="ml-auto text-[10px] text-zinc-600 tabular-nums"
          :title="`${group.family.k} wallets in this cohort carry a p-value, so a p<0.05 picked out of it is not evidence. Bonferroni threshold shown.`"
        >
          k={{ group.family.k }} · needs p&lt;{{ group.family.bonferroni.toFixed(4) }}
        </span>
      </div>

      <!-- Desktop: dense table. An operator reads a roster, not a card wall. -->
      <div class="hidden md:block rounded-lg border border-edge overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-surface-light/40 text-zinc-500">
              <th class="text-left font-medium px-3 py-2">Wallet</th>
              <th class="text-right font-medium px-2 py-2 w-16" title="Settled wagers. A parlay counts once, never its legs.">n</th>
              <th class="text-right font-medium px-2 py-2 w-16" title="Unsettled wagers">Open</th>
              <th
                v-if="group.showCoverage"
                class="text-right font-medium px-2 py-2 w-24"
                title="Share of this tipster's published slips our resolver could bind to a fixture. The ROI describes only these."
              >Covered</th>
              <th class="text-right font-medium px-2 py-2 w-24">Turnover</th>
              <th class="text-right font-medium px-2 py-2 w-24">P&amp;L</th>
              <th class="text-right font-medium px-2 py-2 w-20" title="Profit / turnover — not bankroll return">ROI</th>
              <th class="text-right font-medium px-2 py-2 w-20" title="Chance a zero-edge bettor matches this. Lower is better.">p(luck)</th>
              <th class="text-left font-medium px-3 py-2 w-28">Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in group.rows" :key="r.id"
              @click="$emit('select', r.id)"
              class="border-t border-edge/40 cursor-pointer transition-colors"
              :class="r.id === selectedId ? 'bg-blue-500/10' : 'hover:bg-surface-light/30'"
            >
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <span class="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-light text-zinc-400 border border-edge">
                    {{ r.meta.badge }}
                  </span>
                  <span
                    v-if="r.sourceName"
                    class="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold"
                    :class="sourceClass(r.sourceKey)"
                    :title="`External source: ${r.sourceName}`"
                  >{{ r.sourceName }}</span>
                  <div class="min-w-0">
                    <div class="text-zinc-200 font-medium truncate">{{ r.meta.longName }}</div>
                    <div class="text-[10px] text-zinc-600 truncate">W{{ r.id }} · {{ r.blurbShort }}</div>
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ r.perf.n_wagers }}</td>
              <td class="px-2 py-2 text-right tabular-nums" :class="r.perf.n_pending > 0 ? 'text-amber-400' : 'text-zinc-600'">
                {{ r.perf.n_pending || '—' }}
              </td>
              <td v-if="group.showCoverage" class="px-2 py-2 text-right tabular-nums">
                <template v-if="r.coverage">
                  <span :class="coverageClass(r.coverage.coverage_pct)">{{ r.coverage.coverage_pct.toFixed(1) }}%</span>
                  <span class="text-zinc-600"> of {{ r.coverage.slips }}</span>
                </template>
                <span v-else class="text-zinc-600">—</span>
              </td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ money(r.perf.turnover) }}</td>
              <td class="px-2 py-2 text-right tabular-nums" :class="signClass(r.perf.pnl)">{{ signed(r.perf.pnl) }}</td>
              <td
                class="px-2 py-2 text-right tabular-nums font-semibold"
                :class="priceBasisOf(r.id) === 'synthetic' ? 'text-neutral-500 italic font-normal' : signClass(r.perf.roi_pct)"
                :title="priceBasisOf(r.id) === 'synthetic' ? UNPRICED_TITLE
                      : priceBasisOf(r.id) === 'mixed' ? MIXED_PRICE_TITLE : undefined"
              >
                <template v-if="priceBasisOf(r.id) === 'synthetic'">{{ UNPRICED_LABEL }}</template>
                <template v-else>
                  {{ r.perf.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}<span
                    v-if="priceBasisOf(r.id) === 'mixed'" class="text-amber-500/80 font-normal">*</span>
                </template>
              </td>
              <td class="px-2 py-2 text-right tabular-nums" :class="pClass(r.perf.p_luck)">
                {{ r.perf.p_luck == null ? '—' : Number(r.perf.p_luck).toFixed(3) }}
              </td>
              <td class="px-3 py-2">
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                  :class="VERDICT_CLASS[r.verdict]"
                  :title="VERDICT_TITLE[r.verdict]"
                >{{ VERDICT_LABEL[r.verdict] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: the same rows, stacked. -->
      <div class="md:hidden space-y-1.5">
        <button
          v-for="r in group.rows" :key="r.id"
          @click="$emit('select', r.id)"
          class="w-full text-left rounded-lg border p-3 transition-colors"
          :class="r.id === selectedId ? 'border-blue-500/40 bg-blue-500/10' : 'border-edge bg-surface hover:border-edge-light'"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm text-zinc-200 font-medium truncate">{{ r.meta.longName }}</div>
              <div class="text-[10px] text-zinc-600">
                W{{ r.id }} · {{ r.meta.badge }}
                <span
                  v-if="r.sourceName"
                  class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold"
                  :class="sourceClass(r.sourceKey)"
                >{{ r.sourceName }}</span>
              </div>
            </div>
            <span
              class="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              :class="VERDICT_CLASS[r.verdict]"
            >{{ VERDICT_LABEL[r.verdict] }}</span>
          </div>
          <div class="flex items-center gap-3 mt-2 text-[11px] tabular-nums flex-wrap">
            <span class="text-zinc-500">n <span class="text-zinc-300">{{ r.perf.n_wagers }}</span></span>
            <span v-if="r.perf.n_pending" class="text-amber-400">{{ r.perf.n_pending }} open</span>
            <span
              :class="priceBasisOf(r.id) === 'synthetic' ? 'text-neutral-500 italic' : signClass(r.perf.roi_pct)"
              :title="priceBasisOf(r.id) === 'synthetic' ? UNPRICED_TITLE : undefined"
            >
              <template v-if="priceBasisOf(r.id) === 'synthetic'">ROI {{ UNPRICED_LABEL }}</template>
              <template v-else>ROI {{ r.perf.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}<span
                v-if="priceBasisOf(r.id) === 'mixed'" class="text-amber-500/80">*</span></template>
            </span>
            <span v-if="r.perf.p_luck != null" :class="pClass(r.perf.p_luck)">
              p={{ Number(r.perf.p_luck).toFixed(2) }}
            </span>
            <span v-if="r.coverage" :class="coverageClass(r.coverage.coverage_pct)">
              {{ r.coverage.coverage_pct.toFixed(0) }}% covered
            </span>
          </div>
        </button>
      </div>
    </div>

    <p class="text-[10px] text-zinc-600 leading-relaxed mt-4 px-1">
      A wager is one settled bet, or one parlay at its parlay price — never a parlay's legs.
      <span class="text-neutral-500">unpriced</span> = struck at alt-line/SGP prices no book quoted, so the ROI
      measures our own model against itself (CD #37); <span class="text-amber-500/80">*</span> = part of the record was.
      ROI is profit over turnover, not bankroll return. p(luck) is the chance a bettor with no edge
      matches this P&amp;L. <span class="text-zinc-500">Verdicts are corrected for the size of the
      cohort they were picked from</span> — the whole roster is scored at once, so an uncorrected
      p&lt;0.05 is a selection, not a finding. Run
      <code class="text-zinc-500">python3 -m common.wallet_significance</code> before publishing any
      of it.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveWalletMeta } from '~/utils/wallet-meta'
import { cohortOf, scoreFamily, VERDICT_CLASS, VERDICT_LABEL, VERDICT_TITLE,
         priceBasisOf, UNPRICED_LABEL, UNPRICED_TITLE, MIXED_PRICE_TITLE } from '~/utils/wallet-stats'

const props = defineProps({
  wallets:     { type: Array, required: true },   // rows from `wallets`
  performance: { type: Array, default: () => [] },// rows from get_wallet_performance
  /** Rows from v_tipster_wallet_coverage, via /api/wallet/tipsters. */
  coverage:    { type: Array, default: () => [] },
  /** Source registry (key + display name), via /api/wallet/tipsters. */
  sources:     { type: Array, default: () => [] },
  selectedId:  { type: Number, default: null },
})

/** Which external source a mirrored wallet replays. Keyed by tipster_sources.key. */
const sourceNameByKey = computed(() => {
  const m = new Map()
  for (const s of props.sources) m.set(s.key, s.name)
  return m
})

defineEmits(['select'])

const EMPTY_PERF = {
  n_wagers: 0, n_won: 0, n_pending: 0, turnover: 0, pnl: 0,
  roi_pct: null, win_rate_pct: null, p_luck: null, verdict: 'n<10',
}

const rows = computed(() => {
  const perfById = new Map((props.performance || []).map(p => [p.wallet_id, p]))
  const covById = new Map((props.coverage || []).map(c => [c.wallet_id, c]))
  return (props.wallets || []).map(w => {
    const blurb = (w.bio || '').trim()
    const cov = covById.get(w.id) || null
    return {
      id: w.id,
      raw: w,
      meta: resolveWalletMeta(w),
      perf: perfById.get(w.id) || EMPTY_PERF,
      coverage: cov,
      sourceKey: cov?.source_key || null,
      sourceName: cov?.source_key ? sourceNameByKey.value.get(cov.source_key) || cov.source_key : null,
      blurbShort: blurb.length > 68 ? blurb.slice(0, 68) + '…' : (blurb || '—'),
    }
  })
})

/**
 * Three cohorts, because there are three kinds of thing in this table and
 * mixing them corrupts both the reading and the statistics.
 *
 *   ours       — strategies we run. `lifecycle='trader'`, not an external mirror.
 *   incubation — strategies we run in incubation; accrue rows, never a claim.
 *   mirror     — an external tipster's published picks, replayed at a flat unit
 *                (`archetype='external_tipster'`). Reference data, never a
 *                strategy of ours, and never comparable to a wallet we operate:
 *                its ROI covers only the fraction of the source we could bind.
 *   user_mirror— a real bettor's ACTUAL Stoiximan slips at their real stakes
 *                (`lifecycle='user_mirror'`, W54). Real euros, not ours; its
 *                figures carry a binding-coverage caveat and are NOT that
 *                bettor's real record.
 *   legacy     — history, frozen at the 2026-07-28 cutover.
 *
 * `lifecycle` is the DB's own answer and `is_active` is not — several trader
 * personas are active with no picker built, and several legacy wallets still
 * take writes.
 *
 * Each cohort gets its OWN multiplicity correction. Pooling k across them
 * would let the 15-wallet tipster archive inflate the bar our own strategies
 * must clear, and vice versa — they are separate searches.
 */
const groups = computed(() => {
  const all = rows.value
  const inCohort = k => all.filter(r => cohortOf(r.raw) === k)
  const [ours, incubation, mirror, userMirror, legacy] =
    ['ours', 'incubation', 'mirror', 'user_mirror', 'legacy'].map(inCohort)
  const byVolume = (a, b) => (b.perf.n_wagers - a.perf.n_wagers) || (a.id - b.id)

  return [
    { key: 'trader', label: 'Trader personas', hint: 'the live roster (CD #35)',
      rows: ours.sort(byVolume), showCoverage: false },
    { key: 'incubation', label: 'Incubation',
      hint: 'strategies accruing settled rows — never a track record',
      rows: incubation.sort(byVolume), showCoverage: false },
    { key: 'mirror', label: 'Mirrored tipsters',
      hint: 'external picks replayed at a flat 1.00 — reference data, not our strategies',
      rows: mirror.sort(byVolume), showCoverage: true },
    { key: 'user_mirror', label: 'User mirror',
      hint: "a real bettor's actual slips at real stakes — coverage-capped, not their real record",
      rows: userMirror.sort(byVolume), showCoverage: true },
    { key: 'legacy', label: 'Legacy', hint: 'history; frozen at the cutover',
      rows: legacy.sort(byVolume), showCoverage: false },
  ]
    .filter(g => g.rows.length > 0)
    .map(g => ({ ...g, family: scoreFamily(g.rows.map(r => ({
      wallet_id: r.id, p_luck: r.perf.p_luck, n_wagers: r.perf.n_wagers,
    }))) }))
    .map(g => ({ ...g, rows: g.rows.map(r => ({ ...r, verdict: g.family.verdictById.get(r.id) })) }))
})

function money(v) {
  const n = Number(v || 0)
  return n === 0 ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function signed(v) {
  if (v == null) return '—'
  const n = Number(v)
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function signClass(v) {
  if (v == null || Number(v) === 0) return 'text-zinc-600'
  return Number(v) > 0 ? 'text-emerald-400' : 'text-red-400'
}

// Only p<0.20 is worth visually distinguishing; everything above is noise.
function pClass(p) {
  if (p == null) return 'text-zinc-600'
  const n = Number(p)
  if (n < 0.05) return 'text-emerald-400 font-semibold'
  if (n < 0.20) return 'text-amber-400'
  return 'text-zinc-500'
}

// Coverage is a warning, not an achievement: at 5% the ROI describes a
// twentieth of what the tipster published and the subsample is not random.
function coverageClass(pct) {
  const n = Number(pct || 0)
  if (n >= 25) return 'text-zinc-300'
  if (n >= 10) return 'text-amber-400'
  return 'text-red-400'
}

// Source chip — one colour per external source so the cohort reads as two
// groups at a glance. New sources fall through to the neutral zinc chip.
function sourceClass(key) {
  return {
    betarades:   'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    freetips247: 'bg-sky-500/10 text-sky-300 border border-sky-500/20',
  }[key] || 'bg-zinc-700/40 text-zinc-400 border border-edge'
}
</script>
