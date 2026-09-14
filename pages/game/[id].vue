<template>
  <div class="min-h-screen bg-surface-base">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading game details..." />
    </div>

    <!-- Main Content -->
    <div v-else-if="data" class="max-w-[1400px] mx-auto p-2.5 sm:p-4">
      <!-- Back Button -->
      <button
        type="button"
        @click="goBack"
        aria-label="Back"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-light active:bg-surface-hover transition-colors mb-3 sm:mb-4 -ml-1"
      >
        <ChevronLeft :size="20" />
      </button>

      <!-- ── HERO: home stats rail · centered scorecard + court · away stats rail ── -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)_minmax(0,1fr)] gap-3 items-start">
        <Reveal :delay="0" class="min-w-0 space-y-3">
          <!-- Basketball has no scalar stat columns — they are NULL by design —
               so its rail derives team totals from the box score instead. -->
          <GameBasketballTeamRail
            v-if="showBballRails"
            side="home"
            :sport-stats="data.game.sport_stats"
            :team-name="data.game.home_name"
          />
          <GameTeamFormRail
            v-else-if="showFormRails"
            side="home"
            :data="preview?.home || null"
            :league="preview?.league || null"
            :league-key="data.game.league_key"
            :team-key="data.game.home_key"
          />
          <TeamStatsRail v-else side="home" :game="data.game" :sport="gameSport" />
          <TeamRatingsCard v-if="showRatings" side="home" :lineup="data.lineups.home" :league-key="data.game.league_key" />
        </Reveal>
        <Reveal :delay="40" class="min-w-0 space-y-3">
          <GameHeader :game="data.game" :sport="gameSport" />

          <GameQuarterFlow
            v-if="showQuarterFlow"
            :quarters="data.game.sport_stats.quarters"
            :home-name="data.game.home_name"
            :away-name="data.game.away_name"
          />

          <GameGameLeaders
            v-if="showBballRails"
            :sport-stats="data.game.sport_stats"
            :home-name="data.game.home_name"
            :away-name="data.game.away_name"
          />

          <!-- The court sits in the middle column, directly under the scorecard -->
          <section v-if="showPitch" class="panel overflow-hidden">
            <header class="panel-head">
              <span class="panel-title">Lineups</span>
              <span class="pill pill-blue">{{ data.game.home_formation || '—' }}</span>
              <span class="pill pill-dim ml-auto">{{ data.game.away_formation || '—' }}</span>
            </header>
            <div class="p-2.5 sm:p-4">
              <FormationPitch
                :home-lineup="data.lineups.home"
                :away-lineup="data.lineups.away"
                :home-name="data.game.home_name"
                :away-name="data.game.away_name"
                :home-formation="data.game.home_formation"
                :away-formation="data.game.away_formation"
              />
              <div v-if="homeBench.length || awayBench.length" class="bench mt-3">
                <div class="bench-side">
                  <span class="bench-label">Bench · {{ data.game.home_name }}</span>
                  <div class="bench-chips">
                    <span v-for="pl in homeBench" :key="pl.id || pl.player_name" class="bench-chip" :style="{ borderColor: `${VIZ_HOME}55` }">
                      <span class="bench-chip-num">{{ pl.jersey_number || '-' }}</span>{{ benchName(pl.player_name) }}
                    </span>
                  </div>
                </div>
                <div class="bench-side">
                  <span class="bench-label">Bench · {{ data.game.away_name }}</span>
                  <div class="bench-chips">
                    <span v-for="pl in awayBench" :key="pl.id || pl.player_name" class="bench-chip" :style="{ borderColor: `${VIZ_AWAY}55` }">
                      <span class="bench-chip-num">{{ pl.jersey_number || '-' }}</span>{{ benchName(pl.player_name) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
        <Reveal :delay="80" class="min-w-0 space-y-3">
          <GameBasketballTeamRail
            v-if="showBballRails"
            side="away"
            :sport-stats="data.game.sport_stats"
            :team-name="data.game.away_name"
          />
          <GameTeamFormRail
            v-else-if="showFormRails"
            side="away"
            :data="preview?.away || null"
            :league="preview?.league || null"
            :league-key="data.game.league_key"
            :team-key="data.game.away_key"
            mirror
          />
          <TeamStatsRail v-else side="away" :game="data.game" :sport="gameSport" mirror />
          <TeamRatingsCard v-if="showRatings" side="away" :lineup="data.lineups.away" :league-key="data.game.league_key" mirror />
        </Reveal>
      </div>

      <Reveal v-if="blindSpot" :delay="60">
        <TwinBlindSpotBanner :risk="blindSpot" class="mt-3" />
      </Reveal>

      <!-- ── TIMELINE: a horizontal minute axis, one compact band ──
           Deliberately NOT a vertical rail: a rail costs ~55px per event and
           leaves the middle of a 1400px page empty, which is what this page
           did before. The axis reads the match left to right in ~140px. -->
      <Reveal v-if="showTimeline" :delay="90">
        <section class="panel overflow-hidden mt-3">
          <header class="panel-head">
            <span class="panel-title">Timeline</span>
            <span class="pill pill-dim tabular-nums">{{ data.game.match_events.length }} events</span>
            <div class="ml-auto flex items-center gap-2">
              <span class="tl-key" :style="{ borderColor: `${VIZ_HOME}55`, color: VIZ_HOME }">
                <i :style="{ background: VIZ_HOME }" />{{ data.game.home_name }}
              </span>
              <span class="tl-key" :style="{ borderColor: `${VIZ_AWAY}55`, color: VIZ_AWAY }">
                <i :style="{ background: VIZ_AWAY }" />{{ data.game.away_name }}
              </span>
            </div>
          </header>
          <div class="px-3 pt-3 pb-2 sm:px-4">
            <MatchEvents
              :events="data.game.match_events"
              :home-name="data.game.home_name"
              :away-name="data.game.away_name"
              :home-lineup="data.lineups?.home || []"
              :away-lineup="data.lineups?.away || []"
            />
          </div>
        </section>
      </Reveal>

      <!-- ── POST-MORTEM: what we called, and whether our number was any good ──
           A completed football fixture has no tabs, so this sits inline. It
           renders nothing when there is no wager and no scored market. -->
      <Reveal v-if="showPostMortem" :delay="105">
        <div class="mt-3">
          <GamePostMortem :game-id="data.game.id" />
        </div>
      </Reveal>

      <!-- ── DETAIL: one panel, one minimal tab rail ──
           Everything below the fold lives behind a tab so the page is a
           screen of cards, not a 3,000px column. -->
      <Reveal v-if="tabs.length > 0" :delay="120">
        <section class="panel overflow-hidden mt-3">
          <header class="panel-head tabs-head">
            <GameTabs :tabs="tabs" v-model="activeTab" />
          </header>

          <div class="p-2.5 sm:p-4" @touchstart="onTouchStart" @touchend="onTouchEnd">
            <Transition name="tab" mode="out-in">
              <div :key="activeTab">
                <!-- Match / Game Stats (basketball) -->
                <div v-if="activeTab === 'stats'">
                  <MatchStatistics v-if="hasMatchStats" :game="data.game" :sport="gameSport" />
                  <div v-else class="text-center py-10 text-zinc-500 text-sm">
                    No {{ gameSport === 'basketball' ? 'game' : 'match' }} statistics available
                  </div>
                </div>

                <!-- Player ratings / box score -->
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
                  <div v-else class="text-center py-10 text-zinc-500 text-sm">
                    No {{ gameSport === 'basketball' ? 'player stats' : 'lineup information' }} available
                  </div>
                </div>

                <!-- Shot chart (completed basketball with located shots) -->
                <div v-else-if="activeTab === 'shots'">
                  <GameShotChart
                    v-if="shotData?.available"
                    :shots="shotData.shots"
                    :teams="shotData.teams"
                    :coord-system="shotData.coord_system"
                    :court="shotData.court"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                    :excludes="shotData.excludes"
                  />
                  <div v-else class="text-center py-10 text-zinc-500 text-sm">
                    {{ shotData?.reason || 'No shot locations available' }}
                  </div>
                </div>

                <!-- Market board (scheduled football) — the price, our number,
                     and whether the gap is one we have evidence for. The raw
                     alt-line ladder sits underneath it, unchanged. -->
                <div v-else-if="activeTab === 'market'">
                  <GameMarketBoard :game-id="data.game.id" />
                  <details class="ladder-details">
                    <summary class="ladder-summary">Full alt-line ladder</summary>
                    <OddsLadder :odds-raw="data.game.odds_raw" />
                  </details>
                </div>

                <!-- Analysis -->
                <div v-else-if="activeTab === 'analysis'">
                  <GameAnalysis
                    :game="data.game"
                    :sport="gameSport"
                    :analysis="analysisData"
                    :analysis-loading="analysisLoading"
                    :prediction="data.prediction"
                    :show-odds="gameSport !== 'football'"
                  />
                </div>

                <!-- Prediction -->
                <div v-else-if="activeTab === 'prediction'">
                  <GamePrediction
                    :game="data.game"
                    :prediction="data.prediction"
                    :sport="gameSport"
                    :analysis="analysisData"
                  />
                </div>

                <!-- Fantasy -->
                <div v-else-if="activeTab === 'fantasy'">
                  <FantasyProjections
                    :game-id="data.game.id"
                    :home-name="data.game.home_name"
                    :away-name="data.game.away_name"
                  />
                </div>

                <!-- Props (admin only) -->
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
        </section>
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
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Reveal from '~/components/ui/Reveal.vue'
import GameHeader from '~/components/game/GameHeader.vue'
import TeamStatsRail from '~/components/game/TeamStatsRail.vue'
import TeamRatingsCard from '~/components/game/TeamRatingsCard.vue'
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
import GameBasketballTeamRail from '~/components/game/BasketballTeamRail.vue'
import GameQuarterFlow from '~/components/game/QuarterFlow.vue'
import GameShotChart from '~/components/game/ShotChart.vue'
import GameGameLeaders from '~/components/game/GameLeaders.vue'
import GameMarketBoard from '~/components/game/MarketBoard.vue'
import GamePostMortem from '~/components/game/PostMortem.vue'
import GameTeamFormRail from '~/components/game/TeamFormRail.vue'

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

// Fetch game data (bundled — game + lineups, plus h2h + fantasy when the
// fixture is still scheduled).
//
// `useSwr`, not `useAsyncData`: the app is SPA-only (`ssr: false`), so
// useAsyncData's hydration path costs without paying, and useSwr is the
// documented fetcher for new code. Its key is a computed, so routing straight
// from one game to another refetches instead of showing the previous match.
const swrKey = computed(() => `game:${gameId.value}`)
const { data, pending: loading, error } = useSwr(
  swrKey,
  () => api.fetchGameDetail(Number(gameId.value)),
  { memoryTtl: 5 * 60_000 },
)

// Sport detection — sportOf() knows every basketball league_key, not just
// nba/euroleague, so ACB/BCL/EuroCup/GBL games are no longer read as football.
const gameSport = computed(() =>
  data.value?.game ? sportOf(data.value.game) : 'football')

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
    activeTab.value = gameSport.value === 'football' ? 'players' : 'stats'
  } else {
    // Football's scheduled page leads with the full Market ladder.
    activeTab.value = gameSport.value === 'football' ? 'market' : 'analysis'
  }
}, { immediate: true })


