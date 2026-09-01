<template>
  <div class="relative">
    <!-- Minimal segmented rail: auto-width labels, one gliding pill -->
    <div ref="railRef" class="game-tab-rail">
      <!-- the pill rides behind the labels -->
      <span v-if="indicatorStyle" class="game-tab-pill" :style="indicatorStyle" />
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="game-tab"
        :class="tab.key === modelValue ? 'game-tab-active' : 'game-tab-idle'"
        @click="$emit('update:modelValue', tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.badge != null" class="game-tab-badge tabular-nums">{{ tab.badge }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface GameTab {
  key: string
  label: string
  /** optional count rendered as a dim chip after the label */
  badge?: number | string | null
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
/* A rail, not a full-width button row: labels size to their text and sit in a
   recessed track, so three tabs do not stretch across 1200px of panel. */
.game-tab-rail {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.2rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid #2a2f3a;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.game-tab-rail::-webkit-scrollbar { display: none; }

.game-tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  padding: 0.3rem 0.7rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 160ms ease;
}

.game-tab-idle { color: rgb(113, 113, 122); }
.game-tab-idle:hover { color: rgb(212, 212, 216); }
.game-tab-active { color: rgb(244, 244, 245); }

.game-tab-badge {
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 0.575rem;
  font-weight: 700;
  color: rgb(148, 151, 160);
}
.game-tab-active .game-tab-badge { background: rgba(255, 255, 255, 0.12); color: rgb(212, 212, 216); }

/* the single gliding pill — the whole "wow" of the rail is that this moves
   rather than each tab painting its own background */
.game-tab-pill {
  position: absolute;
  top: 0.2rem;
  bottom: 0.2rem;
  border-radius: 0.375rem;
  background: linear-gradient(180deg, #2f3542, #272c37);
  border: 1px solid #3a4150;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 2px 8px rgba(0, 0, 0, 0.35);
  transition:
    left 260ms cubic-bezier(0.4, 0, 0.2, 1),
    width 260ms cubic-bezier(0.4, 0, 0.2, 1);
}
/* a hairline of brand colour along the pill's base ties it to the page accent */
.game-tab-pill::after {
  content: '';
  position: absolute;
  left: 0.4rem;
  right: 0.4rem;
  bottom: -1px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, #3987e5, #d95926);
  box-shadow: 0 0 8px 1px rgba(57, 135, 229, 0.4);
}

@media (prefers-reduced-motion: reduce) {
  .game-tab-pill { transition: none; }
}
</style>
