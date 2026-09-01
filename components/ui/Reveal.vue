<template>
  <div ref="el" class="reveal" :class="{ 'reveal-in': visible }" :style="{ '--d': `${delay}ms` }">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  /** Per-index stagger delay in ms. */
  delay?: number
}>(), {
  delay: 0,
})

const el = ref<HTMLElement | null>(null)
const visible = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !el.value) {
    visible.value = true
    return
  }
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        visible.value = true
        observer?.disconnect()
        observer = null
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
  observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.reveal {
  opacity: 0;
}

.reveal-in {
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
    opacity: 1;
  }
  .reveal-in {
    animation: none;
  }
}
</style>
