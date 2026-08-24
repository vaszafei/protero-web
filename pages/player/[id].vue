<template>
  <div class="min-h-screen bg-surface-base">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading player..." />
    </div>

    <!-- Content -->
    <div v-else-if="seasonData || twin" class="max-w-3xl mx-auto p-3 sm:p-6">
      <!-- Back -->
      <button @click="$router.back()" class="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 mb-4 transition-colors">
        <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
        <span class="text-sm font-medium">Back</span>
      </button>

      <!-- Player Header -->
      <div class="bg-surface rounded-xl p-5 border border-edge/30 mb-5">
        <h1 class="text-xl font-bold text-zinc-100">{{ twin?.full_name || twin?.player_name || bballTwin?.player_name || playerName }}</h1>
        <span v-if="seasonData" class="text-sm text-zinc-500">{{ leagueKey.toUpperCase() }} · Season {{ currentSeason }} · {{ seasonData.gameCount }} games</span>
        <span v-else-if="twin" class="text-sm text-zinc-500">Football player · {{ twin?.position || 'position unknown' }}</span>
        <span v-else-if="bballTwin" class="text-sm text-zinc-500">Basketball player · {{ bballTwin?.position || 'position unknown' }}</span>
      </div>

      <!-- The football twin — never a price -->
      <PlayerTwinPanel
        v-if="twin"
        :twin="twin"
        :cohort="twinCohort"
        :team-names="twinTeamNames"
        class="mb-5"
      />

      <!-- The basketball twin — never a price -->
      <BasketballPlayerTwinPanel
        v-if="bballTwin"
        :twin="bballTwin"
        :cohort="bballCohort"
        :team-names="bballTeamNames"
        class="mb-5"
      />

      <div v-else-if="isFootballId || (seasonData && !twin && !bballTwin)" class="bg-surface rounded-xl p-5 border border-edge/30 mb-5">
        <p class="text-xs text-zinc-500 leading-relaxed">
          No twin for this player. A player twin needs a FlashScore entity id and appearances
          in the football or basketball corpus; players outside it have no fitted rates to show.
        </p>
      </div>

      <template v-if="seasonData">
      <!-- Season Averages -->
      <div class="bg-surface rounded-xl p-5 border border-edge/30 mb-5">
        <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">Season Averages</div>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div v-for="avg in avgCards" :key="avg.key" class="text-center bg-surface-light/30 rounded-lg p-3">
            <div class="text-lg font-bold text-zinc-100 tabular-nums">{{ avg.value }}</div>
            <div class="text-[10px] text-zinc-500 font-medium">{{ avg.label }}</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="bg-surface rounded-xl p-5 border border-edge/30 mb-5">
        <!-- Filter + Viz switcher -->
        <div class="flex items-center justify-between gap-2 mb-4">
          <div class="flex bg-surface-light/40 rounded-lg p-0.5">
            <button
              v-for="f in sideFilters" :key="f.key"
              @click="chartSideFilter = f.key"
              :class="[
                'px-3 py-1 text-[11px] rounded-md font-semibold transition-all',
                chartSideFilter === f.key
                  ? (f.key === 'home' ? 'bg-[#0848a8]/40 text-[#4d8fff]' : f.key === 'away' ? 'bg-[#f82828]/20 text-[#ff6b6b]' : 'bg-surface text-zinc-200 shadow-sm')
                  : 'text-zinc-500 hover:text-zinc-300'
              ]"
            >{{ f.label }}</button>
          </div>
          <div class="flex bg-surface-light/40 rounded-lg p-0.5">
            <button
              v-for="vt in vizTypes" :key="vt.key"
              @click="activeViz = vt.key"
              :class="[
                'px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all',
                activeViz === vt.key
                  ? 'bg-surface text-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              ]"
            >{{ vt.label }}</button>
          </div>
        </div>

        <!-- Bar Charts -->
        <div v-if="activeViz === 'bars'" class="space-y-6">
          <div v-for="metric in barMetrics" :key="metric.key">
            <div class="flex items-center justify-between mb-2.5 px-1">
              <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">{{ metric.label }}</span>
              <span class="text-[10px] text-zinc-500 tabular-nums">
                avg <span class="text-[#f82828] font-bold">{{ filteredAvg(metric.key) }}</span>
              </span>
            </div>
            <div class="bar-chart-container">
              <div class="bar-grid-line" style="bottom: 25%"></div>
              <div class="bar-grid-line" style="bottom: 50%"></div>
              <div class="bar-grid-line" style="bottom: 75%"></div>
              <div class="avg-line" :style="{ bottom: barPct(filteredAvg(metric.key), metric.max) + '%' }">
                <span class="avg-line-label">{{ filteredAvg(metric.key) }}</span>
              </div>
              <div class="bars-row">
                <div v-for="(g, i) in filteredGames" :key="i" class="bar-col" :style="{ '--bar-delay': i * 30 + 'ms' }">
                  <div class="bar-wrapper">
                    <div
                      class="bar"
                      :class="getStatVal(g, metric.key) >= filteredAvg(metric.key) ? 'bar-above' : 'bar-below'"
                      :style="{ height: barPct(getStatVal(g, metric.key), metric.max) + '%' }"
                    >
                      <span class="bar-value">{{ getStatVal(g, metric.key) }}</span>
                    </div>
                  </div>
                  <div class="bar-footer">
                    <span :class="['text-[7px] font-bold leading-none', g.result === 'W' ? 'text-emerald-400' : 'text-red-400']">{{ g.result }}</span>
                    <span class="text-[7px] text-zinc-600 leading-none truncate">{{ formatOppShort(g.opponent) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Radar Chart -->
        <div v-if="activeViz === 'radar'" class="flex flex-col items-center">
          <svg viewBox="0 0 220 220" class="w-56 h-56">
            <polygon v-for="ring in [0.25, 0.5, 0.75, 1]" :key="ring" :points="radarRingPoints(ring)" fill="none" stroke="#2a2f3a" stroke-width="0.5" />
            <line v-for="(_, i) in radarAxes" :key="'ax'+i" x1="110" y1="110" :x2="110 + 80 * Math.cos(radarAngle(i))" :y2="110 + 80 * Math.sin(radarAngle(i))" stroke="#2a2f3a" stroke-width="0.5" />
            <polygon :points="radarPolygon('avg')" fill="#f82828" fill-opacity="0.1" stroke="#f82828" stroke-width="1.5" stroke-opacity="0.5" />
            <polygon :points="radarPolygon('last5')" fill="#0848a8" fill-opacity="0.25" stroke="#4d8fff" stroke-width="2" />
            <g v-for="(axis, i) in radarAxes" :key="'lbl'+i">
              <text :x="110 + 98 * Math.cos(radarAngle(i))" :y="110 + 98 * Math.sin(radarAngle(i)) - 5" text-anchor="middle" dominant-baseline="central" class="fill-zinc-400 text-[10px] font-semibold">{{ axis.label }}</text>
              <text :x="110 + 98 * Math.cos(radarAngle(i))" :y="110 + 98 * Math.sin(radarAngle(i)) + 7" text-anchor="middle" dominant-baseline="central" class="fill-zinc-500 text-[8px]">{{ last5Avg(axis.key) }}</text>
            </g>
          </svg>
          <div class="flex items-center gap-5 mt-2">
            <div class="flex items-center gap-1.5"><span class="w-4 h-2 rounded-sm bg-[#0848a8]"></span><span class="text-xs text-zinc-400">Last 5</span></div>
            <div class="flex items-center gap-1.5"><span class="w-4 h-2 rounded-sm bg-[#f82828] opacity-50"></span><span class="text-xs text-zinc-400">Season Avg</span></div>
          </div>
        </div>

        <!-- Heat Map -->
        <div v-if="activeViz === 'heat'">
          <div class="overflow-x-auto -mx-1 pb-2">
            <div class="inline-flex flex-col min-w-full">
              <div class="flex items-end gap-1 mb-1.5 pl-10">
                <div v-for="(g, i) in filteredGames" :key="i" class="heat-cell-h">
                  <span class="text-[8px] text-zinc-600 whitespace-nowrap">{{ formatHeatDate(g.game_date) }}</span>
                  <span :class="['text-[9px] font-bold', g.result === 'W' ? 'text-emerald-400' : g.result === 'L' ? 'text-red-400' : 'text-zinc-500']">{{ g.result }}</span>
                  <span :class="['w-1.5 h-1.5 rounded-full mt-0.5', g.side === 'home' ? 'bg-[#0848a8]' : 'bg-[#f82828]']"></span>
                </div>
              </div>
              <div v-for="metric in heatMetrics" :key="metric.key" class="flex items-center gap-1 mb-1">
                <span class="text-[10px] text-zinc-500 w-9 text-right font-semibold flex-shrink-0">{{ metric.label }}</span>
                <div v-for="(g, i) in filteredGames" :key="i" class="heat-cell" :style="{ backgroundColor: heatColor(getStatVal(g, metric.key), metric.key) }">
                  <span class="text-[10px] font-semibold tabular-nums">{{ getStatVal(g, metric.key) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-center gap-3 mt-2">
            <div class="flex items-center gap-1"><span class="w-4 h-3 rounded-sm" style="background:rgba(248,40,40,0.25)"></span><span class="text-[10px] text-zinc-500">Below avg</span></div>
            <div class="flex items-center gap-1"><span class="w-4 h-3 rounded-sm" style="background:rgba(42,47,58,0.4)"></span><span class="text-[10px] text-zinc-500">At avg</span></div>
            <div class="flex items-center gap-1"><span class="w-4 h-3 rounded-sm" style="background:rgba(8,72,168,0.3)"></span><span class="text-[10px] text-zinc-500">Above avg</span></div>
          </div>
        </div>
      </div>

      <!-- Game Log -->
      <div class="bg-surface rounded-xl p-5 border border-edge/30">
        <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">Game Log ({{ filteredGames.length }})</div>
        <div class="space-y-1">
          <div
            v-for="g in filteredGames" :key="g.game_id"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-light/20 hover:bg-surface-light/40 transition-colors"
          >
            <span :class="['text-xs font-bold w-4', g.result === 'W' ? 'text-emerald-400' : g.result === 'L' ? 'text-red-400' : 'text-zinc-500']">{{ g.result }}</span>
            <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', g.side === 'home' ? 'bg-[#0848a8]' : 'bg-[#f82828]']"></span>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-zinc-300 truncate">vs {{ g.opponent }}</div>
              <div class="text-[10px] text-zinc-500 tabular-nums">{{ formatGameDate(g.game_date) }} · {{ g.score_for }}-{{ g.score_against }}</div>
            </div>
            <div class="flex items-center gap-2 text-xs tabular-nums">
              <span class="font-bold text-zinc-100">{{ g.player_stats?.pts ?? '-' }}</span>
              <span class="text-zinc-500">{{ g.player_stats?.reb ?? '-' }}r</span>
              <span class="text-zinc-500">{{ g.player_stats?.ast ?? '-' }}a</span>
            </div>
          </div>
        </div>
      </div>
      </template>
    </div>

    <!-- Error -->
    <div v-else class="flex flex-col items-center justify-center min-h-screen gap-3">
      <p class="text-zinc-400">Player not found</p>
      <button @click="$router.back()" class="text-sm text-[#4d8fff] hover:underline">Go back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import PlayerTwinPanel from '~/components/player/PlayerTwinPanel.vue'
import BasketballPlayerTwinPanel from '~/components/player/BasketballPlayerTwinPanel.vue'
import { useTwins } from '~/composables/useTwins'
import type { TwinPlayer, BasketballPlayerTwin } from '~/composables/useTwins'

const route = useRoute()
const api = useApi()
const twins = useTwins()

const playerId = computed(() => route.params.id)
const leagueKey = computed(() => route.query.league || 'nba')

const loading = ref(true)
const seasonData = ref(null)
const playerName = ref('')
const activeViz = ref('bars')
const chartSideFilter = ref('all')

// ── The twin (football only — keyed by the FS entity id string) ──
const twin = ref<TwinPlayer | null>(null)
const twinCohort = ref<number[]>([])
const twinTeamNames = ref<Record<string, string>>({})

// ── The basketball twin (also keyed by the FS entity id string) ──
const bballTwin = ref<BasketballPlayerTwin | null>(null)
const bballCohort = ref({ points: [] as number[], rebounds: [] as number[], assists: [] as number[] })
const bballTeamNames = ref<Record<string, string>>({})

const isFootballId = computed(() => /^[A-Za-z0-9]{6,12}$/.test(String(playerId.value)) && isNaN(Number(playerId.value)))

const vizTypes = [
  { key: 'bars', label: 'Bars' },
  { key: 'radar', label: 'Radar' },
  { key: 'heat', label: 'Heat' },
]
const sideFilters = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' },
]

const currentSeason = computed(() => {
  const now = new Date()
  const y = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}/${String(y + 1).slice(2)}`
})

// ─── Fetch data ──────────────────────────────────────────

onMounted(async () => {
  try {
    const data = await api.fetchPlayerSeason(Number(playerId.value), leagueKey.value)
    seasonData.value = data
    if (data?.playerName) {
      playerName.value = formatName(data.playerName)
    } else {
      playerName.value = route.query.name || `Player #${playerId.value}`
    }
  } catch (e) {
    console.error('Failed to load player:', e)
  } finally {
    loading.value = false
  }

  // The twin is football-only. The basketball season fetch above fails for a
  // string id (it feeds Number()), which is exactly the football case — fetch
  // the twin independently and render it above the basketball-only sections.
  if (isFootballId.value) {
    try {
      const t = await twins.fetchTwinPlayer(String(playerId.value))
      if (t) {
        twin.value = t
        if (t.position) {
          twinCohort.value = await twins.fetchPlayerPositionCohort(t.position)
        }
        // Resolve club names for the career list.
        const teamIds = Object.keys(t.teams_played || {})
        if (teamIds.length) {
          twinTeamNames.value = await twins.fetchTeamNames(teamIds)
        }
      }
    } catch (e) {
      console.error('Failed to load player twin:', e)
    }
  }

  // The basketball twin is keyed on the FS entity id string; NBA game pages
  // link by personId. Resolve the personId first, then fall back to trying the
  // raw id as an FS id. A conflict stays unresolved and shows the no-twin note.
  try {
    const rawId = String(playerId.value)
    const fsId = (await twins.resolveBasketballPlayerId(rawId)) ?? rawId
    const bt = await twins.fetchBasketballTwinPlayer(fsId)
    if (bt) {
      bballTwin.value = bt
      if (bt.position) {
        bballCohort.value = await twins.fetchBasketballPositionCohort(bt.position)
      }
      const teamIds = Object.keys(bt.teams_played || {})
      if (teamIds.length) {
        bballTeamNames.value = await twins.fetchTeamNames(teamIds)
      }
    }
  } catch (e) {
    console.error('Failed to load basketball player twin:', e)
  }
})

// ─── Season Avg cards ────────────────────────────────────

const avgCards = computed(() => {
  const avg = seasonData.value?.averages
  if (!avg) return []
  return [
    { key: 'pts', label: 'PPG', value: avg.pts },
    { key: 'reb', label: 'RPG', value: avg.reb },
    { key: 'ast', label: 'APG', value: avg.ast },
    { key: 'min', label: 'MPG', value: avg.min },
    { key: 'fgPct', label: 'FG%', value: avg.fgPct + '%' },
    { key: 'fg3Pct', label: '3P%', value: avg.fg3Pct + '%' },
  ]
})

// ─── Filtered games ─────────────────────────────────────

const filteredGames = computed(() => {
  const games = seasonData.value?.games
  if (!games?.length) return []
  const reversed = [...games].reverse().slice(-15)
  if (chartSideFilter.value === 'all') return reversed
  return reversed.filter(g => g.side === chartSideFilter.value)
})

function filteredAvg(key) {
  const games = filteredGames.value
  if (!games.length) return 0
  const sum = games.reduce((acc, g) => acc + (g.player_stats?.[key] ?? 0), 0)
  return +(sum / games.length).toFixed(1)
}

function getStatVal(game, key) {
  return game?.player_stats?.[key] ?? 0
}

// ─── Bar Chart ──────────────────────────────────────────

const barMetrics = [
  { key: 'pts', label: 'Points', max: 50 },
  { key: 'reb', label: 'Rebounds', max: 20 },
  { key: 'ast', label: 'Assists', max: 15 },
]

function barPct(val, max) {
  return Math.min((val / max) * 100, 100)
}

function formatOppShort(name) {
  if (!name) return ''
  const words = name.split(' ')
  if (words.length <= 1) return name.slice(0, 3).toUpperCase()
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

// ─── Radar ──────────────────────────────────────────────

const radarAxes = [
  { key: 'pts', label: 'PTS', max: 40 },
  { key: 'reb', label: 'REB', max: 15 },
  { key: 'ast', label: 'AST', max: 12 },
  { key: 'stl', label: 'STL', max: 5 },
  { key: 'blk', label: 'BLK', max: 5 },
]

function radarAngle(i) {
  return (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2
}

function radarRingPoints(scale) {
  return radarAxes.map((_, i) => {
    const a = radarAngle(i)
    return `${110 + 80 * scale * Math.cos(a)},${110 + 80 * scale * Math.sin(a)}`
  }).join(' ')
}

function last5Avg(key) {
  const games = filteredGames.value.slice(-5)
  if (!games.length) return 0
  const sum = games.reduce((acc, g) => acc + (g.player_stats?.[key] ?? 0), 0)
  return +(sum / games.length).toFixed(1)
}

function radarPolygon(type) {
  return radarAxes.map((axis, i) => {
    const a = radarAngle(i)
    let val
    if (type === 'avg') {
      val = seasonData.value?.averages?.[axis.key] ?? 0
    } else {
      val = last5Avg(axis.key)
    }
    const ratio = Math.min(val / axis.max, 1)
    return `${110 + 80 * ratio * Math.cos(a)},${110 + 80 * ratio * Math.sin(a)}`
  }).join(' ')
}

// ─── Heat Map ───────────────────────────────────────────

const heatMetrics = [
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'stl', label: 'STL' },
  { key: 'fg3m', label: '3PT' },
]

function heatColor(val, key) {
  const avg = filteredAvg(key) || 1
  const ratio = val / (avg || 1)
  if (ratio <= 0.3) return 'rgba(248, 40, 40, 0.35)'
  if (ratio <= 0.7) return 'rgba(248, 40, 40, 0.18)'
  if (ratio <= 1.0) return 'rgba(42, 47, 58, 0.25)'
  if (ratio <= 1.5) return 'rgba(8, 72, 168, 0.2)'
  return 'rgba(8, 72, 168, 0.4)'
}

function formatHeatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatGameDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function formatName(name) {
  if (!name) return ''
  const parts = name.split(', ')
  if (parts.length === 2) {
    const last = parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
    const first = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
    return `${first} ${last}`
  }
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}
</script>

<style scoped>
/* Same bar/heat chart styles as the modal */
.bar-chart-container {
  position: relative;
  height: 160px;
  background: rgba(42, 47, 58, 0.15);
  border-radius: 8px;
  padding: 8px 4px 24px;
}
.bar-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(42, 47, 58, 0.3);
}
.avg-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  border-top: 1.5px dashed #f82828;
  opacity: 0.5;
  z-index: 2;
}
.avg-line-label {
  position: absolute;
  right: 4px;
  top: -14px;
  font-size: 9px;
  color: #f82828;
  font-weight: 700;
}
.bars-row {
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 2px;
  padding-bottom: 0;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}
.bar-wrapper {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar {
  width: 80%;
  max-width: 20px;
  border-radius: 3px 3px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transition: height 0.4s ease;
  transition-delay: var(--bar-delay, 0ms);
  position: relative;
}
.bar-above { background: rgba(8, 72, 168, 0.5); }
.bar-below { background: rgba(248, 40, 40, 0.3); }
.bar-value {
  font-size: 8px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  position: absolute;
  top: -14px;
}
.bar-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  margin-top: 3px;
  min-height: 20px;
}
.heat-cell-h {
  width: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.heat-cell {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.8);
}
</style>
