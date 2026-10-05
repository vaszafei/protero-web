<template>
  <GameStage :game="game" sport="football" layout="fit-fixed" @back="$emit('back')">
    <template #left>
      <StageFormRail side="home" :game="game" :preview="preview" :error="previewError" :moves="moves" @retry="$emit('retry')" />
    </template>
    <template #right>
      <StageFormRail side="away" :game="game" :preview="preview" :error="previewError" :moves="moves" @retry="$emit('retry')" />
    </template>
    <template #centre>
      <ExpectedXiPanel class="flex-shrink-0" :game="game" :lineups="lineups" :expected="expected" @retry="$emit('retry')" />
    </template>
    <template #banners><slot name="banners" /></template>
    <template #tabs><slot name="tabs" /></template>
  </GameStage>
</template>

<script setup lang="ts">
import GameStage from '~/components/game/GameStage.vue'
import StageFormRail from '~/components/game/stage/FormRail.vue'
import ExpectedXiPanel from '~/components/game/ExpectedXiPanel.vue'

/** Scheduled football: form rails either side, the expected (or, once published, confirmed) XI in the centre. */
defineProps<{
  game: Record<string, any>
  preview: Record<string, any> | null
  previewError: string | null
  moves: { home: any; away: any }
  lineups: { home: any[]; away: any[] }
  expected: { data: Record<string, any> | null; error: string | null } | null
}>()
defineEmits<{ (e: 'back'): void; (e: 'retry'): void }>()
</script>
