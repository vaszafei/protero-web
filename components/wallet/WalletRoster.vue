<template>
  <section class="panel panel-fill h-full">
    <header class="panel-head !items-center gap-3 flex-shrink-0">
      <UiTabs v-model="tab" :tabs="tabs" size="sm" />

      <template v-if="active">
        <span class="text-[10px] text-zinc-600 truncate">{{ active.hint }}</span>
        <span
          v-if="active.family.k > 1"
          class="ml-auto text-[10px] text-zinc-600 tabular-nums flex-shrink-0"
          :title="`${active.family.k} wallets in this cohort carry a p-value, so a p<0.05 picked out of it is not evidence. Bonferroni threshold shown.`"
        >
          k={{ active.family.k }} · needs p&lt;{{ active.family.bonferroni.toFixed(4) }}
        </span>
      </template>

      <UiTooltip :class="active && active.family.k > 1 ? '' : 'ml-auto'" :width="400" placement="bottom">
        <span class="panel-link !ml-0">how to read</span>
        <template #content>
          <p>
            A wager is one settled bet, or one parlay at its parlay price — never a parlay's legs.
            <b>unpriced</b> = struck at alt-line/SGP prices no book quoted, so the ROI measures our own model
            against itself (CD #37); <b>*</b> = part of the record was. ROI is profit over turnover, not
            bankroll return. p(luck) is the chance a bettor with no edge matches this P&amp;L.
          </p>
          <p class="mt-2">
            Verdicts are corrected for the size of the cohort they were picked from — the whole roster is
            scored at once, so an uncorrected p&lt;0.05 is a selection, not a finding. Run
            <code>python3 -m common.wallet_significance</code> before publishing any of it.
          </p>
        </template>
      </UiTooltip>
    </header>

    <div v-if="tab === SOURCES_KEY" class="panel-scroll">
      <slot name="sources" />
    </div>

    <div v-else-if="active" :key="active.key" class="panel-scroll">
      <table class="w-full text-xs">
        <thead class="sticky top-0 z-[1] bg-surface">
          <tr class="text-zinc-500">
            <th class="text-left font-medium px-3 py-1.5">Wallet</th>
            <th class="text-right font-medium px-2 py-1.5 w-16" title="Settled wagers. A parlay counts once, never its legs.">n</th>
            <th class="text-right font-medium px-2 py-1.5 w-16" title="Unsettled wagers">Open</th>
            <th
              v-if="active.showCoverage"
              class="text-right font-medium px-2 py-1.5 w-28"
              title="Share of this tipster's published slips our resolver could bind to a fixture. The ROI describes only these."
            >Covered</th>
            <th class="text-right font-medium px-2 py-1.5 w-24">Turnover</th>
            <th class="text-right font-medium px-2 py-1.5 w-24">P&amp;L</th>
            <th class="text-right font-medium px-2 py-1.5 w-20" title="Profit / turnover — not bankroll return">ROI</th>
            <th class="text-right font-medium px-2 py-1.5 w-20" title="Chance a zero-edge bettor matches this. Lower is better.">p(luck)</th>
            <th class="text-left font-medium px-3 py-1.5 w-28">Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in active.rows" :key="r.id"
            :style="rowDelay(i)"
            :data-testid="`roster-${r.id}`"
            class="row-in border-t border-edge/40 cursor-pointer transition-colors"
            :class="r.id === selectedId ? 'bg-[var(--brand-blue-tint)]' : 'hover:bg-surface-light/30'"
            @click="$emit('select', r.id)"
          >
            <td class="px-3 py-1.5">
              <UiTooltip :width="320" placement="bottom">
                <span class="inline-flex items-center gap-2 min-w-0">
                  <span class="pill pill-dim flex-shrink-0 uppercase tracking-wider">{{ r.meta.badge }}</span>
                  <span
                    v-if="r.sourceName"
                    class="pill flex-shrink-0"
                    :class="sourceClass(r.sourceKey)"
                    :title="`External source: ${r.sourceName}`"
                  >{{ r.sourceName }}</span>
                  <span class="text-zinc-200 font-medium truncate">{{ r.meta.longName }}</span>
                  <span class="text-[10px] text-zinc-600 flex-shrink-0">W{{ r.id }}</span>
                </span>
                <template #content>
                  <p>{{ r.bio || 'No bio recorded.' }}</p>
                </template>
              </UiTooltip>
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums text-zinc-400">{{ r.perf.n_wagers }}</td>
            <td class="px-2 py-1.5 text-right tabular-nums" :class="r.perf.n_pending > 0 ? 'text-amber-400' : 'text-zinc-600'">
              {{ r.perf.n_pending || '—' }}
            </td>
            <td v-if="active.showCoverage" data-testid="covered" class="px-2 py-1.5 text-right tabular-nums">
              <template v-if="r.coverage">
                <span :class="coverageClass(r.coverage.coverage_pct)">{{ r.coverage.coverage_pct.toFixed(1) }}%</span>
                <span class="text-zinc-600"> of {{ r.coverage.slips }}</span>
              </template>
              <span v-else class="text-zinc-600">—</span>
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums text-zinc-500">{{ money(r.perf.turnover) }}</td>
            <td data-testid="pnl" class="px-2 py-1.5 text-right tabular-nums" :class="signClass(r.perf.pnl)">{{ formatMoney(r.perf.pnl, { signed: true }) }}</td>
            <td
              data-testid="roi"
              class="px-2 py-1.5 text-right tabular-nums font-semibold"
              :class="priceBasisOf(r.id) === 'synthetic' ? 'text-neutral-500 italic font-normal' : roiInk(r.perf.roi_pct, r.verdict).class"
              :title="priceBasisOf(r.id) === 'synthetic' ? UNPRICED_TITLE
                    : priceBasisOf(r.id) === 'mixed' ? MIXED_PRICE_TITLE : roiInk(r.perf.roi_pct, r.verdict).title"
            >
              <template v-if="coverageError && active.showCoverage"><span class="text-[10px] text-negative font-normal" :title="coverageError">coverage unavailable</span></template>
              <template v-else-if="priceBasisOf(r.id) === 'synthetic'">{{ UNPRICED_LABEL }}</template>
              <template v-else>
                {{ r.perf.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}<span
                  v-if="priceBasisOf(r.id) === 'mixed'" class="text-amber-500/80 font-normal">*</span>
              </template>
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums" :class="pClass(r.perf.p_luck)">
              {{ r.perf.p_luck == null ? '—' : Number(r.perf.p_luck).toFixed(3) }}
            </td>
            <td class="px-3 py-1.5">
              <span
                data-testid="verdict"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                :class="VERDICT_CLASS[r.verdict]"
                :title="VERDICT_TITLE[r.verdict]"
              >{{ VERDICT_LABEL[r.verdict] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/formatters'
import { rowDelay } from '~/utils/motion'
import { computed, ref, useSlots, watch } from 'vue'
import { resolveWalletMeta } from '~/utils/wallet-meta'
import { cohortOf, scoreRoster, roiInk, VERDICT_CLASS, VERDICT_LABEL, VERDICT_TITLE,
         priceBasisOf, UNPRICED_LABEL, UNPRICED_TITLE, MIXED_PRICE_TITLE } from '#logic/wallet-stats'

const props = defineProps({
  wallets:     { type: Array, required: true },   // rows from `wallets`
  performance: { type: Array, default: () => [] },// rows from get_wallet_performance
  /** Rows from v_tipster_wallet_coverage, via /api/wallet/tipsters. */
  coverage:    { type: Array, default: () => [] },
  /** Source registry (key + display name), via /api/wallet/tipsters. */
  sources:     { type: Array, default: () => [] },
  selectedId:  { type: Number, default: null },
  /** Why the coverage call failed. A mirror's ROI describes only the slips that bound, so it is replaced, not shown bare. */
  coverageError: { type: String, default: null },
})

/** Which external source a mirrored wallet replays. Keyed by tipster_sources.key. */
const sourceNameByKey = computed(() => {
  const m = new Map()
  for (const s of props.sources) m.set(s.key, s.name)
  return m
})

defineEmits<{ (e: 'select', id: number): void }>()

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
      bio: blurb,
      meta: resolveWalletMeta(w),
      perf: perfById.get(w.id) || EMPTY_PERF,
      coverage: cov,
      sourceKey: cov?.source_key || null,
      sourceName: cov?.source_key ? sourceNameByKey.value.get(cov.source_key) || cov.source_key : null,
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
const scores = computed(() => scoreRoster(
  props.wallets || [],
  (props.performance || []).map(p => ({ wallet_id: p.wallet_id, p_luck: p.p_luck, n_wagers: p.n_wagers })),
))

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
    .map(g => ({
      ...g,
      family: { k: scores.value.get(g.rows[0].id).k, bonferroni: scores.value.get(g.rows[0].id).bar },
      rows: g.rows.map(r => ({ ...r, verdict: scores.value.get(r.id).verdict })),
    }))
})

const SOURCES_KEY = 'sources'
const slots = useSlots()

const tabs = computed(() => [
  ...groups.value.map(g => ({ key: g.key, label: g.label, badge: g.rows.length })),
  ...(slots.sources ? [{ key: SOURCES_KEY, label: 'Sources' }] : []),
])

/** `?w=` (the dashboard fleet links here) opens the cohort holding that wallet. */
const tab = ref('')
watch([groups, () => props.selectedId], () => {
  if (tabs.value.some(t => t.key === tab.value)) return
  const holder = groups.value.find(g => g.rows.some(r => r.id === props.selectedId))
  tab.value = holder?.key || groups.value[0]?.key || ''
}, { immediate: true })

const active = computed(() => groups.value.find(g => g.key === tab.value) || null)

function money(v) {
  const n = Number(v || 0)
  return n === 0 ? '—' : formatMoney(n)
}

function signed(v) {
  if (v == null) return '—'
  const n = Number(v)
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function signClass(v) {
  if (v == null || Number(v) === 0) return 'text-zinc-600'
  return Number(v) > 0 ? 'text-positive' : 'text-negative'
}

// Only p<0.20 is worth visually distinguishing; everything above is noise.
function pClass(p) {
  if (p == null) return 'text-zinc-600'
  const n = Number(p)
  if (n < 0.05) return 'text-[var(--brand-blue)] font-semibold'
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

// Source chip — blue for betarades, neutral for the rest (green is money only).
function sourceClass(key: string) {
  return key === 'betarades' ? 'pill-blue' : 'pill-dim'
}
</script>
