<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <!-- Open exposure — the number an operator checks first. -->
    <div class="stat-tile">
      <p class="stat-label">Open exposure</p>
      <p class="stat-value" :class="exposure.stake > 0 ? 'text-amber-400' : 'text-zinc-600'">
        ${{ fmt(exposure.stake) }}
      </p>
      <p class="stat-foot">
        {{ exposure.n_wagers }} wager<span v-if="exposure.n_wagers !== 1">s</span>
        <span v-if="exposure.n_parlays" class="text-zinc-700">
          · {{ exposure.n_singles }} single{{ exposure.n_singles === 1 ? '' : 's' }} + {{ exposure.n_parlays }} parlay{{ exposure.n_parlays === 1 ? '' : 's' }}
        </span>
      </p>
    </div>

    <!-- Last 7 days, settled -->
    <div class="stat-tile">
      <p class="stat-label">Settled · 7d</p>
      <p class="stat-value" :class="signClass(week.pnl)">
        {{ signed(week.pnl) }}
      </p>
      <p class="stat-foot">
        {{ week.n_wagers }} wagers · {{ week.n_won }}W {{ week.n_wagers - week.n_won }}L
        <span v-if="week.turnover > 0" class="text-zinc-700">· ${{ fmt(week.turnover) }} turnover</span>
      </p>
    </div>

    <!-- Fleet lifetime — settled only, wager-counted -->
    <div class="stat-tile">
      <p class="stat-label">Fleet lifetime</p>
      <p class="stat-value" :class="signClass(lifetime.pnl)">
        {{ signed(lifetime.pnl) }}
      </p>
      <p class="stat-foot">
        {{ lifetime.n_wagers }} settled wagers
      </p>
    </div>

    <!-- Evidence state. There is nothing at p<0.05 and the card says so. -->
    <div class="stat-tile">
      <p class="stat-label">Proven edge</p>
      <p class="stat-value" :class="lifetime.n_edge > 0 ? 'text-emerald-400' : 'text-zinc-600'">
        {{ lifetime.n_edge }}
      </p>
      <p class="stat-foot">
        <template v-if="lifetime.n_edge === 0">
          no wallet at p&lt;0.05<span v-if="lifetime.best"> · best {{ lifetime.best.name }} p={{ Number(lifetime.best.p_luck).toFixed(2) }}</span>
        </template>
        <template v-else>wallets at p&lt;0.05</template>
      </p>
    </div>
  </div>
</template>

<script setup>
/**
 * The four numbers that open the console.
 *
 * "Proven edge" counts wallets the RPC verdicts as EDGE (p<0.05). It reads
 * zero, and that is the honest state of the project — detecting a true +5% ROI
 * edge needs ~3,128 wagers. Never replace this tile with a "best ROI" tile:
 * ROI without its p-value is the number that has misled this project before.
 */
import { computed } from 'vue'

const props = defineProps({
  exposure: { type: Object, required: true },
  week: { type: Object, required: true },
  fleet: { type: Array, default: () => [] },
})

const lifetime = computed(() => {
  const rows = props.fleet.map(w => w.perf).filter(Boolean)
  const withN = rows.filter(p => Number(p.n_wagers) > 0)
  const scored = withN.filter(p => p.p_luck != null)
  const best = scored.length
    ? scored.reduce((a, b) => (Number(a.p_luck) <= Number(b.p_luck) ? a : b))
    : null
  const bestWallet = best ? props.fleet.find(w => w.perf === best) : null
  return {
    n_wagers: withN.reduce((a, p) => a + Number(p.n_wagers || 0), 0),
    pnl: withN.reduce((a, p) => a + Number(p.pnl || 0), 0),
    n_edge: withN.filter(p => p.verdict === 'EDGE').length,
    best: bestWallet ? { name: bestWallet.name, p_luck: best.p_luck } : null,
  }
})

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function signed(v) {
  const n = Number(v || 0)
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function signClass(v) {
  const n = Number(v || 0)
  if (n === 0) return 'text-zinc-600'
  return n > 0 ? 'text-emerald-400' : 'text-red-400'
}
</script>

<style scoped>
.stat-tile {
  position: relative;
  padding: 0.75rem;
  border-radius: 0.65rem;
  background: linear-gradient(165deg, rgba(41, 45, 54, 0.55), rgba(26, 29, 36, 0.95));
  border: 1px solid #2a2f3a;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 20px -16px rgba(0, 0, 0, 0.85);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.stat-tile:hover {
  border-color: #353c48;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 12px 26px -14px rgba(0, 0, 0, 0.9);
  transform: translateY(-1px);
}
.stat-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(113, 113, 122);
}
.stat-value {
  margin-top: 0.15rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
.stat-foot {
  margin-top: 0.2rem;
  font-size: 0.625rem;
  color: rgb(101, 103, 112);
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .stat-tile { transition: none; }
}
</style>
