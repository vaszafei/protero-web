<template>
  <div class="bg-surface-base" :class="isCompleted ? 'h-full' : 'min-h-screen'">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading game details..." />
    </div>

    <!-- Main Content -->
    <!-- Desktop operator page: sized to read without scrolling at 1920×1080.
         Wide container, back control inside the scorecard strip, one-line
         division notice, and tab panes laid out in columns. -->
    <div v-else-if="data" class="max-w-[1680px] mx-auto px-4 pt-3 pb-4" :class="isCompleted ? 'h-full flex flex-col min-h-0' : ''">

      <!-- ── HERO: home stats rail · centered scorecard + court · away stats rail ── -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)_minmax(0,1fr)] gap-3" :class="heroClass">
        <Reveal :delay="0" class="min-w-0 space-y-3" :class="isCompleted ? 'flex flex-col min-h-0 !space-y-0 gap-3' : ''">
          <!-- Basketball has no scalar stat columns — they are NULL by design —
               so its rail derives team totals from the box score instead. -->
          <GameBasketballTeamRail
            v-if="showBballRails"
            side="home"
            :sport-stats="data.game.sport_stats"
            :team-name="data.game.home_name"
            :league-key="data.game.league_key"
            :score="finalScore"
          />
          <UiErrorState
            v-else-if="showFormRails && previewError"
            title="The form rail failed to load."
            :error="previewError"
            @retry="refreshGame"
          />
          <GameTeamFormRail
            v-else-if="showFormRails"
            side="home"
            :data="preview?.home || null"
            :league="preview?.league || null"
            :league-key="data.game.league_key"
            :team-key="data.game.home_key"
            :move="moves.home"
            :season="data.game.season"
          />
          <TeamStatsRail v-else side="home" :game="data.game" :sport="gameSport" :class="isCompleted ? '!h-auto flex-shrink-0' : ''" />
          <TeamRatingsCard v-if="showRatings" class="flex-1 min-h-0" side="home" :lineup="data.lineups.home" :league-key="data.game.league_key" />
        </Reveal>
        <Reveal :delay="40" class="min-w-0 space-y-3" :class="isCompleted ? 'flex flex-col min-h-0 !space-y-0 gap-3 overflow-y-auto' : ''">
          <GameHeader :game="data.game" :sport="gameSport" class="flex-shrink-0">
            <template #lead>
              <button
                type="button"
                @click="goBack"
                aria-label="Back"
                class="inline-flex items-center justify-center w-7 h-7 -ml-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover transition-colors"
              >
                <ChevronLeft :size="18" />
              </button>
            </template>
          </GameHeader>

          <!-- One court for both teams, replacing the two shooting panels the rails used to carry. -->
          <GameBasketballCourt
            v-if="showCourt"
            class="flex-shrink-0"
            :sport-stats="data.game.sport_stats"
            :home-name="data.game.home_name"
            :away-name="data.game.away_name"
          />

          <GameQuarterFlow
            v-if="showQuarterFlow"
            class="flex-shrink-0"
            :quarters="data.game.sport_stats.quarters"
            :home-name="data.game.home_name"
            :away-name="data.game.away_name"
          />

          <GameGameLeaders
            v-if="showBballRails"
            class="flex-shrink-0"
            :sport-stats="data.game.sport_stats"
            :home-name="data.game.home_name"
            :away-name="data.game.away_name"
          />

          <!-- Completed football: the pitch is always the anchor, with or without a lineup. -->
          <FootballPitchPanel v-if="showPitch" class="flex-shrink-0" :game="data.game" :lineups="data.lineups" />

        </Reveal>
        <Reveal :delay="80" class="min-w-0 space-y-3" :class="isCompleted ? 'flex flex-col min-h-0 !space-y-0 gap-3' : ''">
          <GameBasketballTeamRail
            v-if="showBballRails"
            side="away"
            :sport-stats="data.game.sport_stats"
            :team-name="data.game.away_name"
            :league-key="data.game.league_key"
            :score="finalScore"
          />
          <UiErrorState
            v-else-if="showFormRails && previewError"
            title="The form rail failed to load."
            :error="previewError"
            @retry="refreshGame"
          />
          <GameTeamFormRail
            v-else-if="showFormRails"
            side="away"
            :data="preview?.away || null"
            :league="preview?.league || null"
            :league-key="data.game.league_key"
            :team-key="data.game.away_key"
            :move="moves.away"
            :season="data.game.season"
            mirror
          />
          <TeamStatsRail v-else side="away" :game="data.game" :sport="gameSport" mirror :class="isCompleted ? '!h-auto flex-shrink-0' : ''" />
          <TeamRatingsCard v-if="showRatings" class="flex-1 min-h-0" side="away" :lineup="data.lineups.away" :league-key="data.game.league_key" mirror />
        </Reveal>
      </div>

      <UiErrorState
        v-if="contextError"
        compact
        class="mt-3"
        title="Division context failed to load."
        :error="contextError"
        @retry="refreshGame"
      />
      <Reveal v-if="blindSpot" :delay="60">
        <TwinBlindSpotBanner :risk="blindSpot" :moves="moves" class="mt-3" />
      </Reveal>

      <!-- ── DETAIL: one panel, one minimal tab rail ──
           Everything below the fold lives behind a tab so the page is a
           screen of cards, not a 3,000px column. -->
      <Reveal v-if="tabs.length > 0" :delay="120" :class="detailClass">
        <section class="panel overflow-hidden mt-3" :class="isCompleted ? 'flex-1 min-h-0 flex flex-col' : ''">
          <header class="panel-head tabs-head">
            <UiTabs :tabs="tabs" v-model="activeTab" size="sm" />
          </header>

          <div class="p-3" :class="isCompleted ? 'flex-1 min-h-0 overflow-y-auto' : ''">
            <!-- Completed football. Post-mortem stays mounted (v-show) so it can resolve whether
                 it has anything of ours to say, which decides if the market read stands in. -->
            <div v-if="showPostMortem" v-show="activeTab === 'postmortem'" class="space-y-3">
              <GamePostMortem :game-id="data.game.id" @resolved="pmHasContent = $event" />
              <GamePrediction
                v-if="pmHasContent === false"
                :game="data.game"
                :prediction="data.prediction"
                :sport="gameSport"
                :analysis="analysisData"
              />
            </div>
            <Transition name="tab" mode="out-in">
              <div v-if="activeTab !== 'postmortem'" :key="activeTab">
                <!-- Match timeline (completed football): a minute axis, or a plain statement that there are no events. -->
                <div v-if="activeTab === 'timeline'" data-testid="timeline-band">
                  <template v-if="hasMatchEvents">
                    <div class="flex items-center justify-end gap-2 mb-1">
                      <span class="tl-key" :style="{ borderColor: `${VIZ_HOME}55`, color: VIZ_HOME }">
                        <i :style="{ background: VIZ_HOME }" />{{ data.game.home_name }}
                      </span>
                      <span class="tl-key" :style="{ borderColor: `${VIZ_AWAY}55`, color: VIZ_AWAY }">
                        <i :style="{ background: VIZ_AWAY }" />{{ data.game.away_name }}
                      </span>
                    </div>
                    <MatchEvents
                      :events="data.game.match_events"
                      :home-name="data.game.home_name"
                      :away-name="data.game.away_name"
                      :home-lineup="data.lineups?.home || []"
                      :away-lineup="data.lineups?.away || []"
                    />
                  </template>
                  <p v-else class="py-6 text-center text-sm text-zinc-500">
                    Match events are not recorded for this fixture, so there are no goals, cards or substitutions to plot.
                  </p>
                </div>

                <!-- Shot chart (completed basketball with located shots) -->
                <div v-else-if="activeTab === 'shots'">
                  <UiErrorState v-if="shotsError" title="The shot chart failed to load." :error="shotsError" @retry="retryShots" />
                  <GameShotChart
                    v-else-if="shotData?.available"
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
                  <UiErrorState v-if="analysisError" title="The analysis failed to load." :error="analysisError" @retry="refreshGame" />
                  <GameAnalysis
                    v-else
                    :game="data.game"
                    :sport="gameSport"
                    :analysis="analysisData"
                    :analysis-loading="analysisLoading"
                    :show-odds="gameSport !== 'football'"
                  />
                </div>

                <!-- Prediction -->
                <div v-else-if="activeTab === 'prediction'">
                  <UiErrorState
                    v-if="analysisError"
                    compact
                    class="mb-3"
                    title="The betting-status read failed to load — the status line below may be incomplete."
                    :error="analysisError"
                    @retry="refreshGame"
                  />
                  <GamePrediction
                    :game="data.game"
                    :prediction="data.prediction"
                    :sport="gameSport"
                    :analysis="analysisData"
                  />
                </div>

                <!-- Fantasy -->
                <div v-else-if="activeTab === 'fantasy'">
                  <UiErrorState v-if="fantasyError" title="Fantasy projections failed to load." :error="fantasyError" @retry="refreshGame" />
                  <FantasyProjections
                    v-else
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
      <div class="text-center space-y-3 max-w-md">
        <UiErrorState title="Failed to load game details." :error="error ? errorText(error) : 'No such game.'" :retryable="!!error" @retry="refreshGame" />
        <NuxtLink to="/leagues" class="text-zinc-400 hover:text-zinc-200 inline-block text-sm">
          Return to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import { errorText } from '~/utils/error-text'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Reveal from '~/components/ui/Reveal.vue'
