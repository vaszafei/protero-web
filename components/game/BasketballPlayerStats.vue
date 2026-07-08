<template>
  <div>
    <!-- Team Toggle -->
    <div class="flex bg-surface-light rounded-lg p-0.5 mb-3">
      <button
        @click="activeTeam = 'home'"
        :class="[
          'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all truncate',
          activeTeam === 'home'
            ? 'bg-surface text-zinc-100 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'
        ]"
      >
        {{ homeName }}
      </button>
      <button
        @click="activeTeam = 'away'"
        :class="[
          'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all truncate',
          activeTeam === 'away'
            ? 'bg-surface text-zinc-100 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'
        ]"
      >
        {{ awayName }}
      </button>
    </div>

    <!-- Toolbar: DNP filter + active sort hint -->
    <div class="flex items-center justify-between mb-2 text-[11px] text-zinc-500">
      <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="showDNP"
          class="accent-[#4d8fff] w-3.5 h-3.5 rounded"
        />
        <span>Show DNP</span>
      </label>
      <span class="tabular-nums">
        Sorted by
        <span class="text-zinc-300 font-semibold uppercase">{{ sortKey }}</span>
        <UIcon
          :name="sortDir === 'desc' ? 'i-heroicons-arrow-down' : 'i-heroicons-arrow-up'"
          class="inline w-3 h-3 ml-0.5 -mt-0.5"
        />
      </span>
    </div>

    <!-- Player Table -->
    <div class="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
      <table class="w-full text-sm min-w-[720px]">
        <thead>
          <tr class="border-b border-edge text-zinc-500 text-xs uppercase tracking-wider">
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'py-2 font-medium select-none cursor-pointer transition-colors hover:text-zinc-300',
                col.align === 'left' ? 'text-left pr-2' : 'text-center px-1',
                col.width,
                sortKey === col.key ? 'text-[#4d8fff]' : ''
              ]"
              @click="toggleSort(col.key)"
            >
              <span class="inline-flex items-center gap-0.5">
                {{ col.label }}
                <UIcon
                  v-if="sortKey === col.key"
                  :name="sortDir === 'desc' ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                  class="w-3 h-3"
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in activePlayers"
            :key="player.id || player.name"
            class="border-b border-edge/50 hover:bg-surface-light/50 transition-colors cursor-pointer select-none"
            :class="isDNP(player) ? 'opacity-50' : ''"
            @click="openPlayerModal(player)"
          >
            <td class="py-2 pr-2">
              <span class="text-zinc-200 font-medium truncate max-w-[140px] block">{{ formatName(player.name) }}</span>
            </td>
            <td class="text-center py-2 px-1 text-zinc-400 tabular-nums text-xs">{{ formatMin(player.min, player.minutes) }}</td>
            <td class="text-center py-2 px-1 font-semibold tabular-nums" :class="player.pts >= 20 ? 'text-emerald-400' : player.pts >= 10 ? 'text-zinc-200' : 'text-zinc-400'">{{ player.pts }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.reb }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.ast }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.stl }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.blk }}</td>
            <td class="text-center py-2 px-1 tabular-nums text-xs" :class="pctClass(playerFgPct(player))">{{ playerFgPct(player) != null ? playerFgPct(player) + '%' : '—' }}</td>
            <td class="text-center py-2 px-1 tabular-nums text-xs" :class="pctClass(playerThreePct(player))">{{ playerThreePct(player) != null ? playerThreePct(player) + '%' : '—' }}</td>
            <td class="text-center py-2 px-1 tabular-nums text-xs" :class="pctClass(playerFtPct(player))">{{ playerFtPct(player) != null ? playerFtPct(player) + '%' : '—' }}</td>
            <td class="text-center py-2 px-1 tabular-nums" :class="(player.tov || 0) > 3 ? 'text-red-400' : 'text-zinc-400'">{{ player.tov ?? 0 }}</td>
            <td class="text-center py-2 px-1 tabular-nums font-medium" :class="player.pm > 0 ? 'text-emerald-400' : player.pm < 0 ? 'text-red-400' : 'text-zinc-500'">{{ player.pm > 0 ? '+' : '' }}{{ player.pm }}</td>
            <td class="text-center py-2 px-1 tabular-nums font-semibold text-amber-300">{{ playerFpts(player).toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Coach -->
    <div v-if="activeCoach" class="mt-3 text-xs text-zinc-500 flex items-center gap-2">
      <span class="font-medium text-zinc-400">Coach:</span>
      <span>{{ formatName(activeCoach) }}</span>
    </div>

    <!-- ━━━ Bottom Sheet Modal ━━━ -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
          <div class="modal-sheet" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
            <!-- Drag handle -->
            <div class="flex justify-center pt-2 pb-1">
              <div class="w-10 h-1 rounded-full bg-zinc-600"></div>
            </div>

            <!-- Header: Player name + close -->
            <div class="flex items-center justify-between px-5 pb-3 border-b border-edge/30">
              <div>
                <h3 class="text-base font-bold text-zinc-100">{{ modalPlayerName }}</h3>
                <span class="text-xs text-zinc-500">{{ leagueKey.toUpperCase() }} · Season {{ currentSeason }}</span>
              </div>
              <div class="flex items-center gap-2">
                <NuxtLink
                  :to="`/player/${getPlayerId(modalPlayer)}?league=${leagueKey}&name=${encodeURIComponent(modalPlayerName)}`"
                  @click="closeModal"
                  class="text-xs text-[#4d8fff] hover:text-[#6da3ff] font-medium whitespace-nowrap"
                >See player page</NuxtLink>
                <button @click="closeModal" class="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-zinc-400 hover:text-zinc-200">
                  <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Scrollable content -->
            <div class="modal-body">
              <!-- Loading -->
              <div v-if="seasonLoading" class="flex items-center justify-center py-12 gap-3">
                <div class="w-5 h-5 border-2 border-zinc-600 border-t-[#f82828] rounded-full animate-spin"></div>
                <span class="text-sm text-zinc-500">Loading season data...</span>
              </div>

              <!-- Error -->
              <div v-else-if="seasonError" class="text-center py-12">
                <p class="text-sm text-red-400 mb-2">Failed to load season data</p>
                <button @click="retryLoad" class="text-xs text-[#4d8fff] hover:underline">Retry</button>
              </div>

              <!-- Season Data -->
              <div v-else-if="seasonData" class="space-y-5">

                <!-- Today's Game Stats -->
                <div class="bg-surface-light/30 rounded-xl p-4">
                  <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">This Game</div>
                  <div class="grid grid-cols-5 gap-2">
                    <div v-for="s in todayStats" :key="s.key" class="text-center">
                      <div class="text-lg font-bold tabular-nums" :class="s.highlight ? 'text-emerald-400' : 'text-zinc-100'">{{ s.value }}</div>
                      <div class="text-[10px] text-zinc-500 font-medium">{{ s.label }}</div>
                    </div>
                  </div>
                  <!-- Shooting splits -->
                  <div class="flex items-center gap-3 mt-3 pt-3 border-t border-edge/20">
                    <div class="flex-1 text-center">
                      <span class="text-sm font-semibold text-zinc-200 tabular-nums">{{ modalPlayer?.fgm ?? 0 }}/{{ modalPlayer?.fga ?? 0 }}</span>
                      <span class="text-[10px] text-zinc-500 ml-1">FG</span>
                    </div>
                    <div class="flex-1 text-center">
                      <span class="text-sm font-semibold tabular-nums" :class="(modalPlayer?.fg3m ?? 0) > 0 ? 'text-orange-400' : 'text-zinc-400'">{{ modalPlayer?.fg3m ?? 0 }}/{{ modalPlayer?.fg3a ?? 0 }}</span>
                      <span class="text-[10px] text-zinc-500 ml-1">3PT</span>
                    </div>
                    <div class="flex-1 text-center">
                      <span class="text-sm font-semibold text-zinc-200 tabular-nums">{{ modalPlayer?.ftm ?? 0 }}/{{ modalPlayer?.fta ?? 0 }}</span>
                      <span class="text-[10px] text-zinc-500 ml-1">FT</span>
                    </div>
                    <div class="flex-1 text-center">
                      <span class="text-sm font-semibold tabular-nums" :class="(modalPlayer?.pm ?? 0) > 0 ? 'text-emerald-400' : (modalPlayer?.pm ?? 0) < 0 ? 'text-red-400' : 'text-zinc-400'">{{ (modalPlayer?.pm ?? 0) > 0 ? '+' : '' }}{{ modalPlayer?.pm ?? 0 }}</span>
                      <span class="text-[10px] text-zinc-500 ml-1">+/-</span>
                    </div>
                  </div>
                </div>

                <!-- Season Averages -->
                <div>
                  <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3 px-1">Season Averages · {{ seasonData.gameCount }} Games</div>
                  <div class="grid grid-cols-3 gap-2">
                    <div v-for="avg in seasonAvgCards" :key="avg.key" class="avg-card">
                      <div class="text-lg font-bold text-zinc-100 tabular-nums">{{ avg.value }}</div>
                      <div class="text-[10px] text-zinc-500 font-medium">{{ avg.label }}</div>
                      <div v-if="avg.delta !== undefined" class="mt-0.5 space-y-0.5">
                        <div>
                          <span :class="['text-[10px] font-bold tabular-nums', avg.delta > 0 ? 'text-emerald-400' : avg.delta < 0 ? 'text-red-400' : 'text-zinc-500']">
                            {{ avg.delta > 0 ? '↑' : avg.delta < 0 ? '↓' : '=' }}{{ Math.abs(avg.delta).toFixed(1) }} today
                          </span>
                        </div>
                        <div v-if="avg.lastDelta !== undefined">
                          <span :class="['text-[9px] tabular-nums opacity-70', avg.lastDelta > 0 ? 'text-emerald-400' : avg.lastDelta < 0 ? 'text-red-400' : 'text-zinc-500']">
                            {{ avg.lastDelta > 0 ? '↑' : avg.lastDelta < 0 ? '↓' : '=' }}{{ Math.abs(avg.lastDelta).toFixed(1) }} prev
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ══════ CHARTS SECTION ══════ -->
                <div class="space-y-4">

                  <!-- Filter: Home / Away / All + Viz switcher -->
                  <div class="flex items-center justify-between gap-2">
                    <!-- Home / Away filter -->
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
                    <!-- Viz switcher -->
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

                  <!-- === VIZ 1: Bar Chart === -->
                  <div v-if="activeViz === 'bars'" class="space-y-6">
                    <div v-for="metric in barMetrics" :key="metric.key" class="bar-section">
                      <div class="flex items-center justify-between mb-2.5 px-1">
                        <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">{{ metric.label }}</span>
                        <span class="text-[10px] text-zinc-500 tabular-nums">
                          avg <span class="text-[#f82828] font-bold">{{ filteredAvg(metric.key) }}</span>
                        </span>
                      </div>
                      <div class="bar-chart-container">
                        <!-- Subtle horizontal grid -->
                        <div class="bar-grid-line" style="bottom: 25%"></div>
                        <div class="bar-grid-line" style="bottom: 50%"></div>
                        <div class="bar-grid-line" style="bottom: 75%"></div>
                        <!-- Avg reference line -->
                        <div
                          class="avg-line"
                          :style="{ bottom: barPct(filteredAvg(metric.key), metric.max) + '%' }"
                        >
                          <span class="avg-line-label">{{ filteredAvg(metric.key) }}</span>
                        </div>
                        <!-- Bars -->
                        <div class="bars-row">
                          <div
                            v-for="(g, i) in filteredGames" :key="i"
                            class="bar-col"
                            :style="{ '--bar-delay': i * 30 + 'ms' }"
                          >
                            <div class="bar-wrapper">
                              <div
                                class="bar"
                                :class="barColorClass(getStatVal(g, metric.key), filteredAvg(metric.key), g.side)"
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

                  <!-- === VIZ 2: Radar Chart === -->
                  <div v-if="activeViz === 'radar'" class="flex flex-col items-center">
                    <svg viewBox="0 0 220 220" class="w-56 h-56">
                      <!-- Background rings -->
                      <polygon v-for="ring in [0.25, 0.5, 0.75, 1]" :key="ring"
                        :points="radarRingPoints(ring)"
                        fill="none" stroke="#2a2f3a" stroke-width="0.5"
                      />
                      <!-- Axis lines -->
                      <line v-for="(_, i) in radarAxes" :key="'ax'+i"
                        x1="110" y1="110"
                        :x2="110 + 80 * Math.cos(radarAngle(i))" :y2="110 + 80 * Math.sin(radarAngle(i))"
                        stroke="#2a2f3a" stroke-width="0.5"
                      />
                      <!-- Average polygon -->
                      <polygon :points="radarPolygon('avg')" fill="#f82828" fill-opacity="0.1" stroke="#f82828" stroke-width="1.5" stroke-opacity="0.5" />
                      <!-- Today polygon -->
                      <polygon :points="radarPolygon('today')" fill="#0848a8" fill-opacity="0.25" stroke="#4d8fff" stroke-width="2" />
                      <!-- Labels with values -->
                      <g v-for="(axis, i) in radarAxes" :key="'lbl'+i">
                        <text
                          :x="110 + 98 * Math.cos(radarAngle(i))" :y="110 + 98 * Math.sin(radarAngle(i)) - 5"
                          text-anchor="middle" dominant-baseline="central"
                          class="fill-zinc-400 text-[10px] font-semibold"
                        >{{ axis.label }}</text>
                        <text
                          :x="110 + 98 * Math.cos(radarAngle(i))" :y="110 + 98 * Math.sin(radarAngle(i)) + 7"
                          text-anchor="middle" dominant-baseline="central"
                          class="fill-zinc-500 text-[8px]"
                        >{{ modalPlayer?.[axis.key] ?? 0 }}</text>
                      </g>
                    </svg>
                    <div class="flex items-center gap-5 mt-2">
                      <div class="flex items-center gap-1.5">
                        <span class="w-4 h-2 rounded-sm bg-[#0848a8]"></span>
                        <span class="text-xs text-zinc-400">This Game</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="w-4 h-2 rounded-sm bg-[#f82828] opacity-50"></span>
                        <span class="text-xs text-zinc-400">Season Avg</span>
                      </div>
                    </div>
                  </div>

                  <!-- === VIZ 3: Heat Map === -->
                  <div v-if="activeViz === 'heat'">
                    <div class="overflow-x-auto -mx-1 pb-2">
                      <div class="inline-flex flex-col min-w-full">
                        <!-- Header: game dates -->
                        <div class="flex items-end gap-1 mb-1.5 pl-10">
                          <div v-for="(g, i) in filteredGames" :key="i" class="heat-cell-h">
                            <span class="text-[8px] text-zinc-600 whitespace-nowrap">{{ formatHeatDate(g.game_date) }}</span>
                            <span :class="['text-[9px] font-bold', g.result === 'W' ? 'text-emerald-400' : g.result === 'L' ? 'text-red-400' : 'text-zinc-500']">{{ g.result }}</span>
                            <span :class="['w-1.5 h-1.5 rounded-full mt-0.5', g.side === 'home' ? 'bg-[#0848a8]' : 'bg-[#f82828]']"></span>
                          </div>
                        </div>
                        <!-- Rows per stat -->
                        <div v-for="metric in heatMetrics" :key="metric.key" class="flex items-center gap-1 mb-1">
                          <span class="text-[10px] text-zinc-500 w-9 text-right font-semibold flex-shrink-0">{{ metric.label }}</span>
                          <div
                            v-for="(g, i) in filteredGames" :key="i"
                            class="heat-cell"
                            :style="{ backgroundColor: heatColor(getStatVal(g, metric.key), metric.key) }"
                          >
                            <span class="text-[10px] font-semibold tabular-nums">{{ getStatVal(g, metric.key) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- Legend -->
                    <div class="flex items-center justify-center gap-3 mt-2">
                      <div class="flex items-center gap-1"><span class="w-4 h-3 rounded-sm" style="background:rgba(248,40,40,0.25)"></span><span class="text-[10px] text-zinc-500">Below avg</span></div>
                      <div class="flex items-center gap-1"><span class="w-4 h-3 rounded-sm" style="background:rgba(42,47,58,0.4)"></span><span class="text-[10px] text-zinc-500">At avg</span></div>
                      <div class="flex items-center gap-1"><span class="w-4 h-3 rounded-sm" style="background:rgba(8,72,168,0.3)"></span><span class="text-[10px] text-zinc-500">Above avg</span></div>
                    </div>
                  </div>
                </div>

                <!-- Recent Games List -->
                <div>
                  <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-2 px-1">Last {{ Math.min(filteredGames.length, 5) }} Games</div>
                  <div class="space-y-1">
                    <div
                      v-for="g in filteredGames.slice(0, 5)" :key="g.game_id"
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
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  sportStats: { type: Object, required: true },
  homeName: { type: String, default: 'Home' },
  awayName: { type: String, default: 'Away' },
  leagueKey: { type: String, default: 'nba' },
})

const activeTeam = ref('home')
const api = useApi()
const modalOpen = ref(false)
const modalPlayer = ref(null)       // the raw player object from sportStats
const seasonData = ref(null)
const seasonLoading = ref(false)
const seasonError = ref(false)
const activeViz = ref('bars')
const chartSideFilter = ref('all')

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

// Normalize NBA API long field names → short names used throughout this component.
// FlashScore data already uses short names; this is a no-op for those.
function normalizePlayer(p) {
  return {
    ...p,
    id:   p.id   ?? p.player_id,
    pts:  p.pts  ?? p.points     ?? 0,
    reb:  p.reb  ?? p.rebounds   ?? 0,
    ast:  p.ast  ?? p.assists    ?? 0,
    stl:  p.stl  ?? p.steals     ?? 0,
    blk:  p.blk  ?? p.blocks     ?? 0,
    fgm:  p.fgm  ?? p.field_goals_made        ?? 0,
    fga:  p.fga  ?? p.field_goals_attempted   ?? 0,
    fg3m: p.fg3m ?? p.three_pointers_made     ?? 0,
    fg3a: p.fg3a ?? p.three_pointers_attempted ?? 0,
    ftm:  p.ftm  ?? p.free_throws_made        ?? 0,
    fta:  p.fta  ?? p.free_throws_attempted   ?? 0,
    tov:  p.tov  ?? p.turnovers  ?? 0,
    pm:   p.pm   ?? p.plus_minus ?? 0,
  }
}

const activePlayers = computed(() => {
  const team = props.sportStats?.[activeTeam.value]
  if (!team?.players) return []
  let list = team.players.map(normalizePlayer)
  if (!showDNP.value) list = list.filter(p => !isDNP(p))
  const dir = sortDir.value === 'desc' ? -1 : 1
  const key = sortKey.value
  list.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === vb) return 0
    return va < vb ? -dir : dir
  })
  return list
})

