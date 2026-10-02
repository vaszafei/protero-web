<template>
  <div class="es" :class="{ 'es-compact': compact }" role="alert">
    <div class="es-text">
      <p class="es-t">{{ title }}</p>
      <p v-if="error" class="es-b">{{ error }}</p>
    </div>
    <button v-if="retryable" type="button" class="es-retry" @click="$emit('retry')">Retry</button>
  </div>
</template>

<script setup lang="ts">
/**
 * A failed read. The rule across the console: a panel renders its EMPTY state
 * only when the call succeeded with zero rows; any failure renders this, with the
 * error text and a Retry. A swallowed error that reads as "No pending singles"
 * or `n<10` is the failure mode this app has already paid for.
 */
withDefaults(defineProps<{
  title?: string
  error?: string | null
  /** Retry button; hide it where there is nothing to re-run. */
  retryable?: boolean
  /** One tight line, for a slot inside a card rather than a whole panel. */
  compact?: boolean
}>(), { title: 'Failed to load.', error: null, retryable: true, compact: false })

defineEmits<{ (e: 'retry'): void }>()
</script>

<style scoped>
.es {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.8rem; border-radius: var(--r); border: 1px solid var(--brand-red-edge);
  background: var(--brand-red-tint);
}
.es-compact { padding: 0.45rem 0.6rem; }
.es-text { min-width: 0; }
.es-t { font-size: 0.75rem; font-weight: 700; color: var(--brand-red-hi); }
.es-b { margin-top: 0.2rem; font-size: 0.7rem; color: var(--ink-faint); overflow-wrap: anywhere; }
.es-compact .es-b { display: none; }
.es-retry {
  flex-shrink: 0; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.65rem;
  border-radius: var(--r-pill); border: 1px solid var(--brand-red-edge);
  color: var(--ink-strong); background: transparent; cursor: pointer;
}
.es-retry:hover { background: var(--neutral-tint); }
</style>
