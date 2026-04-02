<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <svg class="w-6 h-6 animate-spin text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </div>

    <!-- Empty -->
    <div v-else-if="projections.length === 0" class="text-center py-12 text-zinc-500">
      No fantasy projections available for this game
    </div>

    <!-- Projections Table -->
    <div v-else>
      <!-- Header -->
      <div class="flex items-center justify-between mb-2.5 sm:mb-3">
        <h4 class="text-sm font-bold text-zinc-200 flex items-center gap-2">
          <svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Fantasy Projections
        </h4>
        <span class="text-[9px] sm:text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{{ scoringLabel }}</span>
      </div>

      <div class="flex items-center justify-between mb-1 px-1">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#f82828] to-[#0848a8]" />
          <span class="text-[11px] sm:text-xs font-semibold text-zinc-300">Top 7 Game Picks</span>
        </div>
        <span class="text-[10px] text-zinc-600">{{ topPlayers.length }} players</span>
      </div>

      <div class="space-y-1">
        <div
          v-for="(player, i) in topPlayers"
          :key="`${player.player_name}-${i}`"
          class="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg"
          :class="i % 2 === 0 ? 'bg-surface-light/40' : 'bg-surface/30'"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <span class="text-[10px] sm:text-[11px] text-zinc-600 font-medium tabular-nums w-4 text-right">{{ i + 1 }}</span>
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-semibold text-zinc-200 truncate leading-tight block">{{ player.player_name }}</span>
              <span class="text-[9px] uppercase tracking-wide text-zinc-500">{{ shortTeamName(player.team_name) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div class="text-center min-w-[30px] sm:min-w-[32px]">
              <span class="text-[9px] text-zinc-600 uppercase block leading-none">MIN</span>
              <span class="text-[10px] sm:text-[11px] font-semibold text-zinc-400 tabular-nums">{{ player.projected_minutes?.toFixed(0) || '-' }}</span>
            </div>
            <div class="text-center min-w-[36px] sm:min-w-[40px]">
              <span class="text-[9px] text-zinc-600 uppercase block leading-none">FPTS</span>
              <span
                class="text-[12px] sm:text-[13px] font-bold tabular-nums"
                :class="player.projected_score >= 35 ? 'text-emerald-400' : player.projected_score >= 25 ? 'text-zinc-100' : 'text-zinc-400'"
              >{{ player.projected_score?.toFixed(1) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  gameId: number
  homeName: string
  awayName: string
}>()

const api = useApi()
const projections = ref<any[]>([])
const loading = ref(true)

const scoringLabel = computed(() => {
  if (projections.value.length === 0) return ''
  const st = projections.value[0].scoring_type
  return st === 'dk' ? 'DraftKings' : st === 'pir' ? 'PIR' : st || ''
})

const topPlayers = computed(() => {
  return [...projections.value]
    .sort((a: any, b: any) => (b.projected_score || 0) - (a.projected_score || 0))
    .slice(0, 7)
})

function shortTeamName(teamName?: string) {
  if (!teamName) return '-'
  if (teamName === props.homeName) return 'HOME'
  if (teamName === props.awayName) return 'AWAY'
  return teamName.split(' ').slice(-1)[0].toUpperCase()
}

onMounted(async () => {
  try {
    projections.value = await api.fetchFantasyProjections(props.gameId)
  } catch (e) {
    console.warn('Fantasy projections fetch failed:', e)
  } finally {
    loading.value = false
  }
})
</script>