// ── Sort + filter state ────────────────────────────────
const showDNP = ref(false)
const sortKey = ref('pts')
const sortDir = ref('desc')

const columns = [
  { key: 'name', label: 'Player', width: '',     align: 'left'  },
  { key: 'min',  label: 'MIN',    width: 'w-12', align: 'center' },
  { key: 'pts',  label: 'PTS',    width: 'w-9',  align: 'center' },
  { key: 'reb',  label: 'REB',    width: 'w-9',  align: 'center' },
  { key: 'ast',  label: 'AST',    width: 'w-9',  align: 'center' },
  { key: 'stl',  label: 'STL',    width: 'w-9',  align: 'center' },
  { key: 'blk',  label: 'BLK',    width: 'w-9',  align: 'center' },
  { key: 'fg%',  label: 'FG%',    width: 'w-12', align: 'center' },
  { key: '3p%',  label: '3P%',    width: 'w-12', align: 'center' },
  { key: 'ft%',  label: 'FT%',    width: 'w-12', align: 'center' },
  { key: 'tov',  label: 'TO',     width: 'w-9',  align: 'center' },
  { key: 'pm',   label: '+/-',    width: 'w-12', align: 'center' },
  { key: 'fpts', label: 'FPTS',   width: 'w-12', align: 'center' },
]

