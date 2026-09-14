<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- Has Prediction -->
    <template v-if="prediction">

      <!-- ═══ CONSOLIDATED PICK CARD (ring + pick + EV/Kelly/Edge grid) ═══ -->
      <div :class="['verdict-card rounded-xl px-3.5 sm:px-5 py-4 sm:py-5 relative overflow-hidden', verdictAccentClass]">
        <!-- Background decoration -->
        <div class="absolute inset-0 opacity-5 pointer-events-none">
          <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full" :class="verdictBgCircle"></div>
        </div>

        <div class="flex items-start gap-3 sm:gap-4 relative">
          <!-- Confidence ring -->
          <div class="flex-shrink-0">
            <svg class="block" :width="ringSize" :height="ringSize" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(63,63,70,0.6)" stroke-width="6" />
              <circle
                cx="32" cy="32" r="28" fill="none" stroke-width="6" stroke-linecap="round"
                :stroke="ringStroke"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringDashOffset"
                transform="rotate(-90 32 32)"
                style="transition: stroke-dashoffset 0.7s ease;"
              />
              <text x="32" y="36" text-anchor="middle" class="font-extrabold tabular-nums" :class="confidenceColor" style="font-size: 16px; fill: currentColor;">{{ confidence }}%</text>
            </svg>
            <p class="text-[9px] text-zinc-500 uppercase tracking-widest text-center mt-1 font-bold">Conf.</p>
          </div>

          <!-- Pick + odds + sub label -->
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">AI Pick</p>
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight truncate" :class="outcomeColor" :title="outcomeLabel">{{ pickShort }}</span>
              <span v-if="predictionOdds" class="text-sm font-bold text-zinc-300 tabular-nums">@ {{ predictionOdds }}</span>
            </div>
            <p class="text-[10px] text-zinc-500 mt-1 font-medium truncate">
              <span v-if="isAdmin">Model {{ prediction.model_version || '?' }} · </span>{{ marketLabel }}
            </p>
          </div>
        </div>

        <!-- EV / Kelly / Edge mini-grid -->
        <div v-if="hasMetrics" class="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 relative">
          <div class="metric-cell rounded-lg px-2 sm:px-2.5 py-1.5">
            <span class="text-[9px] text-zinc-500 block uppercase tracking-wider font-bold">EV</span>
            <span v-if="prediction.expected_value != null" class="text-sm font-bold tabular-nums" :class="evPct > 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ evPct > 0 ? '+' : '' }}{{ evPct.toFixed(0) }}%
            </span>
            <span v-else class="text-sm font-bold text-zinc-600">—</span>
          </div>
          <div class="metric-cell rounded-lg px-2 sm:px-2.5 py-1.5">
            <span class="text-[9px] text-zinc-500 block uppercase tracking-wider font-bold">Kelly</span>
            <span v-if="prediction.kelly_percentage != null" class="text-sm font-bold text-indigo-400 tabular-nums">{{ (prediction.kelly_percentage * 100).toFixed(1) }}%</span>
            <span v-else class="text-sm font-bold text-zinc-600">—</span>
          </div>
          <div class="metric-cell rounded-lg px-2 sm:px-2.5 py-1.5">
            <span class="text-[9px] text-zinc-500 block uppercase tracking-wider font-bold">Edge</span>
            <div v-if="prediction.expected_value != null" class="mt-1.5 w-full h-1.5 bg-surface-light rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700" :class="evBarClass" :style="{ width: evBarWidth + '%' }"></div>
            </div>
            <span v-else class="text-sm font-bold text-zinc-600">—</span>
          </div>
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

    <!-- No Prediction — honest about WHY when the analysis record has loaded:
         a coverage league or cup is "not bet, not modelled" (CD #3), which is
         a true and useful statement, not the same thing as "not generated
         yet". Falls back to the generic message while analysis is loading or
         for an enabled league whose predict step just hasn't run yet. -->
    <div v-else class="text-center py-12">
      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-light flex items-center justify-center">
        <UIcon name="i-heroicons-light-bulb" class="w-6 h-6 text-zinc-600" />
      </div>
      <template v-if="analysis?.betting && !analysis.betting.enabled">
        <p class="text-sm font-medium text-zinc-400">Not bet</p>
        <p class="text-xs text-zinc-600 mt-1 max-w-xs mx-auto">{{ analysis.betting.reason }}</p>
      </template>
      <template v-else>
        <p class="text-sm font-medium text-zinc-400">No prediction yet</p>
        <p class="text-xs text-zinc-600 mt-1">Predictions are generated before game day</p>
      </template>
    </div>

    <!-- Player Prop Picks (basketball only) -->
    <PlayerPropPicks v-if="isBball && game.id" :game-id="game.id" />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import PlayerPropPicks from '~/components/game/PlayerPropPicks.vue'
import { betLabelShort } from '~/utils/bet-label'
import { parsePrediction } from '~/utils/prediction-label'

const props = defineProps({
  game: { type: Object, required: true },
  prediction: { type: Object, default: null },
  sport: { type: String, default: 'football' },
  // Unified per-fixture analysis record — only used here for `betting`, so
  // the empty state can say WHY there's no pick instead of just "not yet".
  analysis: { type: Object, default: null }
})

const { isAdmin } = useAuth()
const isBball = computed(() => props.sport === 'basketball')

// ─── Confidence ring geometry ───────────────────────────
const ringSize = 64
const ringCircumference = 2 * Math.PI * 28  // r=28
const ringDashOffset = computed(() => {
  const pct = Math.max(0, Math.min(100, confidence.value))
  return ringCircumference * (1 - pct / 100)
})
const ringStroke = computed(() => {
  if (confidence.value >= 70) return '#22c55e'
  if (confidence.value >= 50) return '#eab308'
  return '#f97316'
})

const hasMetrics = computed(() =>
  props.prediction?.expected_value != null || props.prediction?.kelly_percentage != null
)

// Short pick label using shared formatter (≤14 chars). Falls back to verbose outcomeLabel.
const pickShort = computed(() => {
  if (!props.prediction) return ''
  const bet = {
    bet_type: props.prediction.bet_type || (props.prediction.prediction || '').toUpperCase(),
    notes: props.prediction.prediction,
    home_name: props.game.home_name,
    away_name: props.game.away_name,
  }
  const short = betLabelShort(bet)
  if (short && short.length <= 18) return short
  return outcomeLabel.value
})

// ─── Helpers ─────────────────────────────────────────────
const bballOdds = computed(() => props.game.sport_stats?.odds || null)

// ─── Outcome ─────────────────────────────────────────────
// Canonical parse — same function GameAnalysis.vue uses for its odds-cell
// highlight, so the two can no longer disagree about what a prediction code
// means (this used to be 5 separate `.toUpperCase()` pattern matches here
// alone, with a 6th, differently-branched one in GameAnalysis).
const parsed = computed(() => parsePrediction(props.prediction?.prediction, {
  homeTeam: props.game.home_name,
  awayTeam: props.game.away_name,
  ouLine: bballOdds.value?.over_under?.line,
}))

const outcomeLabel = computed(() => parsed.value.label)

const SIDE_COLOR = {
  home: 'text-[#f82828]',
  away: 'text-[#4d8fff]',
  draw: 'text-zinc-200',
  under: 'text-purple-400',
  over: 'text-emerald-400',
  spread: 'text-zinc-200',
}
const outcomeColor = computed(() => SIDE_COLOR[parsed.value.side || ''] || 'text-zinc-300')

const SIDE_ACCENT = {
  under: 'verdict-under',
  over: 'verdict-over',
  home: 'verdict-home',
  away: 'verdict-away',
}
// Accent class for the verdict card border/bg
const verdictAccentClass = computed(() => SIDE_ACCENT[parsed.value.side || ''] || 'verdict-default')

const SIDE_BG_CIRCLE = {
  under: 'bg-purple-500',
  over: 'bg-emerald-500',
  home: 'bg-red-500',
  away: 'bg-blue-500',
}
const verdictBgCircle = computed(() => SIDE_BG_CIRCLE[parsed.value.side || ''] || 'bg-zinc-500')

const MARKET_LABEL = {
  total: 'O/U Market',
  spread: 'Spread Market',
  moneyline: 'Moneyline',
}
// Market label for sub-text
const marketLabel = computed(() => MARKET_LABEL[parsed.value.market] || 'Main Market')

// The decimal odds for the predicted outcome (so user knows at what price to bet)
const predictionOdds = computed(() => {
  const odds = bballOdds.value
  const v = {
    under: odds?.over_under?.under || props.game.odds_under,
    over: odds?.over_under?.over || props.game.odds_over,
    home: odds?.moneyline?.home || props.game.odds_home,
    away: odds?.moneyline?.away || props.game.odds_away,
  }[parsed.value.side || '']
  return v ? Number(v).toFixed(2) : null
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
