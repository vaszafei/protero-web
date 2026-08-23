<template>
  <div class="min-h-screen bg-surface-base">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading game details..." />
    </div>

    <!-- Main Content -->
    <div v-else-if="data" class="max-w-[1200px] mx-auto p-2.5 sm:p-4">
      <!-- Back Button -->
      <button
        type="button"
        @click="goBack"
        aria-label="Back"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-light active:bg-surface-hover transition-colors mb-3 sm:mb-4 -ml-1"
      >
        <ChevronLeft :size="20" />
      </button>

      <!-- Game Header row: score card (left, narrow) + match stat tiles -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_1fr] gap-3 items-stretch">
        <Reveal :delay="0">
          <GameHeader :game="data.game" :sport="gameSport" class="h-full" />
        </Reveal>
        <Reveal v-if="showHeaderStats" :delay="40" class="min-w-0">
          <GameHeaderStats :game="data.game" :sport="gameSport" />
        </Reveal>
      </div>

      <Reveal :delay="60">
        <TwinBlindSpotBanner v-if="blindSpot" :risk="blindSpot" class="mt-3" />
      </Reveal>

      <!-- ── COMPLETED FOOTBALL: dashboard-style cards, multi-column (no tabs) ── -->
      <div v-if="isCompleted && gameSport === 'football'" class="mt-4 sm:mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <!-- Timeline — full width, horizontal -->
        <Reveal :delay="120" class="md:col-span-2">
          <section class="rounded-lg border border-edge bg-surface overflow-hidden">
            <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
              <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Timeline</h2>
              <span class="text-[10px] text-zinc-600 tabular-nums">{{ data.game.match_events?.length || 0 }} events</span>
            </header>
            <div class="p-3 sm:p-4">
              <MatchEvents
                v-if="data.game.match_events && data.game.match_events.length > 0"
                :events="data.game.match_events"
                :home-name="data.game.home_name"
                :away-name="data.game.away_name"
                :home-lineup="data.lineups?.home || []"
                :away-lineup="data.lineups?.away || []"
              />
              <div v-else class="text-center py-6 text-zinc-500 text-sm">No match events available</div>
            </div>
          </section>
        </Reveal>

        <!-- Lineups — horizontal pitch -->
        <Reveal :delay="160">
          <section class="rounded-lg border border-edge bg-surface overflow-hidden">
            <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
              <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Lineups</h2>
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300">
                {{ data.game.home_formation || '—' }} · {{ data.game.away_formation || '—' }}
              </span>
            </header>
            <div class="p-3 sm:p-4">
              <FormationPitch
                v-if="hasLineups"
                :home-lineup="data.lineups.home"
                :away-lineup="data.lineups.away"
                :home-name="data.game.home_name"
                :away-name="data.game.away_name"
                :home-formation="data.game.home_formation"
                :away-formation="data.game.away_formation"
              />
              <div v-else class="text-center py-6 text-zinc-500 text-sm">No lineup information available</div>
            </div>
          </section>
        </Reveal>

        <!-- Match Stats -->
        <Reveal :delay="200">
          <section class="rounded-lg border border-edge bg-surface overflow-hidden">
            <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
              <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Match Stats</h2>
            </header>
            <div class="p-3 sm:p-4">
              <MatchStatistics v-if="hasMatchStats" :game="data.game" :sport="gameSport" />
              <div v-else class="text-center py-6 text-zinc-500 text-sm">No match statistics available</div>
            </div>
          </section>
        </Reveal>

        <!-- Player Ratings — full width -->
        <Reveal :delay="240" class="md:col-span-2">
          <section class="rounded-lg border border-edge bg-surface overflow-hidden">
            <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
              <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Player Ratings</h2>
            </header>
            <div class="p-3 sm:p-4">
              <PlayerStatsSection
                v-if="hasLineups"
                :home-lineup="data.lineups.home"
                :away-lineup="data.lineups.away"
                :home-name="data.game.home_name"
                :away-name="data.game.away_name"
                :league-key="data.game.league_key"
              />
              <div v-else class="text-center py-6 text-zinc-500 text-sm">No lineup information available</div>
            </div>
          </section>
        </Reveal>
      </div>

      <!-- Main panel (scheduled + basketball) -->
      <Reveal v-else :delay="120">
        <div class="mt-4 sm:mt-6 panel overflow-hidden">
          <!-- Tab rail with gliding indicator -->
          <GameTabs :tabs="tabs" v-model="activeTab" />

          <!-- Tab body (swipeable) -->
          <div class="p-2.5 sm:p-6" @touchstart="onTouchStart" @touchend="onTouchEnd">
            <Transition name="tab" mode="out-in">
              <div :key="activeTab">
                <!-- ── COMPLETED ─────────────────────────────────── -->
                <!-- Timeline Tab (football only) -->
                <div v-if="activeTab === 'timeline'">
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
                <div v-else-if="activeTab === 'stats'">
                  <MatchStatistics 
                    v-if="hasMatchStats"
                    :game="data.game"
                    :sport="gameSport"
                  />
                  <div v-else class="text-center py-12 text-zinc-500">
                    No {{ gameSport === 'basketball' ? 'game' : 'match' }} statistics available
                  </div>
                </div>

                <!-- Players / Ratings Tab -->
                <div v-else-if="activeTab === 'players'">
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
                    :league-key="data.game.league_key"
                  />
                  <div v-else class="text-center py-12 text-zinc-500">
                    No {{ gameSport === 'basketball' ? 'player stats' : 'lineup information' }} available
                  </div>
                </div>

                <!-- ── SCHEDULED ─────────────────────────────────── -->
                <!-- Market Tab (football only — full alt-line ladder) -->
                <div v-else-if="activeTab === 'market'">
                  <OddsLadder :odds-raw="data.game.odds_raw" />
                </div>

                <!-- Analysis Tab -->
                <div v-else-if="activeTab === 'analysis'">
                  <GameAnalysis
                    :game="data.game"
                    :sport="gameSport"
                    :h2h="h2hData"
                    :h2h-loading="h2hLoading"
                    :prediction="data.prediction"
                    :show-odds="gameSport !== 'football'"
                  />
                </div>

                <!-- Prediction Tab -->
                <div v-else-if="activeTab === 'prediction'">
                  <GamePrediction
                    :game="data.game"
                    :prediction="data.prediction"
                    :sport="gameSport"
                  />
                </div>

                <!-- Fantasy Tab -->
                <div v-else-if="activeTab === 'fantasy'">
                  <FantasyProjections
                    :game-id="data.game.id"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                  />
                </div>

                <!-- Props Tab (admin only) -->
                <div v-else-if="activeTab === 'props'">
                  <PlayerPropsUpload
                    :game-id="data.game.id"
                    :league-key="data.game.league_key"
                    :home-team="data.game.home_name"
                    :away-team="data.game.away_name"
                    :game-date="data.game.date"
                  />
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Reveal>
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

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Reveal from '~/components/ui/Reveal.vue'
import GameHeader from '~/components/game/GameHeader.vue'
import GameHeaderStats from '~/components/game/GameHeaderStats.vue'
import GameTabs from '~/components/game/GameTabs.vue'
import MatchStatistics from '~/components/game/MatchStatistics.vue'
import MatchEvents from '~/components/game/MatchEvents.vue'
import PlayerStatsSection from '~/components/game/PlayerStatsSection.vue'
import BasketballPlayerStats from '~/components/game/BasketballPlayerStats.vue'
import GameAnalysis from '~/components/game/GameAnalysis.vue'
import GamePrediction from '~/components/game/GamePrediction.vue'
import OddsLadder from '~/components/game/OddsLadder.vue'
import FormationPitch from '~/components/game/FormationPitch.vue'
import FantasyProjections from '~/components/game/FantasyProjections.vue'
import PlayerPropsUpload from '~/components/PlayerPropsUpload.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const { isAdmin } = useAuth()
const gameId = computed(() => route.params.id)

