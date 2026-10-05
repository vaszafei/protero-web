<template>
  <UiPageShell title="Admin panel" subtitle="Manage match scores and league standings.">
    <!-- Access denied -->
    <div v-if="!isAdmin" class="flex-1 flex items-center justify-center">
      <div class="panel p-8 text-center max-w-md">
        <h1 class="text-lg font-semibold text-zinc-100 mb-2">Access denied</h1>
        <p class="text-sm text-zinc-400 mb-4">You need admin privileges to access this page.</p>
        <UButton color="primary" @click="$router.push('/')">Go to the control room</UButton>
      </div>
    </div>

    <template v-else>
      <UiErrorState v-if="loadError" class="flex-shrink-0 mb-3" title="The admin data failed to load." :error="loadError" @retry="refreshData" />

      <div v-if="selectedLeague && leagueData" class="flex-shrink-0 space-y-3 mb-3">
        <!-- League, season, progress, refresh -->
        <div class="flex items-end gap-3">
          <div class="flex-shrink-0">
            <label class="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">League</label>
            <select
              v-model="selectedLeague"
              class="px-3 py-1.5 rounded-lg border border-edge bg-surface text-sm text-zinc-100 focus:outline-none focus:border-[var(--brand-blue-edge)]"
            >
              <option v-for="league in sortedLeagues" :key="league.key" :value="league.key">{{ league.name }}</option>
            </select>
          </div>

          <div v-if="availableSeasons.length > 0" class="flex-shrink-0">
            <label class="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Season</label>
            <select
              v-model="selectedSeason"
              class="px-3 py-1.5 rounded-lg border border-edge bg-surface text-sm text-zinc-100 focus:outline-none focus:border-[var(--brand-blue-edge)]"
            >
              <option v-for="s in availableSeasons" :key="s.season" :value="s.season">
                {{ s.season }} ({{ s.completedGames }}/{{ s.totalGames }})
              </option>
            </select>
          </div>

          <div class="flex-1 min-w-0 panel px-3 py-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] font-medium text-zinc-300">Season {{ selectedSeason || '' }} progress</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ matchesWithScores }}/{{ matches.length }} ({{ scoresPercentage }}%)</span>
            </div>
            <div class="relative w-full h-1.5 bg-edge rounded-full overflow-hidden">
              <div
                class="absolute top-0 left-0 h-full bg-[var(--brand-blue)] rounded-full"
                :style="{ width: scoresPercentage + '%', transition: 'width var(--dur-slow) var(--ease-glide)' }"
              />
            </div>
          </div>

          <button class="btn btn-ghost" :disabled="loadingMatches" @click="refreshData">
            <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" :class="loadingMatches ? 'animate-spin' : ''" />
            Refresh
          </button>
        </div>

        <!-- Coverage -->
        <div class="grid grid-cols-8 gap-2">
          <div v-for="t in tiles" :key="t.label" class="panel px-3 py-1.5">
            <p class="text-[10px] uppercase tracking-wider text-zinc-500">{{ t.label }}</p>
            <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ t.n }}/{{ matches.length }}
              <span class="text-[10px] font-normal text-zinc-500">{{ t.pct }}%</span></p>
          </div>
          <div class="panel px-3 py-1.5">
            <p class="text-[10px] uppercase tracking-wider text-zinc-500">Latest round</p>
            <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ currentRound }}</p>
          </div>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <AdminMatchList
          :matches="matches"
          :league-key="selectedLeague"
          :loading="loadingMatches"
          @refresh="refreshData"
          @game-deleted="handleGameDeleted"
        />
      </div>
    </template>
  </UiPageShell>
</template>

<script setup lang="ts">
import UiErrorState from '~/components/ui/ErrorState.vue'
import { errorText } from '~/utils/error-text'

const apiFetch = useApiFetch()

definePageMeta({
  middleware: 'auth'
})

const toast = useToast()
const { isAdmin } = useAuth()


// Data
const leagues = ref<any[]>([])
const selectedLeague = ref('')
const leagueData = ref<any>(null)
const matches = ref<any[]>([])
const loadingMatches = ref(false)
const loadError = ref<string | null>(null)
const availableSeasons = ref<any[]>([])
const selectedSeason = ref<any>(null)

// Load leagues on mount
onMounted(async () => {
  await loadLeagues()
})

