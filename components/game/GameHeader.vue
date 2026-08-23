<template>
  <div class="game-header-card rounded-lg overflow-hidden">
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
      <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#f82828]/20 via-edge/40 to-[#0848a8]/20" />
    </div>

    <!-- Match Score -->
    <div class="px-3 sm:px-6 py-2.5 sm:py-3">
      <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-3 sm:gap-6">
        <!-- Home Team -->
        <div class="flex flex-col items-center sm:items-end gap-1.5">
          <div class="home-glow">
            <img 
              v-if="homeLogo && !homeImgError" 
              :src="homeLogo" 
              :alt="game.home_name" 
              class="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              @error="homeImgError = true"
            />
            <div v-else class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#f82828]/12 border border-[#f82828]/20 flex items-center justify-center">
              <span class="text-xs sm:text-sm font-extrabold text-[#f82828]/70 tracking-tight">{{ homeAbbr }}</span>
            </div>
          </div>
          <h1 class="text-xs sm:text-base font-semibold text-zinc-200 text-center sm:text-right leading-tight">{{ game.home_name }}</h1>
          <p v-if="sport === 'football' && game.home_formation" class="text-[10px] sm:text-xs text-zinc-500">
            {{ game.home_formation }}
          </p>
        </div>

        <!-- Score -->
        <div class="text-center min-w-[64px] sm:min-w-[88px]">
          <div v-if="game.status === 'completed'" class="space-y-1.5">
            <div class="flex items-center justify-center gap-2 sm:gap-2.5">
              <span class="text-xl sm:text-3xl font-bold text-zinc-100"><CountUp :value="Number(game.home_goals)" /></span>
              <span class="text-base sm:text-xl text-zinc-600 font-light">-</span>
              <span class="text-xl sm:text-3xl font-bold text-zinc-100"><CountUp :value="Number(game.away_goals)" /></span>
            </div>
            <span class="inline-block px-2 py-0.5 score-badge text-[10px] sm:text-xs font-medium rounded-full tracking-wide uppercase">
              Full Time
            </span>
          </div>
          <div v-else-if="game.status === 'live'" class="space-y-1.5">
            <div class="flex items-center justify-center gap-2 sm:gap-2.5">
              <span class="text-2xl sm:text-4xl font-bold text-zinc-100"><CountUp :value="Number(game.home_goals || 0)" /></span>
              <span class="text-base sm:text-xl text-zinc-600 font-light">-</span>
              <span class="text-2xl sm:text-4xl font-bold text-zinc-100"><CountUp :value="Number(game.away_goals || 0)" /></span>
            </div>
            <span class="inline-block px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] sm:text-xs font-medium rounded-full animate-pulse uppercase tracking-wide">
              Live
            </span>
          </div>
          <div v-else class="space-y-1.5">
            <div class="text-xl sm:text-3xl font-semibold text-zinc-600">VS</div>
            <span class="inline-block px-2 py-0.5 bg-zinc-700/40 text-zinc-500 text-[10px] sm:text-xs font-medium rounded-full tracking-wide uppercase">
              Scheduled
            </span>
          </div>
        </div>

        <!-- Away Team -->
        <div class="flex flex-col items-center sm:items-start gap-1.5">
          <div class="away-glow">
            <img 
              v-if="awayLogo && !awayImgError" 
              :src="awayLogo" 
              :alt="game.away_name" 
              class="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              @error="awayImgError = true"
            />
            <div v-else class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#0848a8]/12 border border-[#0848a8]/20 flex items-center justify-center">
              <span class="text-xs sm:text-sm font-extrabold text-[#0848a8]/70 tracking-tight">{{ awayAbbr }}</span>
            </div>
          </div>
          <h1 class="text-xs sm:text-base font-semibold text-zinc-200 text-center sm:text-left leading-tight">{{ game.away_name }}</h1>
          <p v-if="sport === 'football' && game.away_formation" class="text-[10px] sm:text-xs text-zinc-500">
            {{ game.away_formation }}
          </p>
        </div>
      </div>

      <!-- Possession / xG strip (completed football) -->
      <div
        v-if="sport === 'football' && game.status !== 'completed' && (hasPossession || hasXg)"
        class="mt-3 sm:mt-4 pt-3 sm:pt-3 border-t border-edge/40"
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

      <!-- Referee Info (football only) -->
      <div v-if="sport === 'football' && game.referee" class="mt-3 sm:mt-4 pt-3 border-t border-edge/40">
        <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Referee:</span>
            <span class="font-medium text-zinc-300">{{ game.referee.name }}</span>
          </div>
          <div class="h-3 w-px bg-edge/50 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Avg Yellow:</span>
            <span class="font-medium text-amber-500/80">{{ game.referee.avg_yellow_cards ? game.referee.avg_yellow_cards.toFixed(1) : 'N/A' }}</span>
          </div>
          <div class="h-3 w-px bg-edge/50 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Avg Red:</span>
            <span class="font-medium text-red-400/80">{{ game.referee.avg_red_cards ? game.referee.avg_red_cards.toFixed(2) : 'N/A' }}</span>
          </div>
          <div class="h-3 w-px bg-edge/50 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Avg Fouls:</span>
            <span class="font-medium text-zinc-400">{{ game.referee.avg_fouls ? game.referee.avg_fouls.toFixed(1) : 'N/A' }}</span>
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
.game-header-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
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
