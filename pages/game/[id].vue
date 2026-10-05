<template>
  <div v-if="loading" class="flex justify-center items-center min-h-screen bg-surface-base">
    <LoadingSpinner size="lg" text="Loading game details..." />
  </div>

  <!-- Desktop operator page: one three-column stage for every sport and state, sized to read
       without scrolling at 1920×1080. What fills the columns is the per-sport component's business. -->
  <component :is="stage" v-else-if="data" v-bind="stageProps" @back="goBack" @retry="refreshGame">
    <template #banners>
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
    </template>
    <template #tabs>
      <GameDetailTabs
        v-model="activeTab"
        :tabs="tabs"
        :data="data"
        :sport="gameSport"
        :completed="isCompleted"
        :has-match-events="matchEventCount > 0"
        :analysis-data="analysisData"
        :analysis-error="analysisError"
        :analysis-loading="loading"
        :fantasy-error="extras.fantasyError.value"
        :shot-data="extras.shotData.value"
        :shots-error="extras.shotsError.value"
        @retry="refreshGame"
        @retry-shots="extras.retryShots"
      />
    </template>
  </component>

  <div v-else class="flex justify-center items-center min-h-screen bg-surface-base">
    <div class="text-center space-y-3 max-w-md">
      <UiErrorState title="Failed to load game details." :error="error ? errorText(error) : 'No such game.'" :retryable="!!error" @retry="refreshGame" />
      <NuxtLink to="/leagues" class="text-zinc-400 hover:text-zinc-200 inline-block text-sm">
        Return to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { errorText } from '~/utils/error-text'
import { defaultTabKey, gameTabs, type TabInputs } from '~/utils/game-tabs'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Reveal from '~/components/ui/Reveal.vue'
import GameDetailTabs from '~/components/game/GameDetailTabs.vue'
import FootballScheduledStage from '~/components/game/stage/FootballScheduledStage.vue'
import FootballCompletedStage from '~/components/game/stage/FootballCompletedStage.vue'
import BasketballScheduledStage from '~/components/game/stage/BasketballScheduledStage.vue'
import BasketballCompletedStage from '~/components/game/stage/BasketballCompletedStage.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
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

// sportOf() knows every basketball league_key, not just nba/euroleague.
const gameSport = computed<'football' | 'basketball'>(() =>
  data.value?.game ? sportOf(data.value.game) : 'football')
const isCompleted = computed(() => data.value?.game?.status === 'completed')

// Twin blind-spot context: does either club lack history in this division? A FAILED read is
// reported — an empty result means "no risk / no move", a rejected one means we do not know.
const blindSpot = computed(() => bundle.value?.context?.data?.blindSpot ?? null)
const moves = computed<{ home: any; away: any }>(() => bundle.value?.context?.data?.moves ?? { home: null, away: null })
const contextError = computed<string | null>(() => bundle.value?.context?.error ?? null)

const preview = computed(() => bundle.value?.preview?.data ?? null)
const previewError = computed<string | null>(() => bundle.value?.preview?.error ?? null)

// Per-fixture analysis record; the Monte-Carlo correlations (`useGameExtras`) merge into it.
const analysisError = computed<string | null>(() => bundle.value?.analysis?.error ?? null)
const activeTab = ref('')
const extras = useGameExtras(data, gameSport, isCompleted, activeTab)
const analysisData = computed<Record<string, any> | null>(() => {
  const a = bundle.value?.analysis?.data
  if (!a) return null
  return extras.correlations.value ? { ...a, correlations: extras.correlations.value } : a
})

// The tab matrix lives in `utils/game-tabs.ts`.
const matchEventCount = computed(() => {
  const ev = data.value?.game?.match_events
  return Array.isArray(ev) ? ev.length : 0
})
const tabInputs = computed<TabInputs>(() => ({
  state: isCompleted.value ? 'completed' : 'scheduled',
  sport: gameSport.value,
  matchEventCount: matchEventCount.value,
  hasShots: extras.hasShots.value,
  shotCount: extras.shotData.value?.shots?.length ?? null,
  hasFantasy: extras.hasFantasy.value || !!extras.fantasyError.value,
  isAdmin: isAdmin.value,
}))
const tabs = computed(() => gameTabs(tabInputs.value))

watch(() => [data.value?.game?.id, data.value?.game?.status], () => {
  activeTab.value = defaultTabKey(tabInputs.value) ?? ''
}, { immediate: true })

// A tab can appear late (shots load after the fixture) or disappear (fantasy resolves to none).
// Falling back to the first tab keeps the body from rendering nothing with no active pill.
watch(tabs, (list) => {
  if (list.length && !list.some((t) => t.key === activeTab.value)) activeTab.value = list[0].key
})

const stage = computed(() => ({
  'football-scheduled': FootballScheduledStage,
  'football-completed': FootballCompletedStage,
  'basketball-scheduled': BasketballScheduledStage,
  'basketball-completed': BasketballCompletedStage,
}[`${gameSport.value}-${isCompleted.value ? 'completed' : 'scheduled'}`]))

// Exactly the props the chosen stage declares: an extra one would fall through onto its DOM.
const stageProps = computed(() => {
  const game = data.value!.game
  const hasTabs = tabs.value.length > 0
  if (isCompleted.value) {
    return gameSport.value === 'football'
      ? { game, lineups: data.value!.lineups, hasTabs }
      : { game, hasTabs }
  }
  if (gameSport.value === 'football') {
    return {
      game, preview: preview.value, previewError: previewError.value, moves: moves.value,
      lineups: data.value!.lineups, expected: bundle.value?.expectedXi ?? null, hasTabs,
    }
  }
  return { game, preview: preview.value, previewError: previewError.value, moves: moves.value, hasTabs }
})

useHead({
  title: computed(() => {
    if (data.value?.game) {
      return `${data.value.game.home_name} vs ${data.value.game.away_name} - Game Details`
    }
    return 'Game Details'
  })
})
</script>