function toggleSort(key) {
  if (key === sortKey.value) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    // Strings ascend by default; numbers descend by default.
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
}

function parseMin(p) {
  const raw = p.min ?? p.minutes ?? 0
  if (typeof raw === 'number') return raw
  const s = String(raw)
  if (!s) return 0
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number)
    return (m || 0) + ((sec || 0) / 60)
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function isDNP(p) {
  return parseMin(p) <= 0 && (p.pts ?? 0) === 0 && (p.reb ?? 0) === 0 && (p.ast ?? 0) === 0
}

function playerFgPct(p) {
  const a = p.fga ?? 0
  if (!a) return null
  return Math.round(((p.fgm ?? 0) / a) * 100)
}
function playerThreePct(p) {
  const a = p.fg3a ?? 0
  if (!a) return null
  return Math.round(((p.fg3m ?? 0) / a) * 100)
}
function playerFtPct(p) {
  const a = p.fta ?? 0
  if (!a) return null
  return Math.round(((p.ftm ?? 0) / a) * 100)
}

// DraftKings-style fantasy points (no double-double bonus, kept simple).
function playerFpts(p) {
  return (p.pts ?? 0) * 1
       + (p.fg3m ?? 0) * 0.5
       + (p.reb ?? 0) * 1.25
       + (p.ast ?? 0) * 1.5
       + (p.stl ?? 0) * 2
       + (p.blk ?? 0) * 2
       - (p.tov ?? 0) * 0.5
}

