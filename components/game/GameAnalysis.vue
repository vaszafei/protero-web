<template>
  <div class="space-y-2.5 sm:space-y-4">
    <!-- ===== ODDS SECTION ===== -->
    <div v-if="showOdds && hasOdds" class="space-y-2.5 sm:space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Betting Odds</h4>
        <span v-if="recommendedMarket" class="text-[9px] font-bold text-amber-400 uppercase tracking-wider">AI Pick highlighted</span>
      </div>
      
      <!-- Moneyline -->
      <div class="grid gap-1" :class="isBball ? 'grid-cols-2' : 'grid-cols-3'">
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
        <div v-if="bballOdds.handicap" class="grid grid-cols-2 gap-1">
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Spread H</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ spreadHomeSign }}{{ Math.abs(bballOdds.handicap.line) }}</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ formatOdds(bballOdds.handicap.home) }}</span>
            </div>
          </div>
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Spread A</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ spreadAwaySign }}{{ Math.abs(bballOdds.handicap.line) }}</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ formatOdds(bballOdds.handicap.away) }}</span>
            </div>
          </div>
        </div>

        <div v-if="bballOdds.over_under" class="grid grid-cols-2 gap-1">
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
      <div v-if="!isBball && (game.odds_over || game.odds_under)" class="grid grid-cols-2 gap-1">
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
    <div v-else-if="showOdds" class="text-center py-6">
      <p class="text-sm text-zinc-500">No odds available for this game</p>
    </div>

    <!-- ===== HEAD-TO-HEAD RECORD =====
         NOT form. These pills come from `completedH2HMatches` — the last five
         meetings BETWEEN these two clubs — so the two rows are always exact
         inverses of each other, which no real form line ever is. It was
         labelled "Recent Form" and contradicted the side rails, which show
         actual form from the club's last six fixtures. -->
    <div v-if="homeFormPills.length || awayFormPills.length" class="border-t border-edge/50 pt-3.5 sm:pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 sm:mb-3">
        Head-to-head · last {{ Math.max(homeFormPills.length, awayFormPills.length) }}
      </h4>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-zinc-300 truncate">{{ game.home_name }}</span>
            <span class="text-[10px] text-zinc-500 tabular-nums">{{ formatFormRecord(homeFormPills) }}</span>
          </div>
          <div class="flex gap-1">
            <span
              v-for="(p, i) in homeFormPills"
              :key="`h${i}`"
              :class="['form-pill', p === 'W' ? 'form-w' : p === 'L' ? 'form-l' : 'form-d']"
            >{{ p }}</span>
          </div>
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-zinc-300 truncate">{{ game.away_name }}</span>
            <span class="text-[10px] text-zinc-500 tabular-nums">{{ formatFormRecord(awayFormPills) }}</span>
          </div>
          <div class="flex gap-1">
            <span
              v-for="(p, i) in awayFormPills"
              :key="`a${i}`"
              :class="['form-pill', p === 'W' ? 'form-w' : p === 'L' ? 'form-l' : 'form-d']"
            >{{ p }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== PREDICTED SCORE / TRENDS ===== -->
    <div v-if="predictedScore || paceTrend" class="border-t border-edge/50 pt-3.5 sm:pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 sm:mb-3">Model Outlook</h4>
      <div v-if="predictedScore" class="rounded-lg bg-surface-light/40 px-3 py-3 mb-2">
        <div class="text-[10px] text-zinc-500 uppercase tracking-wider text-center mb-1.5">Predicted Score</div>
        <div class="grid grid-cols-3 items-center gap-2">
          <div class="text-right">
            <span class="text-2xl font-extrabold text-[#e8a0a0] tabular-nums">{{ predictedScore.home }}</span>
          </div>
          <span class="text-center text-zinc-600 text-sm">—</span>
          <div class="text-left">
            <span class="text-2xl font-extrabold text-[#a0b8e8] tabular-nums">{{ predictedScore.away }}</span>
          </div>
        </div>
      </div>
      <div v-if="paceTrend" class="grid grid-cols-2 gap-2">
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider">{{ isBball ? 'Pace' : 'Tempo' }}</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ paceTrend.label }}</span>
        </div>
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider">{{ isBball ? 'Avg Total' : 'Avg Goals' }}</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ paceTrend.avgTotal }}</span>
        </div>
      </div>
    </div>

    <!-- ===== SCHEDULE & LEAGUE TRENDS ===== -->
    <div v-if="timeContext || trends" class="border-t border-edge/50 pt-3.5 sm:pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 sm:mb-3">Schedule &amp; Trends</h4>

      <div v-if="timeContext" class="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-2">
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Kickoff Day</span>
          <span class="text-sm font-bold text-zinc-200">{{ timeContext.kickoff.day_of_week }}</span>
        </div>
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Time (UTC)</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ formatHourUtc(timeContext.kickoff.hour_utc) }}</span>
        </div>
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">{{ game.home_name?.split(' ')[0] }} Rest</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ formatRestDays(timeContext.rest_days.home) }}</span>
        </div>
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">{{ game.away_name?.split(' ')[0] }} Rest</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ formatRestDays(timeContext.rest_days.away) }}</span>
        </div>
      </div>

      <div v-if="hasCongestion" class="grid grid-cols-2 gap-1 mb-2">
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">{{ game.home_name?.split(' ')[0] }} last 10d</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ formatCongestion(timeContext.congestion_10d.home) }}</span>
        </div>
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">{{ game.away_name?.split(' ')[0] }} last 10d</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ formatCongestion(timeContext.congestion_10d.away) }}</span>
        </div>
      </div>

      <div v-if="trends && trends.status === 'available'" class="grid grid-cols-2 gap-1">
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">League Home Win %</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ (trends.home_win_rate * 100).toFixed(1) }}%</span>
          <span class="text-[9px] text-zinc-600 tabular-nums">n={{ trends.n }}</span>
        </div>
        <div class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">League Avg {{ isBball ? 'Total' : 'Goals' }}</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ trends.avg_total_score }}</span>
          <span class="text-[9px] text-zinc-600 tabular-nums">n={{ trends.n }}</span>
        </div>
      </div>
      <p v-else-if="trends" class="text-[11px] text-zinc-500">
        League trend sample too small (n={{ trends.n }} &lt; 30)
      </p>
    </div>

    <!-- ===== COMPETITION FORMAT ===== -->
    <div v-if="competition" class="border-t border-edge/50 pt-3.5 sm:pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 sm:mb-3">Competition Format</h4>
      <div class="flex flex-wrap gap-1.5">
        <span class="competition-pill">{{ formatLabel(competition.format) }}</span>
        <span class="competition-pill">{{ competition.season_convention === 'calendar_year' ? 'Calendar-Year Season' : 'Cross-Year Season' }}</span>
        <span v-if="competition.two_legged" class="competition-pill">Two-Legged Ties</span>
        <span v-if="competition.extra_time" class="competition-pill">Extra Time</span>
        <span v-if="competition.penalties" class="competition-pill">Penalties</span>
        <span v-if="competition.away_goals_rule" class="competition-pill">Away Goals Rule</span>
        <span v-if="competition.periods" class="competition-pill">{{ competition.periods }} × {{ competition.period_length }}min</span>
        <span v-if="competition.ot_rules" class="competition-pill">{{ competition.ot_rules }}</span>
      </div>
    </div>

    <!-- ===== SAME-GAME CORRELATIONS ===== -->
    <div v-if="correlations && correlations.status === 'available'" class="border-t border-edge/50 pt-3.5 sm:pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 sm:mb-3">
        Same-Game Correlations
        <span class="normal-case text-zinc-600 font-normal">· Monte-Carlo sim, not a price</span>
      </h4>
      <div class="grid grid-cols-3 sm:grid-cols-4 gap-1 mb-2">
        <div v-for="(p, leg) in correlations.marginals" :key="leg" class="trend-card">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider truncate w-full text-center">{{ leg }}</span>
          <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ p == null ? '-' : (p * 100).toFixed(1) + '%' }}</span>
        </div>
      </div>
      <div class="space-y-1">
        <div
          v-for="j in correlations.joints"
          :key="j.legs.join('+')"
          class="flex items-center justify-between px-2.5 py-1.5 rounded bg-surface-light/50"
        >
          <span class="text-[11px] text-zinc-400 truncate">{{ j.legs.join(' + ') }}</span>
          <span class="text-[11px] font-bold text-zinc-200 tabular-nums">{{ j.joint_p == null ? '-' : (j.joint_p * 100).toFixed(1) + '%' }}</span>
        </div>
      </div>
    </div>

    <!-- ===== H2H SECTION ===== -->
    <div class="border-t border-edge/50 pt-3.5 sm:pt-4">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 sm:mb-3">Head to Head</h4>
      
      <!-- Loading -->
      <div v-if="h2hLoading" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
      </div>

      <!-- H2H Data -->
      <div v-else-if="completedH2HMatches.length > 0">
        <template v-if="completedH2HMatches.length >= 2">
          <!-- Summary Bar -->
          <div class="flex items-center gap-2 mb-2">
            <div class="flex-1 h-6 rounded-full overflow-hidden flex text-[10px] font-bold">
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
            <span class="text-[11px] text-zinc-500 flex-shrink-0">{{ completedH2HMatches.length }} games</span>
          </div>

          <!-- Summary Stats -->
          <div class="grid grid-cols-3 gap-1 mb-2">
            <div class="bg-surface-light rounded px-1.5 py-1 text-center">
              <span class="text-[10px] text-zinc-500 block">Avg {{ isBball ? 'Total' : 'Goals' }}</span>
              <span class="text-sm font-bold text-zinc-200">{{ h2hAvgGoals }}</span>
            </div>
            <div class="bg-surface-light rounded px-1.5 py-1 text-center">
              <span class="text-[10px] text-zinc-500 block">{{ game.home_name?.split(' ')[0] }} Avg</span>
              <span class="text-sm font-bold text-zinc-200">{{ h2hHomeGoals }}</span>
            </div>
            <div class="bg-surface-light rounded px-1.5 py-1 text-center">
              <span class="text-[10px] text-zinc-500 block">{{ game.away_name?.split(' ')[0] }} Avg</span>
              <span class="text-sm font-bold text-zinc-200">{{ h2hAwayGoals }}</span>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="bg-surface-light/50 border border-edge/60 rounded-lg px-2.5 py-2 mb-2">
            <p class="text-[11px] text-zinc-400 leading-snug">Only one completed head-to-head game found. Showing latest result:</p>
          </div>
        </template>

        <!-- Recent Matches -->
        <div class="space-y-1">
          <div
            v-for="match in completedH2HMatches"
            :key="`${match.date}-${match.home_team?.name}-${match.away_team?.name}`"
            class="flex items-center gap-2 px-2 py-1 rounded bg-surface-light/50"
          >
            <span class="text-[10px] text-zinc-600 w-16 flex-shrink-0 tabular-nums">{{ formatH2HDate(match.date) }}</span>
            <div class="flex-1 flex items-center justify-between min-w-0">
              <span class="text-[11px] font-medium truncate" :class="match.home_team?.name === game.home_name ? 'text-zinc-200' : 'text-zinc-400'">
                {{ match.home_team?.name?.split(' ').pop() }}
              </span>
              <span class="text-[11px] font-bold tabular-nums px-2" :class="resultColor(match)">
                {{ match.home_goals }} - {{ match.away_goals }}
              </span>
              <span class="text-[11px] font-medium truncate text-right" :class="match.away_team?.name === game.away_name ? 'text-zinc-200' : 'text-zinc-400'">
                {{ match.away_team?.name?.split(' ').pop() }}
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

