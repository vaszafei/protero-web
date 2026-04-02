<template>
  <div class="py-6 px-4 md:px-6">
    <!-- Access Denied -->
    <div v-if="!isAdmin" class="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card padding="8">
        <div class="text-center max-w-md">
          <ShieldAlert :size="48" class="text-red-400 mx-auto mb-4" />
          <h1 class="text-xl font-semibold text-zinc-100 mb-2">Access Denied</h1>
          <p class="text-zinc-400 mb-6">You need admin privileges to access this page.</p>
          <UButton color="primary" @click="$router.push('/leagues')">
            Go to Dashboard
          </UButton>
        </div>
      </Card>
    </div>

    <!-- Admin Panel -->
    <div v-else class="space-y-6">
      <!-- Page Header with Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-6">
        <PageHeader 
          title="Admin Panel"
          description="Manage match scores and league standings"
        />
        
        <div class="flex flex-wrap gap-2">
          <UButton 
            color="white" 
            icon="i-lucide-refresh-cw" 
            @click="refreshData"
            :loading="loadingMatches"
          >
            Refresh
          </UButton>
        </div>
      </div>

      <!-- First Row: Dropdowns and Progress Bar -->
      <div v-if="selectedLeague && leagueData" class="px-4 md:px-6">
        <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
          <!-- League Dropdown -->
          <div class="flex-shrink-0">
            <label class="block text-xs font-medium text-zinc-300 mb-1">League</label>
            <select
              v-model="selectedLeague"
              class="px-3 py-2 rounded-lg border border-edge bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option 
                v-for="league in sortedLeagues" 
                :key="league.key" 
                :value="league.key"
              >
                {{ league.name }}
              </option>
            </select>
          </div>
          
          <!-- Season Selector -->
          <div v-if="availableSeasons.length > 0" class="flex-shrink-0">
            <label class="block text-xs font-medium text-zinc-300 mb-1">Season</label>
            <select
              v-model="selectedSeason"
              class="px-3 py-2 rounded-lg border border-edge bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option 
                v-for="s in availableSeasons" 
                :key="s.season" 
                :value="s.season"
              >
                {{ s.season }} ({{ s.completedGames }}/{{ s.totalGames }})
              </option>
            </select>
          </div>

          <!-- Progress Bar Card (takes remaining space) -->
          <div class="flex-1 min-w-0 bg-surface rounded-lg border border-edge p-4">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-zinc-300">
                Season {{ selectedSeason || '' }} Progress
              </span>
              <span class="text-xs text-zinc-400">
                {{ matchesWithScores }}/{{ matches.length }} ({{ scoresPercentage }}%)
              </span>
            </div>
            <div class="relative w-full h-2 bg-edge rounded-full overflow-hidden">
              <div 
                class="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                :style="{ width: scoresPercentage + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Second Row: Stats Cards -->
      <div v-if="selectedLeague && leagueData" class="px-4 md:px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <!-- Played -->
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2.5 border border-green-500/30/50">
            <div class="text-center">
              <div class="text-sm font-bold text-green-400 mb-0.5">
                {{ matchesWithScores }}/{{ matches.length }}
                <span class="text-xs">({{ scoresPercentage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Played</div>
            </div>
          </div>

          <!-- Game Stats -->
          <div class="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg p-2.5 border border-blue-200/50">
            <div class="text-center">
              <div class="text-sm font-bold text-blue-400 mb-0.5">
                {{ matchesWithStats }}/{{ matches.length }}
                <span class="text-xs">({{ statsCoverage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Game Stats</div>
            </div>
          </div>

          <!-- Lineups -->
          <div class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-2.5 border border-teal-200/50">
            <div class="text-center">
              <div class="text-sm font-bold text-teal-600 mb-0.5">
                {{ matchesWithLineups }}/{{ matches.length }}
                <span class="text-xs">({{ lineupsCoverage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Lineups</div>
            </div>
          </div>

          <!-- Player Stats -->
          <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-2.5 border border-indigo-200/50">
            <div class="text-center">
              <div class="text-sm font-bold text-indigo-600 mb-0.5">
                {{ matchesWithPlayerStats }}/{{ matches.length }}
                <span class="text-xs">({{ playerStatsCoverage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Player Stats</div>
            </div>
          </div>

          <!-- Referees -->
          <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-2.5 border border-amber-200/50">
            <div class="text-center">
              <div class="text-sm font-bold text-amber-400 mb-0.5">
                {{ matchesWithReferees }}/{{ matches.length }}
                <span class="text-xs">({{ refereesCoverage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Referees</div>
            </div>
          </div>

          <!-- Odds -->
          <div class="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-lg p-2.5 border border-purple-200/50">
            <div class="text-center">
              <div class="text-sm font-bold text-purple-600 mb-0.5">
                {{ matchesWithOdds }}/{{ matches.length }}
                <span class="text-xs">({{ oddsCoverage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Odds</div>
            </div>
          </div>

          <!-- Formations -->
          <div class="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-2.5 border border-rose-200/50">
            <div class="text-center">
              <div class="text-sm font-bold text-rose-600 mb-0.5">
                {{ matchesWithFormations }}/{{ matches.length }}
                <span class="text-xs">({{ formationsCoverage }}%)</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Formations</div>
            </div>
          </div>

          <!-- Latest Round -->
          <div class="bg-gradient-to-br from-surface-light to-surface rounded-lg p-2.5 border border-edge/50">
            <div class="text-center">
              <div class="text-sm font-bold text-primary-400 mb-0.5">{{ currentRound }}</div>
              <div class="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Latest Round</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Match List -->
      <div class="px-4 md:px-6">
        <AdminMatchList
          :matches="matches"
          :league-key="selectedLeague"
          :loading="loadingMatches"
          @refresh="refreshData"
          @game-deleted="handleGameDeleted"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ShieldAlert } from 'lucide-vue-next'
import PageHeader from '~/components/ui/PageHeader.vue'
import Card from '~/components/ui/Card.vue'
import StatCard from '~/components/ui/StatCard.vue'
import FetchScheduledModal from '~/components/admin/FetchScheduledModal.vue'

definePageMeta({
  middleware: 'auth'
})

const toast = useToast()
const { user, isAdmin, logout } = useAuth()

// Redirect non-admin users
if (!isAdmin.value) {
  // Will show access denied message
}


// Data
const leagues = ref([])
const selectedLeague = ref('')
const leagueData = ref(null)
const matches = ref([])
const loadingMatches = ref(false)
const showFetchModal = ref(false)
const availableSeasons = ref([])
const selectedSeason = ref(null)

// Load leagues on mount
onMounted(async () => {
  await loadLeagues()
})

// Logout handler
const handleLogout = async () => {
  await logout()
  navigateTo('/login')
}

// Load leagues
const loadLeagues = async () => {
  try {
    const data = await $fetch('/api/leagues')
    leagues.value = data.leagues || []
    // Auto-select Premier League as first tab
    if (leagues.value.length > 0) {
      const premierLeague = leagues.value.find(l => l.key === 'premier_league')
      selectedLeague.value = premierLeague ? premierLeague.key : leagues.value[0].key
    }
  } catch (error) {
    console.error('Error loading leagues:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load leagues',
      color: 'red'
    })
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
watch(selectedLeague, async (newLeague, oldLeague) => {
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
    const seasonsData = await $fetch(`/api/seasons/${newLeague}`)
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
    console.error('Error loading seasons:', error)
    availableSeasons.value = []
    selectedSeason.value = null
    // Fallback to loading all matches
    await loadMatches(newLeague, null)
  }
})

// Load matches when season changes (only if not triggered by league change)
watch(selectedSeason, async (newSeason, oldSeason) => {
  // Only load if season changed but league didn't (manual season selection)
  if (newSeason !== oldSeason && selectedLeague.value) {
    await loadMatches(selectedLeague.value, newSeason)
  }
})

// Load matches function
const loadMatches = async (leagueKey, season) => {
  loadingMatches.value = true
  try {
    // Build URL with season filter
    let url = `/api/leagues/${leagueKey}?round=all&_t=${Date.now()}`
    if (season) {
      url += `&season=${season}`
    }
    
    const data = await $fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    leagueData.value = data
    matches.value = data.games || []
  } catch (error) {
    console.error('Error loading matches:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load matches',
      color: 'red'
    })
  } finally {
    loadingMatches.value = false
  }
}

// Refresh data
const refreshData = async () => {
  if (selectedLeague.value) {
    loadingMatches.value = true
    try {
      // Build URL with season filter
      let url = `/api/leagues/${selectedLeague.value}?round=all&t=${Date.now()}`
      if (selectedSeason.value) {
        url += `&season=${selectedSeason.value}`
      }
      
      const data = await $fetch(url)
      leagueData.value = data
      matches.value = data.games || []
      
      console.log('Refreshed data, sample match statuses:', 
        matches.value.slice(0, 3).map(m => ({
          id: m.id, 
          round: m.round,
          home: m.home_name,
          away: m.away_name,
          score: `${m.home_goals ?? '?'}-${m.away_goals ?? '?'}`,
          status: m.status
        }))
      )
      
      toast.add({
        title: 'Refreshed',
        description: 'Data refreshed successfully',
        color: 'green'
      })
    } catch (error) {
      console.error('Error refreshing:', error)
    } finally {
      loadingMatches.value = false
    }
  }
}

// Handle games saved from fetch modal
const handleGamesSaved = async () => {
  await refreshData()
}

// Handle game deletion
const handleGameDeleted = (gameId) => {
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
  
  const rounds = gamesWithScores.map(m => {
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
</script>