function pctClass(pct) {
  if (pct == null) return 'text-zinc-600'
  if (pct >= 50) return 'text-emerald-400'
  if (pct >= 40) return 'text-zinc-300'
  if (pct >= 30) return 'text-amber-400'
  return 'text-red-400'
}

function sortValue(p, key) {
  switch (key) {
    case 'name': return (p.name || '').toLowerCase()
    case 'min':  return parseMin(p)
    case 'fg%':  return playerFgPct(p) ?? -1
    case '3p%':  return playerThreePct(p) ?? -1
    case 'ft%':  return playerFtPct(p) ?? -1
    case 'fpts': return playerFpts(p)
    default:     return p[key] ?? 0
  }
}

const activeCoach = computed(() => {
  return props.sportStats?.[activeTeam.value]?.coach || null
})

const modalPlayerName = computed(() => {
  if (!modalPlayer.value) return ''
  return formatName(modalPlayer.value.name)
})

// ─── Modal open / close ──────────────────────────────────

function getPlayerId(player) {
  return String(player.id || player.player_id || player.name)
}

async function openPlayerModal(player) {
  modalPlayer.value = player
  modalOpen.value = true
  seasonData.value = null
  seasonLoading.value = true
  seasonError.value = false
  activeViz.value = 'bars'
  chartSideFilter.value = 'all'
  document.body.style.overflow = 'hidden'

  const pid = getPlayerId(player)
  try {
    const data = await api.fetchPlayerSeason(Number(pid), props.leagueKey)
    seasonData.value = data
  } catch (e) {
    console.error('Failed to load player season:', e)
    seasonError.value = true
  } finally {
    seasonLoading.value = false
  }
}

