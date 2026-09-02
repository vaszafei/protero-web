<template>
  <div class="game-header-card panel-glass rounded-lg overflow-hidden flex flex-col">
    <!-- League Info - subtle strip with brand gradient underline -->
    <div class="relative px-3 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between">
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="text-lg sm:text-xl">{{ game.league_flag }}</span>
        <div>
          <h3 class="font-semibold text-sm sm:text-base text-zinc-200">{{ game.league_name }}</h3>
          <p class="text-xs text-zinc-500">{{ game.round && game.round !== 0 && game.round !== '0' ? `Round ${game.round}` : game.league_name }}</p>
        </div>
      </div>
      <p class="text-xs text-zinc-400">{{ formatDate(game.date) }} · <span class="text-zinc-300 font-medium">{{ formatTime(game.date) }}</span></p>
      <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-brand-red/20 via-edge/40 to-brand-blue/20" />
    </div>

    <!-- Match Score — centered scorecard, logos either side of the score -->
    <div class="flex-1 flex flex-col justify-center px-3 sm:px-6 py-4 sm:py-5">
      <div class="flex items-center justify-center gap-3 sm:gap-6">
        <!-- Home logo + name -->
        <div class="flex flex-col items-center gap-1.5 w-28 sm:w-40">
          <div class="home-glow">
            <img 
              v-if="homeLogo && !homeImgError" 
              :src="homeLogo" 
              :alt="game.home_name" 
              class="w-12 h-12 sm:w-16 sm:h-16 object-contain"
              @error="homeImgError = true"
            />
            <div v-else class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-blue/12 border border-brand-blue/25 flex items-center justify-center">
              <span class="text-base sm:text-xl font-extrabold text-brand-blue/80 tracking-tight">{{ homeAbbr }}</span>
            </div>
          </div>
          <h1 class="team-name text-xs sm:text-sm font-semibold text-zinc-100 text-center">{{ game.home_name }}</h1>
          <p v-if="sport === 'football' && game.home_formation" class="text-[10px] sm:text-xs text-zinc-500">{{ game.home_formation }}</p>
        </div>

        <!-- Score -->
        <div class="text-center min-w-[72px] sm:min-w-[104px] flex-shrink-0">
          <div v-if="game.status === 'completed'" class="space-y-1.5">
            <div class="flex items-center justify-center gap-2 sm:gap-3 score-pulse">
              <span class="text-2xl sm:text-4xl font-bold text-zinc-50"><CountUp :value="Number(game.home_goals)" /></span>
              <span class="text-lg sm:text-2xl text-zinc-600 font-light">-</span>
              <span class="text-2xl sm:text-4xl font-bold text-zinc-50"><CountUp :value="Number(game.away_goals)" /></span>
            </div>
            <span class="inline-block px-2 py-0.5 score-badge text-[10px] sm:text-xs font-medium rounded-full tracking-wide uppercase">
              Full Time
            </span>
          </div>
          <div v-else-if="game.status === 'live'" class="space-y-1.5">
            <div class="flex items-center justify-center gap-2 sm:gap-3">
              <span class="text-3xl sm:text-5xl font-bold text-zinc-50"><CountUp :value="Number(game.home_goals || 0)" /></span>
              <span class="text-xl sm:text-2xl text-zinc-600 font-light">-</span>
              <span class="text-3xl sm:text-5xl font-bold text-zinc-50"><CountUp :value="Number(game.away_goals || 0)" /></span>
            </div>
            <span class="inline-block px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] sm:text-xs font-medium rounded-full animate-pulse uppercase tracking-wide">
              Live
            </span>
          </div>
          <div v-else class="space-y-1.5">
            <div class="text-2xl sm:text-4xl font-semibold text-zinc-600">VS</div>
            <span class="inline-block px-2 py-0.5 bg-zinc-700/40 text-zinc-500 text-[10px] sm:text-xs font-medium rounded-full tracking-wide uppercase">
              Scheduled
            </span>
          </div>
        </div>

        <!-- Away logo + name -->
        <div class="flex flex-col items-center gap-1.5 w-28 sm:w-40">
          <div class="away-glow">
            <img 
              v-if="awayLogo && !awayImgError" 
              :src="awayLogo" 
              :alt="game.away_name" 
              class="w-12 h-12 sm:w-16 sm:h-16 object-contain"
              @error="awayImgError = true"
            />
            <div v-else class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-red/12 border border-brand-red/25 flex items-center justify-center">
              <span class="text-base sm:text-xl font-extrabold text-brand-red/80 tracking-tight">{{ awayAbbr }}</span>
            </div>
          </div>
          <h1 class="team-name text-xs sm:text-sm font-semibold text-zinc-100 text-center">{{ game.away_name }}</h1>
          <p v-if="sport === 'football' && game.away_formation" class="text-[10px] sm:text-xs text-zinc-500">{{ game.away_formation }}</p>
        </div>
      </div>

      <!-- Venue / referee / stage meta strip, centered under the score -->
      <div v-if="hasMeta" class="mt-4 pt-3 border-t border-edge/40">
        <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs">
          <div v-if="venueLabel" class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-zinc-500" />
            <span class="text-zinc-400">{{ venueLabel }}</span>
          </div>
          <div v-if="game.referee?.name || game.referee_name" class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-user" class="w-3.5 h-3.5 text-zinc-500" />
            <span class="text-zinc-500">Referee</span>
            <span class="font-medium text-zinc-300">{{ game.referee?.name || game.referee_name }}</span>
          </div>
          <div v-if="stageLabel" class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-zinc-500" />
            <span class="text-zinc-400">{{ stageLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Possession / xG strip (scheduled football) -->
      <div
        v-if="sport === 'football' && game.status !== 'completed' && (hasPossession || hasXg)"
        class="mt-3 sm:mt-4 pt-3 border-t border-edge/40"
      >
        <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          <div v-if="hasPossession" class="flex items-center gap-2">
            <span class="text-[10px] uppercase tracking-wider text-zinc-500">Possession</span>
            <span class="font-bold text-zinc-200 tabular-nums">{{ num(game.home_possession) }}%</span>
            <span class="text-zinc-600 text-xs">/</span>
            <span class="font-bold text-zinc-200 tabular-nums">{{ num(game.away_possession) }}%</span>
          </div>
          <div v-if="hasXg" class="flex items-center gap-2">
            <span class="text-[10px] uppercase tracking-wider text-zinc-500">xG</span>
            <span class="font-bold text-zinc-200 tabular-nums">{{ num(game.home_xg, 2) }}</span>
            <span class="text-zinc-600 text-xs">/</span>
            <span class="font-bold text-zinc-200 tabular-nums">{{ num(game.away_xg, 2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Odds / Bet Picks strip — identical to dashboard card bottom bar -->
    <div v-if="hasOddsOrPicks" class="flex items-center gap-1 px-2 py-1 border-t border-edge/30 bg-surface/30 min-h-[22px]">
      <template v-if="oddsData?.over_under?.line">
        <div :class="[
          'relative px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-medium transition-all',
          activeOverBet ? 'ring-1 ring-emerald-400/70 bg-emerald-500/15 text-emerald-400 font-bold' : 'text-zinc-600'
        ]">
          O {{ oddsData.over_under.line }}<span v-if="oddsData.over_under.over" class="ml-0.5 text-[9px] opacity-60">@{{ Number(oddsData.over_under.over).toFixed(2) }}</span>
          <span v-if="activeOverBet && activeOverStake" class="absolute -top-1.5 -right-1 bg-emerald-500 text-white text-[7px] font-extrabold px-1 py-px rounded-full leading-none">{{ activeOverStake }}</span>
        </div>
        <div :class="[
          'relative px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-medium transition-all',
          activeUnderBet ? 'ring-1 ring-purple-400/70 bg-purple-500/15 text-purple-400 font-bold' : 'text-zinc-600'
        ]">
          U {{ oddsData.over_under.line }}<span v-if="oddsData.over_under.under" class="ml-0.5 text-[9px] opacity-60">@{{ Number(oddsData.over_under.under).toFixed(2) }}</span>
          <span v-if="activeUnderBet && activeUnderStake" class="absolute -top-1.5 -right-1 bg-purple-500 text-white text-[7px] font-extrabold px-1 py-px rounded-full leading-none">{{ activeUnderStake }}</span>
        </div>
      </template>
      <template v-else-if="oddsData?.moneyline?.home">
        <span class="px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 whitespace-nowrap">H {{ oddsData.moneyline.home.toFixed(2) }}</span>
        <span v-if="oddsData.moneyline.draw" class="px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 whitespace-nowrap">D {{ oddsData.moneyline.draw.toFixed(2) }}</span>
        <span class="px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 whitespace-nowrap">A {{ oddsData.moneyline.away.toFixed(2) }}</span>
      </template>

      <div class="flex-1" />

      <button
        v-if="displayPrediction && !hidesPredictionChip"
        type="button"
        @click="openBetSheet"
        :class="[
          'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded whitespace-nowrap max-w-[200px] truncate transition-colors',
          getPredictionClasses(displayPrediction.prediction, game.home_goals !== null),
          'hover:brightness-125 active:scale-95'
        ]"
      >
        <span class="truncate">{{ shortPredictionLabel }}</span>
        <span
          v-if="game.home_goals !== null"
          :class="[
            'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-extrabold leading-none',
            isPredictionCorrect() ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
          ]"
        >{{ isPredictionCorrect() ? 'W' : 'L' }}</span>
        <UIcon name="i-heroicons-information-circle" class="w-3 h-3 opacity-80 flex-shrink-0" />
      </button>
      <div v-if="displayPrediction?.confidence" :class="[
        'px-1 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap',
        displayPrediction.confidence >= 70 ? 'bg-emerald-600/30 text-emerald-400' :
        displayPrediction.confidence >= 55 ? 'bg-sky-600/30 text-sky-400' :
        displayPrediction.confidence >= 45 ? 'bg-amber-500/30 text-amber-400' : 'bg-rose-600/30 text-rose-400'
      ]">{{ displayPrediction.confidence }}%</div>
    </div>

    <!-- ━━━ Bet Summary Bottom Sheet ━━━ -->
    <Teleport to="body">
      <Transition name="bet-sheet">
        <div v-if="betSheetOpen" class="bet-sheet-overlay" @click.self="closeBetSheet">
          <div class="bet-sheet">
            <div class="bet-sheet-handle" />
            <div class="flex items-start justify-between px-5 pt-3 pb-3 border-b border-edge/40">
              <div class="min-w-0">
                <div class="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">AI Pick</div>
                <h3 class="text-base font-bold text-zinc-100 leading-tight">{{ betSheetLong }}</h3>
              </div>
              <button @click="closeBetSheet" class="ml-3 w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-zinc-400 hover:text-zinc-200 flex-shrink-0">
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
              </button>
            </div>
            <div class="px-5 py-4 space-y-3">
              <!-- Match -->
              <div class="bg-surface-light/40 rounded-lg px-3 py-2">
                <div class="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Match</div>
                <div class="flex items-center justify-between text-sm font-semibold text-zinc-100">
                  <span class="truncate">{{ game.home_name }}</span>
                  <span class="text-zinc-500 mx-2">vs</span>
                  <span class="truncate text-right">{{ game.away_name }}</span>
                </div>
              </div>

              <!-- Probability + Confidence -->
              <div class="grid grid-cols-2 gap-2" v-if="betSheetProbPct != null || displayPrediction?.confidence">
                <div v-if="betSheetProbPct != null" class="bet-sheet-stat">
                  <span class="text-[10px] uppercase tracking-wider text-zinc-500">Model Probability</span>
                  <span class="text-lg font-bold text-emerald-300 tabular-nums">{{ betSheetProbPct }}%</span>
                </div>
                <div v-if="displayPrediction?.confidence" class="bet-sheet-stat">
                  <span class="text-[10px] uppercase tracking-wider text-zinc-500">Confidence</span>
                  <span class="text-lg font-bold text-sky-300 tabular-nums">{{ displayPrediction.confidence }}%</span>
                </div>
              </div>

              <!-- EV / Kelly -->
              <div class="grid grid-cols-2 gap-2" v-if="displayPrediction?.expected_value != null || displayPrediction?.kelly_percentage != null">
                <div v-if="displayPrediction.expected_value != null" class="bet-sheet-stat">
                  <span class="text-[10px] uppercase tracking-wider text-zinc-500">Expected Value</span>
                  <span :class="['text-lg font-bold tabular-nums', Number(displayPrediction.expected_value) > 0 ? 'text-emerald-300' : 'text-rose-300']">
                    {{ (Number(displayPrediction.expected_value) * 100).toFixed(1) }}%
                  </span>
                </div>
                <div v-if="displayPrediction.kelly_percentage != null" class="bet-sheet-stat">
                  <span class="text-[10px] uppercase tracking-wider text-zinc-500">Kelly Stake</span>
                  <span class="text-lg font-bold text-indigo-300 tabular-nums">
                    {{ (Number(displayPrediction.kelly_percentage) * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>

              <!-- Active bet (if any) -->
              <div v-if="activeBetForSheet" class="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2">
                <div class="text-[10px] uppercase tracking-wider text-purple-300 mb-1">Active Bet</div>
                <div class="flex items-center justify-between text-sm font-semibold text-zinc-100">
                  <span>{{ formatBetLabel(activeBetForSheet) }}</span>
                  <span v-if="activeBetForSheet.stake || activeBetForSheet.amount" class="text-emerald-300 tabular-nums">
                    ${{ Math.round(Number(activeBetForSheet.stake || activeBetForSheet.amount)) }}
                  </span>
                </div>
              </div>

              <!-- Notes (raw) -->
              <div v-if="displayPrediction?.notes && displayPrediction.notes !== displayPrediction.prediction" class="text-[11px] text-zinc-500 leading-snug">
                {{ displayPrediction.notes }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { betLabelShort, betLabelLong } from '~/utils/bet-label'
import CountUp from '~/components/ui/CountUp.vue'

const props = defineProps({
  game: {
    type: Object,
    required: true
  },
  sport: {
    type: String,
    default: 'football'
  }
})

const hasPossession = computed(() => {
  const h = Number(props.game.home_possession)
  const a = Number(props.game.away_possession)
  return isFinite(h) && isFinite(a) && (h + a) > 0
})

const hasXg = computed(() => {
  const h = Number(props.game.home_xg)
  const a = Number(props.game.away_xg)
  return isFinite(h) && isFinite(a) && (h + a) > 0
})

// The meta strip shows only rows that actually carry data.
const hasMeta = computed(() => {
  return !!(props.game.venue
    || props.game.sport_stats?.venue
    || props.game.referee?.name
    || props.game.referee_name
    || props.game.stage
    || (props.game.round && props.game.round !== 0))
})

const venueLabel = computed(() =>
  props.game.venue || props.game.sport_stats?.venue || '')

const stageLabel = computed(() => {
  const g = props.game
  if (g.stage && g.stage !== '0') return g.stage
  if (g.round && g.round !== 0 && g.round !== '0') return `Round ${g.round}`
  return ''
})

function num(v: any, decimals = 0): string {
  const n = Number(v)
  return isFinite(n) ? n.toFixed(decimals) : '-'
}

// Track image load errors to fall back to initials
const homeImgError = ref(false)
const awayImgError = ref(false)

// Reset errors when game changes
watch(() => props.game?.id, () => {
  homeImgError.value = false
  awayImgError.value = false
})

import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

const homeLogo = computed(() => getTeamLogoUrl(props.game.home_key))
const awayLogo = computed(() => getTeamLogoUrl(props.game.away_key))

const homeAbbr = computed(() => teamAbbreviation(props.game.home_name))
const awayAbbr = computed(() => teamAbbreviation(props.game.away_name))

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    timeZone: 'Europe/Athens',
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    timeZone: 'Europe/Athens',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

// ── Odds / prediction / bets ────────────────────────────────
const oddsData = computed(() => props.game.sport_stats?.odds || null)

const displayPrediction = computed(() => {
  if (props.game.predictions?.length > 0) return props.game.predictions[0]
  return props.game.prediction || null
})

// Canonical short label (e.g. "U 216.5", "O 1.5", "Home", "U 216.5 + O 221.5").
// Prefer the bet that's actually placed on this game; fall back to prediction text.
const shortPredictionLabel = computed(() => {
  const placedBet = activeOverBet.value || activeUnderBet.value
  if (placedBet) return betLabelShort(placedBet)
  const p = displayPrediction.value
  if (!p) return ''
  const short = betLabelShort({
    bet_type: p.bet_type || p.prediction,
    notes: p.prediction || p.notes,
  })
  return short || formatPrediction(p.prediction)
})

const gameBets = computed<any[]>(() => props.game.bets || [])

const activeOverBet = computed(() =>
  gameBets.value.find(b => {
    const bt = (b.bet_type || '').toLowerCase()
    return bt.includes('over') && !bt.includes('under')
  }) || null
)
const activeUnderBet = computed(() =>
  gameBets.value.find(b => (b.bet_type || '').toLowerCase().includes('under')) || null
)

function _fmtStake(bet: any) {
  const s = bet?.stake || bet?.amount
  if (!s) return null
  const n = Number(s)
  return isNaN(n) ? null : `$${Math.round(n)}`
}
const activeOverStake = computed(() => _fmtStake(activeOverBet.value))
const activeUnderStake = computed(() => _fmtStake(activeUnderBet.value))

const hidesPredictionChip = computed(() => {
  if (!oddsData.value?.over_under?.line) return false
  return !!(activeOverBet.value || activeUnderBet.value)
})

const hasOddsOrPicks = computed(() =>
  !!oddsData.value || !!displayPrediction.value || gameBets.value.length > 0
)

function formatPrediction(prediction: string) {
  if (!prediction) return ''
  const pred = prediction.toUpperCase()
  const ouLine = oddsData.value?.over_under?.line
  if (pred.includes('OVER_TOTAL') || pred.includes('OVER_ALT')) return ouLine ? `O ${ouLine}` : 'OVER'
  if (pred.includes('UNDER_TOTAL') || pred.includes('UNDER_ALT')) return ouLine ? `U ${ouLine}` : 'UNDER'
  if (pred.includes('SPREAD_COVER')) return 'SPREAD'
  if (pred.includes('HOME_WIN')) return 'HOME'
  const map: Record<string, string> = {
    'HOME': 'HOME', 'DRAW': 'DRAW', 'AWAY': 'AWAY',
    'OVER': 'OVER 2.5', 'UNDER': 'UNDER 2.5',
    'OVER_15': 'OVER 1.5', 'UNDER_15': 'UNDER 1.5',
    'OVER_25': 'OVER 2.5', 'UNDER_25': 'UNDER 2.5',
    'OVER_35': 'OVER 3.5', 'UNDER_35': 'UNDER 3.5',
  }
  return map[pred] || pred
}

function isPredictionCorrect() {
  const p = displayPrediction.value
  if (!p || props.game.home_goals === null) return false
  return p.result_correct === true
}

function getPredictionClasses(prediction: string, isFinished: boolean) {
  if (!prediction) return ''
  const pred = prediction.toUpperCase()
  const isCorrect = isFinished && isPredictionCorrect()
  const isWrong = isFinished && !isPredictionCorrect()
  if (isCorrect) return 'bg-emerald-500/20 text-emerald-400'
  if (isWrong) return 'bg-red-500/15 text-red-400'
  if (pred.includes('HOME') || pred.includes('OVER')) return 'bg-sky-500/15 text-sky-400'
  if (pred.includes('DRAW')) return 'bg-amber-500/15 text-amber-400'
  return 'bg-zinc-700/60 text-zinc-300'
}

function formatBetLabel(bet: any) {
  if (bet.notes) return bet.notes
  const t = (bet.bet_type || '').toUpperCase()
  const map: Record<string, string> = {
    'OVER': 'Over', 'UNDER': 'Under',
    'OVER_ALT': 'Over (alt)', 'UNDER_ALT': 'Under (alt)',
    'SPREAD_COVER': 'Spread', 'HOME_WIN': 'ML Home', 'AWAY_WIN': 'ML Away',
    'SGP_HOME_ML+HOME_COVERS': 'SGP Home+Spread',
    'SGP_AWAY_ML+AWAY_COVERS': 'SGP Away+Spread',
  }
  return map[t] || t
}

// ─── Bet Summary BottomSheet ────────────────────────────
const betSheetOpen = ref(false)

function openBetSheet() {
  betSheetOpen.value = true
}
function closeBetSheet() {
  betSheetOpen.value = false
}

const activeBetForSheet = computed(() => activeOverBet.value || activeUnderBet.value || null)

const betSheetLong = computed(() => {
  const placed = activeBetForSheet.value
  if (placed) return betLabelLong(placed)
  const p = displayPrediction.value
  if (!p) return ''
  return betLabelLong({
    bet_type: p.bet_type || p.prediction,
    notes: p.notes || p.prediction,
  }) || formatPrediction(p.prediction)
})

const betSheetProbPct = computed(() => {
  const p = displayPrediction.value
  if (!p) return null
  const raw = p.home_win_prob ?? p.away_win_prob ?? p.over_prob ?? p.under_prob ?? p.probability
  if (raw == null) return null
  const n = Number(raw)
  if (!isFinite(n)) return null
  return Math.round(n <= 1 ? n * 100 : n)
})
</script>

<style scoped>
/*
 * "New York Knicks" and "San Antonio Spurs" wrapped to THREE lines in the
 * 160px name column and pushed the whole scorecard out of shape. Two lines
 * max, balanced so a two-word name does not break as 1 + 1 orphan, and
 * ellipsed past that.
 */
.team-name {
  line-height: 1.2;
  text-wrap: balance;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
  overflow-wrap: anywhere;
}

.game-header-card {
  /* Background/border come from the shared .panel-glass class (panels.css);
     this rule only adds the extra outer glow .panel-glass doesn't define. */
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.score-pulse {
  animation: score-pulse-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: 0.3s;
}

@keyframes score-pulse-in {
  0% { transform: scale(0.92); text-shadow: 0 0 0 rgba(255, 255, 255, 0); }
  55% { transform: scale(1.05); text-shadow: 0 0 18px rgba(255, 255, 255, 0.25); }
  100% { transform: scale(1); text-shadow: 0 0 0 rgba(255, 255, 255, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .score-pulse {
    animation: none;
  }
}

.home-glow {
  filter: drop-shadow(0 0 12px rgba(248, 40, 40, 0.1));
}

.away-glow {
  filter: drop-shadow(0 0 12px rgba(8, 72, 168, 0.1));
}

.score-badge {
  background: linear-gradient(135deg, rgba(248, 40, 40, 0.08) 0%, rgba(8, 72, 168, 0.08) 100%);
  color: rgba(200, 200, 210, 0.7);
  border: 1px solid rgba(248, 40, 40, 0.06);
}

/* Bet summary bottom sheet */
.bet-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 80;
}
.bet-sheet {
  width: 100%;
  max-width: 540px;
  background: #1c1f27;
  border: 1px solid rgba(42, 47, 58, 0.6);
  border-bottom: none;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding-bottom: env(safe-area-inset-bottom, 12px);
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5);
}
.bet-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(120, 125, 140, 0.6);
  margin: 8px auto 4px;
}
.bet-sheet-stat {
  @apply bg-surface-light/40 rounded-lg px-3 py-2 flex flex-col gap-0.5;
}
.bet-sheet-enter-active,
.bet-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.bet-sheet-enter-active .bet-sheet,
.bet-sheet-leave-active .bet-sheet {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.bet-sheet-enter-from,
.bet-sheet-leave-to {
  opacity: 0;
}
.bet-sheet-enter-from .bet-sheet,
.bet-sheet-leave-to .bet-sheet {
  transform: translateY(100%);
}
</style>
