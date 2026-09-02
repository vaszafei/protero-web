<template>
  <div class="panel sk" :style="{ height: height }" role="status" aria-busy="true">
    <div v-if="title" class="panel-head">
      <span class="sk-bar" style="width: 7rem; height: 0.55rem" />
    </div>
    <div class="sk-body">
      <div
        v-for="i in rows"
        :key="i"
        class="sk-row"
        :style="{ animationDelay: `${i * 70}ms` }"
      >
        <span class="sk-bar" :style="{ width: widths[i % widths.length] }" />
      </div>
    </div>
    <span class="sr-only">Loading</span>
  </div>
</template>

<script setup lang="ts">
/**
 * A shape-matched loading state.
 *
 * The app's habit was a centred spinner, then the content appearing at a
 * different size and shoving the page — the layout shift reads as a glitch. A
 * skeleton the same shape as the panel it replaces means the only thing that
 * changes on load is the ink.
 */
withDefaults(defineProps<{
  rows?: number
  title?: boolean
  height?: string
}>(), {
  rows: 4,
  title: true,
  height: 'auto',
})

/** Ragged widths — a stack of identical bars reads as a table, not as text. */
const widths = ['82%', '64%', '91%', '55%', '74%']
</script>

<style scoped>
.sk { overflow: hidden; }
.sk-body { padding: 0.7rem 0.8rem; display: flex; flex-direction: column; gap: 0.6rem; }

.sk-bar {
  display: block;
  height: 0.6rem;
  border-radius: var(--r-pill);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.045) 0%,
    rgba(255, 255, 255, 0.085) 50%,
    rgba(255, 255, 255, 0.045) 100%
  );
  background-size: 200% 100%;
  animation: sk-sweep 1.4s ease-in-out infinite;
}

@keyframes sk-sweep {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sk-bar { animation: none; background: rgba(255, 255, 255, 0.06); }
}
</style>
