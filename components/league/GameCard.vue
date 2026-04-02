<template>
  <NuxtLink
    :to="`/game/${game.id}`"
    class="group flex flex-col rounded-lg border border-edge hover:border-primary-500 transition-all cursor-pointer bg-surface relative overflow-hidden h-full"
  >
    <!-- Time chip - small, top-right corner -->
    <span class="absolute top-1 right-1 px-1 py-px bg-emerald-600/80 text-white text-[9px] font-medium rounded">
      {{ formatTime(game.date) }}
    </span>

    <!-- FT / Prediction badge - top-left corner -->
    <div class="absolute top-1 left-1 flex items-center gap-0.5">
      <span v-if="game.home_goals !== null" class="px-1 py-px bg-zinc-700 text-zinc-300 text-[9px] font-medium rounded">FT</span>
      <span v-if="game.prediction" :class="[
        'px-1 py-px text-[9px] font-bold rounded',
        game.home_goals !== null
          ? (isPredictionWin(game) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')
          : 'bg-orange-400/15 text-orange-400'
      ]">{{ formatPred(game.prediction) }}<span v-if="game.home_goals !== null" class="ml-0.5">{{ isPredictionWin(game) ? '✓' : '✗' }}</span></span>
    </div>

    <!-- Logos Row: Home vs Away -->
    <div class="flex items-center justify-center gap-2 pt-5 pb-1.5 px-2">
      <!-- Home -->
      <div class="flex flex-col items-center gap-0.5 min-w-0">
        <img v-if="getTeamLogoUrl(game.home_key, game.league_key)" :src="getTeamLogoUrl(game.home_key, game.league_key)" loading="lazy" width="24" height="24" class="w-6 h-6 object-contain" :title="game.home_name" />
        <div v-else class="w-6 h-6 rounded-full bg-[#0848a8]/20 flex items-center justify-center">
          <span class="text-[8px] text-zinc-400 font-bold">H</span>
        </div>
      </div>

      <!-- Score or VS -->
      <div class="flex flex-col items-center">
        <span v-if="game.home_goals !== null" class="text-sm font-bold text-primary-400 leading-none tabular-nums">
          {{ game.home_goals }}-{{ game.away_goals }}
        </span>
        <span v-else class="text-[10px] text-zinc-500 font-medium">vs</span>
      </div>

      <!-- Away -->
      <div class="flex flex-col items-center gap-0.5 min-w-0">
        <img v-if="getTeamLogoUrl(game.away_key, game.league_key)" :src="getTeamLogoUrl(game.away_key, game.league_key)" loading="lazy" width="24" height="24" class="w-6 h-6 object-contain" :title="game.away_name" />
        <div v-else class="w-6 h-6 rounded-full bg-[#f82828]/15 flex items-center justify-center">
          <span class="text-[8px] text-zinc-400 font-bold">A</span>
        </div>
      </div>
    </div>

    <!-- Horizontal Divider -->
    <div class="h-px bg-edge/50 mx-2"></div>

    <!-- Odds Row (dashboard style) -->
    <div v-if="game.home_odds" class="flex items-center justify-center gap-3 px-2 py-1.5">
      <div class="flex flex-col items-center">
        <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">1</span>
        <span class="text-[10px] font-semibold text-zinc-300 tabular-nums">{{ Number(game.home_odds).toFixed(2) }}</span>
      </div>
      <div v-if="game.draw_odds" class="flex flex-col items-center">
        <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">X</span>
        <span class="text-[10px] font-semibold text-zinc-300 tabular-nums">{{ Number(game.draw_odds).toFixed(2) }}</span>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">2</span>
        <span class="text-[10px] font-semibold text-zinc-300 tabular-nums">{{ Number(game.away_odds).toFixed(2) }}</span>
      </div>
    </div>

    <!-- Bet stake indicator -->
    <div v-if="game.bet_id" class="flex justify-center pb-1">
      <span :class="[
        'px-1.5 py-px text-[9px] font-bold rounded',
        game.home_goals !== null
          ? (isPredictionWin(game) ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
          : 'bg-zinc-600 text-white'
      ]">€{{ game.stake }}</span>
    </div>
  </NuxtLink>
</template>

<script setup>
defineProps({
  game: {
    type: Object,
    required: true
  }
})

import { getTeamLogoUrl } from '~/utils/teamLogo'

// Format time for display
function formatTime(dateStr) {
  if (!dateStr || dateStr === 'TBD') return 'TBD'
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Format prediction label
function formatPred(prediction) {
  if (!prediction) return ''
  const map = { HOME: '1', DRAW: 'X', AWAY: '2', OVER: 'O2.5', UNDER: 'U2.5' }
  return map[prediction.toUpperCase()] || prediction
}

// Check if prediction won
function isPredictionWin(game) {
  if (game.home_goals === null) return false
  return isWinningOdds(game, game.prediction?.toLowerCase())
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
