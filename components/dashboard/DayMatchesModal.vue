<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    @click.self="$emit('close')"
  >
    <div class="bg-surface rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-edge">
        <div>
          <h2 class="text-2xl font-bold text-zinc-100">{{ dayName }}</h2>
          <p class="text-base text-zinc-400">{{ fullDate }} • {{ games.length }} matches</p>
        </div>
        <button
          @click="$emit('close')"
          class="text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
        </button>
      </div>

      <!-- Games List -->
      <div class="overflow-y-auto max-h-[calc(90vh-120px)] p-4">
        <div class="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          <!-- Group games by league -->
          <div v-for="(games, league) in gamesByLeague" :key="league" class="flex gap-3">
            <!-- League Column (Left Side) -->
            <div class="w-24 flex-shrink-0">
              <div class="sticky top-4 bg-surface-light rounded-lg p-2 text-center">
                <div class="text-2xl mb-1">{{ getLeagueFlag(league) }}</div>
                <div class="text-xs font-semibold text-zinc-100 leading-tight">{{ getLeagueName(league) }}</div>
                <div class="text-xs text-zinc-500 mt-0.5">{{ games.length }} {{ games.length === 1 ? 'game' : 'games' }}</div>
              </div>
            </div>

            <!-- Games Grid -->
            <div class="flex-1 grid grid-cols-2 xl:grid-cols-3 gap-2">
              <div
                v-for="game in games"
                :key="game.id"
                class="relative"
              >
                <!-- Use DashboardGameCard component -->
                <DashboardGameCard :game="game" :bets="getGameBets(game.id)" />

                <!-- Parlays referencing this game -->
                <div v-if="getGameParlays(game.id).length > 0" class="mt-1 p-1.5 bg-purple-500/10 border border-purple-500/20 rounded">
                  <div class="text-xs font-semibold text-purple-400 mb-1">{{ getGameParlays(game.id).length }} Parlay{{ getGameParlays(game.id).length > 1 ? 's' : '' }}</div>
                  <div class="space-y-0.5">
                    <div
                      v-for="parlay in getGameParlays(game.id)"
                      :key="parlay.id"
                      class="bg-surface border border-purple-500/20 rounded p-1 text-xs"
                    >
                      <div class="flex items-center justify-between mb-0.5">
                        <span class="font-semibold text-purple-300">#{{ parlay.id }}</span>
                        <span 
                          class="px-1.5 py-0.5 rounded text-[11px] font-bold"
                          :class="{
                            'bg-green-500/20 text-green-400': parlay.status === 'won',
                            'bg-red-500/20 text-red-400': parlay.status === 'lost',
                            'bg-edge text-zinc-300': parlay.status === 'pending'
                          }"
                        >
                          {{ parlay.status.toUpperCase() }}
                        </span>
                      </div>
                      <div class="grid grid-cols-3 gap-1 text-xs mb-1">
                        <div>
                          <div class="text-purple-600">{{ parlay.num_legs || 0 }} legs</div>
                        </div>
                        <div>
                          <div class="text-purple-600">{{ parlay.parlay_odds ? parlay.parlay_odds.toFixed(2) : '0.00' }}x</div>
                        </div>
                        <div>
                          <div class="text-purple-600">${{ parlay.total_stake ? parlay.total_stake.toFixed(2) : '0.00' }}</div>
                        </div>
                      </div>
                      
                      <!-- Parlay Legs Details -->
                      <div v-if="parlay.parlay_legs && parlay.parlay_legs.length > 0" class="space-y-0.5 mb-1">
                        <div class="text-[11px] font-semibold text-purple-400 mb-0.5">Legs:</div>
                        <div
                          v-for="leg in parlay.parlay_legs"
                          :key="leg.id"
                          class="bg-purple-500/10 rounded px-1.5 py-1 text-[11px]"
                        >
                          <div v-if="leg.bets">
                            <div class="flex items-center justify-between">
                              <span class="text-purple-300 font-medium">Leg {{ leg.leg_number }}</span>
                              <span class="text-purple-400">{{ leg.bets.bet_type }} @ {{ leg.bets.odds?.toFixed(2) || '0.00' }}</span>
                            </div>
                            <div v-if="getLegGame(leg.bets.game_id)" class="text-purple-600 text-[11px] mt-0.5">
                              {{ getLegGame(leg.bets.game_id).home_name }} vs {{ getLegGame(leg.bets.game_id).away_name }}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div v-if="parlay.status !== 'pending'" class="mt-1 pt-1 border-t border-purple-500/20">
                        <div class="flex justify-between items-center text-[11px]">
                          <span class="text-purple-600">{{ parlay.status === 'won' ? 'Won' : 'Lost' }}</span>
                          <span 
                            class="font-bold"
                            :class="parlay.status === 'won' ? 'text-green-400' : 'text-red-400'"
                          >
                            {{ parlay.status === 'won' ? '+' : '-' }}€{{ parlay.status === 'won' ? ((parlay.actual_payout || 0) - (parlay.total_stake || 0)).toFixed(2) : (parlay.total_stake || 0).toFixed(2) }}
                          </span>
                        </div>
                      </div>
                      <div v-else class="mt-1 pt-1 border-t border-purple-500/20">
                        <div class="flex justify-between items-center text-[11px]">
                          <span class="text-purple-600">Pot. Win</span>
                          <span class="font-bold text-purple-300">${{ ((parlay.total_stake || 0) * (parlay.parlay_odds || 0)).toFixed(2) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="games.length === 0" class="text-center py-12">
          <p class="text-zinc-400">No matches scheduled for this day</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isOpen: boolean
  date: Date | null
  games: any[]
  leagues: any[]
  bets?: any[]
  parlays?: any[]
  showBets?: boolean
}>()

defineEmits<{
  'close': []
  'select-game': [game: any]
}>()

const router = useRouter()

const navigateToGame = (gameId: number) => {
  router.push(`/game/${gameId}`)
}

const dayName = computed(() => {
  if (!props.date) return ''
  return props.date.toLocaleDateString('en-US', { timeZone: 'Europe/Athens', weekday: 'long' })
})

const fullDate = computed(() => {
  if (!props.date) return ''
  return props.date.toLocaleDateString('en-US', { timeZone: 'Europe/Athens', month: 'long', day: 'numeric', year: 'numeric' })
})

// Group games by league
const gamesByLeague = computed(() => {
  const grouped: Record<string, any[]> = {}
  
  props.games.forEach(game => {
    const league = game.league_key || 'other'
    if (!grouped[league]) {
      grouped[league] = []
    }
    grouped[league].push(game)
  })
  
  // Sort games within each league by time
  Object.keys(grouped).forEach(league => {
    grouped[league].sort((a, b) => {
      const timeA = new Date(a.date).getTime()
      const timeB = new Date(b.date).getTime()
      return timeA - timeB
    })
  })
  
  return grouped
})

const sortedGames = computed(() => {
  return [...props.games].sort((a, b) => {
    // Sort by time first
    const timeA = new Date(a.date).getTime()
    const timeB = new Date(b.date).getTime()
    if (timeA !== timeB) return timeA - timeB
    
    // Then by league (handle undefined league names)
    const leagueA = a.league_name || ''
    const leagueB = b.league_name || ''
    return leagueA.localeCompare(leagueB)
  })
})

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false })
}

