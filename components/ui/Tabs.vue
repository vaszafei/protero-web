<template>
  <div ref="railRef" class="ut" :class="`ut-${size}`" role="tablist">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.key"
      :ref="(el) => setTabRef(el, i)"
      type="button"
      role="tab"
      class="ut-tab"
      :class="{ 'is-active': tab.key === modelValue }"
      :aria-selected="tab.key === modelValue"
      :tabindex="tab.key === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      :title="tab.hint || undefined"
      @click="select(tab)"
      @keydown="onKey($event, i)"
    >
      {{ tab.label }}
      <span v-if="tab.badge != null" class="ut-badge tabular-nums">{{ tab.badge }}</span>
    </button>
    <span class="ut-line" :class="{ 'is-ready': ready }" :style="lineStyle" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
/**
 * The one tab rail: a row of labels with a single underline that glides to the
 * active one (`--ease-glide`). Counts ride along as badges, arrow keys move
 * between tabs, a disabled tab says why in its `hint`. Replaces GameTabs, the
 * league TabNavigation and the wallet page's three hand-rolled button rows.
 *
 * The underline is placed from `offsetLeft`/`offsetWidth`, not bounding rects, so
 * a route transition that is still moving the page cannot skew the measurement.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface UiTab {
  key: string
  label: string
  /** A count shown as a dim chip after the label. */
  badge?: number | string | null
  disabled?: boolean
  /** Tooltip — the reason a tab is disabled. */
  hint?: string
}

const props = withDefaults(defineProps<{
  tabs: UiTab[]
  modelValue: string
  /** `md` is a section switch; `sm` fits a panel header or a filter row. */
  size?: 'md' | 'sm'
}>(), { size: 'md' })

const emit = defineEmits<{ (e: 'update:modelValue', key: string): void }>()

const railRef = ref<HTMLElement | null>(null)
const tabEls: (HTMLElement | null)[] = []
const lineStyle = ref<Record<string, string>>({ width: '0px', transform: 'translateX(0px)' })
// The first placement must not animate in from x=0.
const ready = ref(false)

function setTabRef(el: unknown, i: number) {
  tabEls[i] = (el as HTMLElement) ?? null
}

function measure() {
  const i = props.tabs.findIndex((t) => t.key === props.modelValue)
  const el = i < 0 ? null : tabEls[i]
  if (!el) {
    lineStyle.value = { width: '0px', transform: 'translateX(0px)' }
    return
  }
  lineStyle.value = { width: `${el.offsetWidth}px`, transform: `translateX(${el.offsetLeft}px)` }
}

function select(tab: UiTab) {
  if (!tab.disabled && tab.key !== props.modelValue) emit('update:modelValue', tab.key)
}

/** Arrow / Home / End move to the nearest enabled tab and focus it. */
function onKey(e: KeyboardEvent, from: number) {
  const n = props.tabs.length
  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  let target = -1
  if (e.key === 'Home') target = 0
  else if (e.key === 'End') target = n - 1
  else if (step) {
    for (let k = 1; k <= n; k++) {
      const j = (from + step * k + n * k) % n
      if (!props.tabs[j].disabled) { target = j; break }
    }
  }
  if (target < 0 || props.tabs[target]?.disabled) return
  e.preventDefault()
  select(props.tabs[target])
  tabEls[target]?.focus()
}

let observer: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  measure()
  // Two frames: the first placement lands unanimated, every later one glides.
  requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true }))
  if (typeof ResizeObserver !== 'undefined' && railRef.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(railRef.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

watch(() => [props.modelValue, props.tabs.map((t) => `${t.label}|${t.badge}`).join()], () => nextTick(measure))
</script>

<style scoped>
.ut {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.ut::-webkit-scrollbar { display: none; }

.ut-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  color: var(--ink-mute);
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color var(--dur-fast) ease;
}
.ut-tab:hover:not(:disabled) { color: var(--ink-soft); }
.ut-tab.is-active { color: var(--ink-strong); }
.ut-tab:disabled { opacity: 0.4; cursor: not-allowed; }
.ut-tab:focus-visible { outline: 1px solid var(--brand-blue-edge); outline-offset: 2px; border-radius: 0.25rem; }

.ut-md { gap: 1.5rem; }
.ut-md .ut-tab { padding: 0.15rem 0.05rem 0.7rem; font-size: 0.9rem; }
.ut-sm { gap: 0.9rem; }
.ut-sm .ut-tab { padding: 0.2rem 0.05rem 0.45rem; font-size: 0.72rem; }

.ut-badge {
  padding: 0 0.3rem;
  border-radius: var(--r-pill);
  background: var(--neutral-tint);
  color: var(--ink-mute);
  font-size: 0.6rem;
  font-weight: 700;
}
.ut-tab.is-active .ut-badge { background: var(--brand-blue-tint); color: var(--brand-blue-hi); }

.ut-line {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: var(--brand-blue);
  pointer-events: none;
}
.ut-line.is-ready {
  transition:
    transform var(--dur-slow) var(--ease-glide),
    width var(--dur-slow) var(--ease-glide);
}

@media (prefers-reduced-motion: reduce) {
  .ut-line.is-ready, .ut-tab { transition: none; }
}
</style>