// Tab order — also the swipe order. Counts ride along as badges so the rail
// says how much is behind each tab before it is opened.
// The pitch lives above the tabs, the match stats live in the side rails, and
// the player ratings live in per-team cards under the rails — so a completed
// football game has no tabs at all; only basketball keeps tabbed panels.
const tabs = computed(() => {
  if (isCompleted.value) {
    if (gameSport.value === 'football') {
      return []
    }
    const bt = [
      { key: 'stats', label: 'Game Stats', badge: null },
      { key: 'players', label: 'Player Stats', badge: null },
    ]
    // Only EuroLeague 2025-2026 is backfilled, so most fixtures have no shot
    // rows at all — the tab appears when there is something behind it rather
    // than opening onto an empty court.
    if (hasShots.value) {
      bt.push({ key: 'shots', label: 'Shot Chart', badge: shotData.value?.shots?.length ?? null })
    }
    return bt
  }
  if (gameSport.value === 'football') return [
    { key: 'market', label: 'Market', badge: null },
    { key: 'analysis', label: 'Analysis', badge: null },
    { key: 'prediction', label: 'Prediction', badge: null },
  ]
  const t = [
    { key: 'analysis', label: 'Analysis', badge: null },
    { key: 'prediction', label: 'Prediction', badge: null },
  ]
  if (hasFantasy.value) t.push({ key: 'fantasy', label: 'Fantasy', badge: null })
  if (isAdmin.value) t.push({ key: 'props', label: 'Props', badge: null })
  return t
})

