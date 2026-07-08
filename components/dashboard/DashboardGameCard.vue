<template>
  <NuxtLink
    :to="`/game/${game.id}`"
    class="game-card group flex flex-col rounded-lg transition-all cursor-pointer relative overflow-hidden"
  >
    <!-- Status bar top -->
    <div class="flex items-center justify-between px-2 py-1 border-b border-edge/30">
      <span class="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{{ formatTime(game.date) }}</span>
      <div class="flex items-center gap-1">
        <span v-if="game.home_goals !== null" class="text-[10px] font-bold text-zinc-500 uppercase">FT</span>
        <span v-else class="text-[10px] text-emerald-500 font-medium">Scheduled</span>
      </div>
    </div>

    <!-- Teams section -->
    <div class="flex flex-col gap-1 px-2 py-1.5">
      <!-- Home team row -->
      <div class="flex items-center gap-2">
        <img v-if="homeLogo" :src="homeLogo" loading="lazy" width="18" height="18" class="w-[18px] h-[18px] object-contain flex-shrink-0" :alt="game.home_name" @error="($event.target as HTMLImageElement).style.display='none'" />
        <div v-else class="w-[18px] h-[18px] rounded-full bg-[#0848a8]/20 flex-shrink-0"></div>
        <span class="text-[12px] font-semibold text-zinc-200 truncate flex-1">{{ game.home_name }}</span>
        <span v-if="game.home_goals !== null" class="text-[13px] font-bold text-zinc-100 tabular-nums w-5 text-right">{{ game.home_goals }}</span>
        <span v-else-if="oddsData?.moneyline?.home" class="text-[11px] font-medium text-zinc-400 tabular-nums w-8 text-right">{{ oddsData.moneyline.home.toFixed(2) }}</span>
      </div>
      <!-- Away team row -->
      <div class="flex items-center gap-2">
        <img v-if="awayLogo" :src="awayLogo" loading="lazy" width="18" height="18" class="w-[18px] h-[18px] object-contain flex-shrink-0" :alt="game.away_name" @error="($event.target as HTMLImageElement).style.display='none'" />
        <div v-else class="w-[18px] h-[18px] rounded-full bg-[#f82828]/15 flex-shrink-0"></div>
        <span class="text-[12px] font-semibold text-zinc-200 truncate flex-1">{{ game.away_name }}</span>
        <span v-if="game.away_goals !== null" class="text-[13px] font-bold text-zinc-100 tabular-nums w-5 text-right">{{ game.away_goals }}</span>
        <span v-else-if="oddsData?.moneyline?.away" class="text-[11px] font-medium text-zinc-400 tabular-nums w-8 text-right">{{ oddsData.moneyline.away.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Bottom bar: Market odds + Prediction + Confidence -->
    <div class="flex items-center gap-1 px-2 py-1 border-t border-edge/30 bg-surface/30 min-h-[22px]">
      <!-- O/U visual chips — basketball games with O/U line -->
      <template v-if="oddsData?.over_under?.line">
        <!-- Over chip -->
        <div :class="[
          'relative px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-medium transition-all',
          activeOverBet ? 'ring-1 ring-emerald-400/70 bg-emerald-500/15 text-emerald-400 font-bold' : 'text-zinc-600'
        ]">
          O {{ oddsData.over_under.line }}<span v-if="oddsData.over_under.over" class="ml-0.5 text-[9px] opacity-60">@{{ Number(oddsData.over_under.over).toFixed(2) }}</span>
          <span v-if="activeOverBet && activeOverStake" class="absolute -top-1.5 -right-1 bg-emerald-500 text-white text-[7px] font-extrabold px-1 py-px rounded-full leading-none">{{ activeOverStake }}</span>
        </div>
        <!-- Under chip -->
        <div :class="[
          'relative px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-medium transition-all',
          activeUnderBet ? 'ring-1 ring-purple-400/70 bg-purple-500/15 text-purple-400 font-bold' : 'text-zinc-600'
        ]">
          U {{ oddsData.over_under.line }}<span v-if="oddsData.over_under.under" class="ml-0.5 text-[9px] opacity-60">@{{ Number(oddsData.over_under.under).toFixed(2) }}</span>
          <span v-if="activeUnderBet && activeUnderStake" class="absolute -top-1.5 -right-1 bg-purple-500 text-white text-[7px] font-extrabold px-1 py-px rounded-full leading-none">{{ activeUnderStake }}</span>
        </div>
      </template>
      <!-- Spread chip (when no O/U but has handicap) -->
      <span
        v-else-if="oddsData?.handicap?.line"
        class="px-1 py-0.5 text-[10px] font-medium text-zinc-500 whitespace-nowrap"
      >
        {{ oddsData.handicap.line > 0 ? '+' : '' }}{{ oddsData.handicap.line }}
      </span>

      <div class="flex-1"></div>

      <!-- Prediction chip — hide for O/U bets (already shown above) -->
      <div v-if="displayPrediction && !hidesPredictionChip" :class="[
        'px-1.5 py-0.5 text-[10px] font-bold rounded whitespace-nowrap',
        getPredictionClasses(displayPrediction.prediction, game.home_goals !== null)
      ]">
        {{ formatPrediction(displayPrediction.prediction) }}
        <span v-if="game.home_goals !== null" class="ml-0.5">{{ isPredictionCorrect() ? 'W' : 'L' }}</span>
      </div>

      <!-- Confidence -->
      <div v-if="displayPrediction?.confidence" :class="[
        'px-1 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap',
        displayPrediction.confidence >= 70 ? 'bg-emerald-600/30 text-emerald-400' : 
        displayPrediction.confidence >= 55 ? 'bg-sky-600/30 text-sky-400' : 
        displayPrediction.confidence >= 45 ? 'bg-amber-500/30 text-amber-400' : 'bg-rose-600/30 text-rose-400'
      ]">
        {{ displayPrediction.confidence }}%
      </div>

      <!-- Bet count indicator (only when no O/U chips shown) -->
      <span v-if="gameBets.length > 0 && !oddsData?.over_under?.line" class="px-1 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 whitespace-nowrap">{{ gameBets.length }} pick{{ gameBets.length > 1 ? 's' : '' }}</span>
    </div>

    <!-- Bet picks row (only when bets exist) -->
    <div v-if="gameBets.length > 0" class="flex flex-wrap gap-1 px-2 py-1 border-t border-edge/20 bg-surface/20">
      <div
        v-for="b in gameBets"
        :key="b.id"
        :class="[
          'flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold',
          b.status === 'won' ? 'bg-emerald-500/15 text-emerald-400' :
          b.status === 'lost' ? 'bg-red-500/15 text-red-400' :
          'bg-amber-500/10 text-amber-400'
        ]"
      >
        <span class="font-bold">{{ formatBetLabel(b) }}</span>
        <span class="text-zinc-500">@{{ Number(b.odds).toFixed(2) }}</span>
        <span v-if="b.stake || b.amount" class="text-zinc-600 ml-0.5">· ${{ Number(b.stake || b.amount).toFixed(0) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps({
  game: {
    type: Object,
    required: true
  },
  bet: {
    type: Object,
    default: null
  },
  bets: {
    type: Array,
    default: () => []
  }
})

import { getTeamLogoUrl } from '~/utils/teamLogo'

const homeLogo = computed(() => getTeamLogoUrl(props.game.home_key, props.game.league_key))
const awayLogo = computed(() => getTeamLogoUrl(props.game.away_key, props.game.league_key))

// Odds data — prefer sport_stats.odds (pre-averaged), fall back to odds_raw arrays
const oddsData = computed(() => {
  if (props.game.sport_stats?.odds) return props.game.sport_stats.odds
  const raw = props.game.odds_raw
  if (!raw) return null
  // odds_raw stores arrays of bookmaker entries — take the first (most recent) per market
  const ml = Array.isArray(raw.moneyline) ? raw.moneyline[0] : raw.moneyline
  const hc = Array.isArray(raw.handicap) ? raw.handicap[0] : raw.handicap
  const ou = Array.isArray(raw.over_under) ? raw.over_under[0] : raw.over_under
  if (!ml && !hc && !ou) return null
  return {
    moneyline: ml || null,
    handicap: hc || null,
    over_under: ou || null,
  }
})

// Extract prediction from game (handle both array and object)
const displayPrediction = computed(() => {
  if (props.game.predictions && props.game.predictions.length > 0) {
    return props.game.predictions[0]
  }
  return props.game.prediction || null
})

// Wallets that only produce parlays (props strategies). Their per-leg bet
// rows must never render as standalone chips on a game card.
const PARLAY_ONLY_WALLETS = new Set([19, 20])

function isParlayLeg(bet) {
  if (!bet?.notes) return false
  let n = bet.notes
  if (typeof n === 'string') {
    try { n = JSON.parse(n) } catch { return false }
  }
  return !!(n && (n.parlay_id || n.pick_type === 'prop_parlay_leg' || n.leg_number))
}

// Collect all bets for this game from props and game.bets, then filter out
// parlay legs and parlay-only wallets so chips only show real per-game singles.
const gameBets = computed(() => {
  const allBets = []
  if (props.bets && props.bets.length > 0) allBets.push(...props.bets)
  else if (props.bet) allBets.push(props.bet)
  if (props.game.bets && props.game.bets.length > 0) {
    for (const b of props.game.bets) {
      if (!allBets.some(x => x.id === b.id)) allBets.push(b)
    }
  }
  return allBets.filter(b => {
    if (PARLAY_ONLY_WALLETS.has(Number(b.wallet_id))) return false
    if (isParlayLeg(b)) return false
    return true
  })
})

// Legacy single bet (kept for compatibility)
const displayBet = computed(() => gameBets.value[0] || null)

// Format time for display
function formatTime(dateStr) {
  if (!dateStr || dateStr === 'TBD') return 'TBD'
  
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Format prediction for display
function formatPrediction(prediction) {
  if (!prediction) return ''
  
  const pred = prediction.toUpperCase()
  const mapping = {
    'HOME': 'HOME',
    'DRAW': 'DRAW',
    'AWAY': 'AWAY',
    'OVER': 'OVER 2.5',
    'UNDER': 'UNDER 2.5',
    'OVER_15': 'OVER 1.5',
    'UNDER_15': 'UNDER 1.5',
    'OVER_25': 'OVER 2.5',
    'UNDER_25': 'UNDER 2.5',
    'OVER_35': 'OVER 3.5',
    'UNDER_35': 'UNDER 3.5',
    'OVER_2.5': 'OVER 2.5',
    'UNDER_2.5': 'UNDER 2.5',
    'OVER_1.5': 'OVER 1.5',
    'UNDER_1.5': 'UNDER 1.5',
    'OVER_3.5': 'OVER 3.5',
    'UNDER_3.5': 'UNDER 3.5',
  }
  
  // Basketball: show line number for O/U predictions so they're self-explanatory
  const ouLine = oddsData.value?.over_under?.line
  if (pred.includes('OVER_TOTAL') || pred.includes('OVER_ALT')) return ouLine ? `O ${ouLine}` : 'OVER'
  if (pred.includes('UNDER_TOTAL') || pred.includes('UNDER_ALT')) return ouLine ? `U ${ouLine}` : 'UNDER'
  if (pred.includes('SPREAD_COVER')) return 'SPREAD'
  if (pred.includes('HOME_WIN')) return 'HOME'
  
  return mapping[pred] || pred
}

// ─── Active O/U bet helpers ──────────────────────────────────────────────────
const activeOverBet = computed(() =>
  gameBets.value.find(b => {
    const bt = (b.bet_type || '').toLowerCase()
    return bt.includes('over') && !bt.includes('under')
  }) || null
)

const activeUnderBet = computed(() =>
  gameBets.value.find(b => (b.bet_type || '').toLowerCase().includes('under')) || null
)

function _formatBetStake(bet) {
  if (!bet) return null
  const s = bet.stake || bet.amount
  if (!s) return null
  const n = Number(s)
  return isNaN(n) ? null : `$${Math.round(n)}`
}

const activeOverStake = computed(() => _formatBetStake(activeOverBet.value))
const activeUnderStake = computed(() => _formatBetStake(activeUnderBet.value))

// Hide prediction chip when O/U chips already represent the pick
const hidesPredictionChip = computed(() => {
  if (!oddsData.value?.over_under?.line) return false
  return !!(activeOverBet.value || activeUnderBet.value)
})

// Format bet label from notes or bet_type
function formatBetLabel(bet) {
  if (bet.notes) return bet.notes
  const t = (bet.bet_type || '').toUpperCase()
  const map = {
    'OVER': 'Over', 'UNDER': 'Under',
    'OVER_ALT': 'Over (alt)', 'UNDER_ALT': 'Under (alt)',
    'SPREAD_COVER': 'Spread', 'HOME_WIN': 'ML Home',
    'SGP_HOME_ML+HOME_COVERS': 'SGP Home+Spread',
    'SGP_AWAY_ML+AWAY_COVERS': 'SGP Away+Spread',
    'SGP_HOME_ML+OVER': 'SGP Home+Over',
    'SGP_AWAY_ML+OVER': 'SGP Away+Over',
    'SGP_HOME_ML+UNDER': 'SGP Home+Under',
    'SGP_AWAY_ML+UNDER': 'SGP Away+Under',
  }
  return map[t] || t
}

// Get prediction styling classes
function getPredictionClasses(prediction, isFinished) {
  if (!prediction) return ''
  
  const pred = prediction.toUpperCase()
  const isCorrect = isPredictionCorrect()
  
  if (isFinished) {
    if (isCorrect) {
      return 'bg-green-500/20 text-green-400 border-green-600'
    } else {
      return 'bg-red-500/20 text-red-400 border-red-600'
    }
  }
  
  // Not finished - show prediction type color
  if (pred.includes('OVER') || pred.includes('UNDER')) {
    return 'bg-purple-500/10 text-purple-400 border-purple-400'
  } else if (pred === 'HOME') {
    return 'bg-blue-500/20 text-blue-400 border-blue-400'
  } else if (pred === 'AWAY') {
    return 'bg-red-500/20 text-red-400 border-red-400'
  } else if (pred === 'DRAW') {
    return 'bg-surface-light text-zinc-300 border-edge'
  }
  
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-400'
}

// Get bet styling classes
function getBetClasses() {
  const currentBet = displayBet.value
  if (!currentBet) return ''
  
  if (currentBet.status === 'won') {
    return 'bg-green-500/20 text-green-400 border-green-600'
  } else if (currentBet.status === 'lost') {
    return 'bg-red-500/20 text-red-400 border-red-600'
  }
  
  return 'bg-amber-500/10 text-amber-400 border-amber-400'
}

// Check if prediction is correct
function isPredictionCorrect() {
  if (!displayPrediction.value || props.game.home_goals === null) return false
  
  const pred = displayPrediction.value.prediction.toLowerCase()
  const homeGoals = props.game.home_goals
  const awayGoals = props.game.away_goals
  const totalGoals = homeGoals + awayGoals
  const isBball = props.game.sport === 'basketball' || props.game.league_key === 'nba' || props.game.league_key === 'euroleague'
  
  if (pred === 'home' || pred.includes('home_win')) return homeGoals > awayGoals
  if (pred === 'draw') return homeGoals === awayGoals
  if (pred === 'away') return awayGoals > homeGoals
  
  // Basketball over/under uses the line from odds
  if (isBball && (pred.includes('over_total') || pred.includes('under_total'))) {
    const line = oddsData.value?.over_under?.line
    if (line) {
      if (pred.includes('over')) return totalGoals > line
      if (pred.includes('under')) return totalGoals < line
    }
    return false
  }
  
  // Football thresholds
  if (pred === 'over' || pred === 'over_25' || pred === 'over_2.5') return totalGoals > 2.5
  if (pred === 'under' || pred === 'under_25' || pred === 'under_2.5') return totalGoals < 2.5
  if (pred === 'over_15' || pred === 'over_1.5') return totalGoals > 1.5
  if (pred === 'under_15' || pred === 'under_1.5') return totalGoals < 1.5
  if (pred === 'over_35' || pred === 'over_3.5') return totalGoals > 3.5
  if (pred === 'under_35' || pred === 'under_3.5') return totalGoals < 3.5
  
  return false
}
</script>

<style scoped>
.game-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02);
}

.game-card:hover {
  border-color: rgba(248, 40, 40, 0.3);
  box-shadow: 0 2px 8px rgba(248, 40, 40, 0.08);
}
</style>
