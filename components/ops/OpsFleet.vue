<template>
  <section class="panel overflow-hidden">
    <header class="panel-head">
      <h2 class="panel-title">Fleet</h2>
      <span class="text-[10px] text-zinc-600 tabular-nums">{{ rows.length }}</span>
      <NuxtLink to="/wallet" class="panel-link">All wallets →</NuxtLink>
    </header>

    <div class="overflow-x-auto">
      <table class="w-full text-xs table-fixed">
        <thead>
          <tr class="text-zinc-500 border-b border-edge/60">
            <th class="text-left font-medium px-2 py-2">Wallet</th>
            <th class="text-right font-medium px-2 py-2 w-14" title="Settled wagers. A parlay counts once, never its legs.">n</th>
            <th class="text-right font-medium px-2 py-2 w-14">Open</th>
            <th class="text-right font-medium px-2 py-2 w-16" title="Profit / turnover — not bankroll return">ROI</th>
            <th class="text-right font-medium px-2 py-2 w-16">Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rows" :key="r.id"
            class="row-hover cursor-pointer"
            @click="$router.push(`/wallet?w=${r.id}`)"
          >
            <td class="px-2 py-2">
              <span class="text-zinc-200 truncate inline-block max-w-[104px] align-bottom" :title="r.name">{{ r.name }}</span>
              <span class="ml-1.5 text-[10px] text-zinc-600">W{{ r.id }}</span>
              <span v-if="r.silent" class="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-zinc-700/40 text-zinc-500"
                    title="Trader persona with no picker wired — it cannot place a bet">NO PICKER</span>
            </td>
            <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ n(r) }}</td>
            <td class="px-2 py-2 text-right tabular-nums" :class="open(r) ? 'text-amber-400' : 'text-zinc-600'">
              {{ open(r) || '—' }}
            </td>
            <td class="px-2 py-2 text-right tabular-nums font-semibold" :class="signClass(r.perf?.roi_pct)">
              {{ r.perf?.roi_pct == null ? '—' : signed(r.perf.roi_pct) + '%' }}
            </td>
            <td class="px-2 py-2 text-right">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="verdictClass(r.perf?.verdict)">
                {{ r.perf?.verdict || 'n<10' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="hidden > 0" class="text-[10px] text-zinc-600 px-3 py-1.5 border-t border-edge/40">
      {{ hidden }} more legacy wallet<span v-if="hidden !== 1">s</span> below {{ LEGACY_MIN_N }} settled wagers —
      <NuxtLink to="/wallet" class="text-zinc-500 hover:text-zinc-300">see all</NuxtLink>.
    </p>

    <p class="text-[10px] text-zinc-600 px-3 py-2 border-t border-edge/40 leading-relaxed">
      ROI is profit over turnover. Verdict is the RPC's read of p(luck): EDGE below 0.05, hint below
      0.20, LUCK above. Nothing here reaches EDGE — run
      <code class="text-zinc-500">python3 -m common.wallet_significance</code> before quoting any of it.
    </p>
  </section>
</template>

<script setup>
/**
 * Fleet health, sorted by what has actually been measured.
 *
 * A wallet with no picker (W27, W30) is marked rather than hidden: "0 wagers"
 * on an active persona reads as a quiet day, when in fact nothing can ever
 * write to it.
 */
import { computed } from 'vue'

const props = defineProps({
  fleet: { type: Array, default: () => [] },
})

/** Trader personas with no picker built — CD #35 records both. */
const NO_PICKER = new Set([27, 30])

/** Legacy wallets below this many settled wagers are summarised, not listed. */
const LEGACY_MIN_N = 30

const all = computed(() =>
  [...props.fleet]
    .map(w => ({ ...w, silent: NO_PICKER.has(w.id) }))
    .sort((a, b) => (n(b) - n(a)) || (open(b) - open(a)) || (a.id - b.id))
)

const rows = computed(() =>
  all.value.filter(w => w.lifecycle === 'trader' || n(w) >= LEGACY_MIN_N || open(w) > 0)
)

const hidden = computed(() => all.value.length - rows.value.length)

function n(r) { return Number(r.perf?.n_wagers || 0) }
function open(r) { return Number(r.perf?.n_pending || 0) }

function signed(v) {
  if (v == null) return '—'
  const x = Number(v)
  return (x >= 0 ? '+' : '') + x.toFixed(2)
}

function signClass(v) {
  if (v == null || Number(v) === 0) return 'text-zinc-600'
  return Number(v) > 0 ? 'text-emerald-400' : 'text-red-400'
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