// The pitch (formation diagram + bench) renders under the scorecard for a
// completed football game that holds a lineup.
const showPitch = computed(() => {
  return isCompleted.value && gameSport.value === 'football' && hasLineups.value
})

// Per-team ratings cards render under each stat rail when a lineup exists.
const showRatings = computed(() => {
  return isCompleted.value && gameSport.value === 'football' && hasLineups.value
})

/**
 * Basketball side rails.
 *
 * `TeamStatsRail` reads `home_shots` / `home_corners` / `home_possession_pct`,
 * which the sport split NULLed for every basketball fixture — so it rendered
 * "No stats recorded" on both sides and wasted ~50% of the page width. The
 * basketball rail derives its totals from the box score instead, which is where
 * basketball team stats actually live.
 */
const showBballRails = computed(() =>
  isCompleted.value && gameSport.value === 'basketball' && hasBballPlayers.value
)

/** `sport_stats.quarters` is present on ~8% of completed basketball fixtures. */
const showQuarterFlow = computed(() => {
  const q = data.value?.game?.sport_stats?.quarters
  return !!(isCompleted.value
    && gameSport.value === 'basketball'
    && Array.isArray(q?.home) && q.home.length > 0)
})

// The timeline is its own always-visible band above the tabs — it is the one
// thing you want without a click, and it now costs ~140px to show.
const showTimeline = computed(() => {
  const g = data.value?.game
  return !!(isCompleted.value
    && gameSport.value === 'football'
    && Array.isArray(g?.match_events)
    && g.match_events.length > 0)
})

