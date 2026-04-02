<template>
  <div class="space-y-4">
    <!-- ===== ODDS SECTION ===== -->
    <div v-if="hasOdds" class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Betting Odds</h4>
        <span v-if="recommendedMarket" class="text-[9px] font-bold text-amber-400 uppercase tracking-wider">AI Pick highlighted</span>
      </div>
      
      <!-- Moneyline -->
      <div class="grid gap-1.5" :class="isBball ? 'grid-cols-2' : 'grid-cols-3'">
        <div :class="['odds-cell relative', recommendedMarket === 'home' ? 'odds-cell-recommended' : '']">
          <span v-if="recommendedMarket === 'home'" class="ai-pick-badge">AI Pick</span>
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Home</span>
          <span class="text-lg font-bold tabular-nums" :class="homeOddsFavorite ? 'text-green-400' : 'text-zinc-200'">
            {{ formatOdds(mlOdds.home) }}
          </span>
        </div>
        <div v-if="!isBball" class="odds-cell">
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Draw</span>
          <span class="text-lg font-bold text-zinc-200 tabular-nums">{{ formatOdds(mlOdds.draw) }}</span>
        </div>
        <div :class="['odds-cell relative', recommendedMarket === 'away' ? 'odds-cell-recommended' : '']">
          <span v-if="recommendedMarket === 'away'" class="ai-pick-badge">AI Pick</span>
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Away</span>
          <span class="text-lg font-bold tabular-nums" :class="awayOddsFavorite ? 'text-green-400' : 'text-zinc-200'">
            {{ formatOdds(mlOdds.away) }}
          </span>
        </div>
      </div>

      <!-- Basketball Extra Odds (Spread & O/U) -->
      <template v-if="isBball && bballOdds">
        <div v-if="bballOdds.handicap" class="grid grid-cols-2 gap-1.5">
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Spread H</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ bballOdds.handicap.line > 0 ? '+' : '' }}{{ bballOdds.handicap.line }}</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ formatOdds(bballOdds.handicap.home) }}</span>
            </div>
          </div>
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Spread A</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ bballOdds.handicap.line > 0 ? '' : '+' }}{{ -bballOdds.handicap.line }}</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ formatOdds(bballOdds.handicap.away) }}</span>
            </div>
          </div>
        </div>

        <div v-if="bballOdds.over_under" class="grid grid-cols-2 gap-1.5">
          <div :class="['odds-cell relative', recommendedMarket === 'over' ? 'odds-cell-over' : '']">
            <span v-if="recommendedMarket === 'over'" class="ai-pick-badge ai-pick-over">AI Pick</span>
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Over</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ bballOdds.over_under.line }}</span>
              <span class="text-[11px] tabular-nums" :class="recommendedMarket === 'over' ? 'text-emerald-400 font-bold' : 'text-zinc-400'">{{ formatOdds(bballOdds.over_under.over) }}</span>
            </div>
          </div>
          <div :class="['odds-cell relative', recommendedMarket === 'under' ? 'odds-cell-under' : '']">
            <span v-if="recommendedMarket === 'under'" class="ai-pick-badge ai-pick-under">AI Pick</span>
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Under</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ bballOdds.over_under.line }}</span>
              <span class="text-[11px] tabular-nums" :class="recommendedMarket === 'under' ? 'text-purple-400 font-bold' : 'text-zinc-400'">{{ formatOdds(bballOdds.over_under.under) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Football O/U -->
      <div v-if="!isBball && (game.odds_over || game.odds_under)" class="grid grid-cols-2 gap-1.5">
        <div :class="['odds-cell relative', recommendedMarket === 'over' ? 'odds-cell-over' : '']">
          <span v-if="recommendedMarket === 'over'" class="ai-pick-badge ai-pick-over">AI Pick</span>
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Over 2.5</span>
          <span class="text-lg font-bold tabular-nums" :class="recommendedMarket === 'over' ? 'text-emerald-400' : 'text-zinc-200'">{{ formatOdds(game.odds_over) }}</span>
        </div>
        <div :class="['odds-cell relative', recommendedMarket === 'under' ? 'odds-cell-under' : '']">
          <span v-if="recommendedMarket === 'under'" class="ai-pick-badge ai-pick-under">AI Pick</span>
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Under 2.5</span>
          <span class="text-lg font-bold tabular-nums" :class="recommendedMarket === 'under' ? 'text-purple-400' : 'text-zinc-200'">{{ formatOdds(game.odds_under) }}</span>
        </div>
      </div>
    </div>

    <!-- No odds message -->
    <div v-else class="text-center py-6">
      <p class="text-sm text-zinc-500">No odds available for this game</p>
    </div>

    <!-- ===== H2H SECTION ===== -->
    <div class="border-t border-edge/50 pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Head to Head</h4>
      
      <!-- Loading -->
      <div v-if="h2hLoading" class="flex justify-center py-8">
        <svg class="w-6 h-6 animate-spin text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>

      <!-- H2H Data -->
      <div v-else-if="h2h && h2h.matches && h2h.matches.length > 0">
        <!-- Summary Bar -->
        <div class="flex items-center gap-2 mb-3">
          <div class="flex-1 h-7 rounded-full overflow-hidden flex text-[10px] font-bold">
            <div class="h2h-home flex items-center justify-center transition-all" :style="{ width: homeWinPct + '%' }">
              <span v-if="homeWinPct >= 15" class="text-white/90">{{ h2h.summary.homeTeamWins }}</span>
            </div>
            <div v-if="h2h.summary.draws > 0" class="h2h-draw flex items-center justify-center transition-all" :style="{ width: drawPct + '%' }">
              <span v-if="drawPct >= 12" class="text-white/80">{{ h2h.summary.draws }}</span>
            </div>
            <div class="h2h-away flex items-center justify-center transition-all" :style="{ width: awayWinPct + '%' }">
              <span v-if="awayWinPct >= 15" class="text-white/90">{{ h2h.summary.awayTeamWins }}</span>
            </div>
          </div>
          <span class="text-[11px] text-zinc-500 flex-shrink-0">{{ h2h.summary.totalMatches }} games</span>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-3 gap-1.5 mb-3">
          <div class="bg-surface-light rounded px-2 py-1.5 text-center">
            <span class="text-[10px] text-zinc-500 block">Avg {{ isBball ? 'Total' : 'Goals' }}</span>
            <span class="text-sm font-bold text-zinc-200">{{ h2h.summary.avgGoalsPerMatch }}</span>
          </div>
          <div class="bg-surface-light rounded px-2 py-1.5 text-center">
            <span class="text-[10px] text-zinc-500 block">{{ game.home_name?.split(' ')[0] }} Goals</span>
            <span class="text-sm font-bold text-zinc-200">{{ h2h.summary.homeTeamGoals }}</span>
          </div>
          <div class="bg-surface-light rounded px-2 py-1.5 text-center">
            <span class="text-[10px] text-zinc-500 block">{{ game.away_name?.split(' ')[0] }} Goals</span>
            <span class="text-sm font-bold text-zinc-200">{{ h2h.summary.awayTeamGoals }}</span>
          </div>
        </div>

        <!-- Recent Matches -->
        <div class="space-y-1">
          <div
            v-for="match in h2h.matches.slice(0, 5)"
            :key="match.date"
            class="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-light/50"
          >
            <span class="text-[10px] text-zinc-600 w-16 flex-shrink-0 tabular-nums">{{ formatH2HDate(match.date) }}</span>
            <div class="flex-1 flex items-center justify-between min-w-0">
              <span class="text-[11px] font-medium truncate" :class="match.homeTeam === h2h.homeTeam ? 'text-zinc-200' : 'text-zinc-400'">
                {{ match.homeTeam?.split(' ').pop() }}
              </span>
              <span class="text-[11px] font-bold tabular-nums px-2" :class="resultColor(match)">
                {{ match.homeGoals }} - {{ match.awayGoals }}
              </span>
              <span class="text-[11px] font-medium truncate text-right" :class="match.awayTeam === h2h.awayTeam ? 'text-zinc-200' : 'text-zinc-400'">
                {{ match.awayTeam?.split(' ').pop() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-6">
        <p class="text-sm text-zinc-500">No head-to-head history found</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  game: { type: Object, required: true },
  sport: { type: String, default: 'football' },
  h2h: { type: Object, default: null },
  h2hLoading: { type: Boolean, default: false },
  prediction: { type: Object, default: null }
})

const isBball = computed(() => props.sport === 'basketball')

// ─── Odds ────────────────────────────────────────────────
const bballOdds = computed(() => props.game.sport_stats?.odds || null)

// ─── Recommended market highlight ────────────────────────
const recommendedMarket = computed(() => {
  if (!props.prediction?.prediction) return null
  const p = props.prediction.prediction.toUpperCase()
  if (p.includes('OVER_TOTAL') || p.includes('OVER_ALT') || p === 'OVER') return 'over'
  if (p.includes('UNDER_TOTAL') || p.includes('UNDER_ALT') || p === 'UNDER') return 'under'
  if (p === '1' || p === 'HOME' || p === 'H' || p.includes('HOME_WIN')) return 'home'
  if (p === '2' || p === 'AWAY' || p === 'A') return 'away'
  return null
})

const mlOdds = computed(() => {
  if (isBball.value && bballOdds.value?.moneyline) {
    return {
      home: bballOdds.value.moneyline.home,
      away: bballOdds.value.moneyline.away,
      draw: null
    }
  }
  return {
    home: props.game.odds_home,
    draw: props.game.odds_draw,
    away: props.game.odds_away
  }
})

const hasOdds = computed(() => mlOdds.value.home || mlOdds.value.away)

const homeOddsFavorite = computed(() => {
  if (!mlOdds.value.home || !mlOdds.value.away) return false
  return mlOdds.value.home < mlOdds.value.away
})

const awayOddsFavorite = computed(() => {
  if (!mlOdds.value.home || !mlOdds.value.away) return false
  return mlOdds.value.away < mlOdds.value.home
})

function formatOdds(v) {
  if (!v) return '-'
  return Number(v).toFixed(2)
}

// ─── H2H ─────────────────────────────────────────────────
const homeWinPct = computed(() => {
  if (!props.h2h?.summary?.totalMatches) return 0
  return Math.round((props.h2h.summary.homeTeamWins / props.h2h.summary.totalMatches) * 100)
})

const awayWinPct = computed(() => {
  if (!props.h2h?.summary?.totalMatches) return 0
  return Math.round((props.h2h.summary.awayTeamWins / props.h2h.summary.totalMatches) * 100)
})

const drawPct = computed(() => {
  if (!props.h2h?.summary?.totalMatches) return 0
  return 100 - homeWinPct.value - awayWinPct.value
})

function formatH2HDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function resultColor(match) {
  if (!props.h2h) return 'text-zinc-300'
  // Who won relative to THIS game's home team?
  const homeTeamId = props.h2h.homeTeam
  const isHome = match.homeTeam === homeTeamId
  const homeGoals = isHome ? match.homeGoals : match.awayGoals
  const awayGoals = isHome ? match.awayGoals : match.homeGoals
  if (homeGoals > awayGoals) return 'text-green-400'
  if (homeGoals < awayGoals) return 'text-red-400'
  return 'text-zinc-400'
}
</script>

<style scoped>
.odds-cell {
  @apply bg-surface-light rounded-lg px-3 py-2.5 flex flex-col items-center gap-0.5;
}

/* Recommended market highlight styles */
.odds-cell-recommended {
  @apply bg-surface-light rounded-lg px-3 py-2.5 flex flex-col items-center gap-0.5;
  ring: 1px;
  box-shadow: 0 0 0 1.5px rgba(251, 191, 36, 0.5), inset 0 0 12px rgba(251, 191, 36, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.06);
}
.odds-cell-over {
  @apply bg-surface-light rounded-lg px-3 py-2.5 flex flex-col items-center gap-0.5;
  box-shadow: 0 0 0 1.5px rgba(52, 211, 153, 0.5), inset 0 0 12px rgba(52, 211, 153, 0.05);
  border: 1px solid rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.06);
}
.odds-cell-under {
  @apply bg-surface-light rounded-lg px-3 py-2.5 flex flex-col items-center gap-0.5;
  box-shadow: 0 0 0 1.5px rgba(168, 85, 247, 0.5), inset 0 0 12px rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.35);
  background: rgba(168, 85, 247, 0.06);
}

/* Small "AI Pick" badge at top-right of highlighted cell */
.ai-pick-badge {
  position: absolute;
  top: -7px;
  right: 6px;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 5px;
  border-radius: 9999px;
  background: rgba(251, 191, 36, 0.9);
  color: #1a1c22;
  line-height: 1;
}
.ai-pick-over {
  background: rgba(52, 211, 153, 0.9);
}
.ai-pick-under {
  background: rgba(168, 85, 247, 0.9);
}

.h2h-home {
  background: linear-gradient(135deg, #f82828, #d82020);
}
.h2h-draw {
  background: #404654;
}
.h2h-away {
  background: linear-gradient(135deg, #0848a8, #4d8fff);
}
</style>
