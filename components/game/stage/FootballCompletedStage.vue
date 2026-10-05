<template>
  <GameStage :game="game" sport="football" layout="fit-fixed" @back="$emit('back')">
    <template #left>
      <TeamStatsRail side="home" :game="game" sport="football" class="!h-auto flex-shrink-0" />
      <TeamRatingsCard v-if="hasLineups" class="flex-1 min-h-0" side="home" :lineup="lineups.home" :league-key="game.league_key" />
    </template>
    <template #centre>
      <!-- The pitch is always the anchor, with or without a lineup. -->
      <FootballPitchPanel class="flex-shrink-0" :game="game" :lineups="lineups" />
    </template>
    <template #right>
      <TeamStatsRail side="away" :game="game" sport="football" mirror class="!h-auto flex-shrink-0" />
      <TeamRatingsCard v-if="hasLineups" class="flex-1 min-h-0" side="away" :lineup="lineups.away" :league-key="game.league_key" mirror />
    </template>
    <template #banners><slot name="banners" /></template>
    <template #tabs><slot name="tabs" /></template>
  </GameStage>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GameStage from '~/components/game/GameStage.vue'
import TeamStatsRail from '~/components/game/TeamStatsRail.vue'
import TeamRatingsCard from '~/components/game/TeamRatingsCard.vue'
import FootballPitchPanel from '~/components/game/FootballPitchPanel.vue'

const props = defineProps<{
  game: Record<string, any>
  lineups: { home: any[]; away: any[] }
}>()
defineEmits<{ (e: 'back'): void }>()

// Per-team ratings cards render under each stat rail when a lineup exists.
const hasLineups = computed(() => props.lineups?.home?.length > 0 || props.lineups?.away?.length > 0)
</script>
