<template>
  <div class="min-h-screen bg-surface-base">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading game details..." />
    </div>

    <!-- Main Content -->
    <div v-else-if="data" class="max-w-7xl mx-auto p-3 sm:p-6">
      <!-- Back Button -->
      <NuxtLink to="/" class="inline-flex items-center gap-1.5 sm:gap-2 text-zinc-400 hover:text-zinc-200 mb-4 sm:mb-6 transition-colors">
        <ChevronLeft :size="18" />
        <span class="text-sm font-medium">Back to Dashboard</span>
      </NuxtLink>

      <!-- Game Header -->
      <GameHeader 
        :game="data.game"
        :sport="gameSport"
      />

      <!-- Main Grid -->
      <div class="mt-6">
        <!-- Tabbed Content -->
        <div class="space-y-6">
          <!-- Tab Navigation -->
          <div class="game-tabs-card rounded-lg overflow-hidden">
            <div class="flex border-b border-edge/50">
              <!-- ===== COMPLETED GAME TABS ===== -->
              <template v-if="isCompleted">
                <button
                  v-if="gameSport === 'football'"
                  @click="activeTab = 'timeline'"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                  :class="activeTab === 'timeline' 
                    ? 'text-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'"
                >
                  Timeline
                  <div 
                    v-if="activeTab === 'timeline'"
                    class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
                  ></div>
                </button>
                <button
                  @click="activeTab = 'stats'"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                  :class="activeTab === 'stats' 
                    ? 'text-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'"
                >
                  {{ gameSport === 'basketball' ? 'Game Stats' : 'Match Stats' }}
                  <div 
                    v-if="activeTab === 'stats'"
                    class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
                  ></div>
                </button>
                <button
                  @click="activeTab = 'players'"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                  :class="activeTab === 'players' 
                    ? 'text-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'"
                >
                  Player Stats
                  <div 
                    v-if="activeTab === 'players'"
                    class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
                  ></div>
                </button>
              </template>

              <!-- ===== SCHEDULED GAME TABS ===== -->
              <template v-else>
                <button
                  @click="activeTab = 'analysis'"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                  :class="activeTab === 'analysis' 
                    ? 'text-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'"
                >
                  Analysis
                  <div 
                    v-if="activeTab === 'analysis'"
                    class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
                  ></div>
                </button>
                <button
                  @click="activeTab = 'prediction'"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                  :class="activeTab === 'prediction' 
                    ? 'text-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'"
                >
                  Prediction
                  <div 
                    v-if="activeTab === 'prediction'"
                    class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
                  ></div>
                </button>
                <button
                  v-if="hasFantasy"
                  @click="activeTab = 'fantasy'"
                  class="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative"
                  :class="activeTab === 'fantasy' 
                    ? 'text-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-300'"
                >
                  Fantasy
                  <div 
                    v-if="activeTab === 'fantasy'"
                    class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
                  ></div>
                </button>
              </template>
            </div>

            <!-- Tab Content (swipeable) -->
            <div 
              class="p-3 sm:p-6"
              @touchstart="onTouchStart"
              @touchend="onTouchEnd"
            >
              <!-- ===== COMPLETED GAME CONTENT ===== -->
              <template v-if="isCompleted">
                <!-- Timeline Tab (football only) -->
                <div v-if="gameSport === 'football'" v-show="activeTab === 'timeline'">
                  <MatchEvents 
                    v-if="data.game.match_events && data.game.match_events.length > 0"
                    :events="data.game.match_events"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                    :home-lineup="data.lineups?.home || []"
                    :away-lineup="data.lineups?.away || []"
                  />
                  <div v-else class="text-center py-12 text-zinc-400">
                    No match events available
                  </div>
                </div>

                <!-- Match Stats Tab -->
                <div v-show="activeTab === 'stats'">
                  <MatchStatistics 
                    v-if="hasMatchStats"
                    :game="data.game"
                    :sport="gameSport"
                  />
                  <div v-else class="text-center py-12 text-zinc-500">
                    No {{ gameSport === 'basketball' ? 'game' : 'match' }} statistics available
                  </div>
                </div>

                <!-- Lineups & Stats Tab -->
                <div v-show="activeTab === 'players'">
                  <BasketballPlayerStats
                    v-if="gameSport === 'basketball' && hasBballPlayers"
                    :sport-stats="data.game.sport_stats"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                    :league-key="data.game.league_key"
                  />
                  <PlayerStatsSection 
                    v-else-if="hasLineups"
                    :home-lineup="data.lineups.home"
                    :away-lineup="data.lineups.away"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                  />
                  <div v-else class="text-center py-12 text-zinc-500">
                    No {{ gameSport === 'basketball' ? 'player stats' : 'lineup information' }} available
                  </div>
                </div>
              </template>

              <!-- ===== SCHEDULED GAME CONTENT ===== -->
              <template v-else>
                <!-- Analysis Tab -->
                <div v-show="activeTab === 'analysis'">
                  <GameAnalysis
                    :game="data.game"
                    :sport="gameSport"
                    :h2h="h2hData"
                    :h2h-loading="h2hLoading"
                    :prediction="data.prediction"
                  />
                </div>

                <!-- Prediction Tab -->
                <div v-show="activeTab === 'prediction'">
                  <GamePrediction
                    :game="data.game"
                    :prediction="data.prediction"
                    :sport="gameSport"
                  />
                </div>

                <!-- Fantasy Tab -->
                <div v-if="hasFantasy" v-show="activeTab === 'fantasy'">
                  <FantasyProjections
                    :game-id="data.game.id"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <p class="text-lg text-zinc-400">Failed to load game details</p>
        <NuxtLink to="/leagues" class="text-zinc-400 hover:text-zinc-200 mt-4 inline-block">
          Return to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import GameHeader from '~/components/game/GameHeader.vue'