/**
 * Pre-match side rails.
 *
 * `TeamStatsRail` reads the scalar match-stat columns, all of which are NULL
 * before kick-off, so a scheduled fixture rendered "No stats recorded" on both
 * flanks — the same structural defect the basketball rails had. Form and twin
 * ratings are what the fixture actually carries beforehand.
 *
 * Both sports, because both were empty: 1,200 scheduled NBA fixtures carry the
 * same blank rail. `twin_team` holds football only, so a basketball rail shows
 * form alone and the ratings block renders nothing — which is the component's
 * existing behaviour for any club the twin has not fitted.
 */
const showFormRails = computed(() => !isCompleted.value)

const preview = ref(null)
watch(() => [data.value?.game?.id, showFormRails.value], async ([id, show]) => {
  if (!id || !show) { preview.value = null; return }
  preview.value = await $fetch(`/api/game/${id}/preview`).catch(() => null)
}, { immediate: true })

/**
 * The post-mortem renders for a completed football fixture. The component
 * itself decides whether there is anything to say — a fixture with no wager
 * and no model rows in the spine renders nothing rather than three empty
 * states.
 */
const showPostMortem = computed(() =>
  isCompleted.value && gameSport.value === 'football')

// Badge for the ratings tab: only players who actually carry a rating.
const ratedPlayerCount = computed(() => {
  const ls = data.value?.lineups
  if (!ls) return 0
  return [...(ls.home || []), ...(ls.away || [])].filter((pl) => pl?.rating != null).length
})
// A tab can disappear (no lineups, fantasy resolves to none). Falling back to
// the first tab keeps the body from rendering nothing with the rail showing
// no active pill.
watch(tabs, (list) => {
  if (list.length && !list.some((t) => t.key === activeTab.value)) {
    activeTab.value = list[0].key
  }
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

// Bench strip under the pitch — the same non-starters PlayerStatsSection
// lists further down, shown compactly here so the Lineups panel isn't just
// the pitch diagram floating above empty space next to a taller Match Stats panel.
function isLineupStarter(p: Record<string, any>): boolean {
  if (typeof p.is_starting_xi === 'boolean') return p.is_starting_xi
  if (p.starter === 1 || p.starter === true) return true
  return false
}
function benchName(name: string): string {
  if (!name) return ''
  const last = name.split(' ').pop() || name
  return last.length > 14 ? last.slice(0, 14) + '…' : last
}
const homeBench = computed(() => (data.value?.lineups?.home || []).filter(p => !isLineupStarter(p)))
const awayBench = computed(() => (data.value?.lineups?.away || []).filter(p => !isLineupStarter(p)))

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
/**
 * Shot locations, fetched on demand rather than with the fixture.
 *
 * A EuroLeague game carries ~160 located field goals and the endpoint returns
 * one object per shot, so bundling this into the page payload would grow every
 * fixture request — including the football ones, which can never have shots —
 * to pay for a tab most visitors never open. It is therefore requested once,
 * the first time the fixture is known to be a completed basketball game, and
 * cached in the ref afterwards.
 */
const shotData = ref<Record<string, any> | null>(null)
const shotsLoading = ref(false)
const hasShots = computed(() => (shotData.value?.shots?.length ?? 0) > 0)

async function loadShots() {
  const g = data.value?.game
  if (!g || shotData.value || shotsLoading.value) return
  if (!isCompleted.value || gameSport.value !== 'basketball') return
  shotsLoading.value = true
  try {
    shotData.value = await $fetch(`/api/game/${g.id}/shots`)
  } catch (e) {
    console.warn('Shot chart fetch failed:', e)
    // Leave `shotData` null: the tab simply does not appear, which is the same
    // outcome as a fixture with no shots and needs no separate error state.
  } finally {
    shotsLoading.value = false
  }
}

watch(() => data.value?.game, (game) => {
  if (game) loadShots()
}, { immediate: true })

// Unified per-fixture analysis record (`/api/game/[id]/analysis`, unified-
// analysis-layer Track C) — h2h, predicted score and pace/trend for the
// Analysis tab. Lazy-loaded the first time either tab that needs it opens,
// then cached per game id (switching Analysis <-> Prediction doesn't refetch).
const analysisData = ref<Record<string, any> | null>(null)
const analysisLoading = ref(false)
let analysisLoadedForGameId: number | null = null

async function loadAnalysis() {
  const g = data.value?.game
  if (!g) return
  if (analysisLoadedForGameId === g.id) return
  analysisLoading.value = true
  try {
    analysisData.value = await $fetch(`/api/game/${g.id}/analysis`)
    analysisLoadedForGameId = g.id
  } catch (e) {
    console.warn('Analysis fetch failed:', e)
    analysisData.value = null
  } finally {
    analysisLoading.value = false
  }
}

watch(() => [data.value?.game?.id, activeTab.value], ([, tab]) => {
  if (tab === 'analysis' || tab === 'prediction') loadAnalysis()
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
/* The raw ladder is reference material now that the board is the lead — it
   opens on demand rather than being the first thing on the page. */
.ladder-details { margin-top: 1rem; }
.ladder-summary {
  cursor: pointer;
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: var(--r-sm);
  border: 1px solid var(--edge);
  background: var(--neutral-tint);
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--ink-mute);
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}
.ladder-summary::-webkit-details-marker { display: none; }
.ladder-summary::before { content: '+'; font-weight: 700; opacity: 0.7; }
.ladder-details[open] .ladder-summary::before { content: '−'; }
.ladder-summary:hover { color: var(--ink); border-color: var(--brand-blue-edge); }
.ladder-details[open] .ladder-summary { margin-bottom: 0.75rem; }

/* Timeline colour key — lives in the panel head so the plot itself does not
   spend a whole row on a legend. */
.tl-key {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
}
.tl-key i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

/* The tab rail sits inside a panel head, which is baseline-aligned for text.
   A control needs centring and a little less vertical padding. */
.tabs-head {
  align-items: center;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  gap: 0.75rem;
}

.bench {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.bench-side {
  min-width: 0;
}
.bench-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(113, 113, 122);
  margin-bottom: 0.4rem;
}
.bench-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.bench-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem 0.2rem 0.3rem;
  border-radius: 999px;
  border: 1px solid;
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.65rem;
  font-weight: 600;
  color: rgb(212, 212, 216);
  white-space: nowrap;
}
.bench-chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.55rem;
  font-variant-numeric: tabular-nums;
  color: rgb(161, 161, 170);
}

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
