<template>
  <div class="space-y-3">
    <!-- ===== GAMES SECTION ===== -->
    <div class="overview-card rounded-lg">
      <div class="p-2 sm:p-4">
        <!-- Round/Date Navigation -->
        <div class="flex items-center justify-between mb-3">
          <!-- Left: Arrow + Day chip -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              @click="$emit('previousRound')"
              :disabled="selectedRound <= 1"
              class="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft :size="16" class="text-zinc-400" />
            </button>
            <span v-if="sport === 'basketball'" class="px-2 py-0.5 bg-zinc-700/80 text-zinc-400 text-[10px] font-medium rounded-full">
              Day {{ selectedRound }}/{{ maxRound }}
            </span>
            <span v-else class="px-2 py-0.5 bg-zinc-700/80 text-zinc-400 text-[10px] font-medium rounded-full">
              Rd {{ selectedRound }}/{{ maxRound }}
            </span>
          </div>

          <!-- Center: Date + Games chip -->
          <div class="flex items-center gap-1.5">
            <h2 v-if="sport !== 'basketball'" class="text-sm sm:text-base font-bold text-zinc-100 whitespace-nowrap">Round {{ selectedRound }}</h2>
            <h2 v-else class="text-sm sm:text-base font-bold text-zinc-100 whitespace-nowrap">{{ formatBballDate(selectedDate) }}</h2>

            <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full whitespace-nowrap">
              {{ roundGames.length }} {{ roundGames.length === 1 ? 'game' : 'games' }}
            </span>
          </div>

          <!-- Right: Arrow + Predictions/Profit -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <span v-if="roundPredictionsCount > 0" class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-semibold rounded-full">
              {{ roundPredictionsCount }}P
            </span>
            <span v-if="roundBetsCount > 0" :class="[
              'px-1.5 py-0.5 text-[10px] font-semibold rounded-full',
              roundProfitLoss >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            ]">
              {{ roundProfitLoss >= 0 ? '+' : '' }}€{{ roundProfitLoss.toFixed(2) }}
            </span>
            <button
              @click="$emit('nextRound')"
              :disabled="selectedRound >= maxRound"
              class="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight :size="16" class="text-zinc-400" />
            </button>
          </div>
        </div>

        <!-- Progress Dots (football only, max ~40 rounds) -->
        <div v-if="sport !== 'basketball' && maxRound <= 42" class="flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide px-2 py-1 mb-2">
          <button
            v-for="round in maxRound"
            :key="round"
            @click="$emit('changeRound', round)"
            :class="[
              'relative w-2 h-2 rounded-full transition-all',
              round === selectedRound
                ? 'bg-primary-600 w-6'
                : 'bg-zinc-600 hover:bg-zinc-500'
            ]"
            :title="`Round ${round}`"
          />
        </div>

        <!-- Game Cards (horizontal scroll) -->
        <div v-if="roundGames.length > 0" class="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-2 px-2">
          <div
            v-for="game in roundGames"
            :key="game.id || `${game.home_name}-${game.away_name}`"
            class="flex-shrink-0 w-[120px] sm:w-[150px] snap-start"
          >
            <GameCard :game="game" />
          </div>
        </div>

        <div v-else class="py-8 text-center text-zinc-500 text-sm">
          No matches for this {{ sport === 'basketball' ? 'day' : 'round' }}
        </div>
      </div>
    </div>

    <!-- ===== STANDINGS SECTION ===== -->
    <div class="overview-card rounded-lg">
      <div class="p-2 sm:p-4">
        <!-- Standings Header -->
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm sm:text-base font-bold text-zinc-100">Standings</h3>

          <!-- Filter pills -->
          <div class="flex gap-1">
            <button
              @click="$emit('update:filter', 'overall')"
              :class="[
                'px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all',
                filter === 'overall'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light text-zinc-400 hover:bg-surface-hover'
              ]"
            >Overall</button>
            <button
              @click="$emit('update:filter', 'home')"
              :class="[
                'px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all',
                filter === 'home'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light text-zinc-400 hover:bg-surface-hover'
              ]"
            >Home</button>
            <button
              @click="$emit('update:filter', 'away')"
              :class="[
                'px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all',
                filter === 'away'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light text-zinc-400 hover:bg-surface-hover'
              ]"
            >Away</button>
          </div>
        </div>



        <p v-if="isBball" class="text-[10px] text-zinc-600 mb-1.5">Tap a team for detailed breakdown</p>

        <!-- Compact Standings Table -->
        <div class="overflow-x-auto rounded-lg border border-edge/50 scrollbar-hide">
          <table class="min-w-full">
            <thead>
              <tr class="bg-surface-light/60 text-zinc-300">
                <th class="th-cell sticky left-0 bg-surface-light/60 z-10 w-6 !text-left">#</th>
                <th class="th-cell sticky left-6 bg-surface-light/60 z-10 !text-left">Team</th>
                <th class="th-cell">GP</th>
                <th class="th-cell">W</th>
                <th v-if="!isBball" class="th-cell">D</th>
                <th class="th-cell">L</th>
                <th v-if="isBball" class="th-cell">PPG</th>
                <th v-if="isBball" class="th-cell">OPP</th>
                <th v-if="isBball" class="th-cell">DIFF</th>
                <th v-if="!isBball" class="th-cell">GF</th>
                <th v-if="!isBball" class="th-cell">GA</th>
                <th v-if="!isBball" class="th-cell">GD</th>
                <th class="th-cell bg-primary-600/80 !px-1.5">{{ isBball ? 'W%' : 'Pts' }}</th>
                <th v-if="isBball" class="th-cell hidden sm:table-cell">ORtg</th>
                <th v-if="isBball" class="th-cell hidden sm:table-cell">DRtg</th>
                <th v-if="isBball" class="th-cell hidden sm:table-cell">NRtg</th>
                <th v-if="isBball" class="th-cell hidden md:table-cell">Pace</th>
                <th v-if="isBball" class="th-cell">Strk</th>
                <th v-if="isBball" class="th-cell hidden sm:table-cell">L10</th>
                <th v-if="!isBball" class="th-cell hidden md:table-cell">O2.5%</th>
                <th v-if="!isBball" class="th-cell hidden md:table-cell">BTTS%</th>
                <th class="th-cell hidden sm:table-cell">Form</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(team, index) in standings"
                :key="team.team_id || team.name"
                :class="[
                  'border-b border-edge/20 hover:bg-surface-hover transition-all',
                  isBball ? 'cursor-pointer' : '',
                  index % 2 === 0 ? 'bg-surface' : 'bg-surface-light/30'
                ]"
                @click="isBball && openTeamModal(team)"
              >
                <td class="px-1.5 py-1 text-[11px] font-bold text-zinc-300 sticky left-0 bg-inherit z-10">{{ index + 1 }}</td>
                <td class="px-1.5 py-1 text-[11px] font-semibold text-zinc-100 sticky left-6 bg-inherit z-10 max-w-[120px] truncate">
                  <div class="flex items-center gap-1">
                    <img v-if="getTeamLogoUrl(team.team_key)" :src="getTeamLogoUrl(team.team_key)" loading="lazy" width="16" height="16" class="w-4 h-4 object-contain flex-shrink-0" :alt="team.name" />
                    <span class="truncate">{{ team.name }}</span>
                  </div>
                </td>
                <td class="td-cell text-zinc-400">{{ team.GP }}</td>
                <td class="td-cell"><span class="font-bold text-green-400">{{ team.W }}</span></td>
                <td v-if="!isBball" class="td-cell"><span class="font-bold text-yellow-400">{{ team.D }}</span></td>
                <td class="td-cell"><span class="font-bold text-red-400">{{ team.L }}</span></td>
                <!-- Basketball per-game metrics -->
                <td v-if="isBball" class="td-cell font-semibold text-zinc-200 tabular-nums">{{ team.ppg }}</td>
                <td v-if="isBball" class="td-cell text-zinc-400 tabular-nums">{{ team.opp_ppg }}</td>
                <td v-if="isBball" class="td-cell font-bold tabular-nums" :class="team.diff_pg > 0 ? 'text-emerald-400' : team.diff_pg < 0 ? 'text-red-400' : 'text-zinc-500'">
                  {{ team.diff_pg > 0 ? '+' : '' }}{{ team.diff_pg }}
                </td>
                <!-- Football raw totals -->
                <td v-if="!isBball" class="td-cell text-zinc-300">{{ team.GF }}</td>
                <td v-if="!isBball" class="td-cell text-zinc-300">{{ team.GA }}</td>
                <td v-if="!isBball" class="td-cell font-bold" :class="team.GD >= 0 ? 'text-green-400' : 'text-red-400'">{{ team.GD > 0 ? '+' + team.GD : team.GD }}</td>
                <!-- W% / Pts -->
                <td class="px-1.5 py-1 text-center bg-primary-500/10">
                  <span class="text-[11px] font-bold text-primary-400">
                    {{ isBball ? (team.GP > 0 ? Math.round(team.W / team.GP * 100) + '%' : '0%') : team.Pts }}
                  </span>
                </td>
                <!-- Basketball advanced -->
                <td v-if="isBball" class="td-cell tabular-nums hidden sm:table-cell" :class="team.ortg >= 100 ? 'text-emerald-400' : 'text-zinc-400'">{{ team.ortg }}</td>
                <td v-if="isBball" class="td-cell tabular-nums hidden sm:table-cell" :class="team.drtg <= 100 ? 'text-emerald-400' : 'text-zinc-400'">{{ team.drtg }}</td>
                <td v-if="isBball" class="td-cell font-bold tabular-nums hidden sm:table-cell" :class="team.netrtg > 0 ? 'text-emerald-400' : team.netrtg < 0 ? 'text-red-400' : 'text-zinc-500'">
                  {{ team.netrtg > 0 ? '+' : '' }}{{ team.netrtg }}
                </td>
                <td v-if="isBball" class="td-cell text-zinc-400 tabular-nums hidden md:table-cell">{{ team.pace }}</td>
                <td v-if="isBball" class="td-cell font-bold tabular-nums" :class="team.streak?.startsWith('W') ? 'text-emerald-400' : team.streak?.startsWith('L') ? 'text-red-400' : 'text-zinc-500'">{{ team.streak }}</td>
                <td v-if="isBball" class="td-cell text-zinc-300 tabular-nums hidden sm:table-cell">{{ team.last10 }}</td>
                <!-- Football extras -->
                <td v-if="!isBball" class="td-cell hidden md:table-cell">
                  <span :class="['font-bold', getPercentageColor(team.over_25_pct || 0)]">{{ team.over_25_pct || 0 }}%</span>
                </td>
                <td v-if="!isBball" class="td-cell hidden md:table-cell">
                  <span :class="['font-bold', getPercentageColor(team.btts_pct || 0)]">{{ team.btts_pct || 0 }}%</span>
                </td>
                <td class="px-1 py-1 hidden sm:table-cell">
                  <div class="flex gap-0.5 justify-center">
                    <span v-for="(result, i) in (team.form || [])" :key="i"
                      :class="['w-3 h-3 rounded-full flex items-center justify-center text-white text-[11px] font-bold',
                        result === 'W' ? 'bg-green-500' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500']">{{ result }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- ━━━ Team Bottom Sheet Modal ━━━ -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="teamModalOpen" class="team-modal-overlay" @click.self="closeTeamModal">
        <div class="team-modal-sheet" @touchstart="onSheetTouchStart" @touchmove="onSheetTouchMove" @touchend="onSheetTouchEnd">
          <!-- Drag handle -->
          <div class="flex justify-center pt-2 pb-1">
            <div class="w-10 h-1 rounded-full bg-zinc-600"></div>
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-5 pb-3 border-b border-edge/30">
            <div class="flex items-center gap-3">
              <img v-if="getTeamLogoUrl(selectedTeam?.team_key)" :src="getTeamLogoUrl(selectedTeam?.team_key)" class="w-10 h-10 object-contain" :alt="selectedTeam?.name" />
              <div>
                <h3 class="text-base font-bold text-zinc-100">{{ selectedTeam?.name }}</h3>
                <span class="text-xs text-zinc-500">{{ selectedTeam?.W }}-{{ selectedTeam?.L }} · {{ selectedTeam?.GP > 0 ? Math.round(selectedTeam.W / selectedTeam.GP * 100) : 0 }}%</span>
              </div>
            </div>
            <button @click="closeTeamModal" class="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-zinc-400 hover:text-zinc-200">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Scrollable content -->
          <div class="modal-body">
            <!-- Season Overview -->
            <div class="bg-surface-light/30 rounded-xl p-4 mb-4">
              <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">Season Stats</div>
              <div class="grid grid-cols-4 gap-2">
                <div v-for="s in modalSeasonStats" :key="s.label" class="text-center">
                  <div class="text-lg font-bold tabular-nums" :class="s.color || 'text-zinc-100'">{{ s.value }}</div>
                  <div class="text-[10px] text-zinc-500 font-medium">{{ s.label }}</div>
                </div>
              </div>
            </div>

            <!-- Ratings & Pace -->
            <div class="bg-surface-light/30 rounded-xl p-4 mb-4">
              <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">Ratings & Pace</div>
              <div class="grid grid-cols-4 gap-2">
                <div class="text-center">
                  <div class="text-lg font-bold tabular-nums text-emerald-400">{{ selectedTeam?.ortg }}</div>
                  <div class="text-[10px] text-zinc-500 font-medium">ORtg</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold tabular-nums" :class="(selectedTeam?.drtg || 100) <= 100 ? 'text-emerald-400' : 'text-red-400'">{{ selectedTeam?.drtg }}</div>
                  <div class="text-[10px] text-zinc-500 font-medium">DRtg</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold tabular-nums" :class="(selectedTeam?.netrtg || 0) > 0 ? 'text-emerald-400' : 'text-red-400'">{{ selectedTeam?.netrtg > 0 ? '+' : '' }}{{ selectedTeam?.netrtg }}</div>
                  <div class="text-[10px] text-zinc-500 font-medium">Net Rtg</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold tabular-nums text-zinc-100">{{ selectedTeam?.pace }}</div>
                  <div class="text-[10px] text-zinc-500 font-medium">Pace</div>
                </div>
              </div>
            </div>

            <!-- Home / Away Splits -->
            <div class="bg-surface-light/30 rounded-xl p-4 mb-4">
              <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">Home / Away</div>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#0848a8] flex-shrink-0"></span>
                  <span class="text-xs text-zinc-400 w-10">Home</span>
                  <span class="text-xs font-bold text-zinc-200 w-12">{{ selectedTeam?.home_W }}-{{ selectedTeam?.home_L }}</span>
                  <div class="flex-1 flex items-center gap-2">
                    <span class="text-[11px] text-zinc-400 tabular-nums">{{ selectedTeam?.home_ppg }} PPG</span>
                    <span class="text-[11px] text-zinc-500 tabular-nums">{{ selectedTeam?.home_opp_ppg }} OPP</span>
                    <span class="text-[11px] font-bold tabular-nums" :class="(selectedTeam?.home_ppg - selectedTeam?.home_opp_ppg) > 0 ? 'text-emerald-400' : 'text-red-400'">
                      {{ (selectedTeam?.home_ppg - selectedTeam?.home_opp_ppg) > 0 ? '+' : '' }}{{ ((selectedTeam?.home_ppg || 0) - (selectedTeam?.home_opp_ppg || 0)).toFixed(1) }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#f82828] flex-shrink-0"></span>
                  <span class="text-xs text-zinc-400 w-10">Away</span>
                  <span class="text-xs font-bold text-zinc-200 w-12">{{ selectedTeam?.away_W }}-{{ selectedTeam?.away_L }}</span>
                  <div class="flex-1 flex items-center gap-2">
                    <span class="text-[11px] text-zinc-400 tabular-nums">{{ selectedTeam?.away_ppg }} PPG</span>
                    <span class="text-[11px] text-zinc-500 tabular-nums">{{ selectedTeam?.away_opp_ppg }} OPP</span>
                    <span class="text-[11px] font-bold tabular-nums" :class="(selectedTeam?.away_ppg - selectedTeam?.away_opp_ppg) > 0 ? 'text-emerald-400' : 'text-red-400'">
                      {{ (selectedTeam?.away_ppg - selectedTeam?.away_opp_ppg) > 0 ? '+' : '' }}{{ ((selectedTeam?.away_ppg || 0) - (selectedTeam?.away_opp_ppg || 0)).toFixed(1) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Performance Insights -->
            <div class="bg-surface-light/30 rounded-xl p-4 mb-4">
              <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-3">Insights</div>
              <div class="grid grid-cols-2 gap-2">
                <div v-for="insight in modalInsights" :key="insight.label" class="flex items-center justify-between px-3 py-2 rounded-lg bg-surface/50">
                  <span class="text-[11px] text-zinc-400">{{ insight.label }}</span>
                  <span class="text-[11px] font-bold tabular-nums" :class="insight.color">{{ insight.value }}</span>
                </div>
              </div>
            </div>

            <!-- Recent Games -->
            <div>
              <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-2 px-1">Last {{ Math.min(modalRecentGames.length, 10) }} Games</div>
              <div class="space-y-1">
                <div v-for="g in modalRecentGames.slice(0, 10)" :key="g.date + g.opponent"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-light/20 hover:bg-surface-light/40 transition-colors">
                  <span :class="['text-xs font-bold w-4', g.result === 'W' ? 'text-emerald-400' : 'text-red-400']">{{ g.result }}</span>
                  <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', g.isHome ? 'bg-[#0848a8]' : 'bg-[#f82828]']"></span>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-zinc-300 truncate">{{ g.isHome ? 'vs' : '@' }} {{ g.opponent }}</div>
                    <div class="text-[10px] text-zinc-500 tabular-nums">{{ formatModalDate(g.date) }}</div>
                  </div>
                  <div class="text-xs font-bold tabular-nums" :class="g.result === 'W' ? 'text-zinc-100' : 'text-zinc-400'">
                    {{ g.pf }}-{{ g.pa }}
                  </div>
                  <span class="text-[10px] text-zinc-600 tabular-nums w-6 text-right">{{ g.pf > g.pa ? '+' : '' }}{{ g.pf - g.pa }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import GameCard from '~/components/league/GameCard.vue'

const props = defineProps({
  selectedRound: { type: Number, required: true },
  maxRound: { type: Number, required: true },
  roundGames: { type: Array, required: true },
  standings: { type: Array, required: true, default: () => [] },
  filter: { type: String, default: 'overall' },
  sport: { type: String, default: 'football' },
  selectedDate: { type: String, default: null },
  allGames: { type: Array, default: () => [] },
  leagueKey: { type: String, default: '' }
})

defineEmits(['previousRound', 'nextRound', 'changeRound', 'update:filter'])

const isBball = computed(() => props.sport === 'basketball')

// ─── Standings summary stats ────────────────────────────────
const totalGames = computed(() => Math.round(props.standings.reduce((sum, t) => sum + t.GP, 0) / 2))
const totalGoals = computed(() => props.standings.reduce((sum, t) => sum + t.GF, 0))
const avgGoalsPerGame = computed(() => {
  const t = totalGames.value
  return t > 0 ? (totalGoals.value / t).toFixed(2) : 0
})
const leagueAvgPace = computed(() => {
  if (!isBball.value || props.standings.length === 0) return 0
  const sum = props.standings.reduce((acc, t) => acc + (t.pace || 0), 0)
  return (sum / props.standings.length).toFixed(1)
})

// ─── Round stats ────────────────────────────────────────────
const roundPredictionsCount = computed(() => props.roundGames.filter(g => g.prediction_id).length)
const roundBetsCount = computed(() => props.roundGames.filter(g => g.bet_id).length)
const roundProfitLoss = computed(() => {
  return props.roundGames.filter(g => g.bet_id).reduce((total, g) => {
    if (g.home_goals === null || g.away_goals === null) return total
    const pt = g.prediction?.toLowerCase()
    if (pt && isWinningOdds(g, pt)) return total + (parseFloat(g.stake) * parseFloat(g.bet_odds) - parseFloat(g.stake))
    else if (pt) return total - parseFloat(g.stake)
    return total
  }, 0)
})

// ─── Team Modal ─────────────────────────────────────────────
const teamModalOpen = ref(false)
const selectedTeam = ref(null)

function openTeamModal(team) {
  selectedTeam.value = team
  teamModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeTeamModal() {
  teamModalOpen.value = false
  selectedTeam.value = null
  document.body.style.overflow = ''
}

// Swipe-to-dismiss
let sheetTouchStartY = 0
let sheetTouchDeltaY = 0
function onSheetTouchStart(e) { sheetTouchStartY = e.touches[0].clientY; sheetTouchDeltaY = 0 }
function onSheetTouchMove(e) {
  sheetTouchDeltaY = e.touches[0].clientY - sheetTouchStartY
  if (sheetTouchDeltaY > 0) e.currentTarget.style.transform = `translateY(${sheetTouchDeltaY}px)`
}
function onSheetTouchEnd(e) {
  const el = e.currentTarget
  if (sheetTouchDeltaY > 120) closeTeamModal()
  else el.style.transform = ''
  sheetTouchDeltaY = 0
}

// Modal data
const modalSeasonStats = computed(() => {
  const t = selectedTeam.value
  if (!t) return []
  return [
    { label: 'PPG', value: t.ppg, color: 'text-zinc-100' },
    { label: 'OPP PPG', value: t.opp_ppg, color: 'text-zinc-100' },
    { label: 'DIFF', value: (t.diff_pg > 0 ? '+' : '') + t.diff_pg, color: t.diff_pg > 0 ? 'text-emerald-400' : t.diff_pg < 0 ? 'text-red-400' : 'text-zinc-400' },
    { label: 'Streak', value: t.streak, color: t.streak?.startsWith('W') ? 'text-emerald-400' : t.streak?.startsWith('L') ? 'text-red-400' : 'text-zinc-400' }
  ]
})

const modalInsights = computed(() => {
  const t = selectedTeam.value
  if (!t || !t.recentGames) return []
  const games = t.recentGames
  const wins = games.filter(g => g.result === 'W')
  const losses = games.filter(g => g.result === 'L')
  const avgWinMargin = wins.length > 0 ? (wins.reduce((s, g) => s + (g.pf - g.pa), 0) / wins.length).toFixed(1) : '-'
  const avgLossMargin = losses.length > 0 ? (losses.reduce((s, g) => s + (g.pa - g.pf), 0) / losses.length).toFixed(1) : '-'
  const closeGames = games.filter(g => Math.abs(g.pf - g.pa) <= 5)
  const closeWins = closeGames.filter(g => g.result === 'W').length
  const blowouts = games.filter(g => g.result === 'W' && (g.pf - g.pa) >= 15).length
  return [
    { label: 'L10 Record', value: t.last10, color: 'text-zinc-200' },
    { label: 'Avg Win Margin', value: '+' + avgWinMargin, color: 'text-emerald-400' },
    { label: 'Avg Loss Margin', value: '-' + avgLossMargin, color: 'text-red-400' },
    { label: 'Close Games (≤5)', value: `${closeWins}-${closeGames.length - closeWins}`, color: 'text-zinc-200' },
    { label: 'Blowout W (15+)', value: String(blowouts), color: 'text-emerald-400' },
    { label: 'vs .500+ Teams', value: _computeVs500(t), color: 'text-zinc-200' }
  ]
})

function _computeVs500(team) {
  if (!team?.recentGames) return '-'
  const standingsMap = {}
  props.standings.forEach(t => { if (t.name) standingsMap[t.name] = t })
  const vs500 = team.recentGames.filter(g => {
    const opp = standingsMap[g.opponent]
    return opp && opp.GP > 0 && (opp.W / opp.GP) >= 0.5
  })
  const w = vs500.filter(g => g.result === 'W').length
  return `${w}-${vs500.length - w}`
}

const modalRecentGames = computed(() => {
  const t = selectedTeam.value
  if (!t || !t.recentGames) return []
  return [...t.recentGames].reverse()
})

function formatModalDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

// ─── Helpers ────────────────────────────────────────────────
function getPercentageColor(value) {
  if (value >= 70) return 'text-red-400'
  if (value >= 50) return 'text-orange-400'
  if (value >= 30) return 'text-yellow-400'
  return 'text-green-400'
}

function formatBballDate(dateStr) {
  if (!dateStr) return 'Loading...'
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateRange() {
  const dates = props.roundGames.map(g => g.date ? g.date.split('T')[0] : null).filter(Boolean)
  const uniqueDates = [...new Set(dates)].sort()
  if (uniqueDates.length === 0) return 'TBD'
  if (uniqueDates.length === 1) return formatDateShort(uniqueDates[0])
  return `${formatDateShort(uniqueDates[0])} - ${formatDateShort(uniqueDates[uniqueDates.length - 1])}`
}

function formatDateShort(dateStr) {
  if (dateStr === 'TBD') return 'TBD'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isWinningOdds(game, type) {
  if (game.home_goals === null || game.away_goals === null) return false
  const h = game.home_goals, a = game.away_goals, t = h + a
  if (type === 'home') return h > a
  if (type === 'draw') return h === a
  if (type === 'away') return a > h
  if (type === 'over') return t > 2.5
  if (type === 'under') return t < 2.5
  return false
}

import { getTeamLogoUrl } from '~/utils/teamLogo'
</script>

<style scoped>
.overview-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.th-cell {
  @apply px-1 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider;
}

.td-cell {
  @apply px-1 py-1 text-center text-[11px];
}

/* ─── Team Modal ─── */
.team-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.team-modal-sheet {
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

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .team-modal-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-leave-active .team-modal-sheet {
  transition: transform 0.2s ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .team-modal-sheet,
.sheet-leave-to .team-modal-sheet {
  transform: translateY(100%);
}
</style>