import GameHeader from '~/components/game/GameHeader.vue'
import TeamStatsRail from '~/components/game/TeamStatsRail.vue'
import TeamRatingsCard from '~/components/game/TeamRatingsCard.vue'
import MatchEvents from '~/components/game/MatchEvents.vue'
import GameAnalysis from '~/components/game/GameAnalysis.vue'
import GamePrediction from '~/components/game/GamePrediction.vue'
import OddsLadder from '~/components/game/OddsLadder.vue'
import FootballPitchPanel from '~/components/game/FootballPitchPanel.vue'
import FantasyProjections from '~/components/game/FantasyProjections.vue'
import PlayerPropsUpload from '~/components/PlayerPropsUpload.vue'
import GameBasketballTeamRail from '~/components/game/BasketballTeamRail.vue'
import GameBasketballCourt from '~/components/game/BasketballCourt.vue'
import { boxScore, hasBox } from '~/utils/basketball-box'
import GameQuarterFlow from '~/components/game/QuarterFlow.vue'
import GameShotChart from '~/components/game/ShotChart.vue'
import GameGameLeaders from '~/components/game/GameLeaders.vue'
import GameMarketBoard from '~/components/game/MarketBoard.vue'
import GamePostMortem from '~/components/game/PostMortem.vue'
import GameTeamFormRail from '~/components/game/TeamFormRail.vue'

