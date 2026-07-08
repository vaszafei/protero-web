<template>
  <div
    class="rounded-xl border overflow-hidden"
    :class="borderClass"
  >
    <!-- Header bar -->
    <div class="flex items-center justify-between px-4 py-2.5" :class="headerBg">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="min-w-0">
          <span class="font-semibold text-sm text-zinc-100 block truncate">{{ pick.player_name }}</span>
          <span v-if="showOcrName" class="text-[10px] text-zinc-600 block truncate">OCR: {{ pick.player_name_ocr }}</span>
        </div>
        <span class="text-[11px] text-zinc-500 shrink-0 border border-zinc-700/50 rounded px-1.5 py-0.5">
          {{ pick.team_name }}
        </span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-bold px-2 py-1 rounded-lg" :class="tierBadge">
          {{ tierLabel }}
        </span>
        <span v-if="pick.confidence && tier <= 2" class="text-[11px] font-mono" :class="confColor">{{ pick.confidence }}%</span>
      </div>
    </div>

    <!-- Bet line -->
    <div class="px-4 py-2 border-t border-zinc-800/60 flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-base font-bold" :class="tier <= 2 ? 'text-zinc-100' : 'text-zinc-400'">
          {{ pick.market?.toUpperCase() }} {{ fmtLine(pick.line) }}
        </span>
        <span v-if="pick.direction" class="text-[11px] px-1.5 py-0.5 rounded font-bold"
          :class="pick.direction === 'OVER' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
        >{{ pick.direction }}</span>
      </div>
      <span v-if="pick.odds" class="text-xs text-zinc-500">@ {{ pick.odds }}</span>
    </div>

    <!-- Stats grid — only for picks with actual data -->
    <div v-if="hasStats" class="px-4 py-2.5 border-t border-zinc-800/60">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div v-if="pick.season_hr != null" class="stat-pill" :class="hrBg(pick.season_hr)">
          <span class="stat-pill-label">Season</span>
          <span class="stat-pill-value" :class="hrText(pick.season_hr)">{{ fmtPct(pick.season_hr) }}</span>
          <span v-if="pick.season_games" class="stat-pill-sub">{{ pick.season_games }}g</span>
        </div>
        <div v-if="pick.l10_hr != null" class="stat-pill" :class="hrBg(pick.l10_hr)">
          <span class="stat-pill-label">Last 10</span>
          <span class="stat-pill-value" :class="hrText(pick.l10_hr)">{{ fmtPct(pick.l10_hr) }}</span>
          <span v-if="pick.l10_hits != null" class="stat-pill-sub">{{ pick.l10_hits }}/10</span>
        </div>
        <div v-if="pick.h2h_hr != null" class="stat-pill" :class="hrBg(pick.h2h_hr)">
          <span class="stat-pill-label">H2H</span>
          <span class="stat-pill-value" :class="hrText(pick.h2h_hr)">{{ fmtPct(pick.h2h_hr) }}</span>
          <span v-if="pick.h2h_n" class="stat-pill-sub">{{ pick.h2h_n }}g</span>
        </div>
        <div v-if="pick.cv != null" class="stat-pill" :class="cvBg(pick.cv)">
          <span class="stat-pill-label">CV</span>
          <span class="stat-pill-value" :class="cvText(pick.cv)">{{ pick.cv?.toFixed(2) }}</span>
          <span class="stat-pill-sub">{{ pick.cv < 0.25 ? 'Elite' : pick.cv < 0.35 ? 'Solid' : 'Volatile' }}</span>
        </div>
      </div>

      <!-- Avg context -->
      <div v-if="pick.season_avg != null" class="flex items-center gap-4 mt-2 text-xs text-zinc-400">
        <span>Avg <strong class="text-zinc-200">{{ pick.season_avg }}</strong> ± {{ pick.season_sd }}</span>
        <span v-if="pick.h2h_avg != null">H2H Avg <strong class="text-zinc-200">{{ pick.h2h_avg }}</strong></span>
      </div>
    </div>

    <!-- No data explanation for SKIP -->
    <div v-else-if="tier >= 3" class="px-4 py-2 border-t border-zinc-800/60">
      <span class="text-xs text-zinc-600 italic">{{ noDataReason }}</span>
    </div>

    <!-- Green + red flags -->
    <div v-if="(pick.green_flags?.length || pick.red_flags?.length) && tier <= 2" class="px-4 py-2 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
      <span
        v-for="flag in pick.green_flags"
        :key="'g-'+flag"
        class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      >✓ {{ flag }}</span>
      <span
        v-for="flag in pick.red_flags"
        :key="'r-'+flag"
        class="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
      >⚠ {{ flag }}</span>
    </div>

    <!-- Last 10 game values chart -->
    <div v-if="pick.l10_values?.length && tier <= 2" class="px-4 py-2 border-t border-zinc-800/60 flex items-center gap-2">
      <span class="text-[10px] text-zinc-500 shrink-0 uppercase tracking-wide">L10</span>
      <div class="flex gap-0.5 flex-wrap">
        <span
          v-for="(v, idx) in pick.l10_values"
          :key="idx"
          class="text-[11px] w-7 text-center py-0.5 rounded font-mono"
          :class="v > pick.line ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-600'"
        >{{ v }}</span>
      </div>
    </div>

    <!-- Best alt line recommendation -->
    <div v-if="pick.best_alt_line && tier <= 2" class="px-4 py-2 border-t border-zinc-800/60 bg-amber-500/5">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-[10px] text-amber-500/80 uppercase font-medium">Best Alt Line</span>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-sm font-bold text-amber-400">{{ pick.best_alt_line.line }}+ @ {{ pick.best_alt_line.odds }}</span>
          </div>
        </div>
        <div class="flex gap-3 text-right">
          <div>
            <div class="text-[10px] text-zinc-500">Season</div>
            <div class="text-xs font-bold" :class="hrTextClass(pick.best_alt_line.season_hr)">{{ pick.best_alt_line.season_hr }}%</div>
          </div>
          <div>
            <div class="text-[10px] text-zinc-500">L10</div>
            <div class="text-xs font-bold" :class="hrTextClass(pick.best_alt_line.l10_hr)">{{ pick.best_alt_line.l10_hr }}%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pick: any
  tier: number
}>()