function closeModal() {
  modalOpen.value = false
  modalPlayer.value = null
  seasonData.value = null
  document.body.style.overflow = ''
}

async function retryLoad() {
  if (!modalPlayer.value) return
  await openPlayerModal(modalPlayer.value)
}

// ─── Swipe-to-dismiss ────────────────────────────────────

let touchStartY = 0
let touchDeltaY = 0

function onTouchStart(e) {
  touchStartY = e.touches[0].clientY
  touchDeltaY = 0
}

function onTouchMove(e) {
  touchDeltaY = e.touches[0].clientY - touchStartY
  if (touchDeltaY > 0) {
    e.currentTarget.style.transform = `translateY(${touchDeltaY}px)`
  }
}

function onTouchEnd(e) {
  const el = e.currentTarget
  if (touchDeltaY > 120) {
    closeModal()
  } else {
    el.style.transform = ''
  }
  touchDeltaY = 0
}

// ─── Today's game stats (for modal header) ───────────────

const todayStats = computed(() => {
  const p = modalPlayer.value
  if (!p) return []
  return [
    { key: 'pts', label: 'PTS', value: p.pts ?? 0, highlight: (p.pts ?? 0) >= 20 },
    { key: 'reb', label: 'REB', value: p.reb ?? 0, highlight: (p.reb ?? 0) >= 10 },
    { key: 'ast', label: 'AST', value: p.ast ?? 0, highlight: (p.ast ?? 0) >= 10 },
    { key: 'stl', label: 'STL', value: p.stl ?? 0, highlight: (p.stl ?? 0) >= 3 },
    { key: 'blk', label: 'BLK', value: p.blk ?? 0, highlight: (p.blk ?? 0) >= 3 },
  ]
})