const apiFetch = useApiFetch()

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

// One request for the whole page (`game-page` Edge Function): fixture, lineups, rails, market
// board, analysis, post-mortem, twin context. Components read their part through `useGamePage`
// with the same id, so the key is shared and the request is made once.
const { data: bundle, pending: loading, error, refresh: refreshGame } = useGamePage(gameId)
const data = computed(() => bundle.value?.detail ?? null)

// Sport detection — sportOf() knows every basketball league_key, not just
// nba/euroleague, so ACB/BCL/EuroCup/GBL games are no longer read as football.
const gameSport = computed(() =>
  data.value?.game ? sportOf(data.value.game) : 'football')

// Twin blind-spot context: does either club lack history in this division? `twin_fixture_risk`
// only returns fixtures that carry the risk, so a miss is the common case and renders nothing.
// Each club's most recent promotion/relegation (football only) feeds the rails' chip and the
// division line. A FAILED read is reported — an empty result means "no risk / no move", a rejected
// one means we do not know.
const blindSpot = computed(() => bundle.value?.context?.data?.blindSpot ?? null)
const moves = computed<{ home: any; away: any }>(() => bundle.value?.context?.data?.moves ?? { home: null, away: null })
const contextError = computed<string | null>(() => bundle.value?.context?.error ?? null)

