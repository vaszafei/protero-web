<template>
  <section class="panel overflow-hidden mt-3" :class="completed ? 'flex-1 min-h-0 flex flex-col' : ''">
    <header class="panel-head tabs-head">
      <UiTabs :tabs="tabs" :model-value="modelValue" size="sm" @update:model-value="$emit('update:modelValue', $event)" />
    </header>
    <div class="p-3" :class="completed ? 'flex-1 min-h-0 overflow-y-auto' : ''">
      <!-- Completed football. Post-mortem stays mounted (v-show) so it can resolve whether
           it has anything of ours to say, which decides if the market read stands in. -->
      <div v-if="showPostMortem" v-show="activeTab === 'postmortem'" class="space-y-3">
        <GamePostMortem :game-id="data.game.id" @resolved="pmHasContent = $event" />
        <GamePrediction
          v-if="pmHasContent === false"
          :game="data.game"
          :prediction="data.prediction"
          :sport="sport"
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
            <UiErrorState v-if="shotsError" title="The shot chart failed to load." :error="shotsError" @retry="$emit('retry-shots')" />
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
            <UiErrorState v-if="analysisError" title="The analysis failed to load." :error="analysisError" @retry="$emit('retry')" />
            <GameAnalysis
              v-else
              :game="data.game"
              :sport="sport"
              :analysis="analysisData"
              :analysis-loading="analysisLoading"
              :show-odds="sport !== 'football'"
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
              @retry="$emit('retry')"
            />
            <GamePrediction
              :game="data.game"
              :prediction="data.prediction"
              :sport="sport"
              :analysis="analysisData"
            />
          </div>

          <!-- Fantasy -->
          <div v-else-if="activeTab === 'fantasy'">
            <UiErrorState v-if="fantasyError" title="Fantasy projections failed to load." :error="fantasyError" @retry="$emit('retry')" />
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import type { GameSport, GameTab } from '~/utils/game-tabs'
import MatchEvents from '~/components/game/MatchEvents.vue'
import GameAnalysis from '~/components/game/GameAnalysis.vue'
import GamePrediction from '~/components/game/GamePrediction.vue'
import OddsLadder from '~/components/game/OddsLadder.vue'
import FantasyProjections from '~/components/game/FantasyProjections.vue'
import PlayerPropsUpload from '~/components/PlayerPropsUpload.vue'
import GameShotChart from '~/components/game/ShotChart.vue'
import GameMarketBoard from '~/components/game/MarketBoard.vue'
import GamePostMortem from '~/components/game/PostMortem.vue'

/**
 * The bottom panel: one tab rail and the body of whichever tab is open. Which tabs exist is
 * `utils/game-tabs.ts`; this only renders them.
 */
const props = defineProps<{
  tabs: GameTab[]
  modelValue: string
  data: Record<string, any>
  sport: GameSport
  completed: boolean
  hasMatchEvents: boolean
  analysisData: Record<string, any> | null
  analysisError: string | null
  analysisLoading: boolean
  fantasyError: string | null
  shotData: Record<string, any> | null
  shotsError: string | null
}>()
defineEmits<{
  (e: 'update:modelValue', key: string): void
  (e: 'retry'): void
  (e: 'retry-shots'): void
}>()

const activeTab = computed(() => props.modelValue)
const showPostMortem = computed(() => props.completed && props.sport === 'football')

// The post-mortem stays mounted so it can resolve whether it has anything of ours to say.
const pmHasContent = ref<boolean | null>(null)
watch(() => props.data?.game?.id, () => { pmHasContent.value = null })
</script>

<style scoped>
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