// Load leagues
const loadLeagues = async () => {
  loadError.value = null
  try {
    const data = await apiFetch<any>('/api/leagues')
    leagues.value = data.leagues || []
    // Auto-select Premier League as first tab
    if (leagues.value.length > 0) {
      const premierLeague = leagues.value.find(l => l.key === 'premier_league')
      selectedLeague.value = premierLeague ? premierLeague.key : leagues.value[0].key
    }
  } catch (error) {
    loadError.value = errorText(error)
  }
}

// Sort leagues with Premier League first
const sortedLeagues = computed(() => {
  const sorted = [...leagues.value]
  sorted.sort((a, b) => {
    if (a.key === 'premier_league') return -1
    if (b.key === 'premier_league') return 1
    return a.name.localeCompare(b.name)
  })
  return sorted
})

// Load matches when league selected
watch(selectedLeague, async (newLeague: string, oldLeague: string) => {
  if (!newLeague) {
    matches.value = []
    leagueData.value = null
    availableSeasons.value = []
    selectedSeason.value = null
    return
  }
  
  // Clear matches immediately when switching leagues
  if (oldLeague !== newLeague) {
    matches.value = []
    leagueData.value = null
  }
  
  // Fetch available seasons for this league
  try {
    const seasonsData = await apiFetch<any>(`/api/seasons/${newLeague}`)
    availableSeasons.value = seasonsData.seasons || []
    
    // Default to most recent season (first in the list, sorted DESC)
    if (availableSeasons.value.length > 0) {
      const newSeason = availableSeasons.value[0].season
      // Manually trigger load matches to avoid race conditions
      selectedSeason.value = newSeason
      await loadMatches(newLeague, newSeason)
    } else {
      selectedSeason.value = null
      // If no seasons, still load games
      await loadMatches(newLeague, null)
    }
  } catch (error) {
    toast.add({ title: 'Seasons failed to load', description: errorText(error), color: 'red' })
    availableSeasons.value = []
    selectedSeason.value = null
    // Fallback to loading all matches
    await loadMatches(newLeague, null)
  }
})

// Load matches when season changes (only if not triggered by league change)
watch(selectedSeason, async (newSeason: any, oldSeason: any) => {
  // Only load if season changed but league didn't (manual season selection)
  if (newSeason !== oldSeason && selectedLeague.value) {
    await loadMatches(selectedLeague.value, newSeason)
  }
})

