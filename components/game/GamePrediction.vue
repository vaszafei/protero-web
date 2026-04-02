<template>
  <div class="space-y-4">
    <!-- Has Prediction -->
    <template v-if="prediction">

      <!-- ═══ TOP VERDICT CARD ═══ -->
      <div :class="['verdict-card rounded-xl px-5 py-5 relative overflow-hidden', verdictAccentClass]">
        <!-- Background decoration -->
        <div class="absolute inset-0 opacity-5 pointer-events-none">
          <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full" :class="verdictBgCircle"></div>
          <div class="absolute -left-8 -bottom-8 w-40 h-40 rounded-full" :class="verdictBgCircle"></div>
        </div>
        <!-- Label -->
        <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">AI Prediction</p>
        <!-- Outcome -->
        <div class="flex items-end gap-3">
          <span class="text-3xl font-extrabold leading-none tracking-tight" :class="outcomeColor">{{ outcomeLabel }}</span>
          <span v-if="predictionOdds" class="mb-0.5 text-base font-bold text-zinc-400 tabular-nums">@ {{ predictionOdds }}</span>
        </div>
        <!-- Sub-label -->
        <p class="text-[10px] text-zinc-500 mt-2 font-medium">Model {{ prediction.model_version || '?' }} · {{ marketLabel }}</p>
      </div>

      <!-- ═══ CONFIDENCE BAR ═══ -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-medium text-zinc-500">Confidence</span>
          <span class="text-sm font-bold tabular-nums" :class="confidenceColor">{{ confidence }}%</span>
        </div>
        <div class="w-full h-2 bg-surface-light rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700" :class="confidenceBarClass" :style="{ width: confidence + '%' }"></div>
        </div>
      </div>

      <!-- ═══ WIN PROBABILITIES ═══ -->
      <div v-if="hasAnyProb">
        <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Win Probabilities</h4>
        <div class="space-y-1.5">
          <!-- Home -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-zinc-400 w-12 flex-shrink-0 truncate">{{ game.home_name?.split(' ').pop() }}</span>
            <div class="flex-1 h-5 bg-surface-light rounded-full overflow-hidden relative">
              <div class="h-full rounded-full bg-gradient-to-r from-[#f82828]/80 to-[#f82828]/50 transition-all duration-500" :style="{ width: (homeProb ?? 0) + '%' }"></div>
              <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">{{ homeProb != null ? homeProb + '%' : '—' }}</span>
            </div>
          </div>
          <!-- Draw (football only) -->
          <div v-if="!isBball" class="flex items-center gap-2">
            <span class="text-[11px] text-zinc-400 w-12 flex-shrink-0">Draw</span>
            <div class="flex-1 h-5 bg-surface-light rounded-full overflow-hidden relative">
              <div class="h-full rounded-full bg-zinc-600/60 transition-all duration-500" :style="{ width: (drawProb ?? 0) + '%' }"></div>
              <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">{{ drawProb != null ? drawProb + '%' : '—' }}</span>
            </div>
          </div>
          <!-- Away -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-zinc-400 w-12 flex-shrink-0 truncate">{{ game.away_name?.split(' ').pop() }}</span>
            <div class="flex-1 h-5 bg-surface-light rounded-full overflow-hidden relative">
              <div class="h-full rounded-full bg-gradient-to-r from-[#0848a8]/80 to-[#4d8fff]/50 transition-all duration-500" :style="{ width: (awayProb ?? 0) + '%' }"></div>
              <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">{{ awayProb != null ? awayProb + '%' : '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ BET SUGGESTION CARD (when EV or Kelly available) ═══ -->
      <div v-if="prediction.expected_value || prediction.kelly_percentage" class="bet-suggestion-card rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
          <span class="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Suggested Bet</span>
        </div>
        <!-- Bet line -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base font-extrabold" :class="outcomeColor">{{ outcomeLabel }}</span>
          <span v-if="predictionOdds" class="text-sm font-bold text-zinc-300 tabular-nums">@ {{ predictionOdds }}</span>
        </div>
        <!-- EV + Kelly metrics -->
        <div class="grid grid-cols-2 gap-2">
          <div v-if="prediction.expected_value" class="metric-cell rounded-lg px-3 py-2">
            <span class="text-[10px] text-zinc-500 block mb-0.5">Expected Value</span>
            <span class="text-sm font-bold tabular-nums" :class="prediction.expected_value > 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ prediction.expected_value > 0 ? '+' : '' }}{{ (prediction.expected_value * 100).toFixed(1) }}%
            </span>
          </div>
          <div v-if="prediction.kelly_percentage" class="metric-cell rounded-lg px-3 py-2">
            <span class="text-[10px] text-zinc-500 block mb-0.5">Kelly Stake</span>
            <span class="text-sm font-bold text-indigo-400 tabular-nums">{{ (prediction.kelly_percentage * 100).toFixed(1) }}%</span>
          </div>
        </div>
        <!-- Edge strength bar -->
        <div v-if="prediction.expected_value" class="mt-3">
          <div class="flex justify-between text-[9px] text-zinc-600 mb-1">
            <span>Edge</span>
            <span>{{ evStrengthLabel }}</span>
          </div>
          <div class="w-full h-1.5 bg-surface-light rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="evBarClass"
              :style="{ width: evBarWidth + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- ═══ MARKET PREDICTIONS ═══ -->
      <div v-if="markets.length > 0" class="border-t border-edge/50 pt-3">
        <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Market Predictions</h4>
        <div class="grid grid-cols-2 gap-1.5">
          <div v-for="m in markets" :key="m.label" class="bg-surface-light rounded-lg px-3 py-2 text-center">
            <span class="text-[10px] text-zinc-500 block">{{ m.label }}</span>
            <span class="text-sm font-bold" :class="m.color">{{ m.value }}</span>
          </div>
        </div>
      </div>

    </template>

    <!-- No Prediction -->
    <div v-else class="text-center py-12">
      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-light flex items-center justify-center">
        <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p class="text-sm font-medium text-zinc-400">No prediction yet</p>
      <p class="text-xs text-zinc-600 mt-1">Predictions are generated before game day</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  game: { type: Object, required: true },
  prediction: { type: Object, default: null },
  sport: { type: String, default: 'football' }
})

