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

    <div v-else class="p-2 sm:p-2.5">
      <!-- Bar sits under a single-line label+figures row (was a stacked block
           ~44px tall; now ~28px). Rows past the 8th collapse behind a toggle. -->
      <div
        v-for="r in visibleRows" :key="r.label"
        class="px-1.5 py-1 rounded hover:bg-surface-light/30"
      >
        <div class="flex items-baseline gap-2">
          <span class="text-[12px] text-zinc-200 truncate">{{ pretty(r.label) }}</span>
          <span class="text-[10px] text-zinc-600 tabular-nums flex-shrink-0 ml-auto">
            n={{ r.n }}
          </span>
          <span class="text-[12px] font-semibold tabular-nums flex-shrink-0 w-16 text-right" :class="signClass(r.pnl)">
            {{ signed(r.pnl) }}
          </span>
          <span
            class="text-[10px] tabular-nums flex-shrink-0 w-14 text-right"
            :class="r.n < MIN_N ? 'text-zinc-600' : signClass(r.roi_pct)"
          >
            {{ r.n < MIN_N ? 'thin' : (r.roi_pct == null ? '—' : signed(r.roi_pct) + '%') }}
          </span>
        </div>
        <!-- One bar, signed from a shared centre so slices are comparable
             to each other rather than each to itself. -->
        <div class="relative h-1 mt-0.5 rounded-full bg-surface-light/50 overflow-hidden">
          <div
            class="absolute inset-y-0"
            :class="Number(r.pnl) >= 0 ? 'bg-emerald-500/60' : 'bg-red-500/60'"
            :style="barStyle(r)"
          ></div>
          <div class="absolute inset-y-0 w-px bg-zinc-600/70" style="left:50%"></div>
        </div>
      </div>

      <button
        v-if="rows.length > COLLAPSE_AT"
        @click="expanded = !expanded"
        class="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 mt-1.5"
      >
        {{ expanded ? 'Show less' : `+${rows.length - COLLAPSE_AT} more` }}
      </button>

      <p class="text-[10px] text-zinc-600 mt-2 px-1.5 leading-snug">
        {{ basis }} A slice under {{ MIN_N }} wagers shows P&amp;L but no ROI — at that n
        1 SE of the cell's return runs ±10–20pp.
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

/** Rows past this collapse behind a "+N more" toggle. */
const COLLAPSE_AT = 8

const CUTS = [
  { key: 'league', label: 'Competition' },
  { key: 'market', label: 'Market' },
  { key: 'odds',   label: 'Price' },
]

const cut = ref('league')
const expanded = ref(false)

const available = computed(() =>
  CUTS.filter(c => (props.breakdown?.cuts?.[c.key] || []).length > 0))

// A wallet that bet one league has no competition cut; land on one that exists
// rather than rendering an empty panel with a live tab.
watch(available, list => {
  if (list.length && !list.some(c => c.key === cut.value)) cut.value = list[0].key
}, { immediate: true })

// Reset the collapse when the operator switches cut.
watch(cut, () => { expanded.value = false })

const rows = computed(() => props.breakdown?.cuts?.[cut.value] || [])
const visibleRows = computed(() =>
  expanded.value ? rows.value : rows.value.slice(0, COLLAPSE_AT))

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
