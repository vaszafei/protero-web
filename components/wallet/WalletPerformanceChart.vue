<template>
  <div class="rounded-xl border border-edge bg-surface p-3 sm:p-4">
    <!-- Header + range selector -->
    <div class="flex items-center justify-between mb-3">
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
    <div v-if="loading" class="h-32 flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-zinc-600" />
    </div>
    <div v-else-if="!points || points.length < 2" class="h-32 flex items-center justify-center">
      <p class="text-[11px] text-zinc-600">Not enough settled bets to plot</p>
    </div>

    <!-- Chart -->
    <div v-else>
      <div class="relative h-32">
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

          <!-- Last point dot -->
          <circle
            v-if="lastPoint"
            :cx="lastPoint.x" :cy="lastPoint.y" r="2.5"
            :fill="strokeColor"
          />
        </svg>

        <!-- Y-axis labels (overlay) -->
        <div class="absolute left-1 top-0 text-[9px] text-zinc-600 tabular-nums">${{ formatNum(maxV) }}</div>
        <div class="absolute left-1 bottom-0 text-[9px] text-zinc-600 tabular-nums">${{ formatNum(minV) }}</div>
      </div>

      <!-- Footer summary -->
      <div class="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
        <span class="tabular-nums">Start: ${{ formatNum(points[0].balance) }}</span>
        <span class="tabular-nums" :class="rangePnl >= 0 ? 'text-emerald-400' : 'text-red-400'">
          {{ rangePnl >= 0 ? '+' : '' }}${{ formatNum(rangePnl) }} ({{ rangePnlPct >= 0 ? '+' : '' }}{{ rangePnlPct.toFixed(1) }}%)
        </span>
        <span class="tabular-nums">Now: ${{ formatNum(points[points.length - 1].balance) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  points:    { type: Array, default: () => [] },     // [{ts, balance}, ...] sorted asc
  modelValue:{ type: Number, default: 30 },          // selected days
  loading:   { type: Boolean, default: false },
  seed:      { type: Number, default: 0 },
})
defineEmits(['update:days'])

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

const rangePnl = computed(() => {
  if (props.points.length < 2) return 0
  return props.points[props.points.length - 1].balance - props.points[0].balance
})
const rangePnlPct = computed(() => {
  if (props.points.length < 2) return 0
  const start = props.points[0].balance || 1
  return (rangePnl.value / start) * 100
})

const strokeColor = computed(() => rangePnl.value >= 0 ? '#34d399' : '#f87171')

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>
