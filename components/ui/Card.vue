<template>
  <div 
    class="bg-surface border border-edge rounded-lg transition-colors"
    :class="[
      padding && `p-${padding}`,
      hover && 'hover:border-primary-500/50',
      shadow && 'shadow-sm shadow-black/20'
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  padding?: string
  hover?: boolean
  shadow?: boolean
}>(), {
  padding: '6',
  hover: false,
  shadow: false
})
</script>
