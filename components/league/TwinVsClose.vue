<template>
  <section v-if="hasData" class="panel">
    <header class="panel-head">
      <h3 class="panel-title">Twin vs close · season-phase stack</h3>
      <span class="text-[10px] text-zinc-600">research · proper scoring, no EV/ROI</span>
      <button
        type="button"
        class="ml-auto text-[10px] font-semibold text-zinc-300 hover:text-zinc-100 border border-edge rounded px-2 py-0.5 transition-colors"
        @click="open = true"
      >
        Compare phases
      </button>
    </header>

    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[560px]">
        <thead>
          <tr class="text-zinc-500 bg-white/[0.02]">
            <th class="th text-left">Market</th>
            <th class="th w-16 text-right" title="Fixtures the cell was scored on (test season)">n</th>
            <th class="th w-20 text-right" title="Close's own Brier Skill Score on the same slice — the accuracy frontier">ceil</th>
            <th class="th w-24 text-right" title="The twin's weight on the log-odds residual. 0 = the close is right; >0 would mean it adds signal.">b twin</th>
            <th class="th w-16 text-right" title="Significance of b. |t| ≥ ~2 is worth reading; the Bonferroni bar across 56 cells is 3.29.">t(b)</th>
            <th class="th w-24 text-right" title="Paired Brier: twin − close. Negative = the twin beat the close on the same fixtures.">ΔBrier twin</th>
            <th class="th w-16 text-right" title="Significance of the paired Brier delta.">t(ΔB)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cell in cells" :key="cell.market" class="border-t border-white/[0.035]">
            <td class="td font-medium text-zinc-200">{{ marketLabel(cell.market) }}</td>
            <td class="td text-right text-zinc-500 tabular-nums">{{ cell.n_test }}</td>
            <td class="td text-right text-zinc-400 tabular-nums">{{ fmt(cell.ceiling, 3) }}</td>
            <td class="td text-right tabular-nums" :class="bClass(cell.b_m1)">{{ fmt(cell.b_m1, 3) }}</td>
            <td class="td text-right tabular-nums" :class="tClass(cell.t_m1)">{{ fmt(cell.t_m1, 2) }}</td>
            <td class="td text-right tabular-nums" :class="deltaClass(cell.twin_delta_brier)">{{ fmtSci(cell.twin_delta_brier) }}</td>
            <td class="td text-right tabular-nums" :class="tClass(cell.twin_delta_t)">{{ fmt(cell.twin_delta_t, 2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="px-3 py-2 border-t border-edge/40 text-[10px] text-zinc-600 leading-relaxed">
      Fit on {{ trainSeasons }} · scored on {{ testSeason }}. The twin is walked forward (monthly
      refit, out of sample) and stacked on the Shin-de-vigged closing price with the same M0/M1/M2
      instrument that scored DC / GBM / tipsters. b &gt; 0 means the twin knows something the close
      does not — the expected answer here is b ≈ 0, matching every prior source.
    </p>

    <UModal v-model="open" :ui="{ width: 'sm:max-w-4xl', background: 'bg-surface' }">
      <div class="p-6 bg-surface rounded-xl">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="text-lg font-bold text-zinc-100">Twin vs close — by season phase</h3>
            <p class="text-[11px] text-zinc-500 mt-0.5">
              The per-cell weight is fitted once and re-scored on the calendar terciles of
              {{ testSeason }} — a phase cannot manufacture its own b.
            </p>
          </div>
          <button class="text-zinc-500 hover:text-zinc-400" @click="open = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="cell in cells"
            :key="cell.market"
            class="bg-surface-light rounded-lg border border-edge p-3"
          >
            <div class="flex items-baseline gap-2 mb-2">
              <span class="text-xs font-semibold text-zinc-200">{{ marketLabel(cell.market) }}</span>
              <span class="text-[10px] text-zinc-500 tabular-nums">
                b = {{ fmt(cell.b_m1, 3) }} · t = {{ fmt(cell.t_m1, 2) }}
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="ph in ['early', 'mid', 'late']" :key="ph" class="bg-surface/60 rounded p-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-semibold text-zinc-400 uppercase">{{ ph }}</span>
                  <span class="text-[10px] text-zinc-600 tabular-nums">n={{ phaseN(cell, ph) }}</span>
                </div>
                <div class="mt-1.5 space-y-1 text-[11px] tabular-nums">
                  <div class="flex justify-between">
                    <span class="text-zinc-600">close BSS</span>
                    <span class="text-zinc-300">{{ fmt(phaseVal(cell, ph, 'close_bss'), 3) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-zinc-600">twin BSS</span>
                    <span class="text-zinc-300">{{ fmt(phaseVal(cell, ph, 'twin_bss'), 3) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-zinc-600">ΔBrier twin</span>
                    <span :class="deltaClass(phaseVal(cell, ph, 'twin_delta_brier'))">
                      {{ fmtSci(phaseVal(cell, ph, 'twin_delta_brier')) }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-zinc-600">t(ΔB)</span>
                    <span :class="tClass(phaseVal(cell, ph, 'twin_delta_t'))">
                      {{ fmt(phaseVal(cell, ph, 'twin_delta_t'), 2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p class="mt-4 text-[10px] text-zinc-600 leading-relaxed">
          ΔBrier negative = the twin beat the close in that slice. |t| ≥ ~2 is the only thing
          worth reading; the Bonferroni bar applies to the cell sweep, not to the phase slice.
          Proper scoring only — this is a model-quality read, never a bet or a price.
        </p>
      </div>
    </UModal>
  </section>
</template>

<script setup lang="ts">
/**
 * Twin vs closing line, split by season phase — the persisted output of
 * `research/closing_line/season_phase.py --persist` (workstream 1 of the
 * research phase). Renders the per-cell M1 stack fit and a "Compare phases"
 * modal that re-scores the SAME weight on the early/mid/late terciles.
 *
 * This is a model-quality read with proper scoring rules only — Brier/BSS and
 * paired deltas, no EV, no ROI, no bet selection. The twin is explicitly NOT a
 * pricing input (see useTwins.ts) and this panel must never read as one.
 */
import { computed, ref } from 'vue'

interface PhaseRow {
  league_key: string
  market: string
  phase: 'all' | 'early' | 'mid' | 'late'
  n_test: number
  ceiling: number | null
  close_bss: number | null
  twin_bss: number | null
  b_m1: number | null
  t_m1: number | null
  twin_delta_brier: number | null
  twin_delta_t: number | null
  m1_delta_brier: number | null
  m1_delta_t: number | null
  train_seasons: string
  test_season: string
  computed_at: string
}

const props = defineProps<{ leagueKey: string }>()

const api = useApi()
const open = ref(false)

const { data, pending, error } = useSwr(
  computed(() => `twin_season_phase:${props.leagueKey}`),
  () => api.fetchTwinSeasonPhase(props.leagueKey),
  { memoryTtl: 30 * 60_000 },
)

const rows = computed<PhaseRow[]>(() => data.value || [])
const cells = computed(() => rows.value.filter(r => r.phase === 'all').sort((a, b) => a.market.localeCompare(b.market)))
const hasData = computed(() => cells.value.length > 0 && !error.value)

const trainSeasons = computed(() => cells.value[0]?.train_seasons || '—')
const testSeason = computed(() => cells.value[0]?.test_season || '—')

function phaseRow(cell: PhaseRow, phase: string): PhaseRow | undefined {
  return rows.value.find(r => r.market === cell.market && r.phase === phase)
}
function phaseN(cell: PhaseRow, phase: string): number {
  return phaseRow(cell, phase)?.n_test ?? 0
}
function phaseVal(cell: PhaseRow, phase: string, key: 'close_bss' | 'twin_bss' | 'twin_delta_brier' | 'twin_delta_t'): number | null {
  return phaseRow(cell, phase)?.[key] ?? null
}

const MARKET_LABELS: Record<string, string> = {
  home_win: 'Home win',
  draw: 'Draw',
  away_win: 'Away win',
  over_25: 'Over 2.5',
}
function marketLabel(m: string): string {
  return MARKET_LABELS[m] || m
}

function fmt(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}
function fmtSci(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toExponential(2)
}

/** b > 0 would be the twin earning its way off the close; the fitted value is ~0 or negative. */
function bClass(b: number | null): string {
  if (b == null || !Number.isFinite(b)) return 'text-zinc-600'
  return b > 0 ? 'text-emerald-400' : b < 0 ? 'text-red-400' : 'text-zinc-400'
}
function deltaClass(d: number | null): string {
  if (d == null || !Number.isFinite(d)) return 'text-zinc-600'
  return d < 0 ? 'text-emerald-400' : 'text-red-400'
}
function tClass(t: number | null): string {
  if (t == null || !Number.isFinite(t)) return 'text-zinc-600'
  return Math.abs(t) >= 2 ? 'text-zinc-200 font-semibold' : 'text-zinc-500'
}
</script>

<style scoped>
/* Mirrors AnalysisView's table cells — .th/.td are scoped there, so this
   component carries its own copy of the same two definitions. */
.th { padding: 0.4rem 0.5rem; font-weight: 600; font-size: 0.6rem; letter-spacing: 0.03em; text-transform: uppercase; text-align: center; }
.td { padding: 0.32rem 0.5rem; }
</style>
