<template>
  <div class="wallet-hero rounded-xl p-3 sm:p-4 relative overflow-hidden">
    <div class="relative">
      <!-- No name or blurb here: the page above the card already carries both,
           and the truncated copy that used to sit here was the same sentence
           cut off mid-word. The mini-sparkline was removed 2026-09-10 — the
           equity chart beside this card already plots the same curve. -->

      <!-- Balance -->
      <div class="mb-2.5">
        <p class="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Balance</p>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">${{ formatNum(wallet.balance) }}</span>
          <span class="text-sm font-bold tabular-nums" :class="pl >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ pl >= 0 ? '+' : '' }}{{ formatNum(pl) }}
          </span>
        </div>
      </div>

      <!-- Stats grid — every figure from get_wallet_performance, never from
           the wallets stat columns, which are bankroll return and stale. -->
      <div class="grid grid-cols-4 gap-2">
        <div>
          <p class="text-[9px] text-zinc-500 uppercase" title="Profit / turnover">ROI</p>
          <p
            class="text-sm font-bold tabular-nums"
            :class="unpriced ? 'text-neutral-500 italic font-normal'
                  : roi == null ? 'text-zinc-600' : roi >= 0 ? 'text-emerald-400' : 'text-red-400'"
            :title="unpriced ? UNPRICED_TITLE : mixedPrice ? MIXED_PRICE_TITLE : undefined"
          >
            <template v-if="unpriced">{{ UNPRICED_LABEL }}</template>
            <template v-else>{{ roi == null ? '—' : (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%'
              }}<span v-if="mixedPrice" class="text-amber-500/80 font-normal">*</span></template>
          </p>
        </div>
        <div>
          <p class="text-[9px] text-zinc-500 uppercase">Win</p>
          <p class="text-sm font-bold text-zinc-100 tabular-nums">
            {{ winRate == null ? '—' : winRate.toFixed(1) + '%' }}
          </p>
        </div>
        <div>
          <p class="text-[9px] text-zinc-500 uppercase" title="Settled wagers — a parlay counts once, never its legs">Wagers</p>
          <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ nWagers }}</p>
        </div>
        <div>
          <p class="text-[9px] text-zinc-500 uppercase">Seed</p>
          <p class="text-sm font-bold text-zinc-100 tabular-nums">${{ formatNum(wallet.initial_balance) }}</p>
        </div>
      </div>

      <!-- ROI never travels alone (performance-claim rule 2). The verdict is
           the COHORT-corrected one: this wallet was read off a roster scored
           all at once, so its own p is not the bar it has to clear. -->
      <div v-if="performance" class="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-x-2 gap-y-1 flex-wrap">
        <span
          class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
          :class="VERDICT_CLASS[verdict]"
          :title="VERDICT_TITLE[verdict]"
        >{{ VERDICT_LABEL[verdict] }}</span>
        <span class="text-[10px] text-zinc-500 tabular-nums">
          <template v-if="performance.p_luck != null">
            p(luck) = {{ Number(performance.p_luck).toFixed(3) }}<template v-if="family && family.k > 1">
              · needs p&lt;{{ family.bonferroni.toFixed(4) }} at k={{ family.k }}</template>
            · turnover ${{ formatNum(performance.turnover) }}
          </template>
          <template v-else>
            below n=10 — a simulation says nothing useful here
          </template>
        </span>
        <span v-if="performance.n_pending > 0" class="text-[10px] text-amber-400 tabular-nums">
          {{ performance.n_pending }} open
        </span>
      </div>

      <!-- A mirrored wallet's ROI is a statement about the fraction of the
           source we could bind, not about the tipster. Never render one
           without the other. Compacted 2026-09-10 — one line of prose plus a
           figure strip, not two paragraphs. -->
      <div v-if="coverage" class="mt-2 pt-2 border-t border-white/5">
        <p class="text-[10px] text-zinc-400 leading-snug">
          <span class="font-semibold text-zinc-300">Mirror.</span>
          {{ coverage.slips_in_ledger.toLocaleString() }}/{{ coverage.slips.toLocaleString() }} slips
          (<span :class="coverageClass">{{ Number(coverage.coverage_pct).toFixed(1) }}%</span>)
          bound — figures above describe those, not the tipster's record.
        </p>
        <p class="text-[10px] text-zinc-600 mt-0.5 tabular-nums">
          <template v-if="coverage.verdict_comparable">
            agrees {{ coverage.verdict_agree }}/{{ coverage.verdict_comparable }} ·
          </template>
          {{ coverage.legs_no_fixture.toLocaleString() }} legs no fixture ·
          {{ coverage.legs_no_market.toLocaleString() }} no market
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { VERDICT_CLASS, VERDICT_LABEL, VERDICT_TITLE,
         priceBasisOf, UNPRICED_LABEL, UNPRICED_TITLE, MIXED_PRICE_TITLE } from '~/utils/wallet-stats'

const props = defineProps({
  wallet:           { type: Object, required: true },
  /** One `get_wallet_performance` row. Null renders the stats as unknown. */
  performance:      { type: Object, default: null },
  /** Cohort-corrected verdict from utils/wallet-stats.scoreFamily. */
  verdict:          { type: String, default: 'n<10' },
  /** { k, bonferroni } for the cohort this wallet was scored in. */
  family:           { type: Object, default: null },
  /** One v_tipster_wallet_coverage row — mirrored wallets only. */
  coverage:         { type: Object, default: null },
})

/**
 * Balance movement — this one IS a bankroll figure and is labelled as such
 * beside the balance. It is not ROI, and must not be relabelled as ROI: for W7
 * this reads +69.71 where the ROI is +11.5%.
 */
const pl = computed(() =>
  parseFloat(props.wallet?.balance || 0) - parseFloat(props.wallet?.initial_balance || 0))

const roi = computed(() =>
  props.performance?.roi_pct == null ? null : Number(props.performance.roi_pct))

/**
 * A wallet whose wagers were struck at prices we generated has no scoreable
 * ROI — the figure measures our own model against itself. Rendered as
 * `unpriced` rather than hidden: the wallet happened, and the row is the
 * record of why alt-line pricing is banned (CD #37).
 */
const priceBasis = computed(() => priceBasisOf(Number(props.wallet?.id)))
const unpriced = computed(() => priceBasis.value === 'synthetic')
const mixedPrice = computed(() => priceBasis.value === 'mixed')

const winRate = computed(() =>
  props.performance?.win_rate_pct == null ? null : Number(props.performance.win_rate_pct))

const nWagers = computed(() => Number(props.performance?.n_wagers ?? 0))

const coverageClass = computed(() => {
  const n = Number(props.coverage?.coverage_pct || 0)
  if (n >= 25) return 'text-zinc-300'
  if (n >= 10) return 'text-amber-400'
  return 'text-red-400'
})

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.wallet-hero {
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(16, 55, 40, 0.18) 100%);
  border: 1px solid rgba(52, 211, 153, 0.15);
}
</style>
