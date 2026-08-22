<template>
  <div>
    <!-- Lifecycle groups: what still writes, then what is history. -->
    <div v-for="group in groups" :key="group.key" class="mb-5 last:mb-0">
      <div class="flex items-baseline gap-2 mb-2 px-1">
        <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{{ group.label }}</h3>
        <span class="text-[10px] text-zinc-600 tabular-nums">{{ group.rows.length }}</span>
        <span class="text-[10px] text-zinc-600">— {{ group.hint }}</span>
      </div>

      <!-- Desktop: dense table. An operator reads a roster, not a card wall. -->
      <div class="hidden md:block rounded-lg border border-edge overflow-hidden">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-surface-light/40 text-zinc-500">
              <th class="text-left font-medium px-3 py-2">Wallet</th>
              <th class="text-right font-medium px-2 py-2 w-16" title="Settled wagers. A parlay counts once, never its legs.">n</th>
              <th class="text-right font-medium px-2 py-2 w-16" title="Unsettled wagers">Open</th>
              <th class="text-right font-medium px-2 py-2 w-24">Turnover</th>
              <th class="text-right font-medium px-2 py-2 w-24">P&amp;L</th>
              <th class="text-right font-medium px-2 py-2 w-20" title="Profit / turnover — not bankroll return">ROI</th>
              <th class="text-right font-medium px-2 py-2 w-20" title="Chance a zero-edge bettor matches this. Lower is better.">p(luck)</th>
              <th class="text-left font-medium px-3 py-2 w-24">Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in group.rows" :key="r.id"
              @click="$emit('select', r.id)"
              class="border-t border-edge/40 cursor-pointer transition-colors"
              :class="r.id === selectedId ? 'bg-blue-500/10' : 'hover:bg-surface-light/30'"
            >
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <span class="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-light text-zinc-400 border border-edge">
                    {{ r.meta.badge }}
                  </span>
                  <div class="min-w-0">
                    <div class="text-zinc-200 font-medium truncate">{{ r.meta.longName }}</div>
                    <div class="text-[10px] text-zinc-600 truncate">W{{ r.id }} · {{ r.blurbShort }}</div>
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ r.perf.n_wagers }}</td>
              <td class="px-2 py-2 text-right tabular-nums" :class="r.perf.n_pending > 0 ? 'text-amber-400' : 'text-zinc-600'">
                {{ r.perf.n_pending || '—' }}
              </td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ money(r.perf.turnover) }}</td>
              <td class="px-2 py-2 text-right tabular-nums" :class="signClass(r.perf.pnl)">{{ signed(r.perf.pnl) }}</td>
              <td class="px-2 py-2 text-right tabular-nums font-semibold" :class="signClass(r.perf.roi_pct)">
                {{ r.perf.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}
              </td>
              <td class="px-2 py-2 text-right tabular-nums" :class="pClass(r.perf.p_luck)">
                {{ r.perf.p_luck == null ? '—' : Number(r.perf.p_luck).toFixed(3) }}
              </td>
              <td class="px-3 py-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="verdictClass(r.perf.verdict)">
                  {{ r.perf.verdict }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: the same rows, stacked. -->
      <div class="md:hidden space-y-1.5">
        <button
          v-for="r in group.rows" :key="r.id"
          @click="$emit('select', r.id)"
          class="w-full text-left rounded-lg border p-3 transition-colors"
          :class="r.id === selectedId ? 'border-blue-500/40 bg-blue-500/10' : 'border-edge bg-surface hover:border-edge-light'"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm text-zinc-200 font-medium truncate">{{ r.meta.longName }}</div>
              <div class="text-[10px] text-zinc-600">W{{ r.id }} · {{ r.meta.badge }}</div>
            </div>
            <span class="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="verdictClass(r.perf.verdict)">
              {{ r.perf.verdict }}
            </span>
          </div>
          <div class="flex items-center gap-3 mt-2 text-[11px] tabular-nums">
            <span class="text-zinc-500">n <span class="text-zinc-300">{{ r.perf.n_wagers }}</span></span>
            <span v-if="r.perf.n_pending" class="text-amber-400">{{ r.perf.n_pending }} open</span>
            <span :class="signClass(r.perf.roi_pct)">
              ROI {{ r.perf.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}
            </span>
            <span v-if="r.perf.p_luck != null" :class="pClass(r.perf.p_luck)">
              p={{ Number(r.perf.p_luck).toFixed(2) }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <p class="text-[10px] text-zinc-600 leading-relaxed mt-4 px-1">
      A wager is one settled bet, or one parlay at its parlay price — never a parlay's legs.
      ROI is profit over turnover, not bankroll return. p(luck) is the chance a bettor with no edge
      matches this P&amp;L, as a normal approximation; run
      <code class="text-zinc-500">python3 -m common.wallet_significance</code> before publishing any
      of it. Nothing here reaches p&lt;0.05.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveWalletMeta } from '~/utils/wallet-meta'

const props = defineProps({
  wallets:     { type: Array, required: true },  // rows from `wallets`
  performance: { type: Array, default: () => [] }, // rows from get_wallet_performance
  selectedId:  { type: Number, default: null },
})

defineEmits(['select'])

const EMPTY_PERF = {
  n_wagers: 0, n_won: 0, n_pending: 0, turnover: 0, pnl: 0,
  roi_pct: null, win_rate_pct: null, p_luck: null, verdict: 'n<10',
}

const rows = computed(() => {
  const perfById = new Map((props.performance || []).map(p => [p.wallet_id, p]))
  return (props.wallets || []).map(w => {
    const blurb = (w.bio || '').trim()
    return {
      id: w.id,
      raw: w,
      meta: resolveWalletMeta(w),
      perf: perfById.get(w.id) || EMPTY_PERF,
      blurbShort: blurb.length > 68 ? blurb.slice(0, 68) + '…' : (blurb || '—'),
    }
  })
})

/**
 * Split by what still writes. `lifecycle` is the DB's own answer ('trader' vs
 * 'legacy'); `is_active` is not — several trader personas are active with no
 * picker built, and several legacy wallets still take writes.
 */
const groups = computed(() => {
  const live = rows.value.filter(r => r.raw.lifecycle === 'trader')
  const legacy = rows.value.filter(r => r.raw.lifecycle !== 'trader')
  const byVolume = (a, b) => (b.perf.n_wagers - a.perf.n_wagers) || (a.id - b.id)
  return [
    { key: 'trader', label: 'Trader personas', hint: 'the live roster (CD #35)', rows: live.sort(byVolume) },
    { key: 'legacy', label: 'Legacy', hint: 'history; frozen at the cutover', rows: legacy.sort(byVolume) },
  ].filter(g => g.rows.length > 0)
})

function money(v) {
  const n = Number(v || 0)
  return n === 0 ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

// Only p<0.20 is worth visually distinguishing; everything above is noise.
function pClass(p) {
  if (p == null) return 'text-zinc-600'
  const n = Number(p)
  if (n < 0.05) return 'text-emerald-400 font-semibold'
  if (n < 0.20) return 'text-amber-400'
  return 'text-zinc-500'
}

function verdictClass(v) {
  return {
    EDGE:   'bg-emerald-500/15 text-emerald-300',
    hint:   'bg-amber-500/15 text-amber-300',
    LUCK:   'bg-zinc-700/40 text-zinc-400',
    'n<10': 'bg-zinc-800/60 text-zinc-600',
  }[v] || 'bg-zinc-800/60 text-zinc-600'
}
</script>