<script setup lang="ts">
import { computed } from 'vue'
import { parsePrediction } from '~/utils/prediction-label'

const props = defineProps({
  game: { type: Object, required: true },
  sport: { type: String, default: 'football' },
  // The unified per-fixture analysis record (`/api/game/[id]/analysis`) — h2h,
  // predicted score and pace/trend all come from here now, server-computed by
  // team_id, instead of a browser-side by-name Supabase query. See
  // `docs/plans/unified-analysis-layer.md` §4 (Track C).
  analysis: { type: Object, default: null },
  analysisLoading: { type: Boolean, default: false },
  prediction: { type: Object, default: null },
  // Football's odds now live in the dedicated Market tab (OddsLadder), so the
  // odds section here renders only for basketball.
  showOdds: { type: Boolean, default: true }
})

const isBball = computed(() => props.sport === 'basketball')
const h2hLoading = computed(() => props.analysisLoading)

// Adapter onto the server's `analysis.h2h` shape — keeps every computed below
// (and the template's bare `h2h.summary.*` bindings) unchanged.
const h2h = computed(() => {
  const a = props.analysis?.h2h
  if (!a) return null
  return {
    summary: {
      totalMatches: a.summary.total_matches,
      homeTeamWins: a.summary.home_wins,
      awayTeamWins: a.summary.away_wins,
      draws: a.summary.draws,
    },
    matches: a.matches,
  }
})

