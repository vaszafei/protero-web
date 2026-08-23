<template>
  <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 h-full">
    <div
      v-for="t in tiles"
      :key="t.label"
      class="rounded-lg border border-edge bg-surface p-3 flex flex-col justify-center"
    >
      <p class="text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{{ t.label }}</p>

      <div class="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <span class="text-base font-bold tabular-nums" :style="{ color: VIZ_HOME }">{{ fmt(t.home, t.decimals) }}{{ t.suffix }}</span>
        <div class="flex h-1.5 rounded-full overflow-hidden bg-surface-light">
          <div :style="{ width: pct(t.home, t.away) + '%', background: VIZ_HOME }" />
          <div class="flex-1" :style="{ background: VIZ_AWAY }" />
        </div>
        <span class="text-base font-bold tabular-nums" :style="{ color: VIZ_AWAY }">{{ fmt(t.away, t.decimals) }}{{ t.suffix }}</span>
      </div>

      <div class="mt-1.5 grid grid-cols-2 gap-2">
        <span class="text-right text-[10px] text-zinc-600 truncate">{{ shortName(homeName) }}</span>
        <span class="text-left text-[10px] text-zinc-600 truncate">{{ shortName(awayName) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps<{
  game: Record<string, any>
  sport: string
}>()

const homeName = computed(() => props.game?.home_name || '')
const awayName = computed(() => props.game?.away_name || '')

// Headline match metrics, each rendered as a compact tile. Only tiles whose
// values are actually present render — so a scheduled game shows nothing here.
const tiles = computed(() => {
  const g = props.game || {}
  const defs = [
    { label: 'Possession', home: g.home_possession, away: g.away_possession, suffix: '%', decimals: 0 },
    { label: 'Expected Goals', home: g.home_xg, away: g.away_xg, suffix: '', decimals: 2 },
    { label: 'Shots', home: g.home_shots, away: g.away_shots, suffix: '', decimals: 0 },
    { label: 'Corners', home: g.home_corners, away: g.away_corners, suffix: '', decimals: 0 },
  ]
  return defs.filter((t) => t.home != null && t.away != null)
})

function fmt(v: unknown, decimals: number): string {
  const n = Number(v)
  return isFinite(n) ? n.toFixed(decimals) : '—'
}

function pct(home: unknown, away: unknown): number {
  const h = Number(home) || 0
  const a = Number(away) || 0
  const total = h + a
  return total === 0 ? 50 : Math.round((h / total) * 100)
}

function shortName(name: string): string {
  if (!name) return ''
  const parts = name.split(' ')
  const last = parts[parts.length - 1]
  return last.length > 14 ? last.slice(0, 14) + '…' : last
}
</script>
