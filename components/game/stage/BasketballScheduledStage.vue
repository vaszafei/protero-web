<template>
  <GameStage :game="game" sport="basketball" layout="flow" @back="$emit('back')">
    <template #left>
      <StageFormRail side="home" :game="game" :preview="preview" :error="previewError" :moves="moves" @retry="$emit('retry')" />
    </template>
    <template #right>
      <StageFormRail side="away" :game="game" :preview="preview" :error="previewError" :moves="moves" @retry="$emit('retry')" />
    </template>
    <template #centre>
      <ExpectedFivePanel class="flex-shrink-0" :game="game" :expected="expected" @retry="$emit('retry')" />
    </template>
    <template #banners><slot name="banners" /></template>
    <template #tabs><slot name="tabs" /></template>
  </GameStage>
</template>

<script setup lang="ts">
import GameStage from '~/components/game/GameStage.vue'
import StageFormRail from '~/components/game/stage/FormRail.vue'
import ExpectedFivePanel from '~/components/game/ExpectedFivePanel.vue'

/** Scheduled basketball: form rails either side, the expected five in the centre. */
defineProps<{
  game: Record<string, any>
  preview: Record<string, any> | null
  previewError: string | null
  moves: { home: any; away: any }
  expected: { data: Record<string, any> | null; error: string | null } | null
}>()
defineEmits<{ (e: 'back'): void; (e: 'retry'): void }>()
</script>