// ─── Odds ────────────────────────────────────────────────
const bballOdds = computed(() => props.game.sport_stats?.odds || null)

const spreadHomeSign = computed(() => {
  const line = bballOdds.value?.handicap?.line
  if (!line || line === 0) return ''
  return line < 0 ? '-' : '+'
})
const spreadAwaySign = computed(() => {
  const line = bballOdds.value?.handicap?.line
  if (!line || line === 0) return ''
  return line < 0 ? '+' : '-'
})

// ─── Recommended market highlight ────────────────────────
// Canonical parse — same function GamePrediction.vue uses, so the two can no
// longer disagree about what a prediction code means.
const recommendedMarket = computed(() => {
  const line = isBball.value ? bballOdds.value?.over_under?.line : null
  return parsePrediction(props.prediction?.prediction, {
    homeTeam: props.game.home_name,
    awayTeam: props.game.away_name,
    ouLine: line,
  }).side
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
  if (!h2h.value?.summary?.totalMatches) return 0
  return Math.round((h2h.value.summary.homeTeamWins / h2h.value.summary.totalMatches) * 100)
})

const awayWinPct = computed(() => {
  if (!h2h.value?.summary?.totalMatches) return 0
  return Math.round((h2h.value.summary.awayTeamWins / h2h.value.summary.totalMatches) * 100)
})

