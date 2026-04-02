<template>
  <div class="flex items-center justify-between mb-4 sm:mb-6">
    <div>
      <h1 class="text-xl sm:text-2xl font-bold text-zinc-100">Dashboard</h1>
      <p class="text-xs text-zinc-500 mt-0.5">Match schedule and predictions overview</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        @click="$emit('refresh')"
        :disabled="loading"
        class="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-surface-light transition-colors disabled:opacity-40"
        title="Refresh data"
      >
        <svg
          :class="['w-4.5 h-4.5', { 'animate-spin': loading }]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">

defineProps<{
  loading: boolean
}>()

defineEmits<{
  'refresh': []
}>()
</script>
