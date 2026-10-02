<template>
  <section class="panel panel-fill">
    <header class="panel-head">
      <h2 class="panel-title">Fleet</h2>
      <span class="panel-count">{{ rows.length }}</span>
      <UiTooltip class="ml-auto" :width="380" placement="bottom">
        <span class="panel-link">how to read</span>
        <template #content>
          <p>
            ROI is profit over turnover. The verdict is corrected for the cohort each wallet was scored in
            (the same one /wallet shows), and a figure under ten settled wagers is greyed — it is not a
            result. Nothing here reaches EDGE — run <code>python3 -m common.wallet_significance</code>
            before quoting any of it.
          </p>
          <p v-if="riskAsOf" class="mt-2">
            The Sharpe / DD / green line is <code>wallet_scorecards</code> (lifetime), written {{ riskAsOf }} by
            <code>common.scorecard_update</code> — a hand-run with no cadence, so it is as old as that. Below
            ten settled wagers the line is absent, not zero.
            <template v-if="anyCappedDd">100%* is the writer's DD cap — cumulative P&amp;L fell from a positive
            peak back through zero. It means "gave the peak back", not a bankroll wipe.</template>
            Calmar, CLV and the regime flag are withheld: under that cap Calmar is just |ROI|, CLV is NULL
            for every wallet, and the flag is one global <code>gamma_state</code> row stamped on all 24.
          </p>
        </template>
      </UiTooltip>
      <NuxtLink to="/wallet" class="panel-link !ml-2">All wallets →</NuxtLink>
    </header>

    <div class="panel-scroll">
      <table class="w-full text-xs table-fixed">
        <thead>
          <tr class="text-zinc-500 border-b border-edge/60">
            <th class="text-left font-medium px-2 py-1.5">Wallet</th>
            <th class="text-right font-medium px-2 py-1.5 w-12" title="Settled wagers. A parlay counts once, never its legs.">n</th>
            <th class="text-right font-medium px-2 py-1.5 w-12">Open</th>
            <th class="text-right font-medium px-2 py-1.5 w-16" title="Profit / turnover — not bankroll return">ROI</th>
            <th class="text-right font-medium px-2 py-1.5 w-16">Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in rows" :key="r.id"
            :data-testid="`fleet-${r.id}`"
            class="row-hover cursor-pointer row-in"
            :style="rowDelay(i)"
            @click="$router.push(`/wallet?w=${r.id}`)"
          >
            <td class="px-2 py-1.5">
              <UiTooltip v-if="hasRisk(r)" :width="260" placement="bottom">
                <span class="text-zinc-200 truncate inline-block max-w-[150px] align-bottom">{{ r.name }}</span>
                <template #content>
                  <p>Sharpe {{ r.risk.sharpe.toFixed(2) }} — mean daily P&amp;L over its standard deviation, annualised by √252. Days without a settled wager are not in the series.</p>
                  <p v-if="r.risk.max_drawdown_pct != null" class="mt-1">DD {{ (r.risk.max_drawdown_pct * 100).toFixed(0) }}%<template v-if="r.risk.max_drawdown_pct >= 1">*</template> — {{ ddTitle(r.risk.max_drawdown_pct) }}</p>
                  <p v-if="r.risk.pct_green_days != null" class="mt-1">{{ (r.risk.pct_green_days * 100).toFixed(0) }}% green — share of days with a settled wager that finished positive.</p>
                </template>
              </UiTooltip>
              <span v-else class="text-zinc-200 truncate inline-block max-w-[150px] align-bottom" :title="r.name">{{ r.name }}</span>
              <span class="ml-1.5 text-[10px] text-zinc-600">W{{ r.id }}</span>
              <span v-if="r.silent" class="ml-1.5 pill pill-dim"
                    title="Trader persona with no picker wired — it cannot place a bet">NO PICKER</span>
            </td>
            <td class="px-2 py-1.5 text-right tabular-nums text-zinc-400">{{ n(r) }}</td>
            <td class="px-2 py-1.5 text-right tabular-nums" :class="open(r) ? 'text-amber-400' : 'text-zinc-600'">
              {{ open(r) || '—' }}
            </td>
            <td
              class="px-2 py-1.5 text-right tabular-nums font-semibold"
              :class="roiInk(r.perf?.roi_pct, r.verdict).class"
              :title="roiInk(r.perf?.roi_pct, r.verdict).title"
            >
              {{ r.perf?.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}
            </td>
            <td class="px-2 py-1.5 text-right">
              <span
                data-testid="verdict"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                :class="VERDICT_CLASS[r.verdict]"
                :title="`${VERDICT_TITLE[r.verdict]}${r.k > 1 ? ` Scored at k=${r.k}, needs p<${r.bar.toFixed(4)}.` : ''}`"
              >{{ VERDICT_LABEL[r.verdict] }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="hidden > 0" class="text-[10px] text-zinc-600 px-3 py-1.5 border-t border-edge/40">
        {{ hidden }} more legacy wallet<span v-if="hidden !== 1">s</span> below {{ LEGACY_MIN_N }} settled wagers —
        <NuxtLink to="/wallet" class="text-zinc-500 hover:text-zinc-300">see all</NuxtLink>.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Fleet health, sorted by what has actually been measured.
 *
 * A wallet with no picker (W27, W30) is marked rather than hidden: "0 wagers"
 * on an active persona reads as a quiet day, when in fact nothing can ever
 * write to it.
 *
 * The ROI comes from `get_wallet_performance` and the verdict from
 * `utils/wallet-stats.scoreRoster` (computed server-side, one per wallet — the RPC's
 * own verdict is uncorrected for its cohort and is never rendered); the grey sub-line
 * comes from `wallet_scorecards`. They are two bases and are kept visibly apart
 * — a risk read is not a significance read, and the scorecard's own KEEP/PAUSE
 * verdict is NOT rendered, because it would sit beside the RPC's LUCK/EDGE
 * verdict in the same row saying a different thing about the same wallet.
 */
import { computed } from 'vue'
import { rowDelay } from '~/utils/motion'
import { roiInk, VERDICT_CLASS, VERDICT_LABEL, VERDICT_TITLE } from '#logic/wallet-stats'

const props = defineProps({
  fleet: { type: Array, default: () => [] },
})

/** Trader personas with no picker built — CD #35 records both. */
const NO_PICKER = new Set([27, 30])

/** Legacy wallets below this many settled wagers are summarised, not listed. */
const LEGACY_MIN_N = 30

const all = computed(() =>
  [...props.fleet]
    .map(w => ({ ...w, silent: NO_PICKER.has(w.id) }))
    .sort((a, b) => (n(b) - n(a)) || (open(b) - open(a)) || (a.id - b.id))
)

const rows = computed(() =>
  all.value.filter(w => w.lifecycle === 'trader' || n(w) >= LEGACY_MIN_N || open(w) > 0)
)

const hidden = computed(() => all.value.length - rows.value.length)

function hasRisk(r) { return r.risk?.sharpe != null }

/** The newest scorecard batch — they are all written in one pass. */
const riskAsOf = computed(() => {
  const stamps = props.fleet.map(w => w.risk?.computed_at).filter(Boolean)
  if (!stamps.length) return null
  return new Date(stamps.sort().at(-1)).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  })
})

const anyCappedDd = computed(() =>
  rows.value.some(r => hasRisk(r) && r.risk.max_drawdown_pct >= 1)
)

function ddTitle(dd) {
  return dd >= 1
    ? 'Peak-to-trough give-back of cumulative P&L, capped at 100% by the writer. 100% means P&L fell from a positive peak back to zero or below — not that a bankroll was lost.'
    : 'Peak-to-trough give-back of cumulative P&L.'
}

function n(r) { return Number(r.perf?.n_wagers || 0) }
function open(r) { return Number(r.perf?.n_pending || 0) }

function signed(v) {
  if (v == null) return '—'
  const x = Number(v)
  return (x >= 0 ? '+' : '') + x.toFixed(2)
}


</script>