const drawPct = computed(() => {
  if (!h2h.value?.summary?.totalMatches) return 0
  return 100 - homeWinPct.value - awayWinPct.value
})

const completedH2HMatches = computed(() => {
  // The server already filters to completed meetings (`not home_goals is null`).
  return h2h.value?.matches || []
})

const h2hAvgGoals = computed(() => {
  const m = completedH2HMatches.value
  if (!m.length) return '-'
  const total = m.reduce((s: number, g: any) => s + Number(g.home_goals) + Number(g.away_goals), 0)
  return (total / m.length).toFixed(1)
})

const h2hHomeGoals = computed(() => {
  const m = completedH2HMatches.value
  if (!m.length) return '-'
  const total = m.reduce((s: number, g: any) => {
    const isHome = g.home_team?.name === props.game.home_name
    return s + (isHome ? Number(g.home_goals) : Number(g.away_goals))
  }, 0)
  return (total / m.length).toFixed(1)
})

const h2hAwayGoals = computed(() => {
  const m = completedH2HMatches.value
  if (!m.length) return '-'
  const total = m.reduce((s: number, g: any) => {
    const isHome = g.home_team?.name === props.game.home_name
    return s + (isHome ? Number(g.away_goals) : Number(g.home_goals))
  }, 0)
  return (total / m.length).toFixed(1)
})

function formatH2HDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function resultColor(match: any) {
  if (!props.game) return 'text-zinc-300'
  const isHome = match.home_team?.name === props.game.home_name
  const homeGoals = isHome ? match.home_goals : match.away_goals
  const awayGoals = isHome ? match.away_goals : match.home_goals
  if (homeGoals > awayGoals) return 'text-green-400'
  if (homeGoals < awayGoals) return 'text-red-400'
  return 'text-zinc-400'
}

/**
 * Each club's record in the last five meetings BETWEEN THESE TWO CLUBS — not
 * its form. The section that renders this was captioned "Recent Form" until
 * 2026-09-03, which put it in direct contradiction with the side rails: for
 * Pistons-Celtics it read 4W-0D-1L beside the rail's true 2W-4L. The two rows
 * are mirror images by construction, which is the tell.
 */
