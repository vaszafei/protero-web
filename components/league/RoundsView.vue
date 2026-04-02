<template>
  <Card :padding="null">
    <div class="p-3 sm:p-6">
    <!-- Round Navigation Header -->
    <div class="mb-4 sm:mb-6">
      <!-- Top Row: Navigation -->
      <div class="flex items-center justify-between mb-3 sm:mb-4">
        <button
          @click="$emit('previousRound')"
          :disabled="selectedRound <= 1"
          class="p-1.5 sm:p-2 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft :size="20" class="text-zinc-400" />
        </button>
        
        <div class="flex flex-col sm:flex-row items-center justify-between w-full mx-2 sm:mx-4 gap-2">
          <!-- Center: Round title with version badge -->
          <div class="flex items-center gap-2 order-first sm:order-none">
            <h2 v-if="sport !== 'basketball'" class="text-lg sm:text-2xl font-bold text-zinc-100">Round {{ selectedRound }}</h2>
            <h2 v-else class="text-lg sm:text-2xl font-bold text-zinc-100">{{ formatBballDate(selectedDate) }}</h2>
            <span v-if="hasV18Predictions" class="px-2 py-0.5 sm:py-1 bg-purple-600 text-white text-[11px] sm:text-xs font-bold rounded-full">
              v18
            </span>
            <span v-else-if="hasV2Predictions" class="px-2 py-0.5 sm:py-1 bg-blue-600 text-white text-[11px] sm:text-xs font-bold rounded-full">
              v2.0
            </span>
          </div>
          
          <!-- Stats chips row (wraps on mobile) -->
          <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <!-- Day/Round counter for basketball -->
            <span v-if="sport === 'basketball'" class="px-2 sm:px-3 py-0.5 sm:py-1 bg-zinc-700 text-zinc-300 text-[11px] sm:text-sm font-medium rounded-full">
              Day {{ selectedRound }} / {{ maxRound }}
            </span>
            <!-- Date chip (football only — basketball title already shows the date) -->
            <span v-if="sport !== 'basketball'" class="px-2 sm:px-3 py-0.5 sm:py-1 bg-zinc-700 text-zinc-300 text-[11px] sm:text-sm font-medium rounded-full">
              {{ formatDateRange() }}
            </span>
            
            <!-- Predictions Count -->
            <span v-if="roundPredictionsCount > 0" class="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-500/20 text-purple-400 text-[11px] sm:text-sm font-semibold rounded-full">
              {{ roundPredictionsCount }} Preds
            </span>
            
            <!-- Bets Count -->
            <span v-if="roundBetsCount > 0" class="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500/20 text-blue-400 text-[11px] sm:text-sm font-semibold rounded-full">
              {{ roundBetsCount }} Bets
            </span>
            
            <!-- Stake -->
            <span v-if="roundBetsCount > 0" class="px-2 sm:px-3 py-0.5 sm:py-1 bg-zinc-700 text-zinc-300 text-[11px] sm:text-sm font-semibold rounded-full hidden sm:inline-flex">
              Stake: €{{ roundTotalStake.toFixed(2) }}
            </span>
            
            <!-- Profit/Loss -->
            <span v-if="roundBetsCount > 0" :class="[
              'px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-sm font-semibold rounded-full',
              roundProfitLoss >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            ]">
              {{ roundProfitLoss >= 0 ? '+' : '' }}€{{ roundProfitLoss.toFixed(2) }}
            </span>
          </div>
        </div>
        
        <button
          @click="$emit('nextRound')"
          :disabled="selectedRound >= maxRound"
          class="p-1.5 sm:p-2 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight :size="20" class="text-zinc-400" />
        </button>
      </div>
      
      <!-- Bottom Row: Progress Dots (football only — too many dates for basketball) -->
      <div v-if="sport !== 'basketball'" class="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide px-2 py-1">
        <button
          v-for="round in maxRound"
          :key="round"
          @click="$emit('changeRound', round)"
          :class="[
            'relative w-2 h-2 rounded-full transition-all',
            round === selectedRound 
              ? 'bg-primary-600 w-8' 
              : 'bg-zinc-600 hover:bg-zinc-500'
          ]"
          :title="`Round ${round}`"
        />
      </div>
    </div>

    <div v-if="roundGames.length > 0" class="space-y-3">
      <!-- Group games by date -->
      <div v-for="(games, date) in gamesByDate" :key="date" class="flex gap-2 sm:gap-3">
        <!-- Date Column (Left Side) -->
        <div class="w-16 sm:w-24 flex-shrink-0">
          <div class="sticky top-4 bg-surface-light rounded-lg p-1.5 sm:p-2 text-center">
            <div class="text-[11px] sm:text-xs font-semibold text-zinc-100 leading-tight">{{ formatDateShort(date) }}</div>
            <div class="text-[11px] sm:text-[11px] text-zinc-500 mt-0.5">{{ games.length }}</div>
          </div>
        </div>

        <!-- Games Row (Horizontal) -->
        <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-2">
          <GameCard
            v-for="game in games"
            :key="game.id || `${game.home_name}-${game.away_name}`"
            :game="game"
          />
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="Calendar"
      title="No matches"
      description="No matches scheduled for this round"
    />
    </div>
  </Card>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import Card from '~/components/ui/Card.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import GameCard from '~/components/league/GameCard.vue'

