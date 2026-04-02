<template>
  <div class="bg-surface-light border-2 border-dashed border-edge rounded-lg p-12 text-center">
    <div v-if="icon" class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-light mb-4">
      <component :is="icon" :size="32" class="text-zinc-500" />
    </div>
    <h3 class="text-lg font-semibold text-zinc-100 mb-2">{{ title }}</h3>
    <p class="text-sm text-zinc-400 mb-6 max-w-md mx-auto">{{ description }}</p>
    <slot name="action">
      <UButton
        v-if="actionLabel && action"
        @click="action"
        :icon="actionIcon"
        color="primary"
      >
        {{ actionLabel }}
      </UButton>
    </slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: any
  title: string
  description: string
  actionLabel?: string
  actionIcon?: string
  action?: () => void
}>()
</script>
