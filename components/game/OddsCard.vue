<template>
  <div class="bg-surface rounded-lg shadow-sm shadow-black/20 border border-edge p-4 sm:p-6">
    <h3 class="text-base sm:text-lg font-bold text-zinc-100 mb-3 sm:mb-4">
      Betting Odds
    </h3>

    <div class="space-y-3">
      <!-- Match Result Odds -->
      <div>
        <p class="text-xs font-medium text-zinc-400 mb-2">Match Result</p>
        <div class="grid grid-cols-3 gap-2">
          <div class="text-center p-3 bg-surface-light rounded-lg">
            <div class="text-xs text-zinc-400 mb-1">Home</div>
            <div class="font-bold text-zinc-100">
              {{ game.odds_home ? game.odds_home.toFixed(2) : '-' }}
            </div>
          </div>
          <div class="text-center p-3 bg-surface-light rounded-lg">
            <div class="text-xs text-zinc-400 mb-1">Draw</div>
            <div class="font-bold text-zinc-100">
              {{ game.odds_draw ? game.odds_draw.toFixed(2) : '-' }}
            </div>
          </div>
          <div class="text-center p-3 bg-surface-light rounded-lg">
            <div class="text-xs text-zinc-400 mb-1">Away</div>
            <div class="font-bold text-zinc-100">
              {{ game.odds_away ? game.odds_away.toFixed(2) : '-' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Over/Under Odds -->
      <div v-if="game.odds_over || game.odds_under">
        <p class="text-xs font-medium text-zinc-400 mb-2">Over/Under 2.5</p>
        <div class="grid grid-cols-2 gap-2">
          <div class="text-center p-3 bg-surface-light rounded-lg">
            <div class="text-xs text-zinc-400 mb-1">Over 2.5</div>
            <div class="font-bold text-zinc-100">
              {{ game.odds_over ? game.odds_over.toFixed(2) : '-' }}
            </div>
          </div>
          <div class="text-center p-3 bg-surface-light rounded-lg">
            <div class="text-xs text-zinc-400 mb-1">Under 2.5</div>
            <div class="font-bold text-zinc-100">
              {{ game.odds_under ? game.odds_under.toFixed(2) : '-' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Favorite Indicator -->
      <div v-if="favorite" class="pt-3 border-t border-edge">
        <div class="flex items-center justify-between text-sm">
          <span class="text-zinc-400">Favorite:</span>
          <span class="font-bold text-primary-400">{{ favorite }}</span>
        </div>
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

const favorite = computed(() => {
  if (!props.game.odds_home || !props.game.odds_draw || !props.game.odds_away) {
    return null
  }
  
  const minOdds = Math.min(props.game.odds_home, props.game.odds_draw, props.game.odds_away)
  
  if (minOdds === props.game.odds_home) return props.game.home_name
  if (minOdds === props.game.odds_away) return props.game.away_name
  return 'Draw'
})
</script>
