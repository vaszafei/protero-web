<script setup lang="ts">
import { nextTick, onBeforeUnmount, watch } from 'vue'

/**
 * The one right-hand drawer. Slides in from the right edge at full viewport
 * height over a dimmed backdrop. Replaces the old mobile bottom sheet.
 *
 * The page never scrolls while the drawer is open: the body scroll is locked
 * (`document.body.style.overflow`), the backdrop fills the viewport, and the
 * content slot lives in its own `.panel-scroll` column inside the panel.
 * Esc and a backdrop click close it; focus moves into the panel on open and
 * returns to the previously focused element on close.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  /** Human label for the panel, announced to assistive tech. */
  label: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const panelRef = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

/** Keep Tab inside the panel while it is open. */
function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const panel = panelRef.value
  if (!panel) return
  const focusables = panel.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || !panel.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
    e.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    returnFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    panelRef.value?.focus()
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
    if (returnFocus) {
      returnFocus.focus()
      returnFocus = null
    }
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-drawer">
      <div
        v-if="open"
        class="ui-drawer-overlay"
        @click.self="$emit('close')"
      >
        <div
          ref="panelRef"
          class="ui-drawer-panel"
          role="dialog"
          :aria-modal="true"
          :aria-label="label || undefined"
          tabindex="-1"
          @keydown="trapFocus"
        >
          <header v-if="$slots.header" class="ui-drawer-head">
            <slot name="header" />
          </header>
          <div class="ui-drawer-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.ui-drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(640px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--edge);
  box-shadow: var(--shadow-modal);
  outline: none;
}

.ui-drawer-overlay:focus-within .ui-drawer-panel {
  border-left-color: var(--edge-lit);
}

/* Header stays put; the body scrolls its own content (`panel-scroll` idiom). */
.ui-drawer-head {
  flex-shrink: 0;
  border-bottom: 1px solid var(--edge-soft);
}

.ui-drawer-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Slide + backdrop fade on the shared motion tokens. */
.ui-drawer-enter-active .ui-drawer-panel,
.ui-drawer-leave-active .ui-drawer-panel {
  transition: transform var(--dur) var(--ease-rise);
}
.ui-drawer-enter-active,
.ui-drawer-leave-active {
  transition: opacity var(--dur) ease;
}
.ui-drawer-enter-from,
.ui-drawer-leave-to {
  opacity: 0;
}
.ui-drawer-enter-from .ui-drawer-panel,
.ui-drawer-leave-to .ui-drawer-panel {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .ui-drawer-enter-active,
  .ui-drawer-leave-active,
  .ui-drawer-enter-active .ui-drawer-panel,
  .ui-drawer-leave-active .ui-drawer-panel {
    transition: none;
  }
}
</style>
