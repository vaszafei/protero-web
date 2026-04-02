<template>
  <div class="bg-surface-light rounded-lg p-2 border border-edge">
    <!-- Header with Filters -->
    <div class="flex items-center justify-between mb-2">
      <div class="text-xs font-semibold text-zinc-300">Trends (All Rounds)</div>
      
      <!-- Metric Filter -->
      <div class="flex gap-1">
        <button 
          v-for="metric in ['goals', 'shots', 'corners', 'cards']"
          :key="metric"
          @click="selectedMetric = metric"
          class="px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors"
          :class="selectedMetric === metric ? 'bg-zinc-700 text-white' : 'bg-surface text-zinc-400 border border-edge hover:border-edge-light'"
        >
          {{ metric === 'goals' ? 'Goals' : metric === 'shots' ? 'Shots' : metric === 'corners' ? 'Corners' : 'Cards' }}
        </button>
      </div>
    </div>
    
    <!-- Team and Venue Filters -->
    <div class="flex items-center gap-1 mb-2 text-[11px]">
      <span class="text-zinc-400">Show:</span>
      <!-- Team Filter -->
      <button 
        @click="teamFilter = 'both'"
        class="px-1.5 py-0.5 rounded font-medium"
        :class="teamFilter === 'both' ? 'bg-surface-light text-white' : 'bg-surface text-zinc-400 border border-edge'"
      >Both</button>
      <button 
        @click="teamFilter = 'home'"
        class="px-1.5 py-0.5 rounded font-medium"
        :class="teamFilter === 'home' ? 'bg-blue-600 text-white' : 'bg-surface text-zinc-400 border border-edge'"
      >{{ homeName }}</button>
      <button 
        @click="teamFilter = 'away'"
        class="px-1.5 py-0.5 rounded font-medium"
        :class="teamFilter === 'away' ? 'bg-green-600 text-white' : 'bg-surface text-zinc-400 border border-edge'"
      >{{ awayName }}</button>
      
      <span class="text-zinc-500">|</span>
      
      <!-- Venue Filter -->
      <span class="text-zinc-400">Venue:</span>
      <button 
        @click="venueFilter = 'all'"
        class="px-1.5 py-0.5 rounded font-medium"
        :class="venueFilter === 'all' ? 'bg-surface-light text-white' : 'bg-surface text-zinc-400 border border-edge'"
      >All</button>
      <button 
        @click="venueFilter = 'home'"
        class="px-1.5 py-0.5 rounded font-medium"
        :class="venueFilter === 'home' ? 'bg-emerald-600 text-white' : 'bg-surface text-zinc-400 border border-edge'"
      >Home</button>
      <button 
        @click="venueFilter = 'away'"
        class="px-1.5 py-0.5 rounded font-medium"
        :class="venueFilter === 'away' ? 'bg-orange-600 text-white' : 'bg-surface text-zinc-400 border border-edge'"
      >Away</button>
    </div>
    
    <!-- Compact Mini Sparklines -->
    <div class="space-y-2">
      <!-- Home Team -->
      <div v-if="teamFilter === 'both' || teamFilter === 'home'" class="flex items-center gap-2">
        <span class="text-[11px] font-medium text-blue-400 w-24 truncate">{{ homeName }}</span>
        <div class="flex-1 flex items-center gap-0.5">
          <div 
            v-for="(game, idx) in homeTeamData" 
            :key="'home-' + idx"
            class="flex-1 bg-blue-100 rounded-sm flex items-end justify-center"
            :style="{ height: '32px' }"
            :title="`Round ${game.round}: ${game.value} ${selectedMetric}`"
          >
            <div 
              class="w-full bg-blue-600 rounded-sm transition-all"
              :style="{ height: (game.value / maxValue * 100) + '%', minHeight: game.value > 0 ? '8%' : '0' }"
            ></div>
          </div>
        </div>
        <span class="text-[11px] font-bold text-zinc-300 w-8 text-right">{{ homeAvg }}</span>
      </div>
      
      <!-- Away Team -->
      <div v-if="teamFilter === 'both' || teamFilter === 'away'" class="flex items-center gap-2">
        <span class="text-[11px] font-medium text-green-400 w-24 truncate">{{ awayName }}</span>
        <div class="flex-1 flex items-center gap-0.5">
          <div 
            v-for="(game, idx) in awayTeamData" 
            :key="'away-' + idx"
            class="flex-1 bg-green-500/20 rounded-sm flex items-end justify-center"
            :style="{ height: '32px' }"
            :title="`Round ${game.round}: ${game.value} ${selectedMetric}`"
          >
            <div 
              class="w-full bg-green-600 rounded-sm transition-all"
              :style="{ height: (game.value / maxValue * 100) + '%', minHeight: game.value > 0 ? '8%' : '0' }"
            ></div>
          </div>
        </div>
        <span class="text-[11px] font-bold text-zinc-300 w-8 text-right">{{ awayAvg }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  homeName: { type: String, required: true },
  awayName: { type: String, required: true },
  games: { type: Array, required: true }
})

const selectedMetric = ref('goals')
const teamFilter = ref('both') // 'both', 'home', 'away'
const venueFilter = ref('all') // 'all', 'home', 'away'

// Get data for a team's all games
function getTeamData(teamName) {
  return props.games
    .filter(game => {
      const isParticipant = game.home_name === teamName || game.away_name === teamName
      const isCompleted = game.status === 'completed'
      
      if (!isParticipant || !isCompleted) return false
      
      // Apply venue filter
      if (venueFilter.value === 'home' && game.home_name !== teamName) return false
      if (venueFilter.value === 'away' && game.away_name !== teamName) return false
      
      return true
    })
    .sort((a, b) => a.round - b.round)
    .map(game => {
      const isHome = game.home_name === teamName
      let value = 0
      
      switch(selectedMetric.value) {
        case 'goals':
          value = isHome ? (game.home_goals || 0) : (game.away_goals || 0)
          break
        case 'shots':
          value = isHome ? (game.home_shots || 0) : (game.away_shots || 0)
          break
        case 'corners':
          value = isHome ? (game.home_corners || 0) : (game.away_corners || 0)
          break
        case 'cards':
          value = isHome ? (game.home_yellow_cards || 0) : (game.away_yellow_cards || 0)
          break
      }
      
      return {
        round: game.round,
        value: value
      }
    })
}

const homeTeamData = computed(() => getTeamData(props.homeName))
const awayTeamData = computed(() => getTeamData(props.awayName))

const maxValue = computed(() => {
  const allValues = [...homeTeamData.value, ...awayTeamData.value].map(g => g.value)
  const max = Math.max(...allValues, 1)
  
  // Set appropriate max scale based on metric
  switch(selectedMetric.value) {
    case 'goals': return Math.max(max, 3)
    case 'shots': return Math.max(max, 15)
    case 'corners': return Math.max(max, 10)
    case 'cards': return Math.max(max, 5)
    default: return max
  }
})

const homeAvg = computed(() => {
  if (homeTeamData.value.length === 0) return '0.0'
  const sum = homeTeamData.value.reduce((acc, g) => acc + g.value, 0)
  return (sum / homeTeamData.value.length).toFixed(1)
})

const awayAvg = computed(() => {
  if (awayTeamData.value.length === 0) return '0.0'
  const sum = awayTeamData.value.reduce((acc, g) => acc + g.value, 0)
  return (sum / awayTeamData.value.length).toFixed(1)
})
</script>