// Is the game completed?
const isCompleted = computed(() => data.value?.game?.status === 'completed')

// Active tab state — depends on game status
const activeTab = ref('shots')

// Set the correct default tab based on game status
watch(() => data.value?.game?.status, (status) => {
  if (status === 'completed') {
    activeTab.value = gameSport.value === 'football' ? (hasMatchEvents.value ? 'timeline' : 'postmortem') : 'shots'
  } else {
    // Football's scheduled page leads with the full Market ladder.
    activeTab.value = gameSport.value === 'football' ? 'market' : 'analysis'
  }
}, { immediate: true })


// Tab order. Counts ride along as badges so the rail
// says how much is behind each tab before it is opened.
// The pitch lives above the tabs, the match stats live in the side rails, and
// the player ratings live in per-team cards under the rails — so a completed
// football game has no tabs at all; only basketball keeps tabbed panels.
const tabs = computed(() => {
  if (isCompleted.value) {
    if (gameSport.value === 'football') {
      return [
        { key: 'timeline', label: 'Timeline', badge: hasMatchEvents.value ? data.value?.game?.match_events?.length ?? null : null, hint: hasMatchEvents.value ? undefined : 'not recorded' },
        { key: 'postmortem', label: 'Post-mortem', badge: null },
      ]
    }
    // The box score lives in the two team columns; this panel only exists when located shots do.
    const bt: { key: string; label: string; badge: number | null }[] = []
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
  if (hasFantasy.value || fantasyError.value) t.push({ key: 'fantasy', label: 'Fantasy', badge: null })
  if (isAdmin.value) t.push({ key: 'props', label: 'Props', badge: null })
  return t
})

// The pitch (formation diagram + bench, or its empty frame) renders under the scorecard for every
// completed football game.
const showPitch = computed(() => isCompleted.value && gameSport.value === 'football')

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
const finalScore = computed(() => ({ home: data.value?.game?.home_goals, away: data.value?.game?.away_goals }))

const showBballRails = computed(() =>
  isCompleted.value && gameSport.value === 'basketball' && hasBox(boxScore(data.value?.game?.sport_stats))
)

// Completed basketball: the hero is as tall as its content until that would push the Game Stats
// panel off the screen; then it shrinks and the centre column scrolls its own body.
const heroClass = computed(() => {
  if (isCompleted.value && gameSport.value === 'football') return 'flex-1 min-h-0 hero-fit'
  if (isCompleted.value && gameSport.value === 'basketball') return 'min-h-0 grid-rows-[minmax(0,1fr)]'
  return 'items-start'
})

// Completed football's bottom panel is a fixed height, so the pitch above it never has to give way;
// completed basketball's takes whatever the hero leaves.
const detailClass = computed(() => {
  if (!isCompleted.value) return ''
  return gameSport.value === 'football' ? 'flex-none h-[232px] flex flex-col' : 'flex-1 min-h-[240px] flex flex-col'
})

const showCourt = computed(() =>
  isCompleted.value && gameSport.value === 'basketball' && hasBox(boxScore(data.value?.game?.sport_stats)))

/** `sport_stats.quarters` is present on ~8% of completed basketball fixtures. */
const showQuarterFlow = computed(() => {
  const q = data.value?.game?.sport_stats?.quarters
  return !!(isCompleted.value
    && gameSport.value === 'basketball'
    && Array.isArray(q?.home) && q.home.length > 0)
})

// The timeline is its own always-visible band above the tabs.
const hasMatchEvents = computed(() => {
  const ev = data.value?.game?.match_events
  return Array.isArray(ev) && ev.length > 0
})

// Every completed football game gets the band; with no events it says so instead of an empty strip.

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

const preview = computed(() => bundle.value?.preview?.data ?? null)
const previewError = computed<string | null>(() => bundle.value?.preview?.error ?? null)

/**
 * The post-mortem renders for a completed football fixture. The component
 * itself decides whether there is anything to say — a fixture with no wager
 * and no model rows in the spine renders nothing rather than three empty
 * states.
 */
const pmHasContent = ref<boolean | null>(null)
watch(() => data.value?.game?.id, () => { pmHasContent.value = null })
const showPostMortem = computed(() =>
  isCompleted.value && gameSport.value === 'football')

// A tab can disappear (no lineups, fantasy resolves to none). Falling back to
// the first tab keeps the body from rendering nothing with the rail showing
// no active pill.
watch(tabs, (list) => {
  if (list.length && !list.some((t) => t.key === activeTab.value)) {
    activeTab.value = list[0].key
  }
})

// Computed properties
const hasLineups = computed(() => {
  return data.value?.lineups?.home?.length > 0 || data.value?.lineups?.away?.length > 0
})

// Fantasy projections check — only for scheduled basketball games
const hasFantasy = ref(false)

const fantasyError = ref<string | null>(null)
async function checkFantasy() {
  if (!data.value?.game || isCompleted.value) return
  const sport = gameSport.value
  if (sport !== 'basketball') return
  const d = data.value as Record<string, any>
  // The bundled call already ran: report its failure rather than reading it as "no projections".
  fantasyError.value = d?.fantasyError || null
  if (fantasyError.value) return
  if (Array.isArray(d?.fantasy)) {
    hasFantasy.value = d.fantasy.length > 0
    return
  }
  try {
    const projections = await api.fetchFantasyProjections(data.value.game.id)
    hasFantasy.value = projections.length > 0
  } catch (e) {
    fantasyError.value = errorText(e)
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
const shotsError = ref<string | null>(null)
// The tab appears when there is something behind it — or when the load FAILED, so a
// fetch error is not indistinguishable from a fixture with no located shots.
const hasShots = computed(() => (shotData.value?.shots?.length ?? 0) > 0 || !!shotsError.value)

async function loadShots() {
  const g = data.value?.game
  if (!g || shotData.value || shotsLoading.value) return
  if (!isCompleted.value || gameSport.value !== 'basketball') return
  shotsLoading.value = true
  shotsError.value = null
  try {
    shotData.value = await apiFetch(`/api/game/${g.id}/shots`)
  } catch (e) {
    shotsError.value = errorText(e)
  } finally {
    shotsLoading.value = false
  }
}

function retryShots() {
  shotData.value = null
  loadShots()
}

watch(() => data.value?.game, (game) => {
  if (game) loadShots()
}, { immediate: true })

// Unified per-fixture analysis record (`/api/game/[id]/analysis`, unified-
// analysis-layer Track C) — h2h, predicted score and pace/trend for the
// Analysis tab. Lazy-loaded the first time either tab that needs it opens,
// then cached per game id (switching Analysis <-> Prediction doesn't refetch).
const analysisLoading = loading
const analysisError = computed<string | null>(() => bundle.value?.analysis?.error ?? null)

// The Monte-Carlo same-game correlations spawn `ml.slips.slip_sim` on the host, which an Edge
// Function cannot reach, so Nitro serves them — fetched once, the first time a tab that shows them
// opens, and merged into the bundle's analysis record (`correlations.status` is `deferred` until then).
const correlations = ref<Record<string, any> | null>(null)
let correlationsFor: number | null = null
async function loadCorrelations() {
  const g = data.value?.game
  if (!g || gameSport.value !== 'football' || correlationsFor === g.id) return
  correlationsFor = g.id
  correlations.value = null
  try {
    correlations.value = await apiFetch(`/api/game/${g.id}/correlations`)
  } catch (e) {
    correlations.value = { status: 'insufficient_data', note: errorText(e) }
  }
}

const analysisData = computed<Record<string, any> | null>(() => {
  const a = bundle.value?.analysis?.data
  if (!a) return null
  return correlations.value ? { ...a, correlations: correlations.value } : a
})

watch(() => [data.value?.game?.id, activeTab.value], ([, tab]) => {
  if (tab === 'analysis' || tab === 'prediction') loadCorrelations()
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
.hero-fit { grid-template-rows: minmax(0, 1fr); }
/* The raw ladder is reference material now that the board is the lead — it
   opens on demand rather than being the first thing on the page. */
.ladder-details { margin-top: 0.6rem; }
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
</style>
