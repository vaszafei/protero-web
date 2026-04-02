<template>
  <div class="bg-surface rounded-lg shadow-sm border border-edge p-6">
    <h3 class="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
      <span>ℹ️</span>
      <span>Match Info</span>
    </h3>

    <div class="space-y-3 text-sm">
      <!-- League -->
      <div class="flex items-start gap-3">
        <span class="text-zinc-400 min-w-[80px]">League:</span>
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ game.league_flag }}</span>
          <span class="font-medium text-zinc-100">{{ game.league_name }}</span>
        </div>
      </div>

      <!-- Round -->
      <div class="flex items-start gap-3">
        <span class="text-zinc-400 min-w-[80px]">Round:</span>
        <span class="font-medium text-zinc-100">{{ game.round }}</span>
      </div>

      <!-- Date & Time -->
      <div class="flex items-start gap-3">
        <span class="text-zinc-400 min-w-[80px]">Date:</span>
        <div class="font-medium text-zinc-100">
          <p>{{ formatDate(game.date) }}</p>
          <p class="text-primary-400">{{ formatTime(game.date) }}</p>
        </div>
      </div>

      <!-- Status -->
      <div class="flex items-start gap-3">
        <span class="text-zinc-400 min-w-[80px]">Status:</span>
        <span 
          class="inline-block px-2 py-1 rounded text-xs font-semibold"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
      </div>

      <!-- FlashScore Link -->
      <div v-if="game.flashscore_url" class="pt-3 border-t border-edge">
        <a 
          :href="game.flashscore_url" 
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 text-primary-400 hover:text-primary-400 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span class="text-sm font-medium">View on FlashScore</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  game: {
    type: Object,
    required: true
  }
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

const statusLabel = computed(() => {
  switch (props.game.status) {
    case 'completed': return 'Full Time'
    case 'live': return 'LIVE'
    case 'scheduled': return 'Scheduled'
    default: return props.game.status
  }
})

const statusClass = computed(() => {
  switch (props.game.status) {
    case 'completed': return 'bg-green-500/20 text-green-400'
    case 'live': return 'bg-red-500/20 text-red-400'
    case 'scheduled': return 'bg-surface-light text-zinc-300'
    default: return 'bg-surface-light text-zinc-300'
  }
})
</script>