const props = defineProps({
  selectedRound: {
    type: Number,
    required: true
  },
  maxRound: {
    type: Number,
    required: true
  },
  roundGames: {
    type: Array,
    required: true
  },
  sport: {
    type: String,
    default: 'football'
  },
  selectedDate: {
    type: String,
    default: null
  }
})

defineEmits(['previousRound', 'nextRound', 'changeRound'])

// Computed stats
const totalMatches = computed(() => props.roundGames.length)

const completedMatches = computed(() => {
  return props.roundGames.filter(g => 
    g.home_goals !== null && g.away_goals !== null
  ).length
})

const needScores = computed(() => {
  return props.roundGames.filter(g => 
    g.home_goals === null || g.away_goals === null
  ).length
})

// Round statistics
const roundPredictionsCount = computed(() => {
  return props.roundGames.filter(g => g.prediction_id).length
})

const hasV18Predictions = computed(() => {
  return props.roundGames.some(g => g.model_version === 'v18')
})

const hasV2Predictions = computed(() => {
  return props.roundGames.some(g => g.model_version === 'v2.0')
})

const roundBetsCount = computed(() => {
  return props.roundGames.filter(g => g.bet_id).length
})

const roundTotalStake = computed(() => {
  return props.roundGames
    .filter(g => g.bet_id)
    .reduce((sum, g) => sum + parseFloat(g.stake || 0), 0)
})

const roundProfitLoss = computed(() => {
  return props.roundGames
    .filter(g => g.bet_id)
    .reduce((total, g) => {
      // Skip games without results yet
      if (g.home_goals === null || g.away_goals === null) {
        return total
      }
      
      // Determine prediction type from game.prediction
      const predictionType = g.prediction?.toLowerCase() // 'home', 'draw', 'away', 'over', 'under'
      
      // Check if prediction won using isWinningOdds
      if (predictionType && isWinningOdds(g, predictionType)) {
        // Won: stake * odds - stake = profit
        return total + (parseFloat(g.stake) * parseFloat(g.bet_odds) - parseFloat(g.stake))
      } else if (predictionType) {
        // Lost: -stake
        return total - parseFloat(g.stake)
      }
      
      return total
    }, 0)
})

// Group games by date
const gamesByDate = computed(() => {
  const grouped = {}
  
  props.roundGames.forEach(game => {
    const date = game.date ? game.date.split('T')[0] : 'TBD'
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(game)
  })
  
  // Sort dates
  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === 'TBD') return 1
      if (b === 'TBD') return -1
      return new Date(a) - new Date(b)
    })
    .reduce((acc, date) => {
      acc[date] = grouped[date]
      return acc
    }, {})
})

// Format date range for the round
function formatDateRange() {
  const dates = Object.keys(gamesByDate.value).filter(d => d !== 'TBD').sort()
  if (dates.length === 0) return 'TBD'
  if (dates.length === 1) return formatDateShort(dates[0])
  
  const firstDate = formatDateShort(dates[0])
  const lastDate = formatDateShort(dates[dates.length - 1])
  return `${firstDate} - ${lastDate}`
}

// Format date for display
function formatDateShort(dateStr) {
  if (dateStr === 'TBD') return 'TBD'
  const date = new Date(dateStr)
  const options = { month: 'short', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

// Format basketball selected date with weekday
function formatBballDate(dateStr) {
  if (!dateStr) return 'Loading...'
  const date = new Date(dateStr + 'T12:00:00') // noon to avoid timezone offset issues
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Check if odds represent the winning outcome
function isWinningOdds(game, type) {
  if (game.home_goals === null || game.away_goals === null) return false
  
  const homeGoals = game.home_goals
  const awayGoals = game.away_goals
  const totalGoals = homeGoals + awayGoals
  
  if (type === 'home') return homeGoals > awayGoals
  if (type === 'draw') return homeGoals === awayGoals
  if (type === 'away') return awayGoals > homeGoals
  if (type === 'over') return totalGoals > 2.5
  if (type === 'under') return totalGoals < 2.5
  
  return false
}
</script>
