<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <RefreshCw :size="32" class="animate-spin text-primary-400" />
        <p class="text-sm text-zinc-400">Loading matches...</p>
      </div>
    </div>
    
    <!-- Empty State -->
    <EmptyState
      v-else-if="!matches || matches.length === 0"
      icon="Trophy"
      title="No matches found"
      description="Select a league to view matches"
    />

    <!-- Rounds Carousel -->
    <div v-else class="space-y-4">
      <!-- Round Navigation -->
      <Card padding="4">
        <div class="flex items-center justify-between">
          <button
            @click="previousRound"
            :disabled="currentRoundIndex === 0"
            class="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-light"
          >
            <ChevronLeft :size="20" class="text-zinc-300" />
          </button>

          <div class="flex-1 text-center">
            <div class="flex items-center justify-center gap-3 flex-wrap">
              <h2 class="text-lg font-semibold text-zinc-100">Round {{ currentRound }}</h2>
              
              <!-- Total Matches Badge -->
              <span class="px-2.5 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium">
                {{ currentRoundStats.total }} matches
              </span>
              
              <!-- Completed Badge -->
              <span 
                v-if="currentRoundStats.completed > 0"
                class="px-2.5 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium"
              >
                {{ currentRoundStats.completed }} completed
              </span>
              
              <!-- Needs Update Indicators -->
              <span 
                v-if="currentRoundStats.needsScoreUpdate > 0"
                class="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium"
              >
                {{ currentRoundStats.needsScoreUpdate }} need scores
              </span>
              
              <span 
                v-if="currentRoundStats.pending > 0"
                class="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium"
              >
                {{ currentRoundStats.pending }} scheduled
              </span>
              
              <span 
                v-if="currentRoundStats.missingOdds > 0"
                class="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium"
              >
                {{ currentRoundStats.missingOdds }} no odds
              </span>
              

            </div>
          </div>

          <button
            @click="nextRound"
            :disabled="currentRoundIndex === roundKeys.length - 1"
            class="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-light"
          >
            <ChevronRight :size="20" class="text-zinc-300" />
          </button>
        </div>
      </Card>

      <!-- Round Indicator Dots -->
      <div class="flex justify-center gap-2">
        <button
          v-for="(round, index) in roundKeys"
          :key="round"
          @click="currentRoundIndex = index"
          :class="[
            'relative w-2 h-2 rounded-full transition-all',
            currentRoundIndex === index 
              ? 'bg-primary-600 w-8' 
              : roundStats[round]?.needsUpdate
                ? 'bg-orange-400 hover:bg-orange-500/200'
                : 'bg-zinc-600 hover:bg-zinc-600'
          ]"
          :title="roundStats[round]?.needsUpdate ? `Round ${round} needs updates` : `Round ${round}`"
        />
      </div>

      <!-- Match Cards -->
      <div class="space-y-1">
        <AdminMatchCard
          v-for="match in currentRoundMatches"
          :key="match.id"
          :match="match"
          @saved="$emit('refresh')"
          @url-changed="handleUrlChanged"
          @deleted="handleGameDeleted"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-vue-next'
import Card from '~/components/ui/Card.vue'
import EmptyState from '~/components/ui/EmptyState.vue'

