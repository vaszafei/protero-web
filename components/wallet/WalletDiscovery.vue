<template>
  <div>
    <!-- Header / pricing context -->
    <div class="mb-4">
      <h2 class="text-base font-bold text-zinc-100">Available wallets</h2>
      <p class="text-xs text-zinc-500 mt-0.5">
        Subscribe to follow an AI strategy and see its daily picks.
        Each subscription costs
        <span class="text-emerald-400 font-semibold">{{ pricing.cost_credits }} credits</span>
        for {{ pricing.duration_days }} days.
      </p>
    </div>

    <!-- Wallet grid -->
    <div class="space-y-3">
      <div
        v-for="w in enrichedWallets" :key="w.id"
        class="rounded-xl border border-edge bg-surface p-4 flex items-start gap-3"
      >
        <!-- Badge -->
        <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <span class="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">{{ w.meta.badge }}</span>
        </div>

        <!-- Body -->
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2">
            <h3 class="text-sm font-semibold text-zinc-100 truncate">{{ w.meta.longName }}</h3>
            <span
              class="text-xs font-bold tabular-nums flex-shrink-0"
              :class="w.roi >= 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ w.roi >= 0 ? '+' : '' }}{{ w.roi.toFixed(1) }}%
            </span>
          </div>

          <p class="text-[11px] text-zinc-500 leading-snug mt-1 line-clamp-2">{{ w.meta.blurb }}</p>

          <!-- Stats -->
          <div class="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
            <span class="tabular-nums"><span class="text-zinc-300 font-medium">{{ (w.win_rate || 0).toFixed(1) }}%</span> WR</span>
            <span class="tabular-nums"><span class="text-zinc-300 font-medium">{{ w.total_bets || 0 }}</span> bets</span>
            <span class="tabular-nums"><span class="text-zinc-300 font-medium">${{ formatNum(w.balance) }}</span></span>
          </div>

          <!-- Action -->
          <div class="flex items-center justify-end mt-3">
            <button
              @click="$emit('subscribe', w)"
              :disabled="busyWalletId === w.id"
              class="px-3 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              <UIcon v-if="busyWalletId === w.id" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin inline mr-1" />
              Subscribe · {{ pricing.cost_credits }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getWalletMeta } from '~/utils/wallet-meta'

const props = defineProps({
  wallets:       { type: Array, required: true },
  pricing:       { type: Object, required: true }, // { cost_credits, duration_days }
  busyWalletId:  { type: Number, default: null },
})

defineEmits(['subscribe'])

const enrichedWallets = computed(() => {
  return (props.wallets || [])
    .map(w => {
      const init = parseFloat(w.initial_balance) || 1
      const bal  = parseFloat(w.balance) || 0
      const roi  = ((bal - init) / init) * 100
      return { ...w, roi, meta: getWalletMeta(w.id) }
    })
    .sort((a, b) => b.roi - a.roi) // best ROI first
})

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>