function h2hRecordFor(teamName: string): ('W'|'L'|'D')[] {
  const matches = completedH2HMatches.value
  if (!matches.length) return []
  // Use up to 5 most recent results
  const sorted = [...matches].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 5)
  return sorted.map((m: any) => {
    const isHome = m.home_team?.name === teamName
    const teamGoals = isHome ? m.home_goals : m.away_goals
    const oppGoals  = isHome ? m.away_goals : m.home_goals
    if (teamGoals > oppGoals) return 'W'
    if (teamGoals < oppGoals) return 'L'
    return 'D'
  })
}

const homeFormPills = computed(() => h2hRecordFor(props.game.home_name))
const awayFormPills = computed(() => h2hRecordFor(props.game.away_name))

function formatFormRecord(pills: ('W'|'L'|'D')[]) {
  const w = pills.filter(p => p === 'W').length
  const d = pills.filter(p => p === 'D').length
  const l = pills.filter(p => p === 'L').length
  return `${w}W ${d}D ${l}L`
}

// ─── Predicted Score / Pace / Trends ──────────────────────
// Computed server-side now (`analysis.derived`) from the same h2h matches and
// the same ±15%-tilt-by-win-prob math this component used to run itself —
// moved so post-mortem/other future consumers of the analysis record see the
// identical number, not a second copy of this arithmetic.
const predictedScore = computed(() => {
  const d = props.analysis?.derived?.predicted_score
  return d ? { home: d.home, away: d.away } : null
})

const paceTrend = computed(() => {
  const d = props.analysis?.derived?.pace_trend
  return d ? { label: d.label, avgTotal: d.avg_total } : null
})

// ─── Schedule Context / League Trends ─────────────────────
// Both blocks are computed server-side in `analysis.time_context` /
// `analysis.trends` (Track C) — this just renders them.
const timeContext = computed(() => {
  const tc = props.analysis?.time_context
  return tc && tc.status === 'available' ? tc : null
})

const trends = computed(() => props.analysis?.trends || null)

const hasCongestion = computed(() => {
  const c = timeContext.value?.congestion_10d
  return !!c && (c.home != null || c.away != null)
})

function formatHourUtc(h: number | null) {
  return h == null ? '-' : `${String(h).padStart(2, '0')}:00`
}

function formatRestDays(d: number | null) {
  return d == null ? '-' : `${d}d`
}

function formatCongestion(n: number | null) {
  return n == null ? '-' : `${n} games`
}

// ─── Competition Format ────────────────────────────────────
// `analysis.competition` (Track B's `competition_rules` registry, read-only).
const competition = computed(() => {
  const c = props.analysis?.competition
  return c && c.status === 'available' ? c : null
})

const FORMAT_LABELS: Record<string, string> = {
  league: 'League',
  knockout: 'Knockout',
  group_knockout: 'Group + Knockout',
  playoff: 'Playoff',
}

function formatLabel(format: string) {
  return FORMAT_LABELS[format] || format
}

// ─── Same-Game Correlations ─────────────────────────────────
// `analysis.correlations` (Track C, ml/slips/slip_sim.py Monte-Carlo sim,
// computed live per request — football only). Descriptive only (C2):
// never a price, never feeds a mask or a stake.
const correlations = computed(() => props.analysis?.correlations || null)
</script>

<style scoped>
.odds-cell {
  @apply bg-surface-light rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5;
}

/* Recommended market highlight styles */
.odds-cell-recommended {
  @apply bg-surface-light rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5;
  box-shadow: 0 0 0 1.5px rgba(251, 191, 36, 0.5), inset 0 0 12px rgba(251, 191, 36, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.06);
}
.odds-cell-over {
  @apply bg-surface-light rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5;
  box-shadow: 0 0 0 1.5px rgba(52, 211, 153, 0.5), inset 0 0 12px rgba(52, 211, 153, 0.05);
  border: 1px solid rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.06);
}
.odds-cell-under {
  @apply bg-surface-light rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5;
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

/* Form pills */
.form-pill {
  @apply inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold;
}
.form-w {
  background: rgba(52, 211, 153, 0.25);
  color: #34d399;
}
.form-l {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
}
.form-d {
  background: rgba(161, 161, 170, 0.25);
  color: #d4d4d8;
}

/* Trend cards */
.trend-card {
  @apply bg-surface-light rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5;
}

/* Competition format pills */
.competition-pill {
  @apply bg-surface-light rounded-full px-2.5 py-1 text-[10px] font-medium text-zinc-300;
}
</style>