const showOcrName = computed(() =>
  props.pick.player_name_ocr &&
  props.pick.player_name_ocr !== props.pick.player_name
)

const hasStats = computed(() =>
  props.pick.season_hr != null || props.pick.l10_hr != null || props.pick.h2h_hr != null
)

const noDataReason = computed(() => {
  if (!props.pick.player_name || props.pick.player_name === props.pick.player_name_ocr) {
    return 'Could not match player name from OCR'
  }
  return 'No historical game logs found'
})

const borderClass = computed(() => ({
  'border-emerald-500/30': props.tier === 1,
  'border-blue-500/25': props.tier === 2,
  'border-zinc-700/30': props.tier >= 3,
}))

const headerBg = computed(() => ({
  'bg-emerald-500/8': props.tier === 1,
  'bg-blue-500/8': props.tier === 2,
  'bg-zinc-800/40': props.tier >= 3,
}))

const tierBadge = computed(() => {
  if (props.tier === 1) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  if (props.tier === 2) return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  return 'bg-zinc-700/40 text-zinc-500 border border-zinc-600/30'
})

const tierLabel = computed(() => {
  if (props.tier === 1) return '★★★★★'
  if (props.tier === 2) return '★★★★'
  return 'SKIP'
})

const confColor = computed(() => {
  if (props.pick.confidence >= 70) return 'text-emerald-400'
  if (props.pick.confidence >= 50) return 'text-blue-400'
  return 'text-zinc-600'
})

function fmtLine(line: number) {
  if (line == null) return ''
  return `${line}+`
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${Math.round(v)}%`
}

function hrBg(v: number): string {
  if (v >= 75) return 'bg-emerald-500/10'
  if (v >= 65) return 'bg-yellow-500/10'
  return 'bg-red-500/10'
}

function hrText(v: number): string {
  if (v >= 75) return 'text-emerald-400'
  if (v >= 65) return 'text-yellow-400'
  return 'text-red-400'
}

function cvBg(v: number): string {
  if (v < 0.25) return 'bg-emerald-500/10'
  if (v < 0.35) return 'bg-yellow-500/10'
  return 'bg-red-500/10'
}

function cvText(v: number): string {
  if (v < 0.25) return 'text-emerald-400'
  if (v < 0.35) return 'text-yellow-400'
  return 'text-red-400'
}

function hrTextClass(v: number): string {
  if (v >= 75) return 'text-emerald-400'
  if (v >= 65) return 'text-yellow-400'
  return 'text-red-400'
}
</script>

<style scoped>
.stat-pill {
  @apply flex flex-col items-center rounded-lg py-1.5 px-2;
}
.stat-pill-label {
  @apply text-[10px] text-zinc-500 uppercase tracking-wide;
}
.stat-pill-value {
  @apply text-sm font-bold;
}
.stat-pill-sub {
  @apply text-[10px] text-zinc-600;
}
</style>