const isBball = computed(() => props.sport === 'basketball')

// ─── Helpers ─────────────────────────────────────────────
const bballOdds = computed(() => props.game.sport_stats?.odds || null)

// ─── Outcome ─────────────────────────────────────────────
const outcomeLabel = computed(() => {
  if (!props.prediction?.prediction) return '?'
  const p = props.prediction.prediction.toUpperCase()
  const ouLine = bballOdds.value?.over_under?.line
  if (p === '1' || p === 'HOME' || p === 'H') return props.game.home_name
  if (p === '2' || p === 'AWAY' || p === 'A') return props.game.away_name
  if (p === 'X' || p === 'DRAW') return 'Draw'
  if (p.includes('OVER_TOTAL') || p.includes('OVER_ALT')) return ouLine ? `Over ${ouLine}` : 'Over'
  if (p.includes('UNDER_TOTAL') || p.includes('UNDER_ALT')) return ouLine ? `Under ${ouLine}` : 'Under'
  if (p.includes('HOME_WIN')) return props.game.home_name
  if (p.includes('SPREAD_COVER')) return 'Spread Cover'
  return props.prediction.prediction
})

const outcomeColor = computed(() => {
  if (!props.prediction?.prediction) return 'text-zinc-300'
  const p = props.prediction.prediction.toUpperCase()
  if (p === '1' || p === 'HOME' || p === 'H' || p.includes('HOME_WIN')) return 'text-[#f82828]'
  if (p === '2' || p === 'AWAY' || p === 'A') return 'text-[#4d8fff]'
  if (p.includes('UNDER')) return 'text-purple-400'
  if (p.includes('OVER')) return 'text-emerald-400'
  return 'text-zinc-200'
})

