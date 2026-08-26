<template>
  <div class="tabbar mb-4 sm:mb-6 flex justify-center">
    <div class="relative flex gap-6 sm:gap-8">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        ref="tabRefs"
        type="button"
        :disabled="tab.disabled"
        :title="tab.hint || undefined"
        @click="tab.disabled || $emit('update:activeTab', tab.key)"
        class="tab-btn"
        :class="[
          activeTab === tab.key ? 'tab-btn-on' : '',
          tab.disabled ? 'tab-btn-off' : '',
        ]"
      >
        <span class="hidden sm:inline">{{ tab.label }}</span>
        <span class="sm:hidden">{{ tab.shortLabel || tab.label }}</span>
      </button>

      <!-- The moving underline. Measured against the real button rects rather
           than assumed into equal percentage slots, because these tabs are now
           sized to their own label + count, not to a fixed grid. -->
      <div class="tab-underline" :style="underlineStyle" />
    </div>
  </div>
</template>

<script setup>
/**
 * The league page's primary section switch.
 *
 * Rebuilt 2026-08-25 off the pill/card pattern: three tabs sat inside a bordered
 * box, which read as a form control (a segmented input) rather than as the
 * page's primary navigation. This is an underline nav instead — no container,
 * no background, no border — bold label weight and a thick sliding bar carry
 * the hierarchy, the same way the sidebar's own nav items do. Centered, with
 * no baseline rule under the row (removed same day) — the underline itself
 * is enough of a line; a second static one just added visual noise.
 *
 * Three tabs, not four: "Twin" and "Fixtures" were one subject split across two
 * panes — the fitted competition and the games it is fitted on — so they are now
 * a single Overview. Analysis and Predictions stay separate because they answer
 * different questions (what happened / what we think happens next).
 *
 * No icons, per the frontend's CD #6. Weight, motion and counts carry the
 * hierarchy instead.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'

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

/* ── Underline geometry ─────────────────────────────────────────────────
 * Tabs are no longer equal-width slots (the old grid math assumed that), so
 * the underline is positioned against the active button's actual bounding
 * box, measured relative to the row. Recomputed on tab change and on resize.
 */
const tabRefs = ref([])
const underlineStyle = ref({ width: '0px', transform: 'translateX(0px)' })

function measure() {
  const el = tabRefs.value[activeIndex.value]
  const row = el?.parentElement
  if (!el || !row) return
  const elRect = el.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  underlineStyle.value = {
    width: `${elRect.width}px`,
    transform: `translateX(${elRect.left - rowRect.left}px)`,
  }
}

onMounted(async () => {
  await nextTick()
  measure()
  window.addEventListener('resize', measure, { passive: true })
})
watch(() => [props.activeTab, tabs.value.length], async () => {
  await nextTick()
  measure()
})
</script>

<style scoped>
.tabbar {
  position: relative;
}

.tab-btn {
  position: relative;
  padding: 0.15rem 0.05rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgb(113, 113, 122);
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: color 180ms ease, transform 140ms ease;
}
@media (min-width: 640px) {
  .tab-btn { font-size: 0.95rem; }
}
.tab-btn:hover:not(:disabled) { color: rgb(200, 202, 208); }
.tab-btn:active:not(:disabled) { transform: translateY(1px); }
.tab-btn-on {
  color: rgb(244, 245, 247);
  font-weight: 700;
}
.tab-btn-off {
  opacity: 0.4;
  cursor: not-allowed;
}
.tab-btn-off:hover { color: rgb(113, 113, 122); }

/* The sliding indicator — a thick underline, not a filled pill. It sits on
   the baseline, glowing forward into the content it governs rather than
   backward like a card selection would. */
.tab-underline {
  position: absolute;
  bottom: -1px;
  height: 2.5px;
  border-radius: 999px;
  background: linear-gradient(90deg, #3987e5, #63a4ee);
  box-shadow: 0 0 12px 0 rgba(57, 135, 229, 0.75);
  transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .tab-underline, .tab-btn { transition: none; }
}
</style>
