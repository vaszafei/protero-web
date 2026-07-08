<template>
  <div
    class="rounded-lg bg-surface-light/30 border border-edge/40 overflow-hidden transition-colors"
    :class="open ? 'border-edge' : 'hover:border-edge'"
  >
    <!-- Header row -->
    <button
      type="button"
      class="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      @click="open = !open"
    >
      <!-- Status dot -->
      <div class="w-2 h-2 rounded-full flex-shrink-0" :class="dotCls"></div>

      <!-- Title + meta -->
      <div class="flex-1 min-w-0">
        <p class="text-[12px] font-semibold text-zinc-100 truncate flex items-center gap-2">
          <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 uppercase tracking-wider">
            {{ legs.length }}-leg parlay
          </span>
          <span class="tabular-nums text-amber-300">{{ oddsLabel }}x</span>
        </p>
        <p class="text-[10px] text-zinc-500 truncate mt-0.5">
          <span v-if="dateLabel">{{ dateLabel }}</span>
          <span v-if="parlay.strategy" class="text-zinc-600"> · {{ stratLabel }}</span>
        </p>
      </div>

      <!-- Stake / payout -->
      <div class="text-right flex-shrink-0">
        <p class="text-[12px] font-semibold text-zinc-200 tabular-nums">
          ${{ stake }}
        </p>
        <p v-if="parlay.status === 'pending'" class="text-[10px] text-amber-400/80">
          → ${{ potentialReturn }}
        </p>
        <p v-else-if="parlay.profit != null" class="text-[10px] font-bold tabular-nums"
           :class="Number(parlay.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'">
          {{ Number(parlay.profit) >= 0 ? '+' : '' }}${{ Number(parlay.profit).toFixed(2) }}
        </p>
      </div>

      <UIcon
        :name="open ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="w-4 h-4 text-zinc-600 flex-shrink-0"
      />
    </button>

    <!-- Legs -->
    <div v-if="open" class="border-t border-edge/40 divide-y divide-edge/20">
      <div
        v-for="leg in legs" :key="leg.id"
        class="flex items-center gap-2 px-3 py-2 text-[11px]"
      >
        <span class="w-4 text-zinc-600 tabular-nums flex-shrink-0">{{ leg.leg_number }}.</span>
        <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="legDot(leg.status)"></div>
        <div class="flex-1 min-w-0">
          <p class="text-zinc-200 truncate">
            <span class="text-emerald-400/80 font-semibold">{{ legShort(leg) }}</span>
          </p>
          <p class="text-zinc-500 truncate text-[10px]">
            {{ leg.home_name }} <span class="text-zinc-700">vs</span> {{ leg.away_name }}
          </p>
        </div>
        <span class="text-zinc-400 tabular-nums flex-shrink-0">{{ Number(leg.odds || 0).toFixed(2) }}</span>
        <NuxtLink
          v-if="leg.game_id"
          :to="`/game/${leg.game_id}`"
          class="text-zinc-600 hover:text-emerald-400 ml-1 flex-shrink-0"
          @click.stop
        >
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { betLabelShort } from '~/utils/bet-label'

const props = defineProps({
  parlay: { type: Object, required: true },
})

const open = ref(false)

const legs = computed(() => Array.isArray(props.parlay.legs) ? props.parlay.legs : [])
const stake = computed(() => Number(props.parlay.total_stake || 0).toFixed(2))
const oddsLabel = computed(() => Number(props.parlay.parlay_odds || 0).toFixed(2))
const potentialReturn = computed(() => {
  const s = Number(props.parlay.total_stake || 0)
  const o = Number(props.parlay.parlay_odds || 0)
  return (s * o).toFixed(2)
})

const dateLabel = computed(() => {
  const d = props.parlay.date || props.parlay.created_at
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
})

const stratLabel = computed(() => {
  const s = String(props.parlay.strategy || '')
  // props_v2_aif → Props AIF; football_v6_aif → V6
  return s.replace(/^props_v2_/, 'Props ').replace(/_aif$/, ' AIF').replace(/_/g, ' ')
})

const dotCls = computed(() => {
  switch (props.parlay.status) {
    case 'won':  return 'bg-emerald-400'
    case 'lost': return 'bg-red-400'
    case 'pending': return 'bg-amber-400 animate-pulse'
    case 'push': return 'bg-zinc-400'
    default: return 'bg-zinc-500'
  }
})

const legDot = (status) => {
  switch (status) {
    case 'won': return 'bg-emerald-400'
    case 'lost': return 'bg-red-400'
    case 'pending': return 'bg-amber-400'
    default: return 'bg-zinc-600'
  }
}

const legShort = (leg) => betLabelShort(leg)
</script>
