<template>
  <!-- One line per slip. Its legs open in the slip panel beside the ledger
       rather than expanding here, so the list keeps a fixed row height. -->
  <button
    type="button"
    class="w-full h-8 flex items-center gap-2.5 px-2.5 rounded-lg border text-left transition-colors"
    :class="selected
      ? 'bg-blue-500/10 border-blue-500/40'
      : 'bg-surface-light/30 border-edge/40 hover:border-edge'"
    @click="$emit('select', parlay.id)"
  >
    <div class="w-2 h-2 rounded-full flex-shrink-0" :class="dotCls"></div>
    <span class="text-[11px] font-semibold text-zinc-100 tabular-nums w-12 flex-shrink-0">{{ legs.length }} legs</span>
    <span class="text-[11px] tabular-nums text-amber-300 w-16 flex-shrink-0">{{ oddsLabel }}x</span>
    <span class="text-[11px] text-zinc-400 truncate flex-1 min-w-0" :title="summary">{{ summary }}</span>
    <span class="text-[10px] text-zinc-500 flex-shrink-0">{{ dateLabel }}</span>
    <span class="text-[11px] tabular-nums text-zinc-300 w-12 text-right flex-shrink-0">{{ formatMoney(parlay.total_stake || 0) }}</span>
    <span class="text-[11px] font-bold tabular-nums w-16 text-right flex-shrink-0" :class="resultCls">{{ resultLabel }}</span>
  </button>
</template>

<script setup>
import { formatMoney } from '~/utils/formatters'
import { computed } from 'vue'
import { legParts } from '~/utils/bet-label'

const props = defineProps({
  parlay:   { type: Object, required: true },
  selected: { type: Boolean, default: false },
})
defineEmits(['select'])

const legs = computed(() => Array.isArray(props.parlay.legs) ? props.parlay.legs : [])
const oddsLabel = computed(() => Number(props.parlay.parlay_odds || 0).toFixed(2))

/** A props slip lists its players' surnames; any other slip its competitions. */
const summary = computed(() => {
  const names = legs.value
    .flatMap(l => legParts(l).map(p => p.player))
    .filter(Boolean)
    .map(n => n.split(' ').slice(-1)[0])
  if (names.length) return [...new Set(names)].join(', ')
  return [...new Set(legs.value.map(l => l.league_key).filter(Boolean))]
    .map(k => prettyLeagueKey(k)).join(', ')
})

const dateLabel = computed(() => {
  const d = props.parlay.created_at
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
})

const resultLabel = computed(() => {
  if (props.parlay.status === 'pending') {
    return '→ ' + formatMoney(Number(props.parlay.total_stake || 0) * Number(props.parlay.parlay_odds || 0), { whole: true })
  }
  if (props.parlay.profit == null) return '—'
  const p = Number(props.parlay.profit)
  return formatMoney(p, { signed: true })
})

const resultCls = computed(() => {
  if (props.parlay.status === 'pending') return 'text-amber-400/80 font-normal'
  if (props.parlay.profit == null) return 'text-zinc-500'
  return Number(props.parlay.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'
})

const dotCls = computed(() => ({
  won: 'bg-emerald-400',
  lost: 'bg-red-400',
  pending: 'bg-amber-400 animate-pulse',
  pushed: 'bg-zinc-400',
}[props.parlay.status] || 'bg-zinc-500'))
</script>
