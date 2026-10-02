<template>
  <div class="rounded-xl border border-edge bg-surface p-3 flex flex-col min-h-0">
    <!-- Header + range selector -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Performance</h3>
      <div class="flex items-center gap-1">
        <button
          v-for="r in ranges" :key="r.days"
          @click="$emit('update:days', r.days)"
          class="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          :class="modelValue === r.days
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'text-zinc-500 hover:text-zinc-300'"
        >{{ r.label }}</button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="loading" class="flex-1 min-h-28 flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-zinc-600" />
    </div>
    <div v-else-if="error" class="flex-1 min-h-28 flex items-center">
      <UiErrorState class="w-full" title="The equity curve failed to load." :error="error" @retry="$emit('retry')" />
    </div>
    <div v-else-if="!points || points.length < 2" class="flex-1 min-h-28 flex items-center justify-center">
      <p class="text-[11px] text-zinc-600">Not enough settled bets to plot</p>
    </div>

    <!-- Chart -->
    <div v-else class="flex-1 min-h-0 flex flex-col">
      <div class="relative flex-1 min-h-28">
        <svg viewBox="0 0 300 120" preserveAspectRatio="none" class="w-full h-full">
          <!-- Grid lines -->
          <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(82,82,91,0.2)" stroke-width="1" stroke-dasharray="2,2" />

          <!-- Seed reference line -->
          <line
            v-if="seedY != null"
            x1="0" :y1="seedY" x2="300" :y2="seedY"
            stroke="rgba(161,161,170,0.3)" stroke-width="1" stroke-dasharray="3,3"
          />

          <!-- Area fill -->
          <path :d="areaPath" :fill="strokeColor" fill-opacity="0.08" />

          <!-- Line -->
          <polyline
            :points="polyline"
            fill="none"
            :stroke="strokeColor"
            stroke-width="1.8"
            vector-effect="non-scaling-stroke"
          />

          <!-- Last point dot: a zero-length round-capped line, so it stays round
               when the stretched (preserveAspectRatio="none") box distorts a circle. -->
          <line
            v-if="lastPoint"
            :x1="lastPoint.x" :y1="lastPoint.y" :x2="lastPoint.x" :y2="lastPoint.y"
            :stroke="strokeColor" stroke-width="6" stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <!-- Y-axis labels (overlay) -->
        <div class="absolute left-1 top-0 text-[10px] text-zinc-600 tabular-nums">{{ formatMoney(maxV, { whole: true }) }}</div>
        <div class="absolute left-1 bottom-0 text-[10px] text-zinc-600 tabular-nums">{{ formatMoney(minV, { whole: true }) }}</div>
      </div>

      <!-- Footer: start and end balance (with the date) on one line, the
           window P&L under them — one row no longer fits the page's narrow
           standing column. The % is BANKROLL RETURN over the window and is
           labelled as such — not ROI, which lives on the hero from the RPC and
           differs by ~6x on W7. The x-axis is the date a wager was STRUCK, not
           graded: a backfilled wallet settles 20 months in one run and the old
           settled_at axis drew all of them today. -->
      <div class="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-zinc-500 tabular-nums whitespace-nowrap">
        <span>{{ formatMoney(startBalance ?? seed) }} <span class="text-zinc-700">· start</span></span>
        <span>{{ formatMoney(points[points.length - 1].balance) }} <span class="text-zinc-700">· {{ dateLabel(points[points.length - 1].ts) }}</span></span>
      </div>
      <p class="text-center text-[10px] tabular-nums whitespace-nowrap" :class="rangePnl >= 0 ? 'text-emerald-400' : 'text-red-400'">
        {{ formatMoney(rangePnl, { signed: true }) }}
        <span class="text-zinc-500">({{ rangePnlPct >= 0 ? '+' : '' }}{{ rangePnlPct.toFixed(1) }}% bankroll · {{ points.length }} wagers)</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney } from '~/utils/formatters'
import { rangePnl as windowPnl, rangePnlPct as windowPnlPct } from '~/utils/wallet-pnl'

const props = defineProps({
  points:    { type: Array, default: () => [] },     // [{ts, balance}, ...] sorted asc
  modelValue:{ type: Number, default: 30 },          // selected days
  loading:   { type: Boolean, default: false },
  seed:      { type: Number, default: 0 },
  /** Balance just before the window opens; null = measure from the seed ("All"). */
  startBalance: { type: Number, default: null },
  /** Why the history call failed — rendered instead of "Not enough settled bets". */
  error:     { type: String, default: null },
})
defineEmits(['update:days', 'retry'])

const ranges = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
]

// Geometry
const VW = 300, VH = 120, PADX = 4, PADY = 6

const minV = computed(() => Math.min(props.seed || Infinity, ...props.points.map(p => p.balance)))
const maxV = computed(() => Math.max(props.seed || -Infinity, ...props.points.map(p => p.balance)))

function yFor(v) {
  const range = (maxV.value - minV.value) || 1
  return VH - PADY - ((v - minV.value) / range) * (VH - 2 * PADY)
}
function xFor(i) {
  const n = props.points.length
  if (n <= 1) return PADX
  return PADX + (i / (n - 1)) * (VW - 2 * PADX)
}

const polyline = computed(() => {
  return props.points.map((p, i) => `${xFor(i).toFixed(2)},${yFor(p.balance).toFixed(2)}`).join(' ')
})

const areaPath = computed(() => {
  if (!props.points.length) return ''
  const parts = props.points.map((p, i) => {
    const x = xFor(i).toFixed(2)
    const y = yFor(p.balance).toFixed(2)
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`
  })
  parts.push(`L ${xFor(props.points.length - 1).toFixed(2)},${VH - PADY}`)
  parts.push(`L ${PADX},${VH - PADY} Z`)
  return parts.join(' ')
})

const seedY = computed(() => (props.seed ? yFor(props.seed) : null))

const lastPoint = computed(() => {
  const n = props.points.length
  if (!n) return null
  return { x: xFor(n - 1), y: yFor(props.points[n - 1].balance) }
})

const rangePnl = computed(() => windowPnl(props.points, props.seed, props.startBalance))
const rangePnlPct = computed(() => windowPnlPct(props.points, props.seed, props.startBalance))

const strokeColor = computed(() => rangePnl.value >= 0 ? '#34d399' : '#f87171')


function dateLabel(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}
</script>