// ─── Season Averages cards (with delta) ──────────────────

const lastGameStats = computed(() => {
  const games = seasonData.value?.games
  if (!games?.length) return null
  // games are sorted newest first — index 0 is the most recent
  return games[0]?.player_stats ?? null
})

const seasonAvgCards = computed(() => {
  const p = modalPlayer.value
  const avg = seasonData.value?.averages
  const last = lastGameStats.value
  if (!p || !avg) return []

  const card = (key, label, value, avgKey) => {
    const todayVal = p[key] ?? 0
    const avgVal = typeof avgKey === 'string' ? avg[avgKey] : avg[key]
    const delta = +(todayVal - avgVal).toFixed(1)
    const lastDelta = last ? +(last[key] - avgVal).toFixed(1) : undefined
    return { key, label, value, delta, lastDelta }
  }

  return [
    card('pts', 'PPG', avg.pts, 'pts'),
    card('reb', 'RPG', avg.reb, 'reb'),
    card('ast', 'APG', avg.ast, 'ast'),
    { key: 'min', label: 'MPG', value: avg.min },
    { key: 'fgPct', label: 'FG%', value: avg.fgPct + '%' },
    { key: 'fg3Pct', label: '3P%', value: avg.fg3Pct + '%' },
  ]
})

// ─── Filtered games (by home/away) ──────────────────────

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

