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
      <p :class="['text-sm font-bold leading-tight tabular-nums', roiPositive ? 'text-emerald-400' : 'text-red-400']">
        {{ roiPositive ? '+' : '' }}{{ roi.toFixed(1) }}%
      </p>
    </div>

    <!-- Divider -->
    <div class="h-8 w-px bg-zinc-700/40 flex-shrink-0" />

    <!-- W / L -->
    <div class="flex-shrink-0 flex items-center gap-2">
      <div class="text-center">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wide">W</p>
        <p class="text-sm font-bold text-emerald-400 leading-tight tabular-nums">{{ wonBets }}</p>
      </div>
      <span class="text-zinc-600 text-xs">·</span>
      <div class="text-center">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wide">L</p>
        <p class="text-sm font-bold text-red-400 leading-tight tabular-nums">{{ lostBets }}</p>
      </div>
    </div>

    <!-- Win rate mini bar -->
    <div v-if="totalSettled > 0" class="flex-1 min-w-0">
      <div class="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          :style="{ width: winRatePct + '%' }"
        />
      </div>
      <p class="text-[9px] text-zinc-600 mt-0.5 text-right">{{ winRatePct.toFixed(0) }}% win</p>
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

const props = defineProps<{
  walletStats: {
    wallet?: { balance?: number; initial_balance?: number }
    stats?: {
      wonBets?: number
      lostBets?: number
      pendingBets?: number
      roi?: number
    }
  } | null
}>()

function toNum(val: any): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

const balance = computed(() => toNum(props.walletStats?.wallet?.balance))
const roi = computed(() => toNum(props.walletStats?.stats?.roi))
const roiPositive = computed(() => roi.value >= 0)
const wonBets = computed(() => toNum(props.walletStats?.stats?.wonBets))
const lostBets = computed(() => toNum(props.walletStats?.stats?.lostBets))
const pendingBets = computed(() => toNum(props.walletStats?.stats?.pendingBets))
const totalSettled = computed(() => wonBets.value + lostBets.value)
const winRatePct = computed(() => totalSettled.value > 0 ? (wonBets.value / totalSettled.value) * 100 : 0)

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}
</script>

<style scoped>
.wallet-card {
  background: rgba(28, 31, 39, 0.85);
  border: 1px solid rgba(42, 47, 58, 0.5);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
</style>
