<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
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
          <UIcon name="i-heroicons-star" class="w-4 h-4 text-purple-400" />
          Fantasy Projections
        </h4>
        <!-- Scoring system toggle -->
        <div v-if="availableScoringTypes.length > 1" class="inline-flex rounded-md bg-surface-light p-0.5">
          <button
            v-for="st in availableScoringTypes"
            :key="st"
            @click="activeScoringType = st"
            :class="['text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors',
                     activeScoringType === st ? 'bg-purple-500/30 text-purple-200' : 'text-zinc-500 hover:text-zinc-300']"
          >{{ scoringLabelOf(st) }}</button>
        </div>
        <span v-else class="text-[9px] sm:text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{{ scoringLabel }}</span>
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
            <span
              v-if="player.position"
              class="inline-flex items-center justify-center text-[9px] font-extrabold rounded px-1.5 py-0.5 bg-purple-500/20 text-purple-300 flex-shrink-0"
            >{{ player.position }}</span>
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-semibold text-zinc-200 truncate leading-tight block">{{ player.player_name }}</span>
              <span class="text-[9px] uppercase tracking-wide text-zinc-500">{{ shortTeamName(player.team_name) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div v-if="player.salary" class="text-center min-w-[42px] sm:min-w-[48px]">
              <span class="text-[9px] text-zinc-600 uppercase block leading-none">SAL</span>
              <span class="text-[10px] sm:text-[11px] font-semibold text-amber-300 tabular-nums">{{ formatSalary(player.salary) }}</span>
            </div>
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
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps<{
  gameId: number
  homeName: string
  awayName: string
}>()

const api = useApi()
const projections = ref<any[]>([])
const loading = ref(true)
const activeScoringType = ref<string>('')

function scoringLabelOf(st: string) {
  if (st === 'dk') return 'DraftKings'
  if (st === 'pir') return 'PIR'
  if (st === 'stoiximan_nba' || st === 'stoiximan_euro') return 'Stoiximan'
  return st || '—'
}

const availableScoringTypes = computed(() => {
  const set = new Set<string>()
  for (const p of projections.value) if (p.scoring_type) set.add(p.scoring_type)
  return Array.from(set)
})

const scoringLabel = computed(() => scoringLabelOf(activeScoringType.value))

const topPlayers = computed(() => {
  const filtered = activeScoringType.value
    ? projections.value.filter((p: any) => p.scoring_type === activeScoringType.value)
    : projections.value
  return [...filtered]
    .sort((a: any, b: any) => (b.projected_score || 0) - (a.projected_score || 0))
    .slice(0, 7)
})

function formatSalary(v: number) {
  if (!v) return '-'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

function shortTeamName(teamName?: string) {
  if (!teamName) return '-'
  if (teamName === props.homeName) return 'HOME'
  if (teamName === props.awayName) return 'AWAY'
  return teamName.split(' ').slice(-1)[0].toUpperCase()
}

onMounted(async () => {
  try {
    projections.value = await api.fetchFantasyProjections(props.gameId)
    if (availableScoringTypes.value.length) {
      // Prefer DK > Stoiximan > PIR > whatever's first
      const pref = ['dk', 'stoiximan_nba', 'stoiximan_euro', 'pir']
      activeScoringType.value =
        pref.find(t => availableScoringTypes.value.includes(t)) || availableScoringTypes.value[0]
    }
  } catch (e) {
    console.warn('Fantasy projections fetch failed:', e)
  } finally {
    loading.value = false
  }
})
</script>
