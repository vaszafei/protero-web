<template>
  <div class="empty-card text-center py-12">
    <h3 class="text-lg font-semibold text-zinc-200 mb-2">{{ title }}</h3>
    <p class="text-zinc-500 mb-4">{{ description }}</p>
    <slot>
      <button
        @click="$emit('action')"
        class="action-btn px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
      >
        {{ actionText }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description: string
  actionText?: string
}>(), {
  actionText: 'Take Action'
})

defineEmits<{
  'action': []
}>()
</script>

<style scoped>
.empty-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02);
}

.action-btn {
  background: linear-gradient(135deg, #f82828, #0848a8);
}
</style>