const getLeagueFlag = (leagueKey: string) => {
  const league = props.leagues.find(l => l.key === leagueKey)
  return league?.flag || '⚽'
}

const getLeagueName = (leagueKey: string) => {
  const league = props.leagues.find(l => l.key === leagueKey)
  return league?.name || leagueKey
}

// Get all bets for a game
const getGameBets = (gameId: number) => {
  if (!props.showBets || !props.bets) return []
  return props.bets.filter((bet: any) => bet.game_id === gameId)
}
// Legacy single bet helper
const getGameBet = (gameId: number) => getGameBets(gameId)[0] || null

// Get multi-market predictions from explanation JSON
const getMarketPredictions = (prediction: any) => {
  try {
    if (!prediction.explanation) return null
    const explanation = typeof prediction.explanation === 'string' 
      ? JSON.parse(prediction.explanation) 
      : prediction.explanation
    return explanation.markets?.filter((m: any) => m.market !== 'match_result') || null
  } catch {
    return null
  }
}

// Get playing styles from explanation JSON
const getPlayingStyles = (prediction: any) => {
  try {
    if (!prediction.explanation) return null
    const explanation = typeof prediction.explanation === 'string' 
      ? JSON.parse(prediction.explanation) 
      : prediction.explanation
    return explanation.styles || null
  } catch {
    return null
  }
}

// Format market name for display
const formatMarketName = (market: string) => {
  const names: Record<string, string> = {
    'total_goals': 'Goals',
    'exact_score': 'Score',
    'btts': 'BTTS',
    'corners': 'Corners',
    'cards': 'Cards'
  }
  return names[market] || market
}

// Get parlays that include this game
const getGameParlays = (gameId: number) => {
  if (!props.parlays) return []
  
  return props.parlays.filter(parlay => {
    // Check if any leg in this parlay references a bet for this game
    return parlay.parlay_legs?.some((leg: any) => leg.bets?.game_id === gameId)
  })
}

// Get game details for a parlay leg
const getLegGame = (gameId: number) => {
  return props.games.find(g => g.id === gameId)
}

</script>