// Load matches function
const loadMatches = async (leagueKey: string, season: string | null) => {
  loadingMatches.value = true
  try {
    // Build URL with season filter
    let url = `/api/leagues/${leagueKey}?round=all&_t=${Date.now()}`
    if (season) {
      url += `&season=${season}`
    }
    
    const data = await apiFetch<any>(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    leagueData.value = data
    matches.value = data.games || []
  } catch (error) {
    loadError.value = errorText(error)
  } finally {
    loadingMatches.value = false
  }
}

// Refresh data
const refreshData = async () => {
  if (!selectedLeague.value) return
  loadingMatches.value = true
  loadError.value = null
  try {
    let url = `/api/leagues/${selectedLeague.value}?round=all&t=${Date.now()}`
    if (selectedSeason.value) url += `&season=${selectedSeason.value}`
    const data = await apiFetch<any>(url)
    leagueData.value = data
    matches.value = data.games || []
    toast.add({ title: 'Refreshed', description: 'Data refreshed successfully', color: 'primary' })
  } catch (error) {
    loadError.value = errorText(error)
  } finally {
    loadingMatches.value = false
  }
}

// Handle games saved from fetch modal
// Handle game deletion
const handleGameDeleted = (gameId: number) => {
  // Remove from local matches array
  const index = matches.value.findIndex(m => m.id === gameId)
  if (index !== -1) {
    matches.value.splice(index, 1)
  }
}

// Computed statistics
const matchesWithScores = computed(() => {
  // Games that have scores entered (regardless of status)
  return matches.value.filter(m => {
    return m.home_goals !== null && m.away_goals !== null
  }).length
})

const matchesWithLineups = computed(() => {
  // Games that have lineups data
  return matches.value.filter(m => {
    // Check if game has lineups flag or formation data
    return m.home_formation || m.away_formation
  }).length
})

const matchesWithPlayerStats = computed(() => {
  // Games that have detailed player statistics
  // This should be checked via lineups table join, but we can estimate from formations
  return matches.value.filter(m => {
    return m.home_formation && m.away_formation
  }).length
})

const matchesWithReferees = computed(() => {
  // Games that have referee assigned
  return matches.value.filter(m => {
    return m.referee_id !== null && m.referee_id !== undefined
  }).length
})

const matchesWithFormations = computed(() => {
  // Games that have both home and away formations
  return matches.value.filter(m => {
    return m.home_formation && m.away_formation
  }).length
})

const finishedMatches = computed(() => {
  return matches.value.filter(m => m.status === 'completed').length
})

const pendingMatches = computed(() => {
  return matches.value.filter(m => m.status !== 'completed').length
})

const matchesWithStats = computed(() => {
  // Games that have actual meaningful stats (not just template/default values)
  return matches.value.filter(m => {
    // Check if game has is_scraped flag
    if (m.is_scraped === 1) return true
    
    // Check for actual stats data (not just default template values)
    // Exclude games with 0/0 shots, 50/50 possession, or 0/0 corners (template data)
    const hasRealShots = (m.home_shots && m.away_shots) && 
                         (m.home_shots > 0 || m.away_shots > 0)
    const hasRealPossession = (m.home_possession_pct && m.away_possession_pct) && 
                              !(m.home_possession_pct === 50 && m.away_possession_pct === 50)
    const hasRealCorners = (m.home_corners && m.away_corners) && 
                           (m.home_corners > 0 || m.away_corners > 0)
    
    return hasRealShots || hasRealPossession || hasRealCorners
  }).length
})

const matchesWithOdds = computed(() => {
  return matches.value.filter(m => {
    // Check if match has odds (odds_home, odds_draw, odds_away)
    return m.odds_home || m.odds_draw || m.odds_away
  }).length
})

const currentRound = computed(() => {
  if (!matches.value.length) return '-'
  
  // Find the highest round that has games with scores
  const gamesWithScores = matches.value.filter(m => 
    m.home_goals !== null && m.away_goals !== null
  )
  
  if (gamesWithScores.length === 0) {
    // If no games have scores yet, return round 1
    return 1
  }
  
  const rounds = gamesWithScores.map((m: any) => {
    const roundStr = String(m.round || '0')
    return parseInt(roundStr.replace(/\D/g, '') || '0')
  })
  
  return Math.max(...rounds)
})

const scoresPercentage = computed(() => {
  if (!matches.value.length) return 0
  return Math.round((matchesWithScores.value / matches.value.length) * 100)
})

const statsCoverage = computed(() => {
  if (!matches.value.length) return 0
  // Stats coverage is calculated against all games
  return Math.round((matchesWithStats.value / matches.value.length) * 100)
})

const lineupsCoverage = computed(() => {
  if (!matches.value.length) return 0
  return Math.round((matchesWithLineups.value / matches.value.length) * 100)
})

const playerStatsCoverage = computed(() => {
  if (!matches.value.length) return 0
  return Math.round((matchesWithPlayerStats.value / matches.value.length) * 100)
})

const refereesCoverage = computed(() => {
  if (!matches.value.length) return 0
  return Math.round((matchesWithReferees.value / matches.value.length) * 100)
})

const formationsCoverage = computed(() => {
  if (!matches.value.length) return 0
  return Math.round((matchesWithFormations.value / matches.value.length) * 100)
})

const oddsCoverage = computed(() => {
  if (!matches.value.length) return 0
  return Math.round((matchesWithOdds.value / matches.value.length) * 100)
})

const tiles = computed(() => [
  { label: 'Played', n: matchesWithScores.value, pct: scoresPercentage.value },
  { label: 'Game stats', n: matchesWithStats.value, pct: statsCoverage.value },
  { label: 'Lineups', n: matchesWithLineups.value, pct: lineupsCoverage.value },
  { label: 'Player stats', n: matchesWithPlayerStats.value, pct: playerStatsCoverage.value },
  { label: 'Referees', n: matchesWithReferees.value, pct: refereesCoverage.value },
  { label: 'Odds', n: matchesWithOdds.value, pct: oddsCoverage.value },
  { label: 'Formations', n: matchesWithFormations.value, pct: formationsCoverage.value },
])
</script>