// ─── Bar Chart helpers ──────────────────────────────────

const barMetrics = [
  { key: 'pts', label: 'Points', max: 50 },
  { key: 'reb', label: 'Rebounds', max: 20 },
  { key: 'ast', label: 'Assists', max: 15 },
]

function barPct(val, max) {
  return Math.min((val / max) * 100, 100)
}

function barColorClass(val, avg, side) {
  if (val >= avg) return 'bar-above'
  return 'bar-below'
}

function formatOppShort(name) {
  if (!name) return ''
  // Extract last word or abbreviation (e.g. "Los Angeles Lakers" → "LAL")
  const words = name.split(' ')
  if (words.length <= 1) return name.slice(0, 3).toUpperCase()
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

// ─── Radar Chart helpers ────────────────────────────────

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

function radarPolygon(type) {
  return radarAxes.map((axis, i) => {
    const a = radarAngle(i)
    let val
    if (type === 'avg') {
      val = seasonData.value?.averages?.[axis.key] ?? 0
    } else {
      val = modalPlayer.value?.[axis.key] ?? 0
    }
    const ratio = Math.min(val / axis.max, 1)
    return `${110 + 80 * ratio * Math.cos(a)},${110 + 80 * ratio * Math.sin(a)}`
  }).join(' ')
}

// ─── Heat Map helpers ───────────────────────────────────

const heatMetrics = [
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'stl', label: 'STL' },
  { key: 'fg3m', label: '3PT' },
]

