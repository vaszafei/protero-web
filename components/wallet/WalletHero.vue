<template>
  <div class="wallet-hero rounded-xl p-4 sm:p-5 relative overflow-hidden">
    <!-- Decorative gradient blobs -->
    <div class="absolute inset-0 opacity-[0.04] pointer-events-none">
      <div class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-500"></div>
      <div class="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500"></div>
    </div>

    <div class="relative">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-bold text-emerald-300 uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
              {{ meta.badge }}
            </span>
            <h2 class="text-sm font-bold text-zinc-100 truncate">{{ meta.longName }}</h2>
          </div>
          <p class="text-[10px] text-zinc-500 mt-0.5 truncate">{{ meta.blurb }}</p>
        </div>
        <div v-if="expiresInDays != null" class="text-right flex-shrink-0">
          <p class="text-[9px] text-zinc-500 uppercase tracking-wider">Expires</p>
          <p class="text-[11px] font-semibold tabular-nums" :class="expiresInDays <= 3 ? 'text-amber-400' : 'text-zinc-300'">
            {{ expiresInDays > 0 ? `${expiresInDays}d` : 'today' }}
          </p>
        </div>
      </div>

      <!-- Balance -->
      <div class="mb-3">
        <p class="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Balance</p>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">${{ formatNum(wallet.balance) }}</span>
          <span class="text-sm font-bold tabular-nums" :class="pl >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ pl >= 0 ? '+' : '' }}{{ formatNum(pl) }}
          </span>
        </div>
      </div>

      <!-- Sparkline (last 30 settled bet pnl progression) -->
      <div v-if="sparklinePoints.length > 1" class="mb-3 h-8">
        <svg :viewBox="`0 0 100 30`" preserveAspectRatio="none" class="w-full h-full">
          <polyline
            :points="sparkPolyline"
            fill="none"
            :stroke="pl >= 0 ? '#34d399' : '#f87171'"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-4 gap-2">
        <div>
          <p class="text-[9px] text-zinc-500 uppercase">ROI</p>
          <p class="text-sm font-bold tabular-nums" :class="roi >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ roi >= 0 ? '+' : '' }}{{ roi.toFixed(1) }}%
          </p>
        </div>
        <div>
          <p class="text-[9px] text-zinc-500 uppercase">Win</p>
          <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ (wallet.win_rate || 0).toFixed(1) }}%</p>
        </div>
        <div>
          <p class="text-[9px] text-zinc-500 uppercase">Bets</p>
          <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ wallet.total_bets || 0 }}</p>
        </div>
        <div>
          <p class="text-[9px] text-zinc-500 uppercase">Seed</p>
          <p class="text-sm font-bold text-zinc-100 tabular-nums">${{ formatNum(wallet.initial_balance) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getWalletMeta } from '~/utils/wallet-meta'

const props = defineProps({
  wallet:           { type: Object, required: true },
  subscription:     { type: Object, default: null }, // { expires_at, ... }
  sparklinePoints:  { type: Array, default: () => [] }, // [{ts, balance}, ...]
})

const meta = computed(() => getWalletMeta(props.wallet?.id))

const pl = computed(() => {
  return parseFloat(props.wallet?.balance || 0) - parseFloat(props.wallet?.initial_balance || 0)
})

const roi = computed(() => {
  const init = parseFloat(props.wallet?.initial_balance) || 1
  return ((parseFloat(props.wallet?.balance || 0) - init) / init) * 100
})

const expiresInDays = computed(() => {
  const exp = props.subscription?.expires_at
  if (!exp) return null
  const ms = new Date(exp).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400_000))
})

// Map balance points into 0-100 / 30-0 SVG coords
const sparkPolyline = computed(() => {
  const pts = props.sparklinePoints
  if (pts.length < 2) return ''
  const values = pts.map(p => p.balance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * 100
    const y = 30 - ((p.balance - min) / range) * 28 - 1
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
})

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.wallet-hero {
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(16, 55, 40, 0.2) 100%);
  border: 1px solid rgba(52, 211, 153, 0.15);
}
</style>