// Back button: prefer browser history when present, fallback to dashboard
function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

// Fetch game data (bundled — game + lineups + h2h + fantasy in parallel).
// 5-minute SWR cache via useAsyncData key.
const { data, pending: loading, error } = await useAsyncData(
  `game:${gameId.value}`,
  () => api.fetchGameDetail(Number(gameId.value)),
  { server: false }
)

// Sport detection — sportOf() knows every basketball league_key, not just
// nba/euroleague, so ACB/BCL/EuroCup/GBL games are no longer read as football.
const gameSport = computed(() =>
  data.value?.game ? sportOf(data.value.game) : 'football')

// Extra stat tiles beside the header — only completed football carries the
// per-side match metrics these tiles show.
const showHeaderStats = computed(() => {
  if (gameSport.value !== 'football') return false
  const g = data.value?.game
  if (!g) return false
  return [
    g.home_possession, g.away_possession,
    g.home_xg, g.away_xg,
    g.home_shots, g.away_shots,
    g.home_corners, g.away_corners,
  ].some((v) => v != null)
})

// Twin blind-spot context: does either club lack history in this division?
// `twin_fixture_risk` only returns fixtures that carry the risk, so a miss is
// the common case and simply renders nothing.
const twins = useTwins()
const blindSpot = ref(null)
watch(() => data.value?.game?.id, async (id) => {
  if (!id) { blindSpot.value = null; return }
  const m = await twins.fetchFixtureRiskFor([Number(id)]).catch(() => new Map())
  blindSpot.value = m.get(Number(id)) || null
}, { immediate: true })