function getStatVal(game, key) {
  return game?.player_stats?.[key] ?? 0
}

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

// ─── Formatters ─────────────────────────────────────────

const formatMin = (min, minutes) => {
  const val = min ?? minutes
  if (val == null) return '-'
  if (typeof val === 'string' && val.includes(':')) return val
  if (typeof val === 'number') return `${Math.round(val)}:00`
  return String(val)
}

const formatName = (name) => {
  if (!name) return ''
  const parts = name.split(', ')
  if (parts.length === 2) {
    const last = parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
    const first = parts[1].charAt(0) + '.'
    return `${first} ${last}`
  }
  return name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}
</script>

<style scoped>
/* ─── Modal overlay ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-sheet {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: #1c1f27;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  border: 1px solid rgba(42, 47, 58, 0.6);
  border-bottom: none;
  display: flex;
  flex-direction: column;
  will-change: transform;
  transition: transform 0.15s ease-out;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px 32px;
  -webkit-overflow-scrolling: touch;
}

/* ─── Transition ─── */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .modal-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-leave-active .modal-sheet {
  transition: transform 0.2s ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .modal-sheet,
.sheet-leave-to .modal-sheet {
  transform: translateY(100%);
}

/* ─── Cards ─── */
.avg-card {
  @apply bg-surface-light/30 rounded-lg p-3 text-center;
}

/* ─── Bar Chart ─── */
.bar-section {
  background: rgba(28, 31, 39, 0.4);
  border: 1px solid rgba(42, 47, 58, 0.25);
  border-radius: 14px;
  padding: 14px 12px 6px;
}

.bar-chart-container {
  position: relative;
  height: 110px;
  padding-bottom: 0;
}

.bar-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px solid rgba(42, 47, 58, 0.2);
  pointer-events: none;
}

.avg-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1.5px dashed #f82828;
  opacity: 0.45;
  z-index: 2;
  pointer-events: none;
}

.avg-line-label {
  position: absolute;
  top: -13px;
  right: 0;
  font-size: 9px;
  font-weight: 800;
  color: #f82828;
  opacity: 0.75;
  letter-spacing: 0.02em;
}

.bars-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
  position: relative;
  z-index: 1;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
  animation: barFadeIn 0.35s ease-out both;
  animation-delay: var(--bar-delay, 0ms);
}

@keyframes barFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.bar-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  padding: 0 1px;
}

.bar {
  width: 100%;
  min-height: 4px;
  border-radius: 5px 5px 2px 2px;
  position: relative;
  transition: height 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.bar-value {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.bar-footer {
  margin-top: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  overflow: hidden;
  width: 100%;
}

/* Bar color variants */
.bar-above {
  background: linear-gradient(180deg, #4d8fff 0%, #0848a8 100%);
  box-shadow: 0 0 10px rgba(77, 143, 255, 0.25), inset 0 1px 0 rgba(255,255,255,0.1);
}
.bar-below {
  background: linear-gradient(180deg, rgba(248, 40, 40, 0.7) 0%, rgba(248, 40, 40, 0.35) 100%);
  box-shadow: 0 0 8px rgba(248, 40, 40, 0.12);
  opacity: 0.8;
}

/* ─── Heat Map ─── */
.heat-cell {
  @apply w-9 h-7 rounded flex items-center justify-center text-zinc-300 flex-shrink-0;
}
.heat-cell-h {
  @apply w-9 flex flex-col items-center flex-shrink-0;
}
</style>
