<template>
  <GameStage :game="game" sport="football" layout="flow" @back="$emit('back')">
    <template #left>
      <StageFormRail side="home" :game="game" :preview="preview" :error="previewError" :moves="moves" @retry="$emit('retry')" />
    </template>
    <template #right>
      <StageFormRail side="away" :game="game" :preview="preview" :error="previewError" :moves="moves" @retry="$emit('retry')" />
    </template>
    <template #banners><slot name="banners" /></template>
    <template #tabs><slot name="tabs" /></template>
  </GameStage>
</template>

<script setup lang="ts">
import GameStage from '~/components/game/GameStage.vue'
import StageFormRail from '~/components/game/stage/FormRail.vue'

/** Scheduled football: form rails either side; the centre is empty until the expected lineup lands there. */
defineProps<{
  game: Record<string, any>
  preview: Record<string, any> | null
  previewError: string | null
  moves: { home: any; away: any }
}>()
defineEmits<{ (e: 'back'): void; (e: 'retry'): void }>()
</script>
