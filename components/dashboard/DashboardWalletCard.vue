<template>
  <div class="wallet-card px-4 py-3 flex items-center gap-4">
    <!-- Balance -->
    <div class="flex-shrink-0">
      <p class="text-[10px] text-zinc-500 uppercase tracking-wide">Balance</p>
      <p class="text-sm font-bold text-zinc-100 leading-tight tabular-nums">{{ formatCurrency(balance) }}</p>
    </div>

    <!-- Divider -->
    <div class="h-8 w-px bg-zinc-700/40 flex-shrink-0" />

    <!-- ROI -->
    <div class="flex-shrink-0">
      <p class="text-[10px] text-zinc-500 uppercase tracking-wide">ROI</p>
      <p :class="['text-sm font-bold leading-tight tabular-nums', roi == null ? 'text-zinc-600' : roiPositive ? 'text-emerald-400' : 'text-red-400']">
        {{ roi == null ? '—' : (roiPositive ? '+' : '') + roi.toFixed(1) + '%' }}
      </p>
    </div>

    <!-- Divider -->
    <div class="h-8 w-px bg-zinc-700/40 flex-shrink-0" />

    <!-- W / L -->
    <div class="flex-shrink-0 flex items-center gap-2">
      <div class="text-center">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wide">W</p>
        <p class="text-sm font-bold text-emerald-400 leading-tight tabular-nums">{{ nWon }}</p>
      </div>
      <span class="text-zinc-600 text-xs">·</span>
      <div class="text-center">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wide">L</p>
        <p class="text-sm font-bold text-red-400 leading-tight tabular-nums">{{ lostBets }}</p>
      </div>
    </div>

    <!-- Win rate mini bar -->
    <div v-if="nWagers > 0" class="flex-1 min-w-0">
      <div class="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          :style="{ width: winRatePct + '%' }"
        />
      </div>
      <p class="text-[9px] text-zinc-600 mt-0.5 text-right">{{ winRatePct.toFixed(0) }}% win</p>
    </div>

    <!-- Verdict + p(luck) — ROI never travels alone -->
    <div v-if="perf && perf.verdict !== 'n<10'" class="flex-shrink-0 flex items-center gap-1.5">
      <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded" :class="verdictClass(perf.verdict)">
        {{ perf.verdict }}
      </span>
      <span v-if="perf.p_luck != null" class="text-[10px] text-zinc-500 tabular-nums">
        p={{ Number(perf.p_luck).toFixed(2) }}
      </span>
    </div>

    <!-- Pending badge -->
    <div v-if="pendingBets > 0" class="flex-shrink-0">
      <span class="text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
        {{ pendingBets }} pending
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * The compact dashboard wallet card. Every number comes from
 * `get_wallet_performance` (via fetchWalletStats) — never computed here, never
 * read from the stale `wallets.roi` / `total_bets` columns.
 */
const props = defineProps<{
  walletStats: {
    wallet?: { balance?: number; initial_balance?: number; persona_name?: string }
    performance?: {
      roi_pct?: number | null
      win_rate_pct?: number | null
      n_wagers?: number
      n_won?: number
      n_pending?: number
      p_luck?: number | null
      verdict?: string
    } | null
  } | null
}>()

function toNum(val: any): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

const balance = computed(() => toNum(props.walletStats?.wallet?.balance))
const perf = computed(() => props.walletStats?.performance ?? null)
const roi = computed(() => perf.value?.roi_pct == null ? null : Number(perf.value.roi_pct))
const roiPositive = computed(() => (roi.value ?? 0) >= 0)
const nWagers = computed(() => toNum(perf.value?.n_wagers))
const nWon = computed(() => toNum(perf.value?.n_won))
const lostBets = computed(() => Math.max(0, nWagers.value - nWon.value))
const pendingBets = computed(() => toNum(perf.value?.n_pending))
const winRatePct = computed(() => perf.value?.win_rate_pct == null ? 0 : Number(perf.value.win_rate_pct))

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}

function verdictClass(v: string): string {
  return {
    EDGE:   'bg-emerald-500/15 text-emerald-300',
    hint:   'bg-amber-500/15 text-amber-300',
    LUCK:   'bg-zinc-700/40 text-zinc-400',
    'n<10': 'bg-zinc-800/60 text-zinc-600',
  }[v] || 'bg-zinc-800/60 text-zinc-600'
}
</script>

<style scoped>
.wallet-card {
  background: linear-gradient(165deg, rgba(41, 45, 54, 0.55), rgba(26, 29, 36, 0.95));
  border: 1px solid rgba(42, 47, 58, 0.7);
  border-radius: 0.5rem;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 20px -16px rgba(0, 0, 0, 0.85);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.wallet-card:hover {
  border-color: rgba(53, 60, 72, 0.9);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 12px 26px -14px rgba(0, 0, 0, 0.9);
}

@media (prefers-reduced-motion: reduce) {
  .wallet-card { transition: none; }
}
</style>