// Accent class for the verdict card border/bg
const verdictAccentClass = computed(() => {
  if (!props.prediction?.prediction) return ''
  const p = props.prediction.prediction.toUpperCase()
  if (p.includes('UNDER')) return 'verdict-under'
  if (p.includes('OVER')) return 'verdict-over'
  if (p === '1' || p === 'HOME' || p === 'H' || p.includes('HOME_WIN')) return 'verdict-home'
  if (p === '2' || p === 'AWAY' || p === 'A') return 'verdict-away'
  return 'verdict-default'
})

const verdictBgCircle = computed(() => {
  const p = (props.prediction?.prediction || '').toUpperCase()
  if (p.includes('UNDER')) return 'bg-purple-500'
  if (p.includes('OVER')) return 'bg-emerald-500'
  if (p.includes('HOME')) return 'bg-red-500'
  if (p.includes('AWAY')) return 'bg-blue-500'
  return 'bg-zinc-500'
})

// Market label for sub-text
const marketLabel = computed(() => {
  if (!props.prediction?.prediction) return ''
  const p = props.prediction.prediction.toUpperCase()
  if (p.includes('OVER_TOTAL') || p.includes('OVER_ALT')) return 'O/U Market'
  if (p.includes('UNDER_TOTAL') || p.includes('UNDER_ALT')) return 'O/U Market'
  if (p.includes('SPREAD')) return 'Spread Market'
  if (p.includes('HOME_WIN') || p === '1' || p === '2' || p === 'X') return 'Moneyline'
  return 'Main Market'
})

// The decimal odds for the predicted outcome (so user knows at what price to bet)
const predictionOdds = computed(() => {
  if (!props.prediction?.prediction) return null
  const p = props.prediction.prediction.toUpperCase()
  const odds = bballOdds.value

  if (p.includes('UNDER_TOTAL') || p.includes('UNDER_ALT')) {
    const v = odds?.over_under?.under || props.game.odds_under
    return v ? Number(v).toFixed(2) : null
  }
  if (p.includes('OVER_TOTAL') || p.includes('OVER_ALT')) {
    const v = odds?.over_under?.over || props.game.odds_over
    return v ? Number(v).toFixed(2) : null
  }
  if (p === '1' || p === 'HOME' || p === 'H' || p.includes('HOME_WIN')) {
    const v = odds?.moneyline?.home || props.game.odds_home
    return v ? Number(v).toFixed(2) : null
  }
  if (p === '2' || p === 'AWAY' || p === 'A') {
    const v = odds?.moneyline?.away || props.game.odds_away
    return v ? Number(v).toFixed(2) : null
  }
  return null
})

// ─── Confidence ──────────────────────────────────────────
const confidence = computed(() => {
  if (!props.prediction?.confidence) return 0
  return Math.round(props.prediction.confidence * (props.prediction.confidence <= 1 ? 100 : 1))
})

const confidenceColor = computed(() => {
  if (confidence.value >= 70) return 'text-green-400'
  if (confidence.value >= 50) return 'text-yellow-400'
  return 'text-orange-400'
})

const confidenceBarClass = computed(() => {
  if (confidence.value >= 70) return 'bg-green-500'
  if (confidence.value >= 50) return 'bg-yellow-500'
  return 'bg-orange-500'
})

// ─── Probabilities ───────────────────────────────────────
const homeProb = computed(() => {
  if (props.prediction?.home_win_prob == null) return null
  const v = props.prediction.home_win_prob
  return Math.round(v <= 1 ? v * 100 : v)
})

const drawProb = computed(() => {
  if (props.prediction?.draw_prob == null) return null
  const v = props.prediction.draw_prob
  return Math.round(v <= 1 ? v * 100 : v)
})

