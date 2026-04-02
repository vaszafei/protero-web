<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div class="relative">
      <div 
        class="border-4 border-edge rounded-full animate-spin"
        :class="sizeClass"
        :style="{ borderTopColor: color }"
      />
    </div>
    <p v-if="text" class="mt-3 text-sm text-zinc-400">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
  containerClass?: string
}>(), {
  size: 'md',
  color: '#0284c7',
  containerClass: 'py-12'
})

const sizeClass = computed(() => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }
  return sizes[props.size]
})
</script>
