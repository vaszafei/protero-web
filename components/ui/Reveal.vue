<template>
  <div class="reveal" :style="{ '--d': `${delay}ms` }">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** Per-index stagger delay in ms. */
  delay?: number
}>(), {
  delay: 0,
})
</script>

<style scoped>
.reveal {
  animation: rise 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--d, 0ms);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
  }
}
</style>
