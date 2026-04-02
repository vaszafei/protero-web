<template>
  <div class="bg-surface rounded-lg shadow-sm border border-edge p-6">
    <h3 class="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
      <span class="text-primary-400 font-bold">Referee</span>
      <span>Referee</span>
    </h3>

    <div class="space-y-4">
      <!-- Referee Name -->
      <div>
        <p class="text-xl font-semibold text-zinc-100">{{ referee.name }}</p>
        <p class="text-sm text-zinc-400">{{ referee.total_games || 0 }} games officiated</p>
      </div>

      <!-- Stats -->
      <div class="space-y-3 pt-4 border-t border-edge">
        <!-- Yellow Cards Average -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-4 h-5 bg-yellow-500 rounded-sm inline-block"></span>
            <span class="text-sm text-zinc-400">Avg Yellow Cards</span>
          </div>
          <span class="font-bold text-yellow-600">
            {{ referee.avg_yellow_cards !== null ? referee.avg_yellow_cards.toFixed(1) : 'N/A' }}
          </span>
        </div>

        <!-- Red Cards Average -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-4 h-5 bg-red-500 rounded-sm inline-block"></span>
            <span class="text-sm text-zinc-400">Avg Red Cards</span>
          </div>
          <span class="font-bold text-red-400">
            {{ referee.avg_red_cards !== null ? referee.avg_red_cards.toFixed(2) : 'N/A' }}
          </span>
        </div>

        <!-- Fouls Average -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">⚠️</span>
            <span class="text-sm text-zinc-400">Avg Fouls</span>
          </div>
          <span class="font-bold text-zinc-300">
            {{ referee.avg_fouls !== null ? referee.avg_fouls.toFixed(1) : 'N/A' }}
          </span>
        </div>
      </div>

      <!-- Strictness Indicator -->
      <div class="pt-4 border-t border-edge">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-zinc-400">Strictness Level</span>
          <span class="text-sm font-bold" :class="strictnessColor">
            {{ strictnessLabel }}
          </span>
        </div>
        <div class="w-full h-2 bg-surface-light rounded-full overflow-hidden">
          <div 
            class="h-full rounded-full transition-all duration-500"
            :class="strictnessBarColor"
            :style="{ width: `${strictnessPercentage}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  referee: {
    type: Object,
    required: true
  }
})

// Calculate strictness based on cards average
const strictnessLevel = computed(() => {
  const avgYellow = props.referee.avg_yellow_cards || 0
  const avgRed = props.referee.avg_red_cards || 0
  const totalCards = avgYellow + (avgRed * 3) // Weight red cards more
  
  if (totalCards >= 5) return 'strict'
  if (totalCards >= 3.5) return 'moderate'
  return 'lenient'
})

const strictnessLabel = computed(() => {
  switch (strictnessLevel.value) {
    case 'strict': return 'Strict'
    case 'moderate': return 'Moderate'
    default: return 'Lenient'
  }
})

const strictnessColor = computed(() => {
  switch (strictnessLevel.value) {
    case 'strict': return 'text-red-400'
    case 'moderate': return 'text-yellow-600'
    default: return 'text-green-400'
  }
})

const strictnessBarColor = computed(() => {
  switch (strictnessLevel.value) {
    case 'strict': return 'bg-red-500/200'
    case 'moderate': return 'bg-yellow-500'
    default: return 'bg-green-500/200'
  }
})

const strictnessPercentage = computed(() => {
  switch (strictnessLevel.value) {
    case 'strict': return 90
    case 'moderate': return 60
    default: return 30
  }
})
</script>
