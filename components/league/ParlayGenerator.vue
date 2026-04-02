<template>
  <div class="mt-4">
    <!-- Generate Button -->
    <div class="mb-4">
      <button
        @click="generateParlays"
        :disabled="isGenerating"
        class="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg v-if="!isGenerating" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ isGenerating ? 'Generating Parlays...' : 'Generate AI Parlays' }}
      </button>
    </div>

    <!-- Parlays Cards -->
    <div v-if="parlays.length > 0" class="space-y-6">
      <!-- Super Safe Parlay -->
      <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
              
            </div>
            <div>
              <h3 class="text-xl font-bold text-green-900">Super Safe Parlay</h3>
              <p class="text-sm text-green-400">High confidence, lower odds but better win probability</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-green-900">{{ parlays[0].totalOdds.toFixed(2) }}</div>
            <div class="text-sm text-green-400">Combined Odds</div>
          </div>
        </div>

        <div class="bg-surface rounded-lg p-4 mb-4">
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div class="text-xs text-zinc-500 mb-1">Win Probability</div>
              <div class="text-2xl font-bold text-green-400">{{ (parlays[0].winProbability * 100).toFixed(1) }}%</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Expected Value</div>
              <div class="text-2xl font-bold" :class="parlays[0].expectedValue > 0 ? 'text-green-400' : 'text-red-400'">
                {{ parlays[0].expectedValue > 0 ? '+' : '' }}{{ parlays[0].expectedValue.toFixed(3) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Kelly Stake</div>
              <div class="text-xl font-bold text-purple-600">{{ parlays[0].kellyStake.toFixed(2) }}%</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Total Legs</div>
              <div class="text-xl font-bold text-zinc-100">{{ parlays[0].legs.length }}</div>
            </div>
          </div>
          <div class="text-xs text-zinc-400 bg-surface-light rounded p-2">
            <strong>Recommended Stake:</strong> {{ parlays[0].kellyStake.toFixed(2) }}% of bankroll for optimal growth
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="(leg, idx) in parlays[0].legs"
            :key="idx"
            class="bg-surface rounded-lg p-3 border border-green-500/30 hover:border-green-400 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="font-semibold text-sm text-zinc-100">{{ leg.match }}</div>
                <div class="text-xs text-zinc-400 mt-1">{{ leg.bet }} • Confidence: {{ leg.confidence }}%</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-green-400">{{ leg.probability.toFixed(1) }}%</div>
                <div class="text-xs text-zinc-500">@ {{ leg.odds?.toFixed(2) || 'N/A' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Medium Risk Parlay -->
      <div class="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-300 p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h3 class="text-xl font-bold text-orange-900">Medium Risk Parlay</h3>
              <p class="text-sm text-orange-400">Balanced risk/reward with good value opportunities</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-orange-900">{{ parlays[1].totalOdds.toFixed(2) }}</div>
            <div class="text-sm text-orange-400">Combined Odds</div>
          </div>
        </div>

        <div class="bg-surface rounded-lg p-4 mb-4">
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div class="text-xs text-zinc-500 mb-1">Win Probability</div>
              <div class="text-2xl font-bold text-orange-600">{{ (parlays[1].winProbability * 100).toFixed(1) }}%</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Expected Value</div>
              <div class="text-2xl font-bold" :class="parlays[1].expectedValue > 0 ? 'text-green-400' : 'text-red-400'">
                {{ parlays[1].expectedValue > 0 ? '+' : '' }}{{ parlays[1].expectedValue.toFixed(3) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Kelly Stake</div>
              <div class="text-xl font-bold text-purple-600">{{ parlays[1].kellyStake.toFixed(2) }}%</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Total Legs</div>
              <div class="text-xl font-bold text-zinc-100">{{ parlays[1].legs.length }}</div>
            </div>
          </div>
          <div class="text-xs text-zinc-400 bg-surface-light rounded p-2">
            <strong>Recommended Stake:</strong> {{ parlays[1].kellyStake.toFixed(2) }}% of bankroll for optimal growth
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="(leg, idx) in parlays[1].legs"
            :key="idx"
            class="bg-surface rounded-lg p-3 border border-orange-200 hover:border-orange-400 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="font-semibold text-sm text-zinc-100">{{ leg.match }}</div>
                <div class="text-xs text-zinc-400 mt-1">{{ leg.bet }} • Confidence: {{ leg.confidence }}%</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-orange-400">{{ leg.probability.toFixed(1) }}%</div>
                <div class="text-xs text-zinc-500">@ {{ leg.odds?.toFixed(2) || 'N/A' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!isGenerating" class="text-center py-12 text-zinc-500">
      <svg class="w-16 h-16 mx-auto mb-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p>Click the button above to generate AI-powered parlay combinations</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  predictions: {
    type: Array,
    required: true
  }
})

const isGenerating = ref(false)
const parlays = ref([])

function generateParlays() {
  isGenerating.value = true
  
  setTimeout(() => {
    const valuePicks = []
    
    console.log('Total predictions available:', props.predictions.length)
    
    // Find picks where our model shows VALUE (model prob > implied prob from odds)
    props.predictions.forEach(pred => {
      const homeProb = parseFloat(pred.homeWinProb)
      const drawProb = parseFloat(pred.drawProb)
      const awayProb = parseFloat(pred.awayWinProb)
      
      console.log(`${pred.home} vs ${pred.away}:`, {
        homeProb,
        hasOdds: !!pred.odds,
        odds: pred.odds
      })
      
      // Only use picks where we have REAL odds available
      if (!pred.odds?.home || !pred.odds?.draw || !pred.odds?.away) {
        console.log('  -> Skipped: No odds available')
        return
      }
      
      const homeOdds = pred.odds.home
      const drawOdds = pred.odds.draw
      const awayOdds = pred.odds.away
      const over25Odds = pred.odds.over
      const under25Odds = pred.odds.under
      
      // Calculate implied probabilities from odds
      const impliedHome = (1 / homeOdds) * 100
      const impliedDraw = (1 / drawOdds) * 100
      const impliedAway = (1 / awayOdds) * 100
      const impliedOver = over25Odds ? (1 / over25Odds) * 100 : null
      const impliedUnder = under25Odds ? (1 / under25Odds) * 100 : null
      
      // Check for value: our probability > implied probability + edge threshold
      const edgeThreshold = 2 // Lowered from 5% to 2% to find more opportunities
      
      console.log(`  Home: ${homeProb.toFixed(1)}% model vs ${impliedHome.toFixed(1)}% implied, edge: ${(homeProb - impliedHome).toFixed(1)}%`)
      
      if (homeProb > impliedHome + edgeThreshold && pred.confidence >= 60) {
        console.log('  -> Added as HOME value pick!')
        valuePicks.push({
          match: `${pred.home} vs ${pred.away}`,
          bet: 'Home Win',
          probability: homeProb,
          confidence: pred.confidence,
          odds: homeOdds,
          edge: homeProb - impliedHome,
          quality: (homeProb - impliedHome) * (pred.confidence / 100)
        })
      }
      
      if (awayProb > impliedAway + edgeThreshold && pred.confidence >= 60) {
        console.log('  -> Added as AWAY value pick!')
        valuePicks.push({
          match: `${pred.home} vs ${pred.away}`,
          bet: 'Away Win',
          probability: awayProb,
          confidence: pred.confidence,
          odds: awayOdds,
          edge: awayProb - impliedAway,
          quality: (awayProb - impliedAway) * (pred.confidence / 100)
        })
      }
      
      if (drawProb > impliedDraw + edgeThreshold && pred.confidence >= 60) {
        valuePicks.push({
          match: `${pred.home} vs ${pred.away}`,
          bet: 'Draw',
          probability: drawProb,
          confidence: pred.confidence,
          odds: drawOdds,
          edge: drawProb - impliedDraw,
          quality: (drawProb - impliedDraw) * (pred.confidence / 100)
        })
      }
      
      if (impliedOver && pred.over25Probability > impliedOver + edgeThreshold && pred.confidence >= 55) {
        valuePicks.push({
          match: `${pred.home} vs ${pred.away}`,
          bet: 'Over 2.5 Goals',
          probability: pred.over25Probability,
          confidence: pred.confidence,
          odds: over25Odds,
          edge: pred.over25Probability - impliedOver,
          quality: (pred.over25Probability - impliedOver) * (pred.confidence / 100)
        })
      }
      
      if (impliedUnder && (100 - pred.over25Probability) > impliedUnder + edgeThreshold && pred.confidence >= 55) {
        valuePicks.push({
          match: `${pred.home} vs ${pred.away}`,
          bet: 'Under 2.5 Goals',
          probability: 100 - pred.over25Probability,
          confidence: pred.confidence,
          odds: under25Odds,
          edge: (100 - pred.over25Probability) - impliedUnder,
          quality: ((100 - pred.over25Probability) - impliedUnder) * (pred.confidence / 100)
        })
      }
      
      if (pred.bttsProbability >= 60 && pred.confidence >= 55) {
        valuePicks.push({
          match: `${pred.home} vs ${pred.away}`,
          bet: 'Both Teams to Score',
          probability: pred.bttsProbability,
          confidence: pred.confidence,
          odds: calculateOddsFromProbability(pred.bttsProbability),
          edge: 5,
          quality: 5 * (pred.confidence / 100)
        })
      }
    })
    
    // Sort by quality (edge × confidence)
    valuePicks.sort((a, b) => b.quality - a.quality)
    
    // Build super safe: highest quality picks, stop when EV becomes negative
    const safePicks = []
    for (let i = 0; i < valuePicks.length && i < 5; i++) {
      safePicks.push(valuePicks[i])
      const testParlay = buildParlay(safePicks)
      if (testParlay.expectedValue <= 0 && safePicks.length > 1) {
        safePicks.pop() // Remove last pick if it makes EV negative
        break
      }
    }
    
    // Build medium: more legs for higher odds, but still require positive EV
    const mediumPicks = []
    for (let i = 0; i < valuePicks.length && i < 8; i++) {
      mediumPicks.push(valuePicks[i])
      const testParlay = buildParlay(mediumPicks)
      if (testParlay.expectedValue <= 0 && mediumPicks.length > 1) {
        mediumPicks.pop()
        break
      }
    }
    
    const safeParlay = buildParlay(safePicks)
    const mediumParlay = buildParlay(mediumPicks)
    
    parlays.value = [safeParlay, mediumParlay]
    isGenerating.value = false
  }, 800)
}

function calculateOddsFromProbability(probability) {
  // Convert probability to decimal odds with 5% bookmaker margin
  const trueOdds = 100 / probability
  return trueOdds * 0.95 // Add margin
}

function buildParlay(legs) {
  if (legs.length === 0) {
    return {
      legs: [],
      totalOdds: 1,
      winProbability: 0,
      expectedValue: 0,
      kellyStake: 0
    }
  }
  
  // Calculate combined odds (multiply all individual odds)
  const totalOdds = legs.reduce((acc, leg) => acc * leg.odds, 1)
  
  // Calculate combined probability (multiply all probabilities)
  const winProbability = legs.reduce((acc, leg) => acc * (leg.probability / 100), 1)
  
  // Calculate expected value: EV = (p × payout) - (1 - p) × stake
  const expectedValue = (winProbability * totalOdds) - 1
  
  // Calculate Kelly stake: f* = (bp - q) / b where b = odds - 1
  const b = totalOdds - 1
  const p = winProbability
  const q = 1 - p
  const kelly = (b * p - q) / b
  
  // Use fractional Kelly (20% for parlays - more conservative)
  const kellyStake = Math.max(0, Math.min(3, kelly * 20)) // Cap at 3% for parlays
  
  return {
    legs,
    totalOdds,
    winProbability,
    expectedValue,
    kellyStake
  }
}
</script>