import MatchStatistics from '~/components/game/MatchStatistics.vue'
import MatchEvents from '~/components/game/MatchEvents.vue'
import LineupsSection from '~/components/game/LineupsSection.vue'
import PlayerStatsSection from '~/components/game/PlayerStatsSection.vue'
import BasketballPlayerStats from '~/components/game/BasketballPlayerStats.vue'
import GameAnalysis from '~/components/game/GameAnalysis.vue'
import GamePrediction from '~/components/game/GamePrediction.vue'
import FantasyProjections from '~/components/game/FantasyProjections.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const api = useApi()
const gameId = computed(() => route.params.id)

// Fetch game data
const { data, pending: loading, error } = await useAsyncData(`game-${gameId.value}`, () => api.fetchGame(Number(gameId.value)))

// Sport detection
const gameSport = computed(() => data.value?.game?.sport || 'football')

// Is the game completed?
const isCompleted = computed(() => data.value?.game?.status === 'completed')

// Active tab state — depends on game status
const activeTab = ref('stats')

// Set the correct default tab based on game status
watch(() => data.value?.game?.status, (status) => {
  if (status === 'completed') {
    activeTab.value = 'stats'
  } else {
    activeTab.value = 'analysis'
  }
}, { immediate: true })

// Tab order for swipe navigation
const tabOrder = computed(() => {
  if (isCompleted.value) {
    if (gameSport.value === 'football') return ['timeline', 'stats', 'players']
    return ['stats', 'players']
  }
  const tabs = ['analysis', 'prediction']
  if (hasFantasy.value) tabs.push('fantasy')
  return tabs
})

// Swipe gesture handling
let touchStartX = 0
let touchStartY = 0

function onTouchStart(e) {
  touchStartX = e.changedTouches[0].clientX
  touchStartY = e.changedTouches[0].clientY
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
  
  const tabs = tabOrder.value
  const idx = tabs.indexOf(activeTab.value)
  if (dx < 0 && idx < tabs.length - 1) {
    activeTab.value = tabs[idx + 1]
  } else if (dx > 0 && idx > 0) {
    activeTab.value = tabs[idx - 1]
  }
}

// Computed properties
const hasMatchStats = computed(() => {
  if (!data.value?.game) return false
  const g = data.value.game
  if (gameSport.value === 'basketball') {
    return !!g.sport_stats?.home
  }
  return g.home_shots !== null || g.home_possession !== null || g.home_corners !== null
})

const hasLineups = computed(() => {
  return data.value?.lineups?.home?.length > 0 || data.value?.lineups?.away?.length > 0
})

const hasBballPlayers = computed(() => {
  const ss = data.value?.game?.sport_stats
  return ss?.home?.players?.length > 0 || ss?.away?.players?.length > 0
})

const hasOdds = computed(() => {
  if (!data.value?.game) return false
  const g = data.value.game
  return g.odds_home !== null || g.odds_draw !== null || g.odds_away !== null
})

// Fantasy projections check — only for scheduled basketball games
const hasFantasy = ref(false)

async function checkFantasy() {
  if (!data.value?.game || isCompleted.value) return
  const sport = gameSport.value
  if (sport !== 'basketball') return
  try {
    const projections = await api.fetchFantasyProjections(data.value.game.id)
    hasFantasy.value = projections.length > 0
  } catch {
    hasFantasy.value = false
  }
}

watch(() => data.value?.game, (game) => {
  if (game && game.status !== 'completed') checkFantasy()
}, { immediate: true })

// ─── H2H data (for scheduled games) ────────────────────────
const h2hData = ref(null)
const h2hLoading = ref(false)

async function loadH2H() {
  if (!data.value?.game || isCompleted.value) return
  const g = data.value.game
  h2hLoading.value = true
  try {
    const res = await api.fetchH2H(g.home_name, g.away_name, 10)
    h2hData.value = res
  } catch (e) {
    console.warn('H2H fetch failed:', e)
  } finally {
    h2hLoading.value = false
  }
}

// Auto-load H2H for scheduled games
watch(() => data.value?.game, (game) => {
  if (game && game.status !== 'completed') {
    loadH2H()
  }
}, { immediate: true })

// SEO
useHead({
  title: computed(() => {
    if (data.value?.game) {
      return `${data.value.game.home_name} vs ${data.value.game.away_name} - Game Details`
    }
    return 'Game Details'
  })
})
</script>

<style scoped>
.game-tabs-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.tab-indicator {
  background: linear-gradient(90deg, #f82828, #0848a8);
  opacity: 0.5;
}
</style>
