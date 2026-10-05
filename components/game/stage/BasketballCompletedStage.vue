<template>
  <GameStage :game="game" sport="basketball" layout="fit-fill" @back="$emit('back')">
    <template #left>
      <!-- Basketball has no scalar stat columns — they are NULL by design — so its rail derives
           team totals from the box score instead. -->
      <GameBasketballTeamRail v-if="hasBoxScore" side="home" :sport-stats="game.sport_stats" :team-name="game.home_name" :league-key="game.league_key" :score="finalScore" />
      <TeamStatsRail v-else side="home" :game="game" sport="basketball" class="!h-auto flex-shrink-0" />
    </template>
    <template #centre>
      <!-- One court for both teams. -->
      <GameBasketballCourt v-if="hasBoxScore" class="flex-shrink-0" :sport-stats="game.sport_stats" :home-name="game.home_name" :away-name="game.away_name" />
      <GameQuarterFlow v-if="hasQuarters" class="flex-shrink-0" :quarters="game.sport_stats.quarters" :home-name="game.home_name" :away-name="game.away_name" />
      <GameGameLeaders v-if="hasBoxScore" class="flex-shrink-0" :sport-stats="game.sport_stats" :home-name="game.home_name" :away-name="game.away_name" />
    </template>
    <template #right>
      <GameBasketballTeamRail v-if="hasBoxScore" side="away" :sport-stats="game.sport_stats" :team-name="game.away_name" :league-key="game.league_key" :score="finalScore" />
      <TeamStatsRail v-else side="away" :game="game" sport="basketball" mirror class="!h-auto flex-shrink-0" />
    </template>
    <template #banners><slot name="banners" /></template>
    <template #tabs><slot name="tabs" /></template>
  </GameStage>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GameStage from '~/components/game/GameStage.vue'
import TeamStatsRail from '~/components/game/TeamStatsRail.vue'
import GameBasketballTeamRail from '~/components/game/BasketballTeamRail.vue'
import GameBasketballCourt from '~/components/game/BasketballCourt.vue'
import GameQuarterFlow from '~/components/game/QuarterFlow.vue'
import GameGameLeaders from '~/components/game/GameLeaders.vue'
import { boxScore, hasBox } from '~/utils/basketball-box'

const props = defineProps<{ game: Record<string, any> }>()
defineEmits<{ (e: 'back'): void }>()

const hasBoxScore = computed(() => hasBox(boxScore(props.game.sport_stats)))
const finalScore = computed(() => ({ home: props.game.home_goals, away: props.game.away_goals }))

/** `sport_stats.quarters` is present on ~8% of completed basketball fixtures. */
const hasQuarters = computed(() => {
  const q = props.game.sport_stats?.quarters
  return Array.isArray(q?.home) && q.home.length > 0
})
</script>
