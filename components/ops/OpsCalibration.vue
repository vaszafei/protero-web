<template>
  <section class="panel overflow-hidden">
    <header class="panel-head">
      <h2 class="panel-title">Model vs close</h2>
      <span class="text-[10px] text-zinc-600 tabular-nums">{{ cells.length }} cells</span>
    </header>

    <!-- How current the model arm of the spine is. -->
    <div v-if="modelArms.length" class="px-3 py-2 border-b border-edge/40 space-y-1">
      <div
        v-for="a in modelArms" :key="a.source"
        class="flex items-baseline gap-2 text-[10px] tabular-nums"
      >
        <span class="uppercase font-semibold w-8" :class="sourceClass(a.source)">{{ a.source }}</span>
        <span class="text-zinc-500">scored to {{ fmtDate(a.last_date) }}</span>
        <span
          v-if="a.unscored_completed > 0"
          class="ml-auto"
          :class="a.source === 'gbm' ? 'text-zinc-600' : 'text-amber-400/80'"
        >
          {{ a.unscored_completed }} unscored
        </span>
      </div>
      <div v-if="priceArm" class="flex items-baseline gap-2 text-[10px] tabular-nums pt-0.5">
        <span class="uppercase font-semibold w-8 text-zinc-500">price</span>
        <span class="text-zinc-600">scored to {{ fmtDate(priceArm.last_date) }}</span>
      </div>
    </div>

    <div v-if="cells.length" class="divide-y divide-edge/40">
      <div v-for="c in cells" :key="c.league_key + c.market" class="px-3 py-1.5">
        <div class="flex items-baseline gap-2">
          <span class="text-[11px] text-zinc-300 truncate">{{ leagueLabel(c.league_key) }}</span>
          <span class="text-[10px] text-zinc-500">{{ marketLabel(c.market) }}</span>
          <span class="text-[9px] uppercase font-semibold" :class="sourceClass(c.source)">{{ c.source }}</span>
          <span class="ml-auto text-[10px] text-zinc-600 tabular-nums">n={{ c.n }}</span>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <!-- Diverging bar, zero at centre. Left of centre = behind the close. -->
          <div class="relative flex-1 h-1.5 rounded-sm bg-surface-light overflow-hidden">
            <div class="absolute inset-y-0 left-1/2 w-px bg-zinc-600/60"></div>
            <div class="absolute inset-y-0" :style="barStyle(c.bss)"></div>
          </div>
          <span
            class="text-[10px] tabular-nums w-14 text-right"
            :class="c.bss == null ? 'text-zinc-600' : c.bss > 0 ? 'text-blue-300' : 'text-red-400/80'"
            :title="`Brier ${fmt5(c.brier_ours)} vs the close's ${fmt5(c.brier_close)}, on the same ${c.n} fixtures.`"
          >
            {{ c.bss == null ? '—' : signed4(c.bss) }}
          </span>
        </div>
      </div>
    </div>

    <p v-if="missing.length" class="text-[10px] text-amber-300/70 px-3 py-1.5 border-t border-edge/40 leading-relaxed">
      No spine rows at all for {{ missing.join(', ') }} — the mask bets {{ missing.length }} cell<span v-if="missing.length !== 1">s</span>
      the model arm has never scored.
    </p>

    <p class="text-[10px] text-zinc-600 px-3 py-2 border-t border-edge/40 leading-relaxed">
      Brier skill against the de-vigged closing price, PAIRED on the same fixtures — positive beats
      the close. Every cell we bet is negative, which is the standing finding, not a bad week.
      Scored on all graded fixtures, so an early-season slate moves these numbers by nothing.
      <span v-if="dcStale">
        <code class="text-zinc-500">dc</code> is behind the price because
        <code class="text-zinc-500">write_model</code> is not a pipeline step — run
        <code class="text-zinc-500">python3 -m ml.line_scores.write_model --apply</code> to close it.
      </span>
      <span v-if="hasGbm">
        <code class="text-zinc-500">gbm</code> stopping at its test season is BY DESIGN
        (<code class="text-zinc-500">write_gbm.py</code> writes <code class="text-zinc-500">TEST_SEASON</code>
        only, so a training-season row can never be mistaken for an out-of-sample one) — its
        "unscored" count is not staleness.
      </span>
    </p>
  </section>
</template>

<script setup>
/**
 * Our probability against the market's, on the cells the mask actually bets.
 *
 * This is a PROPER-SCORING panel: Brier and Brier skill only, no EV, no ROI, no
 * bet selection. An ROI on 48 wagers and a Brier on 1,100 fixtures answer
 * different questions, and only the second one has an n worth reading — which is
 * the whole argument for the closing-line spine.
 *
 * The comparison is paired per fixture in `line_scores_model_vs_close`. Unpaired
 * means the delta reports which fixtures each source happened to cover: `dc` is
 * scored on every fixture and `close_avg` only where a price exists, so the
 * unpaired gap is mostly a coverage difference wearing a skill label.
 */
import { computed } from 'vue'

const props = defineProps({
  calibration: { type: Object, default: () => ({ cells: [], missing: [], currency: [] }) },
})

const cells = computed(() => props.calibration?.cells || [])
const missing = computed(() => props.calibration?.missing || [])
const currency = computed(() => props.calibration?.currency || [])

const modelArms = computed(() => currency.value.filter(c => c.source === 'dc' || c.source === 'gbm'))
const priceArm = computed(() => currency.value.find(c => c.source === 'close_avg') || null)

const dcStale = computed(() => (modelArms.value.find(a => a.source === 'dc')?.unscored_completed || 0) > 0)
const hasGbm = computed(() => cells.value.some(c => c.source === 'gbm'))

/** The largest |bss| on screen sets the bar's full width. */
const scale = computed(() => {
  const m = Math.max(...cells.value.map(c => Math.abs(c.bss ?? 0)), 0.01)
  return m
})

function barStyle(bss) {
  if (bss == null) return { display: 'none' }
  const frac = Math.min(Math.abs(bss) / scale.value, 1) * 50
  // Blue beats the close, red trails it — the brand rule, not a heat map.
  const color = bss > 0 ? 'var(--brand-blue)' : 'var(--brand-red)'
  return bss > 0
    ? { left: '50%', width: `${frac}%`, background: color }
    : { right: '50%', width: `${frac}%`, background: color }
}

function sourceClass(src) {
  return src === 'gbm' ? 'text-violet-300/80' : 'text-blue-300/80'
}

function leagueLabel(key) {
  return (key || '').replace(/_/g, ' ')
}

function marketLabel(market) {
  return market
    .replace(/^over_(\d)(\d)$/, 'O$1.$2')
    .replace(/^under_(\d)(\d)$/, 'U$1.$2')
    .replace(/_/g, ' ')
}

function fmt5(v) {
  return v == null ? '—' : Number(v).toFixed(5)
}

function signed4(v) {
  const x = Number(v)
  return (x >= 0 ? '+' : '') + x.toFixed(4)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
</script>