// Is the game completed?
const isCompleted = computed(() => data.value?.game?.status === 'completed')

// Active tab state — depends on game status
const activeTab = ref('stats')

// Set the correct default tab based on game status
watch(() => data.value?.game?.status, (status) => {
  if (status === 'completed') {
    activeTab.value = 'stats'
  } else {
    // Football's scheduled page leads with the full Market ladder.
    activeTab.value = gameSport.value === 'football' ? 'market' : 'analysis'
  }
}, { immediate: true })

// Tab order for swipe navigation
const tabs = computed(() => {
  if (isCompleted.value) {
    if (gameSport.value === 'football') return [
      { key: 'timeline', label: 'Timeline' },
      { key: 'stats', label: 'Match Stats' },
      { key: 'players', label: 'Player Ratings' },
    ]
    return [
      { key: 'stats', label: 'Game Stats' },
      { key: 'players', label: 'Player Stats' },
    ]
  }
  if (gameSport.value === 'football') return [
    { key: 'market', label: 'Market' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'prediction', label: 'Prediction' },
  ]
  const t = [
    { key: 'analysis', label: 'Analysis' },
    { key: 'prediction', label: 'Prediction' },
  ]
  if (hasFantasy.value) t.push({ key: 'fantasy', label: 'Fantasy' })
  if (isAdmin.value) t.push({ key: 'props', label: 'Props' })
  return t
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
  
  const keys = tabs.value.map(t => t.key)
  const idx = keys.indexOf(activeTab.value)
  if (dx < 0 && idx < keys.length - 1) {
    activeTab.value = keys[idx + 1]
  } else if (dx > 0 && idx > 0) {
    activeTab.value = keys[idx - 1]
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

// Fantasy projections check — only for scheduled basketball games
const hasFantasy = ref(false)

async function checkFantasy() {
  if (!data.value?.game || isCompleted.value) return
  const sport = gameSport.value
  if (sport !== 'basketball') return
  // Use bundled fantasy data when available (saves a round trip)
  const bundled = (data.value as Record<string, any>)?.fantasy
  if (Array.isArray(bundled)) {
    hasFantasy.value = bundled.length > 0
    return
  }
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
  // Use bundled h2h when available
  const bundled = (data.value as Record<string, any>)?.h2h
  if (bundled && (bundled.matches?.length || bundled.summary)) {
    h2hData.value = bundled
    return
  }
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
.tab-enter-active,
.tab-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.tab-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.tab-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .tab-enter-active,
  .tab-leave-active {
    transition: none;
  }
  .tab-enter-from,
  .tab-leave-to {
    transform: none;
  }
}
</style>