const awayProb = computed(() => {
  if (props.prediction?.away_win_prob == null) return null
  const v = props.prediction.away_win_prob
  return Math.round(v <= 1 ? v * 100 : v)
})

const hasAnyProb = computed(() => homeProb.value != null || awayProb.value != null || drawProb.value != null)

// ─── EV / Edge bar ───────────────────────────────────────
const evPct = computed(() => {
  if (!props.prediction?.expected_value) return 0
  return props.prediction.expected_value * (props.prediction.expected_value <= 1 ? 100 : 1)
})

const evStrengthLabel = computed(() => {
  const v = evPct.value
  if (v >= 15) return 'Strong'
  if (v >= 8) return 'Good'
  if (v >= 3) return 'Marginal'
  return 'Weak'
})

const evBarClass = computed(() => {
  const v = evPct.value
  if (v >= 15) return 'bg-emerald-500'
  if (v >= 8) return 'bg-yellow-500'
  if (v >= 3) return 'bg-amber-500'
  return 'bg-zinc-600'
})

const evBarWidth = computed(() => {
  return Math.min(100, Math.max(0, Math.round(evPct.value * 4)))
})

// ─── Market predictions ──────────────────────────────────
const markets = computed(() => {
  const m = []
  const p = props.prediction
  if (!p) return m

  if (p.over25_prob != null || p.over_25_prob != null) {
    const val = p.over25_prob ?? p.over_25_prob
    const pct = Math.round((val <= 1 ? val * 100 : val))
    m.push({
      label: isBball.value ? 'Over Total' : 'Over 2.5',
      value: pct + '%',
      color: pct >= 55 ? 'text-green-400' : pct <= 40 ? 'text-red-400' : 'text-zinc-200'
    })
  }

  if (p.btts_prob != null) {
    const pct = Math.round((p.btts_prob <= 1 ? p.btts_prob * 100 : p.btts_prob))
    m.push({
      label: 'BTTS',
      value: pct + '%',
      color: pct >= 55 ? 'text-green-400' : pct <= 40 ? 'text-red-400' : 'text-zinc-200'
    })
  }

  // Multi-market predictions
  if (p.multi_market_predictions) {
    try {
      const mmp = typeof p.multi_market_predictions === 'string'
        ? JSON.parse(p.multi_market_predictions)
        : p.multi_market_predictions
      for (const mm of mmp) {
        if (mm.market === '1x2') continue
        m.push({
          label: formatMarketName(mm.market),
          value: mm.prediction,
          color: 'text-zinc-200'
        })
      }
    } catch (e) { /* ignore */ }
  }

  return m
})

function formatMarketName(market) {
  const names = {
    'over_under_25': 'Over/Under 2.5',
    'btts': 'BTTS',
    'double_chance': 'Double Chance'
  }
  return names[market] || market.replace(/_/g, ' ')
}
</script>

<style scoped>
.verdict-card {
  background: rgba(28, 31, 39, 0.95);
  border: 1px solid rgba(42, 47, 58, 0.5);
}
.verdict-under {
  border-color: rgba(168, 85, 247, 0.3);
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(88, 28, 135, 0.12) 100%);
}
.verdict-over {
  border-color: rgba(52, 211, 153, 0.3);
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(6, 78, 59, 0.15) 100%);
}
.verdict-home {
  border-color: rgba(248, 40, 40, 0.3);
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(127, 29, 29, 0.12) 100%);
}
.verdict-away {
  border-color: rgba(8, 72, 168, 0.35);
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(8, 72, 168, 0.12) 100%);
}
.verdict-default {
  border-color: rgba(42, 47, 58, 0.6);
}
.bet-suggestion-card {
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.95), rgba(37, 40, 48, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.2);
}
.metric-cell {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(42, 47, 58, 0.4);
}
</style>
