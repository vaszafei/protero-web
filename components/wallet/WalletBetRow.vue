<template>
  <div
    class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
    :class="bet.game_id ? 'cursor-pointer' : 'cursor-default'"
    @click="onClick"
  >
    <!-- Status dot -->
    <div class="w-2 h-2 rounded-full flex-shrink-0" :class="dotCls"></div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-[12px] font-medium text-zinc-200 truncate">
        {{ bet.home_name || 'TBD' }} <span class="text-zinc-500">vs</span> {{ bet.away_name || 'TBD' }}
      </p>
      <p class="text-[10px] text-zinc-500 truncate">
        <span class="text-emerald-400/80 font-semibold">{{ shortLabel }}</span>
        <span v-if="dateLabel"> · {{ dateLabel }}</span>
        <span v-if="bet.league_key" class="text-zinc-600"> · {{ bet.league_key }}</span>
      </p>
    </div>

    <!-- Odds + stake/profit -->
    <div class="text-right flex-shrink-0">
      <p class="text-[12px] font-semibold text-zinc-200 tabular-nums">
        ${{ stake }} <span class="text-zinc-500">@</span> {{ odds }}
      </p>
      <p v-if="bet.status === 'pending'" class="text-[10px] text-amber-400/80">Pending</p>
      <p v-else-if="bet.profit != null" class="text-[10px] font-bold tabular-nums"
         :class="Number(bet.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'">
        {{ Number(bet.profit) >= 0 ? '+' : '' }}${{ Number(bet.profit).toFixed(2) }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { betLabelShort } from '~/utils/bet-label'

const props = defineProps({
  bet: { type: Object, required: true },
})

const router = useRouter()

const shortLabel = computed(() => betLabelShort(props.bet))
const stake = computed(() => Number(props.bet.stake || 0).toFixed(2))
const odds  = computed(() => Number(props.bet.odds || 0).toFixed(2))

const dateLabel = computed(() => {
  if (!props.bet.date) return ''
  return new Date(props.bet.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
})

const dotCls = computed(() => {
  switch (props.bet.status) {
    case 'won':  return 'bg-emerald-400'
    case 'lost': return 'bg-red-400'
    case 'pending': return 'bg-amber-400 animate-pulse'
    default: return 'bg-zinc-500'
  }
})

function onClick() {
  if (props.bet.game_id) router.push(`/game/${props.bet.game_id}`)
}
</script>
