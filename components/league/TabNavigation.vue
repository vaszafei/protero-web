<template>
  <div class="tabbar rounded-lg mb-3 sm:mb-5">
    <div class="relative flex p-1 gap-0.5">
      <!-- The moving indicator. One element that slides, rather than a border
           painted on whichever button happens to be active — so the transition
           reads as a single object moving between slots. -->
      <div
        class="tab-thumb"
        :style="{
          width: `calc(${100 / tabs.length}% - 4px)`,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 4}px))`,
        }"
      />

      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :disabled="tab.disabled"
        :title="tab.hint || undefined"
        @click="tab.disabled || $emit('update:activeTab', tab.key)"
        class="tab-btn"
        :class="[
          activeTab === tab.key ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300',
          tab.disabled ? 'opacity-40 cursor-not-allowed hover:text-zinc-500' : '',
        ]"
      >
        <span class="tab-label">
          <span class="hidden sm:inline">{{ tab.label }}</span>
          <span class="sm:hidden">{{ tab.shortLabel || tab.label }}</span>
          <span
            v-if="tab.count != null"
            class="tab-count"
            :class="activeTab === tab.key ? 'tab-count-on' : ''"
          >{{ tab.count }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * The league page's tab bar.
 *
 * Three tabs, not four: "Twin" and "Fixtures" were one subject split across two
 * panes — the fitted competition and the games it is fitted on — so they are now
 * a single Overview. Analysis and Predictions stay separate because they answer
 * different questions (what happened / what we think happens next).
 *
 * No icons, per the frontend's CD #6. The motion, the counts and the weight
 * carry the hierarchy instead.
 */
import { computed } from 'vue'

const props = defineProps({
  activeTab: { type: String, required: true },
  /** Number of fixtures in the visible round — the Overview badge. */
  fixtureCount: { type: Number, default: null },
  /** Completed games in the season — Analysis has nothing to say without them. */
  analysisCount: { type: Number, default: null },
  /** Upcoming matches carrying a model output. */
  predictionCount: { type: Number, default: null },
  /**
   * Predictions are a statement about fixtures that have not been played. On a
   * finished season there are none, so the tab is disabled rather than left to
   * render a wall of zeros against games whose results we already hold.
   */
  predictionsDisabled: { type: Boolean, default: false },
  predictionsHint: { type: String, default: '' },
})

defineEmits(['update:activeTab'])

const tabs = computed(() => [
  {
    key: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    count: props.fixtureCount,
  },
  {
    key: 'analysis',
    label: 'Analysis',
    shortLabel: 'Analysis',
    count: props.analysisCount,
  },
  {
    key: 'predictions',
    label: 'Predictions',
    shortLabel: 'Preds',
    count: props.predictionsDisabled ? null : props.predictionCount,
    disabled: props.predictionsDisabled,
    hint: props.predictionsHint,
  },
])

const activeIndex = computed(() => {
  const i = tabs.value.findIndex(t => t.key === props.activeTab)
  return i < 0 ? 0 : i
})
</script>

<style scoped>
.tabbar {
  background: #1c1f27;
  border: 1px solid #2a2f3a;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 24px -16px rgba(0, 0, 0, 0.9);
  /* Compact: the tabs size to their labels, not the page width. */
  width: fit-content;
  max-width: 100%;
}

.tab-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  border-radius: 0.5rem;
  background: linear-gradient(180deg, rgba(57, 135, 229, 0.22), rgba(57, 135, 229, 0.08));
  border: 1px solid rgba(57, 135, 229, 0.35);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25), 0 6px 18px -10px rgba(57, 135, 229, 0.9);
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.tab-btn {
  position: relative;
  z-index: 1;
  /* Equal fixed slots so the sliding thumb stays aligned. */
  flex: 0 0 auto;
  width: 6.25rem;
  min-height: 44px;
  padding: 0.6rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 180ms ease;
  background: transparent;
}
@media (min-width: 640px) {
  .tab-btn { font-size: 0.85rem; width: 8rem; }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  padding: 0 0.3rem;
  height: 1.15rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgb(161, 161, 170);
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: background 180ms ease, color 180ms ease;
}
.tab-count-on {
  background: rgba(57, 135, 229, 0.28);
  color: #cfe2ff;
}

@media (prefers-reduced-motion: reduce) {
  .tab-thumb { transition: none; }
}
</style>