const props = defineProps({
  matches: {
    type: Array,
    default: () => []
  },
  leagueKey: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh', 'game-deleted'])

const toast = useToast()
const currentRoundIndex = ref(0)


// Track URLs from input fields (not just saved ones)
const urlInputs = ref({}) // { gameId: url }

const handleUrlChanged = ({ gameId, url }) => {
  if (url) {
    urlInputs.value[gameId] = url
  } else {
    delete urlInputs.value[gameId]
  }
}

const handleGameDeleted = (gameId) => {
  emit('game-deleted', gameId)
}

// Get games in current round that have FlashScore URLs (from inputs OR saved)
const gamesWithUrls = computed(() => {
  return currentRoundMatches.value.filter(m => {
    const inputUrl = urlInputs.value[m.id]
    const savedUrl = m.flashscore_url
    return (inputUrl && inputUrl.includes('flashscore')) || (savedUrl && savedUrl.includes('flashscore'))
  })
})

// Get the URL for a game (prefer input over saved)
const getGameUrl = (match) => {
  return urlInputs.value[match.id] || match.flashscore_url
}

// Check if game has full stats
const hasStats = (match) => {
  const hasShots = match.home_shots > 0 || match.away_shots > 0
  const hasCorners = match.home_corners > 0 || match.away_corners > 0
  const hasPossession = match.home_possession_pct && match.home_possession_pct !== 50
  return hasShots && (hasCorners || hasPossession)
}

const matchesByRound = computed(() => {
  const grouped = {}
  props.matches.forEach(match => {
    const round = match.round || 'Unknown Round'
    if (!grouped[round]) {
      grouped[round] = []
    }
    grouped[round].push(match)
  })
  
  // Sort rounds numerically
  return Object.keys(grouped)
    .sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, ''))
      const bNum = parseInt(b.replace(/\D/g, ''))
      return aNum - bNum
    })
    .reduce((acc, key) => {
      acc[key] = grouped[key]
      return acc
    }, {})
})

const roundKeys = computed(() => Object.keys(matchesByRound.value))

// Calculate round statistics for smart indicators
const roundStats = computed(() => {
  const now = new Date()
  const stats = {}
  
  Object.entries(matchesByRound.value).forEach(([round, matches]) => {
    // Count matches that should be completed (date has passed) but don't have scores
    const needsScoreUpdate = matches.filter(m => {
      if (m.home_goals !== null && m.away_goals !== null) return false
      if (!m.date) return false
      const matchDate = new Date(m.date)
      return matchDate < now
    })
    
    stats[round] = {
      total: matches.length,
      completed: matches.filter(m => m.status === 'completed').length,
      pending: matches.filter(m => m.status === 'scheduled').length,
      missingScores: matches.filter(m => m.home_goals === null || m.away_goals === null).length,
      missingOdds: matches.filter(m => !m.home_odds).length,
      needsScoreUpdate: needsScoreUpdate.length,
      needsUpdate: false
    }
    // Mark as needs update if games have passed but no scores, or missing odds
    stats[round].needsUpdate = stats[round].needsScoreUpdate > 0 || 
                               stats[round].missingOdds > 0
  })
  return stats
})

const currentRound = computed(() => roundKeys.value[currentRoundIndex.value] || 1)

const currentRoundMatches = computed(() => {
  return matchesByRound.value[currentRound.value] || []
})

const currentRoundStats = computed(() => {
  return roundStats.value[currentRound.value] || {
    total: 0,
    completed: 0,
    pending: 0,
    missingScores: 0,
    missingOdds: 0,
    needsScoreUpdate: 0,
    needsUpdate: false
  }
})

const currentRoundFinished = computed(() => {
  return currentRoundMatches.value.filter(m => m.status === 'completed').length
})

const nextRound = () => {
  if (currentRoundIndex.value < roundKeys.value.length - 1) {
    currentRoundIndex.value++
  }
}

const previousRound = () => {
  if (currentRoundIndex.value > 0) {
    currentRoundIndex.value--
  }
}

// Start at earliest round with unplayed games when league changes
watch(() => props.matches, (newMatches, oldMatches) => {
  // If matches array length changes dramatically or goes from empty to populated, reset to appropriate round
  if (!oldMatches || oldMatches.length === 0 || 
      Math.abs(newMatches.length - oldMatches.length) > 10) {
    // Find the FIRST (earliest) round that has games without scores
    let targetIndex = roundKeys.value.length - 1 // Default to most recent if all are played
    
    for (let i = 0; i < roundKeys.value.length; i++) {
      const round = roundKeys.value[i]
      const roundMatches = matchesByRound.value[round]
      const hasUnplayedGames = roundMatches.some(m => 
        m.home_goals === null || m.away_goals === null
      )
      
      if (hasUnplayedGames) {
        targetIndex = i
        break // Found the first round with unplayed games, stop here
      }
    }
    
    currentRoundIndex.value = Math.max(0, targetIndex)
  }
  // Otherwise, keep current round if it still exists
  else if (currentRoundIndex.value >= roundKeys.value.length) {
    currentRoundIndex.value = roundKeys.value.length - 1
  }
})
</script>
