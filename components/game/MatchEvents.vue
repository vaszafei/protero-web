<template>
  <div>
    <div class="relative py-8">
      <!-- Horizontal Timeline Line -->
      <div class="absolute left-0 right-0 top-1/2 h-0.5 bg-surface-light -translate-y-1/2 z-0"></div>

      <!-- Events -->
      <div class="relative grid auto-cols-fr grid-flow-col">
        <div 
          v-for="(event, index) in sortedEvents" 
          :key="index"
          class="flex flex-col items-center"
        >
          <!-- Event Content (Above or Below based on team) -->
          <div 
            :class="getValidatedTeam(event) === 'home' ? 'order-1 mb-3' : 'order-3 mt-3'"
          >
            <div 
              class="px-2 py-1.5 rounded-md text-center min-w-[63px] border"
              :class="getValidatedTeam(event) === 'home' 
                ? 'bg-blue-500/20 border-blue-200' 
                : 'bg-orange-500/20 border-orange-200'"
            >
              <!-- Player Name -->
              <p class="text-[11px] font-semibold text-zinc-100 truncate mb-0.5">{{ event.player }}</p>
              
              <!-- Event Type -->
              <p class="text-[11px] font-medium text-zinc-400">{{ getEventLabel(event.type) }}</p>
            </div>
          </div>

          <!-- Connecting Line -->
          <div 
            class="w-px bg-zinc-600 order-2"
            :class="getValidatedTeam(event) === 'home' ? 'h-10' : 'h-10'"
          ></div>

          <!-- Time Badge (Center on timeline) -->
          <div class="order-2 z-10">
            <span class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface border-2 border-edge text-[11px] font-bold text-zinc-100">
              {{ typeof event.minute === 'string' ? event.minute : event.minute + "'" }}
            </span>
          </div>

          <!-- Empty space for opposite side -->
          <div 
            class="h-10 order-2"
            :class="getValidatedTeam(event) === 'home' ? 'order-3' : 'order-1'"
          ></div>
        </div>
      </div>

      <!-- Team Labels -->
      <div class="grid grid-cols-2 gap-4 mt-10 pt-6 border-t border-edge">
        <div class="text-center">
          <div class="inline-block px-4 py-2 bg-blue-500/20 border border-blue-200 rounded-md">
            <p class="text-sm font-semibold text-zinc-100">{{ homeName }}</p>
            <p class="text-[11px] text-zinc-400">Home Team Events</p>
          </div>
        </div>
        <div class="text-center">
          <div class="inline-block px-4 py-2 bg-orange-500/20 border border-orange-200 rounded-md">
            <p class="text-sm font-semibold text-zinc-100">{{ awayName }}</p>
            <p class="text-[11px] text-zinc-400">Away Team Events</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    required: true
  },
  homeName: {
    type: String,
    required: true
  },
  awayName: {
    type: String,
    required: true
  },
  homeLineup: {
    type: Array,
    default: () => []
  },
  awayLineup: {
    type: Array,
    default: () => []
  }
})

// Create normalized player name lookup for team validation
const normalizePlayerName = (name) => {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim()
}

const homePlayerNames = computed(() => {
  return props.homeLineup.map(p => normalizePlayerName(p.player_name || p.name || ''))
})

const awayPlayerNames = computed(() => {
  return props.awayLineup.map(p => normalizePlayerName(p.player_name || p.name || ''))
})

// Validate team assignment based on lineup data
const getValidatedTeam = (event) => {
  const normalizedEventPlayer = normalizePlayerName(event.player)
  
  // Check if player is in home lineup
  const isInHomeTeam = homePlayerNames.value.some(name => 
    name.includes(normalizedEventPlayer) || normalizedEventPlayer.includes(name)
  )
  
  // Check if player is in away lineup
  const isInAwayTeam = awayPlayerNames.value.some(name => 
    name.includes(normalizedEventPlayer) || normalizedEventPlayer.includes(name)
  )
  
  // If found in lineups, use that; otherwise fall back to event.team
  if (isInHomeTeam) return 'home'
  if (isInAwayTeam) return 'away'
  return event.team || 'home' // fallback
}

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) => {
    const minuteA = typeof a.minute === 'string' 
      ? parseInt(a.minute.replace(/['+]/g, '')) 
      : parseInt(a.minute) || 0
    const minuteB = typeof b.minute === 'string' 
      ? parseInt(b.minute.replace(/['+]/g, '')) 
      : parseInt(b.minute) || 0
    return minuteA - minuteB
  })
})

const getEventIcon = (type) => {
  const icons = {
    goal: '⚽',
    'yellow-card': '🟨',
    'red-card': '🟥',
    substitution: '🔄',
    'var': '📺',
    'penalty-missed': '❌',
    'own-goal': '⚽'
  }
  return icons[type] || '📍'
}

const getEventLabel = (type) => {
  const labels = {
    goal: 'Goal',
    'yellow-card': 'Yellow Card',
    'red-card': 'Red Card',
    substitution: 'Substitution',
    'var': 'VAR Decision',
    'penalty-missed': 'Penalty Missed',
    'own-goal': 'Own Goal'
  }
  return labels[type] || type
}
</script>
