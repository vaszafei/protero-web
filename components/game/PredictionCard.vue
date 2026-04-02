<template>
  <div class="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-lg shadow-sm border border-emerald-500/20 p-6">
    <h3 class="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
      <span class="text-primary-400 font-bold">Prediction</span>
      <span>AI Prediction</span>
    </h3>

    <div class="space-y-4">
      <!-- Main Prediction -->
      <div class="text-center p-4 bg-surface rounded-lg">
        <p class="text-sm text-zinc-400 mb-2">Predicted Result</p>
        <p class="text-2xl font-bold text-emerald-400 uppercase">{{ prediction.prediction }}</p>
      </div>

      <!-- Confidence -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-zinc-400">Confidence</span>
          <span class="text-lg font-bold text-emerald-400">{{ prediction.confidence }}%</span>
        </div>
        <div class="w-full h-2 bg-surface rounded-full overflow-hidden">
          <div 
            class="h-full bg-emerald-500 rounded-full transition-all duration-500"
            :style="{ width: `${prediction.confidence}%` }"
          />
        </div>
      </div>

      <!-- Multi-Market Predictions -->
      <div v-if="marketPredictions.length > 0" class="pt-4 border-t border-emerald-500/20">
        <p class="text-sm font-medium text-zinc-400 mb-3">Market Predictions</p>
        <div class="space-y-2">
          <div 
            v-for="market in marketPredictions" 
            :key="market.market"
            class="flex items-center justify-between text-sm p-2 bg-surface rounded"
          >
            <span class="text-zinc-400 capitalize">{{ formatMarketName(market.market) }}</span>
            <span class="font-semibold text-zinc-100">{{ market.prediction }}</span>
          </div>
        </div>
      </div>

      <!-- Actual Result (if completed) -->
      <div v-if="prediction.result_correct !== null" class="pt-4 border-t border-emerald-500/20">
        <div 
          class="p-4 rounded-lg text-center"
          :class="prediction.result_correct ? 'bg-green-500/20' : 'bg-red-500/20'"
        >
          <p class="text-sm mb-1" :class="prediction.result_correct ? 'text-green-400' : 'text-red-400'">
            Prediction Result
          </p>
          <p 
            class="text-xl font-bold"
            :class="prediction.result_correct ? 'text-green-400' : 'text-red-400'"
          >
            {{ prediction.result_correct ? 'CORRECT' : 'WRONG' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  prediction: {
    type: Object,
    required: true
  },
  game: {
    type: Object,
    required: true
  }
})

const marketPredictions = computed(() => {
  if (!props.prediction.multi_market_predictions) return []
  
  try {
    const markets = JSON.parse(props.prediction.multi_market_predictions)
    return markets.filter(m => m.market !== '1x2') // Exclude main market
  } catch (e) {
    return []
  }
})

const formatMarketName = (market) => {
  const names = {
    'over_under_25': 'Over/Under 2.5',
    'btts': 'Both Teams to Score',
    'double_chance': 'Double Chance'
  }
  return names[market] || market.replace(/_/g, ' ')
}
</script>
