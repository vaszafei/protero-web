<template>
  <div class="rounded-xl bg-surface border border-edge overflow-hidden">
    <div class="flex items-baseline gap-2 px-3 sm:px-4 py-2.5 border-b border-edge/50 flex-wrap">
      <h3 class="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Where the P&amp;L came from</h3>
      <div class="flex items-center gap-1 ml-auto">
        <button
          v-for="c in available" :key="c.key"
          @click="cut = c.key"
          class="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
          :class="cut === c.key ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'"
        >{{ c.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-[11px] text-zinc-600">Loading…</div>

    <div v-else-if="!rows.length" class="py-10 text-center text-[11px] text-zinc-600">
      No settled singles to break down.
    </div>

    <div v-else class="p-2 sm:p-3">
      <div
        v-for="r in rows" :key="r.label"
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center px-1.5 py-1.5 rounded hover:bg-surface-light/30"
      >
        <div class="min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="text-[12px] text-zinc-200 truncate">{{ pretty(r.label) }}</span>
            <span class="text-[10px] text-zinc-600 tabular-nums flex-shrink-0">
              n={{ r.n }} · {{ Number(r.win_rate_pct).toFixed(0) }}% won
            </span>
          </div>
          <!-- One bar, signed from a shared centre so slices are comparable
               to each other rather than each to itself. -->
          <div class="relative h-1.5 mt-1 rounded-full bg-surface-light/50 overflow-hidden">
            <div
              class="absolute inset-y-0"
              :class="Number(r.pnl) >= 0 ? 'bg-emerald-500/60' : 'bg-red-500/60'"
              :style="barStyle(r)"
            ></div>
            <div class="absolute inset-y-0 w-px bg-zinc-600/70" style="left:50%"></div>
          </div>
        </div>
        <div class="text-right tabular-nums">
          <div class="text-[12px] font-semibold" :class="signClass(r.pnl)">{{ signed(r.pnl) }}</div>
          <!-- A slice this thin has no ROI worth printing; say so rather than
               rendering ±100% off three wagers. -->
          <div class="text-[10px]" :class="r.n < MIN_N ? 'text-zinc-600' : signClass(r.roi_pct)">
            {{ r.n < MIN_N ? 'thin' : (r.roi_pct == null ? '—' : signed(r.roi_pct) + '%') }}
          </div>
        </div>
      </div>

      <p class="text-[10px] text-zinc-600 mt-3 px-1.5 leading-relaxed">
        {{ basis }} A slice under {{ MIN_N }} wagers shows its P&amp;L but not an ROI —
        at that n the ROI is a coin-flip's worth of noise, and 1 SE of a cell's return in this
        project runs ±10–20pp.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  /** The `get_wallet_breakdown` payload, or null. */
  breakdown: { type: Object, default: null },
  loading:   { type: Boolean, default: false },
})

/** Below this a slice's ROI is noise; the P&L still shows. */
const MIN_N = 15

const CUTS = [
  { key: 'league', label: 'Competition' },
  { key: 'market', label: 'Market' },
  { key: 'odds',   label: 'Price' },
]

const cut = ref('league')

const available = computed(() =>
  CUTS.filter(c => (props.breakdown?.cuts?.[c.key] || []).length > 0))

// A wallet that bet one league has no competition cut; land on one that exists
// rather than rendering an empty panel with a live tab.
watch(available, list => {
  if (list.length && !list.some(c => c.key === cut.value)) cut.value = list[0].key
}, { immediate: true })

const rows = computed(() => props.breakdown?.cuts?.[cut.value] || [])

const basis = computed(() => props.breakdown?.basis
  ? props.breakdown.basis.charAt(0).toUpperCase() + props.breakdown.basis.slice(1) + '.'
  : '')

/** Widest absolute P&L in the current cut — the shared scale for every bar. */
const scale = computed(() =>
  Math.max(1, ...rows.value.map(r => Math.abs(Number(r.pnl || 0)))))

function barStyle(r) {
  const v = Number(r.pnl || 0)
  const w = (Math.abs(v) / scale.value) * 50
  return v >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }
}

function signed(v) {
  if (v == null) return '—'
  const n = Number(v)
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function signClass(v) {
  if (v == null || Number(v) === 0) return 'text-zinc-600'
  return Number(v) > 0 ? 'text-emerald-400' : 'text-red-400'
}

function pretty(label) {
  return String(label || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
</script>
