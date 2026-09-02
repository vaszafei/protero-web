<template>
  <span
    ref="trigger"
    class="pt-trigger"
    :tabindex="focusable ? 0 : undefined"
    :aria-describedby="open ? id : undefined"
    @mouseenter="scheduleOpen"
    @mouseleave="scheduleClose"
    @focus="scheduleOpen"
    @blur="close"
    @keydown.esc="close"
  >
    <slot />

    <Teleport to="body">
      <Transition name="pt">
        <div
          v-if="open"
          :id="id"
          role="tooltip"
          class="pt-panel"
          :style="panelStyle"
        >
          <slot name="content">{{ text }}</slot>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
/**
 * The one tooltip in the app.
 *
 * Nuxt UI's `UTooltip` takes a plain string only, and most of what is worth
 * explaining here is structured — a W/D/L chip wants opponent, score, date and
 * xG, not a sentence. So this takes a `content` slot and renders it in a
 * teleported panel positioned against the trigger's viewport rect.
 *
 * Teleported to `<body>` on purpose: the standings table and the match log both
 * live inside `overflow: auto` / `overflow: hidden` containers, and an
 * absolutely-positioned child would be clipped by them.
 *
 * Opens on hover AND on keyboard focus, closes on Escape. `focusable` is on by
 * default because a tooltip only reachable with a mouse is not reachable.
 */
import { ref, computed, onBeforeUnmount, useId } from 'vue'

const props = withDefaults(defineProps<{
  /** Plain-text content. Ignored when the `content` slot is used. */
  text?: string
  /** Preferred side. Flips automatically when there is no room. */
  placement?: 'top' | 'bottom'
  /** ms before opening on hover — stops a tooltip storm when sweeping a row. */
  delay?: number
  /** Make the trigger keyboard-focusable. Turn off only when the trigger is
   *  already a button or link that carries the same information. */
  focusable?: boolean
  /** Max panel width in px. */
  width?: number
}>(), {
  text: '',
  placement: 'top',
  delay: 120,
  focusable: true,
  width: 240,
})

const id = useId()
const trigger = ref<HTMLElement | null>(null)
const open = ref(false)
const rect = ref<DOMRect | null>(null)
const side = ref<'top' | 'bottom'>(props.placement)

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (openTimer) { clearTimeout(openTimer); openTimer = null }
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
}

function scheduleOpen() {
  clearTimers()
  openTimer = setTimeout(() => {
    const el = trigger.value
    if (!el) return
    const r = el.getBoundingClientRect()
    rect.value = r
    // Flip when the preferred side has less room than the panel is likely to need.
    const ROOM = 120
    side.value = props.placement === 'top'
      ? (r.top < ROOM ? 'bottom' : 'top')
      : (window.innerHeight - r.bottom < ROOM ? 'top' : 'bottom')
    open.value = true
  }, props.delay)
}

/** A short grace period so moving between two adjacent chips does not flicker. */
function scheduleClose() {
  clearTimers()
  closeTimer = setTimeout(close, 60)
}

function close() {
  clearTimers()
  open.value = false
}

const panelStyle = computed(() => {
  const r = rect.value
  if (!r) return {}
  const cx = r.left + r.width / 2
  // Keep the panel inside the viewport horizontally.
  const half = props.width / 2
  const left = Math.min(Math.max(cx, half + 8), window.innerWidth - half - 8)
  return {
    left: `${left}px`,
    top: side.value === 'top' ? `${r.top - 8}px` : `${r.bottom + 8}px`,
    transform: `translate(-50%, ${side.value === 'top' ? '-100%' : '0'})`,
    maxWidth: `${props.width}px`,
  }
})

onBeforeUnmount(clearTimers)
</script>

<style scoped>
.pt-trigger {
  display: inline-flex;
  outline: none;
}
.pt-trigger:focus-visible {
  outline: 2px solid var(--brand-blue);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}

.pt-panel {
  position: fixed;
  z-index: 9998;
  pointer-events: none;
  padding: 0.45rem 0.6rem;
  border-radius: var(--r-sm);
  background: var(--surface-lift);
  border: 1px solid var(--edge-lit);
  box-shadow: var(--shadow-modal);
  color: var(--ink);
  font-size: 0.68rem;
  line-height: 1.45;
  white-space: normal;
  text-align: left;
}

.pt-enter-active,
.pt-leave-active {
  transition: opacity var(--dur-fast) ease, transform var(--dur-fast) var(--ease-rise);
}
.pt-enter-from,
.pt-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pt-enter-active,
  .pt-leave-active { transition: none; }
}
</style>
