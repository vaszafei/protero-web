<template>
  <div v-if="seasons.length || loading" class="rounded-xl bg-surface border border-edge overflow-hidden flex flex-col min-h-0">
    <div class="px-3 py-2 border-b border-edge/50 flex items-baseline gap-2 flex-shrink-0">
      <h3 class="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider cursor-help whitespace-nowrap" :title="footnote">
        Season backtest — current rule
      </h3>
    </div>

    <div v-if="loading" class="py-4 text-center text-[11px] text-zinc-600">Loading…</div>

    <div v-else class="p-2 flex-1 min-h-0 overflow-y-auto">
      <!-- Header row -->
      <div class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-1.5 py-1 text-[10px] text-zinc-600 uppercase tracking-wide">
        <span>Season</span>
        <span class="w-9 text-right">n</span>
        <span class="w-9 text-right">WR</span>
        <span class="w-14 text-right">ROI</span>
        <span class="w-14 text-right">Balance</span>
      </div>

      <div
        v-for="s in seasons" :key="s.season"
        class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-1.5 py-0.5 rounded hover:bg-surface-light/30 items-center"
      >
        <span class="text-[12px] text-zinc-200 whitespace-nowrap">{{ s.season }}</span>
        <span class="w-9 text-right text-[11px] text-zinc-500 tabular-nums">{{ s.n_bets }}</span>
        <span class="w-9 text-right text-[11px] text-zinc-500 tabular-nums">
          {{ s.n_bets ? (s.win_rate * 100).toFixed(1) + '%' : '—' }}
        </span>
        <span
          class="w-14 text-right text-[12px] font-semibold tabular-nums"
          :class="signClass(s.roi)"
        >{{ s.roi == null ? '—' : signedPct(s.roi) }}</span>
        <span class="w-14 text-right text-[12px] tabular-nums text-zinc-300">
          {{ formatMoney(s.end_balance, { whole: true }) }}
        </span>
      </div>

      <!-- Cumulative bankroll bar — one shared scale across seasons so the
           ladder's trajectory (not just each season in isolation) is visible
           at a glance. -->
      <div class="relative h-7 mt-1.5 mx-1.5 rounded bg-surface-light/30 overflow-hidden">
        <div class="absolute inset-y-0 left-0 w-px bg-zinc-600/50"></div>
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" class="w-full h-full">
          <polyline
            :points="trajectoryPoints"
            fill="none"
            :stroke="finalBalance >= SEED ? '#34d399' : '#f87171'"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatMoney } from '~/utils/formatters'
import { computed } from 'vue'

const props = defineProps({
  seasons: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const SEED = 1000

const finalBalance = computed(() =>
  props.seasons.length ? Number(props.seasons[props.seasons.length - 1].end_balance) : SEED)

const policy = computed(() => props.seasons[0]?.policy || null)
const priceBasis = computed(() =>
  policy.value?.price_basis || 'games.odds_* (closing-price convention)')

const footnote = computed(() =>
  `A backtest of TODAY's selection rule against every prior season's odds, bankroll carried between seasons from ${SEED.toLocaleString()}. `
  + `Price basis: ${priceBasis.value}. Leg odds ${policy.value?.leg_odds_floor ?? '—'}–${policy.value?.max_leg_odds ?? '—'}x, `
  + `max ${policy.value?.max_legs ?? '—'} legs/slip (fixed 2026-09-19 — the pre-fix rule had no leg cap and stacked near-floor favourites to force the target). `
  + 'No wallet, live or simulated, is significant at this n — see common.wallet_significance.')

function signClass(v) {
  if (v == null) return 'text-zinc-600'
  return Number(v) >= 0 ? 'text-emerald-400' : 'text-red-400'
}
function signedPct(v) {
  const pct = Number(v) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

// Balance trajectory: seed + each season's end_balance, mapped into the 0-32
// viewBox height, seed anchored so a season doing worse than the previous
// rung's start reads visually as a dip, not just a low absolute value.
const balances = computed(() => [SEED, ...props.seasons.map(s => Number(s.end_balance))])
const minB = computed(() => Math.min(...balances.value))
const maxB = computed(() => Math.max(...balances.value))
function yFor(v) {
  const range = (maxB.value - minB.value) || 1
  return 30 - ((v - minB.value) / range) * 28
}
const trajectoryPoints = computed(() => {
  const n = balances.value.length
  if (n < 2) return ''
  return balances.value
    .map((v, i) => `${((i / (n - 1)) * 100).toFixed(2)},${yFor(v).toFixed(2)}`)
    .join(' ')
})
</script>
