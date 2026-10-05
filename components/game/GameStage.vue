<template>
  <div class="bg-surface-base" :class="completed ? 'h-full' : 'min-h-screen'" data-testid="game-stage" :data-layout="layout">
    <div class="max-w-[1680px] mx-auto px-4 pt-3 pb-4" :class="completed ? 'h-full flex flex-col min-h-0' : ''">
      <!-- One three-column hero: home rail · header + centre · away rail. The columns are the same
           width in every sport and state; only what fills them differs. -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)_minmax(0,1fr)] gap-3" :class="heroClass">
        <Reveal :delay="0" class="min-w-0" :class="colClass" data-testid="stage-left">
          <slot name="left" />
        </Reveal>
        <Reveal :delay="40" class="min-w-0" :class="[colClass, completed ? 'overflow-y-auto' : '']" data-testid="stage-centre">
          <GameHeader :game="game" :sport="sport" class="flex-shrink-0">
            <template #lead>
              <button
                type="button"
                aria-label="Back"
                class="inline-flex items-center justify-center w-7 h-7 -ml-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover transition-colors"
                @click="$emit('back')"
              >
                <ChevronLeft :size="18" />
              </button>
            </template>
          </GameHeader>
          <slot name="centre" />
        </Reveal>
        <Reveal :delay="80" class="min-w-0" :class="colClass" data-testid="stage-right">
          <slot name="right" />
        </Reveal>
      </div>

      <slot name="banners" />

      <Reveal v-if="hasTabs" :delay="120" :class="panelClass" data-testid="stage-tabs">
        <slot name="tabs" />
      </Reveal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import Reveal from '~/components/ui/Reveal.vue'
import GameHeader from '~/components/game/GameHeader.vue'
import type { GameSport } from '~/utils/game-tabs'

/**
 * `flow`         scheduled: the page is as tall as its content.
 * `fit-fixed`    completed football: the hero fills the screen, the tab panel is a fixed band under it.
 * `fit-fill`     completed basketball: the hero is as tall as its content until that would push the
 *                tab panel off the screen; the panel takes whatever the hero leaves.
 */
export type StageLayout = 'flow' | 'fit-fixed' | 'fit-fill'

// `hasTabs` reaches the stage through the per-sport components as a fallthrough attribute.
const props = withDefaults(defineProps<{
  game: Record<string, any>
  sport: GameSport
  layout: StageLayout
  hasTabs?: boolean
}>(), { hasTabs: true })
defineEmits<{ (e: 'back'): void }>()

const completed = computed(() => props.layout !== 'flow')

const heroClass = computed(() => ({
  flow: 'items-start',
  'fit-fixed': 'flex-1 min-h-0 grid-rows-[minmax(0,1fr)]',
  'fit-fill': 'min-h-0 grid-rows-[minmax(0,1fr)]',
}[props.layout]))

const colClass = computed(() => completed.value ? 'flex flex-col min-h-0 gap-3' : 'space-y-3')

const panelClass = computed(() => ({
  flow: '',
  'fit-fixed': 'flex-none h-[232px] flex flex-col',
  'fit-fill': 'flex-1 min-h-[240px] flex flex-col',
}[props.layout]))
</script>
