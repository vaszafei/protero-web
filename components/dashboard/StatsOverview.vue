<template>
  <div class="space-y-3">
    <!-- Row 1: Balance + Pending -->
    <div v-if="walletStats" class="grid grid-cols-2 gap-3">
      <!-- Wallet Balance Card -->
      <div class="stats-card rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#f82828]/30 via-transparent to-[#0848a8]/30" />
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Balance</span>
          <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" 
            :class="investmentROI >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'">
            {{ investmentROI >= 0 ? '+' : '' }}{{ investmentROI.toFixed(0) }}% ROI
          </span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
          €{{ formatNumber(walletStats.stats.currentBalance) }}
        </div>
        <div class="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          <span>Initial: <span class="text-zinc-400 font-medium">€{{ formatNumber(walletStats.wallet.initial_balance) }}</span></span>
        </div>
      </div>

      <!-- Pending Card -->
      <div class="stats-card rounded-xl p-3 sm:p-4 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/30 via-transparent to-amber-500/10" />
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Pending</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
          {{ walletStats.stats.pendingBets + parlayStats.pending }}
        </div>
        <div class="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          <span>{{ walletStats.stats.pendingBets }} bets</span>
          <span class="w-px h-3 bg-edge" />
          <span>{{ parlayStats.pending }} parlays</span>
        </div>
      </div>
    </div>

    <!-- Row 2: Bets + Parlays + Total Profit -->
    <div v-if="walletStats" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- BETS Card -->
      <div class="stats-card rounded-xl overflow-hidden">
        <div class="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-1">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Bets</span>
          <span class="text-zinc-300 font-bold text-sm ml-auto">{{ walletStats.stats.totalBets }}</span>
        </div>
        <div class="px-3 sm:px-4 pb-3 pt-1 flex items-center gap-3 sm:gap-4 flex-wrap">
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">W/L</span>
            <span class="text-sm font-bold text-zinc-200">{{ walletStats.stats.wonBets }}<span class="text-zinc-600">/</span>{{ walletStats.stats.lostBets }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">Win%</span>
            <span class="text-sm font-bold text-emerald-400">{{ walletStats.stats.winRate }}%</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">Yield</span>
            <span class="text-sm font-bold" :class="Number(walletStats.stats.roi) >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ walletStats.stats.roi }}%</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">P/L</span>
            <span class="text-sm font-bold" :class="Number(walletStats.stats.totalProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ Number(walletStats.stats.totalProfit) >= 0 ? '+' : '' }}€{{ formatNumber(walletStats.stats.totalProfit) }}
            </span>
          </div>
        </div>
      </div>

      <!-- PARLAYS Card -->
      <div v-if="parlays && parlays.length > 0" class="stats-card rounded-xl overflow-hidden">
        <div class="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-1">
          <div class="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Parlays</span>
          <span class="text-zinc-300 font-bold text-sm ml-auto">{{ parlays.length }}</span>
        </div>
        <div class="px-3 sm:px-4 pb-3 pt-1 flex items-center gap-3 sm:gap-4 flex-wrap">
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">W/L</span>
            <span class="text-sm font-bold text-zinc-200">{{ parlayStats.won }}<span class="text-zinc-600">/</span>{{ parlayStats.lost }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">Win%</span>
            <span class="text-sm font-bold text-purple-400">{{ parlayStats.settled > 0 ? ((parlayStats.won / parlayStats.settled) * 100).toFixed(1) : '0.0' }}%</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">Yield</span>
            <span class="text-sm font-bold" :class="Number(parlayStats.roi) >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ parlayStats.roi }}%</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-zinc-600 uppercase">P/L</span>
            <span class="text-sm font-bold" :class="parlayStats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ parlayStats.profit >= 0 ? '+' : '' }}€{{ formatNumber(parlayStats.profit) }}
            </span>
          </div>
        </div>
      </div>

      <!-- TOTAL PROFIT Card -->
      <div class="stats-card rounded-xl overflow-hidden relative">
        <div class="absolute top-0 left-0 right-0 h-px" 
          :class="totalProfit >= 0 ? 'bg-gradient-to-r from-emerald-500/40 via-emerald-500/15 to-transparent' : 'bg-gradient-to-r from-red-500/40 via-red-500/15 to-transparent'" />
        <div class="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-1">
          <div class="w-1.5 h-1.5 rounded-full" :class="totalProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'" />
          <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Total P/L</span>
        </div>
        <div class="px-3 sm:px-4 pb-3 pt-1">
          <div class="text-xl sm:text-2xl font-extrabold" :class="totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ totalProfit >= 0 ? '+' : '' }}€{{ formatNumber(totalProfit) }}
          </div>
          <div class="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
            <span>Staked: <span class="text-zinc-400 font-medium">€{{ formatNumber(totalStaked) }}</span></span>
            <span class="w-px h-3 bg-edge" />
            <span>Yield: <span class="font-medium" :class="totalROI >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ totalROI.toFixed(1) }}%</span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  stats: {
    leagueCount: number
    matchCount: number
    teamCount: number
    todayMatches: number
    todayPredictions: number
    weekMatches: number
    accuracy?: {
      overall: number
      correct: number
      wrong: number
    }
    validatedCount: number
  }
  walletStats?: any
  parlays?: any[]
}>()

// Format number with commas and 2 decimals
function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Calculate parlay statistics
const parlayStats = computed(() => {
  if (!props.parlays || props.parlays.length === 0) {
    return {
      pending: 0,
      settled: 0,
      won: 0,
      lost: 0,
      roi: 0,
      profit: 0,
      totalStake: 0
    }
  }

  const pending = props.parlays.filter(p => p.status === 'pending').length
  const won = props.parlays.filter(p => p.status === 'won').length
  const lost = props.parlays.filter(p => p.status === 'lost').length
  const settled = won + lost

  // Calculate profit and ROI from settled parlays
  let totalProfit = 0
  let totalStake = 0

  props.parlays.forEach(parlay => {
    if (parlay.status === 'won' || parlay.status === 'lost') {
      totalStake += parlay.total_stake || 0
      if (parlay.status === 'won') {
        totalProfit += (parlay.actual_payout || 0) - (parlay.total_stake || 0)
      } else {
        totalProfit -= parlay.total_stake || 0
      }
    }
  })

  const roi = totalStake > 0 ? ((totalProfit / totalStake) * 100) : 0

  return {
    pending,
    settled,
    won,
    lost,
    roi: roi.toFixed(1),
    profit: totalProfit,
    totalStake
  }
})

// Combined totals
const betProfit = computed(() => Number(props.walletStats?.stats?.totalProfit || 0))
const totalProfit = computed(() => betProfit.value + parlayStats.value.profit)
const totalStaked = computed(() => Number(props.walletStats?.stats?.totalStaked || 0) + parlayStats.value.totalStake)
const totalROI = computed(() => totalStaked.value > 0 ? (totalProfit.value / totalStaked.value) * 100 : 0)
const investmentROI = computed(() => {
  const initial = props.walletStats?.wallet?.initial_balance || 500
  return initial > 0 ? (totalProfit.value / initial) * 100 : 0
})
</script>

<style scoped>
.stats-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
</style>
