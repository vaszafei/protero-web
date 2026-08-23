<template>
  <div class="relative">
    <!-- Tab buttons -->
    <div ref="railRef" class="flex border-b border-edge/50">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="game-tab"
        :class="tab.key === modelValue ? 'game-tab-active' : 'game-tab-idle'"
        @click="$emit('update:modelValue', tab.key)"
      >
        {{ tab.label }}
      </button>

      <!-- Single gliding indicator -->
      <span
        v-if="indicatorStyle"
        class="game-tab-indicator"
        :style="indicatorStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { MOTION } from '~/utils/motion'

export interface GameTab {
  key: string
  label: string
}

const props = defineProps<{
  tabs: GameTab[]
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', key: string): void
}>()

const railRef = ref<HTMLElement | null>(null)

const indicatorStyle = ref<{ left: string; width: string } | null>(null)

function measure() {
  const rail = railRef.value
  if (!rail) return
  const active = rail.querySelector<HTMLElement>('.game-tab-active')
  if (!active) {
    indicatorStyle.value = null
    return
  }
  const railRect = rail.getBoundingClientRect()
  const tabRect = active.getBoundingClientRect()
  indicatorStyle.value = {
    left: `${tabRect.left - railRect.left}px`,
    width: `${tabRect.width}px`,
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(measure)
  if (typeof ResizeObserver !== 'undefined' && railRef.value) {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(railRef.value)
  }
})

watch(() => props.modelValue, () => nextTick(measure))
watch(() => props.tabs, () => nextTick(measure), { deep: true })

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<style scoped>
.game-tab {
  position: relative;
  flex: 1;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: color 160ms ease;
}

.game-tab-idle {
  color: rgb(113, 113, 122);
}
.game-tab-idle:hover {
  color: rgb(212, 212, 216);
}

.game-tab-active {
  color: rgb(244, 244, 245);
}

.game-tab-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, #3987e5, #d95926);
  transition:
    left 240ms cubic-bezier(0.4, 0, 0.2, 1),
    width 240ms cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .game-tab-indicator {
    transition: none;
  }
}
</style>
