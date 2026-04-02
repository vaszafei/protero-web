<template>
  <div class="p-4 bg-surface-light rounded-lg hover:bg-surface-light transition-colors">
    <!-- Main Player Info -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <!-- Jersey Number -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
          {{ player.jersey_number }}
        </div>
        
        <!-- Name & Position -->
        <div>
          <h4 class="font-semibold text-zinc-100">{{ player.player_name }}</h4>
          <p class="text-xs text-zinc-400">{{ player.position || 'Unknown' }}</p>
        </div>
      </div>

      <!-- Rating Badge -->
      <div v-if="player.rating" class="flex-shrink-0">
        <div 
          class="px-3 py-1 rounded-full font-bold text-sm"
          :class="getRatingClass(player.rating)"
        >
          {{ player.rating }}
        </div>
      </div>
    </div>

    <!-- Player Stats Grid -->
    <div v-if="hasStats" class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-edge">
      <!-- Goals -->
      <div v-if="player.goals" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Goals</div>
        <div class="font-bold text-green-400">{{ player.goals }}</div>
      </div>

      <!-- Assists -->
      <div v-if="player.assists" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Assists</div>
        <div class="font-bold text-blue-400">{{ player.assists }}</div>
      </div>

      <!-- xG -->
      <div v-if="player.xg !== null" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">xG</div>
        <div class="font-bold text-purple-600">{{ player.xg }}</div>
      </div>

      <!-- Shots -->
      <div v-if="player.shots_total !== null" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Shots</div>
        <div class="font-bold text-zinc-300">{{ player.shots_total }}</div>
      </div>

      <!-- Passes -->
      <div v-if="player.passes !== null" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Passes</div>
        <div class="font-bold text-zinc-300">
          {{ player.passes }}
          <span v-if="player.pass_accuracy" class="text-xs text-zinc-500">
            ({{ player.pass_accuracy }}%)
          </span>
        </div>
      </div>

      <!-- Touches -->
      <div v-if="player.touches !== null" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Touches</div>
        <div class="font-bold text-zinc-300">{{ player.touches }}</div>
      </div>

      <!-- Dribbles -->
      <div v-if="player.dribbles_successful !== null" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Dribbles</div>
        <div class="font-bold text-orange-600">
          {{ player.dribbles_successful }}
          <span v-if="player.dribbles_attempted" class="text-xs text-zinc-500">
            /{{ player.dribbles_attempted }}
          </span>
        </div>
      </div>

      <!-- Duels -->
      <div v-if="player.duels !== null" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Duels</div>
        <div class="font-bold text-zinc-300">{{ player.duels }}</div>
      </div>

      <!-- Fouls -->
      <div v-if="player.fouls_committed || player.was_fouled" class="text-center">
        <div class="text-xs text-zinc-400 mb-1">Fouls</div>
        <div class="text-xs">
          <span v-if="player.fouls_committed" class="text-red-400">{{ player.fouls_committed }} ⚠️</span>
          <span v-if="player.was_fouled" class="text-blue-400 ml-1">{{ player.was_fouled }}</span>
        </div>
      </div>
    </div>

    <!-- Minutes Played -->
    <div v-if="player.minutes_played" class="mt-3 pt-3 border-t border-edge">
      <div class="flex items-center gap-2 text-xs text-zinc-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ player.minutes_played }}' played</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  player: {
    type: Object,
    required: true
  }
})

const hasStats = computed(() => {
  const p = props.player
  return p.goals || p.assists || p.xg !== null || p.shots_total !== null || 
         p.passes !== null || p.touches !== null || p.dribbles_successful !== null || 
         p.duels !== null || p.fouls_committed || p.was_fouled
})

const getRatingClass = (rating) => {
  const r = parseFloat(rating)
  if (r >= 8.5) return 'bg-green-500/20 text-green-400'
  if (r >= 7.5) return 'bg-blue-100 text-blue-400'
  if (r >= 6.5) return 'bg-surface-light text-zinc-300'
  return 'bg-orange-500/20 text-orange-400'
}
</script>
