<template>
  <div class="space-y-4">
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
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-bold text-zinc-200 flex items-center gap-2">
          <svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Fantasy Projections
        </h4>
        <span class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{{ scoringLabel }}</span>
      </div>

      <!-- Team sections -->
      <div v-for="team in teams" :key="team.name" class="mb-4">
        <div class="flex items-center gap-2 mb-2 px-1">
          <div class="w-1.5 h-1.5 rounded-full" :class="team === teams[0] ? 'bg-[#f82828]' : 'bg-[#0848a8]'" />
          <span class="text-xs font-semibold text-zinc-300">{{ team.name }}</span>
          <span class="text-[10px] text-zinc-600">{{ team.players.length }} players</span>
        </div>
        
        <div class="space-y-1">
          <div
            v-for="(player, i) in team.players"
            :key="player.player_name"
            class="flex items-center justify-between px-3 py-2 rounded-lg"
            :class="i % 2 === 0 ? 'bg-surface-light/40' : 'bg-surface/30'"
          >
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <span class="text-[11px] text-zinc-600 font-medium tabular-nums w-4 text-right">{{ i + 1 }}</span>
              <span class="text-[12px] font-semibold text-zinc-200 truncate">{{ player.player_name }}</span>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <div class="text-center">
                <span class="text-[9px] text-zinc-600 uppercase block leading-none">MIN</span>
                <span class="text-[11px] font-semibold text-zinc-400 tabular-nums">{{ player.projected_minutes?.toFixed(0) || '-' }}</span>
              </div>
              <div class="text-center min-w-[40px]">
                <span class="text-[9px] text-zinc-600 uppercase block leading-none">FPTS</span>
                <span
                  class="text-[13px] font-bold tabular-nums"
                  :class="player.projected_score >= 35 ? 'text-emerald-400' : player.projected_score >= 25 ? 'text-zinc-100' : 'text-zinc-400'"
                >{{ player.projected_score?.toFixed(1) }}</span>
              </div>
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

const teams = computed(() => {
  const homeTeam = { name: props.homeName, players: [] as any[] }
  const awayTeam = { name: props.awayName, players: [] as any[] }
  
  for (const p of projections.value) {
    if (p.team_name === props.homeName) {
      homeTeam.players.push(p)
    } else {
      awayTeam.players.push(p)
    }
  }
  
  // Sort by projected score descending
  homeTeam.players.sort((a: any, b: any) => (b.projected_score || 0) - (a.projected_score || 0))
  awayTeam.players.sort((a: any, b: any) => (b.projected_score || 0) - (a.projected_score || 0))
  
  return [homeTeam, awayTeam].filter(t => t.players.length > 0)
})

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
