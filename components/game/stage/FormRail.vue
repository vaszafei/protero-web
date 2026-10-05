<template>
  <UiErrorState v-if="error" title="The form rail failed to load." :error="error" @retry="$emit('retry')" />
  <GameTeamFormRail
    v-else
    :side="side"
    :data="preview?.[side] || null"
    :league="preview?.league || null"
    :league-key="game.league_key"
    :team-key="side === 'home' ? game.home_key : game.away_key"
    :move="moves[side]"
    :season="game.season"
    :mirror="side === 'away'"
  />
</template>

<script setup lang="ts">
import GameTeamFormRail from '~/components/game/TeamFormRail.vue'

/** A scheduled game's side rail: the club's form and twin ratings, or the statement that they failed. */
defineProps<{
  side: 'home' | 'away'
  game: Record<string, any>
  preview: Record<string, any> | null
  error: string | null
  moves: { home: any; away: any }
}>()
defineEmits<{ (e: 'retry'): void }>()
</script>
