<template>
  <div class="space-y-3">
    <!-- LOADING -->
    <div v-if="pending && !data" class="analysis-card rounded-lg p-6 flex items-center justify-center text-zinc-500 text-sm">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin mr-2" />
      Loading league analysis…
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="analysis-card rounded-lg p-4 text-sm text-red-400">
      Failed to load analysis: {{ error.message || error }}
    </div>

    <!-- EMPTY -->
    <div v-else-if="!hasGames" class="analysis-card rounded-lg p-6 text-center text-zinc-500 text-sm">
      No completed games for this season yet.
    </div>

    <template v-else>
      <!-- ===== 1. KEY METRICS ===== -->
      <div class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-2">Key Metrics</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="stat-cell">
            <span class="stat-label">Games</span>
            <span class="stat-value text-zinc-100">{{ km.games }}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Avg {{ isBball ? 'PPG' : 'Goals' }}</span>
            <span class="stat-value text-green-400">{{ km.avg_total }}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Home Win</span>
            <span class="stat-value text-indigo-400">{{ km.home_win_pct }}%</span>
          </div>
          <div v-if="isBball" class="stat-cell">
            <span class="stat-label">Avg Margin</span>
            <span class="stat-value text-orange-400">{{ km.avg_margin }}</span>
          </div>
          <div v-else class="stat-cell">
            <span class="stat-label">Draw</span>
            <span class="stat-value text-zinc-300">{{ km.draw_pct }}%</span>
          </div>
          <div v-if="!isBball" class="stat-cell">
            <span class="stat-label">Over 2.5</span>
            <span class="stat-value text-orange-400">{{ km.over25_pct }}%</span>
          </div>
          <div v-if="!isBball" class="stat-cell">
            <span class="stat-label">BTTS</span>
            <span class="stat-value text-pink-400">{{ km.btts_pct }}%</span>
          </div>
        </div>
      </div>

      <!-- ===== 2. SCORE DISTRIBUTION ===== -->
      <div v-if="dist.length" class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">{{ isBball ? 'Score Distribution' : 'Goals Distribution' }}</h3>
        <p class="text-[10px] text-zinc-500 mb-3">{{ isBball ? 'Games by total points' : 'Matches by total goals' }}</p>
        <div class="flex items-end gap-1 justify-between" style="height: 120px;">
          <div
            v-for="bar in dist"
            :key="bar.label"
            class="flex flex-col items-center justify-end flex-1 group"
          >
            <span class="text-[9px] font-semibold text-zinc-500 mb-1 tabular-nums">{{ bar.pct }}%</span>
            <div
              class="w-full rounded-t-md relative overflow-hidden bg-gradient-to-t from-[#0848a8] to-[#4d8fff]"
              :style="{ height: barHeight(bar.count) + 'px' }"
            >
              <span class="relative z-10 flex items-start justify-center pt-0.5 text-[10px] font-bold text-white">{{ bar.count }}</span>
            </div>
            <span class="mt-1 text-[8px] font-medium text-zinc-500 whitespace-nowrap tabular-nums leading-tight text-center">
              {{ bar.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- ===== 3. HOME vs AWAY ===== -->
      <div v-if="ha" class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-3">Home vs Away</h3>
        <div class="space-y-3">
          <CompareBar
            :label="isBball ? 'Total Points' : 'Total Goals'"
            :home="Number(ha.home.goals)"
            :away="Number(ha.away.goals)"
          />
          <CompareBar label="Wins" :home="Number(ha.home.wins)" :away="Number(ha.away.wins)" />
          <CompareBar
            :label="isBball ? 'Avg PPG' : 'Avg Goals'"
            :home="Number(ha.home.avg_goals)"
            :away="Number(ha.away.avg_goals)"
          />
          <div class="flex items-center justify-center gap-4 pt-1">
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm bg-[#0848a8]"></div>
              <span class="text-[11px] text-zinc-400 font-medium">Home {{ ha.home.win_pct }}%</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm bg-[#4d8fff]"></div>
              <span class="text-[11px] text-zinc-400 font-medium">Away {{ ha.away.win_pct }}%</span>
            </div>
            <div v-if="!isBball && ha.draws" class="text-[10px] text-zinc-600 font-medium">
              {{ ha.draws.count }} Draws ({{ ha.draws.pct }}%)
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 4. SCORING TRENDS ===== -->
      <div v-if="trends.length" class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Scoring Trends</h3>
        <p class="text-[10px] text-zinc-500 mb-3">
          {{ isBball ? 'Avg points by game day' : 'Avg goals by round' }}
          <span v-if="trendDirection !== 'flat'" class="ml-1 font-semibold" :class="trendDirection === 'up' ? 'text-green-400' : 'text-red-400'">
            {{ trendDirection === 'up' ? '▲ Trending up' : '▼ Trending down' }}
          </span>
        </p>
        <div class="relative" style="height: 140px;">
          <svg viewBox="0 0 600 140" preserveAspectRatio="none" class="w-full h-full">
            <!-- baseline -->
            <line x1="0" :y1="trendBaseY" x2="600" :y2="trendBaseY" stroke="#3f3f46" stroke-width="0.5" stroke-dasharray="2,2" />
            <!-- area -->
            <polyline
              :points="trendPolyline"
              fill="none"
              stroke="#4d8fff"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- points -->
            <circle
              v-for="(p, i) in trendPoints"
              :key="i"
              :cx="p.x"
              :cy="p.y"
              r="2"
              fill="#4d8fff"
            />
          </svg>
        </div>
        <div class="flex justify-between mt-1 text-[9px] text-zinc-500 font-medium">
          <span>{{ trends[0].label }}</span>
          <span class="text-zinc-300">avg {{ trendAvg }}</span>
          <span>{{ trends[trends.length - 1].label }}</span>
        </div>
      </div>

      <!-- ===== 5. FORM TABLE ===== -->
      <div v-if="form.length" class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Form Table</h3>
        <p class="text-[10px] text-zinc-500 mb-3">Last 5 games · top {{ form.length }} teams</p>
        <div class="space-y-1.5">
          <div
            v-for="(team, idx) in form"
            :key="team.team_id"
            class="flex items-center gap-2 py-1 hover:bg-white/[0.02] rounded transition-colors"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-4 text-right tabular-nums">{{ idx + 1 }}</span>
            <span class="text-[11px] font-semibold text-zinc-200 flex-1 truncate" :title="team.name">{{ team.name }}</span>
            <div class="flex gap-0.5">
              <span
                v-for="(r, i) in (team.form || '').split('')"
                :key="i"
                :class="['w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center', formColor(r)]"
              >{{ r }}</span>
            </div>
            <span class="text-[11px] font-bold text-zinc-200 tabular-nums w-6 text-right">{{ team.points }}</span>
          </div>
        </div>
      </div>

      <!-- ===== 6. TOP SCORERS (football only when populated) ===== -->
      <div v-if="scorers.length" class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Top Scorers</h3>
        <p class="text-[10px] text-zinc-500 mb-3">Top 10 by goals</p>
        <div class="space-y-1.5">
          <div
            v-for="(p, idx) in scorers"
            :key="p.name + idx"
            class="flex items-center gap-2 py-1 hover:bg-white/[0.02] rounded transition-colors"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-4 text-right tabular-nums">{{ idx + 1 }}</span>
            <span class="text-[11px] font-semibold text-zinc-200 flex-1 truncate" :title="p.name">{{ p.name }}</span>
            <span class="text-[10px] text-zinc-500 truncate max-w-[90px]" :title="p.team">{{ p.team }}</span>
            <span class="text-[10px] text-zinc-500 tabular-nums w-8 text-right">{{ p.matches }}g</span>
            <span class="text-[11px] font-bold text-emerald-400 tabular-nums w-6 text-right">{{ p.goals }}</span>
          </div>
        </div>
      </div>

      <!-- ===== 7. REFEREE IMPACT (football only) ===== -->
      <div v-if="refs.length" class="analysis-card rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Referee Impact</h3>
        <p class="text-[10px] text-zinc-500 mb-3">Avg goals & cards per match (min 3 games)</p>
        <div class="overflow-x-auto">
          <table class="min-w-full text-[11px]">
            <thead>
              <tr class="text-[9px] uppercase text-zinc-500">
                <th class="text-left py-1 pr-2">Referee</th>
                <th class="text-center py-1 px-2">G</th>
                <th class="text-center py-1 px-2">Avg Goals</th>
                <th class="text-center py-1 px-2">YC</th>
                <th class="text-center py-1 px-2">RC</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in refs"
                :key="r.name"
                class="border-t border-edge/20"
              >
                <td class="py-1 pr-2 font-semibold text-zinc-200 truncate max-w-[120px]" :title="r.name">{{ r.name }}</td>
                <td class="text-center py-1 px-2 text-zinc-500 tabular-nums">{{ r.matches }}</td>
                <td class="text-center py-1 px-2 font-bold tabular-nums" :class="goalsColor(r.avg_total)">{{ r.avg_total }}</td>
                <td class="text-center py-1 px-2 text-yellow-400 tabular-nums">{{ r.avg_yellow }}</td>
                <td class="text-center py-1 px-2 text-red-400 tabular-nums">{{ r.avg_red }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  leagueKey: string
  season?: string
}>()

const api = useApi()

// SWR — 5 min memory TTL is enough; analysis only changes when new completed
// games land. Pull-to-refresh (Phase 0.5) will invalidate.
const { data, pending, error } = useSwr(
  computed(() => `league_analysis:${props.leagueKey}:${props.season || '2025-2026'}`),
  () => api.fetchLeagueAnalysis(props.leagueKey, props.season || '2025-2026'),
  { memoryTtl: 5 * 60_000 },
)

const isBball = computed(() => data.value?.sport === 'basketball')
const km = computed<any>(() => data.value?.key_metrics || {})
const dist = computed<any[]>(() => data.value?.score_distribution || [])
const ha = computed<any>(() => data.value?.home_vs_away)
const trends = computed<any[]>(() => data.value?.scoring_trends || [])
const form = computed<any[]>(() => data.value?.form_table || [])
const scorers = computed<any[]>(() => data.value?.top_scorers || [])
const refs = computed<any[]>(() => data.value?.referee_impact || [])
const hasGames = computed(() => Number(km.value?.games || 0) > 0)

// ── distribution bar heights (max 100px) ────────────────────────────────────
const maxCount = computed(() => Math.max(1, ...dist.value.map((d) => d.count)))
function barHeight(count: number) {
  return Math.max(6, Math.round((count / maxCount.value) * 100))
}

// ── trend mini chart ────────────────────────────────────────────────────────
const trendVals = computed(() => trends.value.map((t) => Number(t.avg_total)))
const trendMin = computed(() => Math.min(...trendVals.value, 0))
const trendMax = computed(() => Math.max(...trendVals.value, 1))
const trendAvg = computed(() => {
  if (!trendVals.value.length) return 0
  const a = trendVals.value.reduce((s, v) => s + v, 0) / trendVals.value.length
  return Math.round(a * 10) / 10
})
const trendDirection = computed<'up' | 'down' | 'flat'>(() => {
  if (trendVals.value.length < 4) return 'flat'
  const half = Math.floor(trendVals.value.length / 2)
  const first = trendVals.value.slice(0, half).reduce((a, b) => a + b, 0) / half
  const last = trendVals.value.slice(half).reduce((a, b) => a + b, 0) / (trendVals.value.length - half)
  const diff = last - first
  if (Math.abs(diff) < 0.15) return 'flat'
  return diff > 0 ? 'up' : 'down'
})
const trendBaseY = computed(() => {
  // Y position of average line
  const range = trendMax.value - trendMin.value || 1
  return 130 - ((trendAvg.value - trendMin.value) / range) * 120
})
const trendPoints = computed(() => {
  if (!trendVals.value.length) return []
  const range = trendMax.value - trendMin.value || 1
  const stepX = trendVals.value.length > 1 ? 600 / (trendVals.value.length - 1) : 600
  return trendVals.value.map((v, i) => ({
    x: i * stepX,
    y: 130 - ((v - trendMin.value) / range) * 120,
  }))
})
const trendPolyline = computed(() =>
  trendPoints.value.map((p) => `${p.x},${p.y}`).join(' '),
)

// ── form pill colour ────────────────────────────────────────────────────────
function formColor(r: string) {
  if (r === 'W') return 'bg-green-600'
  if (r === 'L') return 'bg-red-600'
  return 'bg-zinc-600'
}

// ── referee goals colour scale ──────────────────────────────────────────────
function goalsColor(v: number) {
  if (v >= 3.0) return 'text-orange-400'
  if (v >= 2.5) return 'text-emerald-400'
  return 'text-blue-400'
}

// Inline tiny CompareBar component
const CompareBar = defineComponent({
  props: {
    label: { type: String, required: true },
    home: { type: Number, required: true },
    away: { type: Number, required: true },
  },
  setup(p) {
    const total = computed(() => Math.max(p.home + p.away, 0.0001))
    const homePct = computed(() => Math.max(8, Math.round((p.home / total.value) * 100)))
    const awayPct = computed(() => Math.max(8, 100 - homePct.value))
    return () => h('div', null, [
      h('div', { class: 'flex items-center justify-between mb-1' }, [
        h('span', { class: 'text-[11px] font-semibold text-zinc-300' }, p.label),
        h('span', { class: 'text-[10px] text-zinc-500 tabular-nums' }, `${p.home} vs ${p.away}`),
      ]),
      h('div', { class: 'flex gap-0.5 h-6 rounded-md overflow-hidden' }, [
        h('div', {
          class: 'bg-[#0848a8] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500',
          style: { width: homePct.value + '%' },
        }, String(p.home)),
        h('div', {
          class: 'bg-[#4d8fff] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500',
          style: { width: awayPct.value + '%' },
        }, String(p.away)),
      ]),
    ])
  },
})
</script>

<style scoped>
.analysis-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
}
.stat-label {
  font-size: 10px;
  font-weight: 500;
  color: rgb(113, 113, 122);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
