<template>
  <div class="space-y-3">
    <!-- ===== LEAGUE SUMMARY ===== -->
    <div class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <!-- Header + Filter -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-zinc-100">League Analysis</h3>
          <div v-if="!isBball" class="flex gap-1">
            <button
              v-for="f in filterOptions"
              :key="f.key"
              @click="$emit('update:locationFilter', f.key)"
              :class="[
                'px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all',
                locationFilter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light text-zinc-400 hover:bg-surface-hover'
              ]"
            >{{ f.label }}</button>
          </div>
        </div>

        <!-- Summary Stats Row -->
        <div class="flex items-center gap-2">
          <div class="stat-cell flex-1">
            <span class="stat-label">Games</span>
            <span class="stat-value text-zinc-100">{{ overallStats.totalMatches }}</span>
          </div>
          <div class="stat-cell flex-1">
            <span class="stat-label">Avg {{ isBball ? 'PPG' : 'Goals' }}</span>
            <span class="stat-value text-green-400">{{ overallStats.avgGoalsPerMatch }}</span>
          </div>
          <div class="stat-cell flex-1">
            <span class="stat-label">Home Win%</span>
            <span class="stat-value text-indigo-400">{{ homeWinPct }}%</span>
          </div>
          <div v-if="!isBball" class="stat-cell flex-1">
            <span class="stat-label">Over 2.5</span>
            <span class="stat-value text-orange-400">{{ overallStats.over25Pct }}%</span>
          </div>
          <div v-if="!isBball" class="stat-cell flex-1">
            <span class="stat-label">BTTS</span>
            <span class="stat-value text-pink-400">{{ overallStats.bttsPct || 0 }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SCORE DISTRIBUTION ===== -->
    <div class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">{{ isBball ? 'Score Distribution' : 'Goals Distribution' }}</h3>
        <p class="text-[10px] text-zinc-500 mb-3">{{ isBball ? 'Games by total points scored' : 'Matches by total goals' }}</p>

        <div class="overflow-x-auto scrollbar-hide">
          <div class="flex items-end gap-1 justify-between" style="height: 120px;">
            <div
              v-for="(count, label) in goalsDistribution"
              :key="label"
              class="flex flex-col items-center justify-end flex-1 group"
            >
              <span class="text-[9px] font-semibold text-zinc-500 mb-1 group-hover:text-zinc-300 transition-colors tabular-nums">
                {{ getDistPct(count) }}%
              </span>
              <div
                class="w-full rounded-t-md transition-all relative overflow-hidden"
                :style="{ height: getBarHeight(count) + 'px' }"
              >
                <div class="absolute inset-0 bg-gradient-to-t from-[#0848a8] to-[#4d8fff] group-hover:from-[#0848a8]/80 group-hover:to-[#6da3ff] transition-all"></div>
                <span class="relative z-10 flex items-start justify-center pt-0.5 text-[10px] font-bold text-white">{{ count }}</span>
              </div>
              <span v-if="!isBball" class="mt-1 text-[8px] font-medium text-zinc-500 whitespace-nowrap tabular-nums leading-tight">
                {{ label }}G
              </span>
              <span v-else class="mt-1 text-[8px] font-medium text-zinc-500 whitespace-nowrap tabular-nums leading-tight text-center">
                <template v-if="label.includes('-')">
                  <span class="block">{{ label.split('-')[0] }}-</span>
                  <span class="block">{{ label.split('-')[1] }}</span>
                </template>
                <template v-else>{{ label }}</template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== HOME vs AWAY ===== -->
    <div class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Home vs Away</h3>
        <p class="text-[10px] text-zinc-500 mb-3">Comparative performance analysis</p>

        <div class="space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] font-semibold text-zinc-300">Total {{ isBball ? 'Points' : 'Goals' }}</span>
              <span class="text-[10px] text-zinc-500 tabular-nums">{{ homeAwayComparison.home.goals }} vs {{ homeAwayComparison.away.goals }}</span>
            </div>
            <div class="flex gap-0.5 h-6 rounded-md overflow-hidden">
              <div
                class="bg-[#0848a8] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500"
                :style="{ width: compWidth(homeAwayComparison.home.goals, homeAwayComparison.away.goals) + '%' }"
              >{{ homeAwayComparison.home.goals }}</div>
              <div
                class="bg-[#4d8fff] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500"
                :style="{ width: compWidth(homeAwayComparison.away.goals, homeAwayComparison.home.goals) + '%' }"
              >{{ homeAwayComparison.away.goals }}</div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] font-semibold text-zinc-300">Wins</span>
              <span class="text-[10px] text-zinc-500 tabular-nums">{{ homeAwayComparison.home.wins }} vs {{ homeAwayComparison.away.wins }}</span>
            </div>
            <div class="flex gap-0.5 h-6 rounded-md overflow-hidden">
              <div
                class="bg-[#0848a8] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500"
                :style="{ width: compWidth(homeAwayComparison.home.wins, homeAwayComparison.away.wins) + '%' }"
              >{{ homeAwayComparison.home.wins }}</div>
              <div
                class="bg-[#4d8fff] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500"
                :style="{ width: compWidth(homeAwayComparison.away.wins, homeAwayComparison.home.wins) + '%' }"
              >{{ homeAwayComparison.away.wins }}</div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] font-semibold text-zinc-300">Avg {{ isBball ? 'PPG' : 'Goals' }}</span>
              <span class="text-[10px] text-zinc-500 tabular-nums">{{ homeAwayComparison.home.avgGoals }} vs {{ homeAwayComparison.away.avgGoals }}</span>
            </div>
            <div class="flex gap-0.5 h-6 rounded-md overflow-hidden">
              <div
                class="bg-[#0848a8] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500"
                :style="{ width: compWidth(parseFloat(homeAwayComparison.home.avgGoals), parseFloat(homeAwayComparison.away.avgGoals)) + '%' }"
              >{{ homeAwayComparison.home.avgGoals }}</div>
              <div
                class="bg-[#4d8fff] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500"
                :style="{ width: compWidth(parseFloat(homeAwayComparison.away.avgGoals), parseFloat(homeAwayComparison.home.avgGoals)) + '%' }"
              >{{ homeAwayComparison.away.avgGoals }}</div>
            </div>
          </div>

          <div class="flex items-center justify-center gap-4 pt-1">
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm bg-[#0848a8]"></div>
              <span class="text-[11px] text-zinc-400 font-medium">Home</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm bg-[#4d8fff]"></div>
              <span class="text-[11px] text-zinc-400 font-medium">Away</span>
            </div>
            <div v-if="homeAwayComparison.draws" class="text-[10px] text-zinc-600 font-medium">
              {{ homeAwayComparison.draws.count }} Draws ({{ homeAwayComparison.draws.drawPct }}%)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== WIN RATE EVOLUTION ===== -->
    <div v-if="winRateEvolution && winRateEvolution.length > 1" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Win Rate Evolution</h3>
        <p class="text-[10px] text-zinc-500 mb-3">Home, Away{{ !isBball ? ', Draw' : '' }} % by round</p>

        <div class="relative" style="height: 180px;">
          <!-- Y-axis labels -->
          <div class="absolute left-0 top-0 bottom-5 flex flex-col justify-between text-[9px] text-zinc-600 font-medium w-7 text-right">
            <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
          </div>
          <!-- Bars area -->
          <div class="ml-8 h-full flex items-end gap-1 pb-5 overflow-x-auto scrollbar-hide">
            <div v-for="(evo, idx) in evoSubset" :key="'evo-bar-'+idx" class="flex flex-col items-center flex-1 min-w-[24px]">
              <div class="flex items-end gap-px w-full" style="height: 140px;">
                <div
                  class="flex-1 rounded-t-sm bg-[#0848a8] transition-all relative group"
                  :style="{ height: (evo.homeWinPct / 100 * 140) + 'px' }"
                >
                  <span class="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{{ evo.homeWinPct }}%</span>
                </div>
                <div
                  class="flex-1 rounded-t-sm bg-[#4d8fff] transition-all relative group"
                  :style="{ height: (evo.awayWinPct / 100 * 140) + 'px' }"
                >
                  <span class="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{{ evo.awayWinPct }}%</span>
                </div>
                <div
                  v-if="!isBball"
                  class="flex-1 rounded-t-sm bg-zinc-600 transition-all relative group"
                  :style="{ height: ((evo.drawPct || 0) / 100 * 140) + 'px' }"
                >
                  <span class="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{{ evo.drawPct || 0 }}%</span>
                </div>
              </div>
              <span class="mt-1 text-[9px] text-zinc-600 font-medium">R{{ evo.round }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center gap-4 mt-1">
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-sm bg-[#0848a8]"></div>
            <span class="text-[10px] text-zinc-500 font-medium">Home</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-sm bg-[#4d8fff]"></div>
            <span class="text-[10px] text-zinc-500 font-medium">Away</span>
          </div>
          <div v-if="!isBball" class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-sm bg-zinc-600"></div>
            <span class="text-[10px] text-zinc-500 font-medium">Draw</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== O/U TRENDS (football only) ===== -->
    <div v-if="!isBball && roundTrends && roundTrends.length > 0" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">Over/Under 2.5 Trend</h3>
        <p class="text-[10px] text-zinc-500 mb-3">By round percentage</p>

        <div class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <div
            v-for="round in roundTrends.slice(0, 20)"
            :key="round.round"
            class="flex flex-col items-center gap-0.5 flex-shrink-0"
          >
            <span class="text-[10px] font-medium text-zinc-500 mb-0.5">R{{ round.round }}</span>
            <div
              :class="[
                'px-2 py-1 rounded text-white text-[10px] font-bold text-center min-w-[32px]',
                round.over25 >= 60 ? 'bg-green-600' : round.over25 >= 40 ? 'bg-green-500/80' : 'bg-green-500/50'
              ]"
            >{{ round.over25 }}%</div>
            <div
              :class="[
                'px-2 py-1 rounded text-white text-[10px] font-bold text-center min-w-[32px]',
                round.under25 >= 60 ? 'bg-red-600' : round.under25 >= 40 ? 'bg-red-500/80' : 'bg-red-500/50'
              ]"
            >{{ round.under25 }}%</div>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-center gap-4">
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
            <span class="text-[10px] text-zinc-500 font-medium">Over 2.5</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 bg-red-500 rounded-sm"></div>
            <span class="text-[10px] text-zinc-500 font-medium">Under 2.5</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== BTTS HEATMAP (football only) ===== -->
    <div v-if="!isBball && teamStats && teamStats.length > 0" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-0.5">BTTS Heatmap</h3>
        <p class="text-[10px] text-zinc-500 mb-3">Both Teams to Score probability</p>

        <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
          <div v-for="team in sortedByBtts" :key="team.name">
            <div
              class="h-10 rounded-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all"
              :style="{ backgroundColor: getBttsColor(team.bttsPct) }"
            >
              <span class="text-[10px] font-bold text-white drop-shadow">{{ team.bttsPct }}%</span>
              <span class="text-[9px] text-white/70">{{ team.btts }}/{{ team.matches }}</span>
            </div>
            <div class="text-[9px] font-medium text-zinc-500 mt-0.5 text-center truncate" :title="team.name">{{ team.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== TEAM RANKINGS (football only) ===== -->
    <div v-if="!isBball && teamStats && teamStats.length > 0" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-2">Team Rankings</h3>

        <div class="flex gap-1 mb-3 overflow-x-auto scrollbar-hide">
          <button
            v-for="tab in rankingTabs"
            :key="tab.key"
            @click="activeRankingTab = tab.key"
            :class="[
              'px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap',
              activeRankingTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-surface-light text-zinc-400 hover:bg-surface-hover'
            ]"
          >{{ tab.label }}</button>
        </div>

        <div class="space-y-1">
          <div
            v-for="(team, idx) in currentRanking.slice(0, 8)"
            :key="team.name"
            class="flex items-center gap-1.5"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-3 text-right">{{ idx + 1 }}</span>
            <span class="text-[10px] font-semibold text-zinc-300 w-[68px] truncate" :title="team.name">{{ team.name }}</span>
            <div class="flex-1 relative h-4 bg-surface-light/50 rounded overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded transition-all duration-500"
                :class="currentRankingGradient"
                :style="{ width: getRankingBarWidth(team) + '%' }"
              ></div>
              <span class="absolute left-1.5 top-0 text-[10px] font-bold text-white drop-shadow-sm leading-4 z-10">
                {{ getRankingValue(team) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== ROUND STATISTICS TABLE ===== -->
    <div v-if="roundStats && roundStats.length > 1" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-2">Round Statistics</h3>

        <div class="overflow-x-auto rounded-lg border border-edge/40 max-h-[360px] overflow-y-auto scrollbar-hide">
          <table class="min-w-full">
            <thead class="sticky top-0 z-10">
              <tr class="tbl-header">
                <th class="tbl-th text-left">Rnd</th>
                <th class="tbl-th text-center">G</th>
                <th class="tbl-th text-center bg-[#0848a8]/20">{{ isBball ? 'Pts' : 'Goals' }}</th>
                <th class="tbl-th text-center bg-green-900/20">Avg</th>
                <th v-if="!isBball" class="tbl-th text-center">O2.5</th>
                <th v-if="!isBball" class="tbl-th text-center">U2.5</th>
                <th v-if="!isBball" class="tbl-th text-center">BTTS</th>
                <th v-if="!isBball" class="tbl-th text-center">CS</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="round in roundStats"
                :key="round.round"
                class="border-b border-edge/20 hover:bg-white/[0.02] transition-colors"
              >
                <td class="tbl-td font-bold text-zinc-200">R{{ round.round }}</td>
                <td class="tbl-td text-center text-zinc-500">{{ round.matches }}</td>
                <td class="tbl-td text-center">
                  <span class="font-bold text-blue-400">{{ round.totalGoals }}</span>
                </td>
                <td class="tbl-td text-center">
                  <span :class="['font-bold', getAvgColor(round.avgGoals)]">{{ round.avgGoals }}</span>
                </td>
                <td v-if="!isBball" class="tbl-td text-center">
                  <span class="font-semibold text-orange-400">{{ round.over25Count }}</span>
                  <span class="text-zinc-600 ml-0.5">({{ round.over25Pct }}%)</span>
                </td>
                <td v-if="!isBball" class="tbl-td text-center">
                  <span class="font-semibold text-purple-400">{{ round.under25Count }}</span>
                  <span class="text-zinc-600 ml-0.5">({{ round.under25Pct }}%)</span>
                </td>
                <td v-if="!isBball" class="tbl-td text-center">
                  <span class="font-semibold text-pink-400">{{ round.bttsCount }}</span>
                  <span class="text-zinc-600 ml-0.5">({{ round.bttsPct }}%)</span>
                </td>
                <td v-if="!isBball" class="tbl-td text-center">
                  <span class="font-semibold text-teal-400">{{ round.cleanSheets }}</span>
                  <span class="text-zinc-600 ml-0.5">({{ round.cleanSheetsPct }}%)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== TEAM POWER RANKINGS (basketball) ===== -->
    <div v-if="isBball && sortedByNRtg.length > 0" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h3 class="text-sm font-bold text-zinc-100">Team Power Rankings</h3>
            <p class="text-[10px] text-zinc-500">Sorted by Net Rating</p>
          </div>
          <div class="flex gap-1">
            <button
              v-for="tab in bballRankingTabs"
              :key="tab.key"
              @click="activeBballRanking = tab.key"
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all',
                activeBballRanking === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-light text-zinc-400 hover:bg-surface-hover'
              ]"
            >{{ tab.label }}</button>
          </div>
        </div>

        <!-- Net Rating Bars -->
        <div v-if="activeBballRanking === 'netrtg'" class="space-y-0.5">
          <div
            v-for="(team, idx) in sortedByNRtg"
            :key="team.name"
            class="flex items-center gap-1.5 py-1 group hover:bg-white/[0.02] rounded transition-colors"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-4 text-right">{{ idx + 1 }}</span>
            <div class="w-5 h-5 flex-shrink-0">
              <img v-if="getTeamLogoUrl(team.team_key)" :src="getTeamLogoUrl(team.team_key)" class="w-5 h-5 object-contain" :alt="team.name" @error="($event.target).style.display='none'" />
            </div>
            <span class="text-[10px] font-semibold text-zinc-300 w-[80px] truncate" :title="team.name">{{ team.name }}</span>
            
            <div class="flex-1 relative h-4 flex items-center">
              <div class="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700/50"></div>
              <div v-if="team.netrtg >= 0"
                class="absolute left-1/2 h-3.5 rounded-r transition-all duration-500 bg-gradient-to-r from-green-600 to-green-500"
                :style="{ width: getNRtgBarWidth(team.netrtg) + '%' }"
              ></div>
              <div v-else
                class="absolute h-3.5 rounded-l transition-all duration-500 bg-gradient-to-l from-red-600 to-red-500"
                :style="{ width: getNRtgBarWidth(team.netrtg) + '%', right: '50%' }"
              ></div>
            </div>
            
            <span :class="[
              'text-[10px] font-bold tabular-nums w-8 text-right',
              team.netrtg >= 0 ? 'text-green-400' : 'text-red-400'
            ]">{{ team.netrtg > 0 ? '+' : '' }}{{ team.netrtg }}</span>
          </div>
        </div>

        <!-- Offensive Rating Rankings -->
        <div v-if="activeBballRanking === 'offense'" class="space-y-0.5">
          <div
            v-for="(team, idx) in sortedByORtg"
            :key="team.name"
            class="flex items-center gap-1.5 py-1 group hover:bg-white/[0.02] rounded transition-colors"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-4 text-right">{{ idx + 1 }}</span>
            <div class="w-5 h-5 flex-shrink-0">
              <img v-if="getTeamLogoUrl(team.team_key)" :src="getTeamLogoUrl(team.team_key)" class="w-5 h-5 object-contain" :alt="team.name" @error="($event.target).style.display='none'" />
            </div>
            <span class="text-[10px] font-semibold text-zinc-300 w-[80px] truncate" :title="team.name">{{ team.name }}</span>
            <div class="flex-1 relative h-4 bg-surface-light/30 rounded overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-[#0848a8] to-[#4d8fff] transition-all duration-500"
                :style="{ width: getRtgBarWidth(team.ppg, 'ppg') + '%' }"
              ></div>
            </div>
            <span class="text-[10px] font-bold text-blue-400 tabular-nums w-10 text-right">{{ team.ppg }} PPG</span>
          </div>
        </div>

        <!-- Defensive Rating Rankings -->
        <div v-if="activeBballRanking === 'defense'" class="space-y-0.5">
          <div
            v-for="(team, idx) in sortedByDRtg"
            :key="team.name"
            class="flex items-center gap-1.5 py-1 group hover:bg-white/[0.02] rounded transition-colors"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-4 text-right">{{ idx + 1 }}</span>
            <div class="w-5 h-5 flex-shrink-0">
              <img v-if="getTeamLogoUrl(team.team_key)" :src="getTeamLogoUrl(team.team_key)" class="w-5 h-5 object-contain" :alt="team.name" @error="($event.target).style.display='none'" />
            </div>
            <span class="text-[10px] font-semibold text-zinc-300 w-[80px] truncate" :title="team.name">{{ team.name }}</span>
            <div class="flex-1 relative h-4 bg-surface-light/30 rounded overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-500"
                :style="{ width: getRtgBarWidth(team.opp_ppg, 'opp_ppg') + '%' }"
              ></div>
            </div>
            <span class="text-[10px] font-bold text-emerald-400 tabular-nums w-10 text-right">{{ team.opp_ppg }} OPP</span>
          </div>
        </div>

        <!-- Pace Rankings -->
        <div v-if="activeBballRanking === 'pace'" class="space-y-0.5">
          <div
            v-for="(team, idx) in sortedByPace"
            :key="team.name"
            class="flex items-center gap-1.5 py-1 group hover:bg-white/[0.02] rounded transition-colors"
          >
            <span class="text-[10px] font-bold text-zinc-600 w-4 text-right">{{ idx + 1 }}</span>
            <div class="w-5 h-5 flex-shrink-0">
              <img v-if="getTeamLogoUrl(team.team_key)" :src="getTeamLogoUrl(team.team_key)" class="w-5 h-5 object-contain" :alt="team.name" @error="($event.target).style.display='none'" />
            </div>
            <span class="text-[10px] font-semibold text-zinc-300 w-[80px] truncate" :title="team.name">{{ team.name }}</span>
            <div class="flex-1 relative h-4 bg-surface-light/30 rounded overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-amber-700 to-amber-500 transition-all duration-500"
                :style="{ width: getRtgBarWidth(team.pace, 'pace') + '%' }"
              ></div>
            </div>
            <span class="text-[10px] font-bold text-amber-400 tabular-nums w-8 text-right">{{ team.pace }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== TEAM PERFORMANCE TABLE (football only) ===== -->
    <div v-if="!isBball && teamStats && teamStats.length > 0" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-2">Team Performance</h3>

        <div class="overflow-x-auto rounded-lg border border-edge/40">
          <table class="min-w-full">
            <thead>
              <tr class="tbl-header">
                <th class="tbl-th text-left sticky left-0 bg-[rgba(28,31,39,0.95)] z-10">Team</th>
                <th class="tbl-th text-center">G</th>
                <th class="tbl-th text-center">Poss</th>
                <th class="tbl-th text-center">Shots</th>
                <th class="tbl-th text-center">Crn</th>
                <th class="tbl-th text-center">YC</th>
                <th class="tbl-th text-center">O2.5</th>
                <th class="tbl-th text-center">BTTS</th>
                <th class="tbl-th text-center">CS</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="team in teamStats"
                :key="team.name"
                class="border-b border-edge/20 hover:bg-white/[0.02] transition-colors"
              >
                <td class="tbl-td font-semibold text-zinc-200 sticky left-0 bg-inherit z-10 max-w-[100px] truncate">{{ team.name }}</td>
                <td class="tbl-td text-center text-zinc-500">{{ team.matches }}</td>
                <td class="tbl-td text-center font-semibold text-blue-400">{{ team.avgPossession || '-' }}%</td>
                <td class="tbl-td text-center font-semibold text-cyan-400">{{ team.avgShots || '-' }}</td>
                <td class="tbl-td text-center font-semibold text-teal-400">{{ team.avgCorners || '-' }}</td>
                <td class="tbl-td text-center font-semibold text-amber-400">{{ team.avgYellowCards || '-' }}</td>
                <td class="tbl-td text-center">
                  <span :class="getPctColor(team.over25Pct)">{{ team.over25Pct }}%</span>
                </td>
                <td class="tbl-td text-center">
                  <span :class="getPctColor(team.bttsPct)">{{ team.bttsPct }}%</span>
                </td>
                <td class="tbl-td text-center">
                  <span class="font-semibold text-green-400">{{ team.cleanSheetsPct }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== TOP PERFORMERS (football only) ===== -->
    <div v-if="!isBball && hasTopPerformers" class="analysis-card rounded-lg">
      <div class="p-3 sm:p-4">
        <h3 class="text-sm font-bold text-zinc-100 mb-2">Top Performers</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-if="topPerformers.mostGoals" class="stat-cell">
            <span class="stat-label">Most Goals</span>
            <span class="stat-value text-blue-400">{{ topPerformers.mostGoals.name }}</span>
            <span class="text-[10px] text-zinc-500">{{ topPerformers.mostGoals.totalGoals }} Goals</span>
          </div>
          <div v-if="topPerformers.bestDefense" class="stat-cell">
            <span class="stat-label">Best Defense</span>
            <span class="stat-value text-emerald-400">{{ topPerformers.bestDefense.name }}</span>
            <span class="text-[10px] text-zinc-500">{{ topPerformers.bestDefense.conceded }} Conceded</span>
          </div>
          <div v-if="topPerformers.bestHome" class="stat-cell">
            <span class="stat-label">Best Home</span>
            <span class="stat-value text-indigo-400">{{ topPerformers.bestHome.name }}</span>
            <span class="text-[10px] text-zinc-500">{{ topPerformers.bestHome.homeWinPct }}% Win</span>
          </div>
          <div v-if="topPerformers.bestAway" class="stat-cell">
            <span class="stat-label">Best Away</span>
            <span class="stat-value text-cyan-400">{{ topPerformers.bestAway.name }}</span>
            <span class="text-[10px] text-zinc-500">{{ topPerformers.bestAway.awayWinPct }}% Win</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  overallStats: {
    type: Object,
    required: true,
    default: () => ({
      totalMatches: 0, totalGoals: 0, avgGoalsPerMatch: '0.00',
      over25Pct: 0, bttsPct: 0, avgCorners: '0.0'
    })
  },
  roundStats: {
    type: Array,
    default: () => []
  },
  teamStats: {
    type: Array,
    default: () => []
  },
  standings: {
    type: Array,
    default: () => []
  },
  goalsDistribution: {
    type: Object,
    default: () => ({})
  },
  homeAwayComparison: {
    type: Object,
    default: () => ({
      home: { goals: 0, wins: 0, winPct: 0, avgGoals: '0.00' },
      away: { goals: 0, wins: 0, winPct: 0, avgGoals: '0.00' },
      draws: { count: 0, drawPct: 0 }
    })
  },
  winRateEvolution: {
    type: Array,
    default: () => []
  },
  roundTrends: {
    type: Array,
    default: () => []
  },
  topPerformers: {
    type: Object,
    default: () => ({})
  },
  locationFilter: {
    type: String,
    default: 'all'
  },
  sport: {
    type: String,
    default: 'football'
  }
})

defineEmits(['update:locationFilter'])

const isBball = computed(() => props.sport === 'basketball')

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' }
]

// Football ranking tabs
const activeRankingTab = ref('corners')
const rankingTabs = [
  { key: 'corners', label: 'Corners' },
  { key: 'shots', label: 'Shots' },
  { key: 'possession', label: 'Possession' },
  { key: 'cards', label: 'Cards' }
]

// Basketball ranking tabs
const activeBballRanking = ref('netrtg')
const bballRankingTabs = [
  { key: 'netrtg', label: 'NRtg' },
  { key: 'offense', label: 'Off' },
  { key: 'defense', label: 'Def' },
  { key: 'pace', label: 'Pace' }
]

// --- Computed ---

const homeWinPct = computed(() => props.homeAwayComparison?.home?.winPct || 0)

const hasTopPerformers = computed(() => {
  const tp = props.topPerformers
  return tp && (tp.mostGoals || tp.bestDefense || tp.highBtts || tp.bestHome || tp.bestAway)
})

const sortedByBtts = computed(() => {
  if (!props.teamStats) return []
  return [...props.teamStats].sort((a, b) => b.bttsPct - a.bttsPct)
})

// Basketball power rankings from standings prop
const sortedByNRtg = computed(() => {
  if (!props.standings || !props.standings.length) return []
  return [...props.standings].filter(t => t.GP > 0).sort((a, b) => b.netrtg - a.netrtg)
})

const sortedByORtg = computed(() => {
  if (!props.standings || !props.standings.length) return []
  return [...props.standings].filter(t => t.GP > 0).sort((a, b) => b.ppg - a.ppg)
})

const sortedByDRtg = computed(() => {
  if (!props.standings || !props.standings.length) return []
  return [...props.standings].filter(t => t.GP > 0).sort((a, b) => a.opp_ppg - b.opp_ppg)
})

const sortedByPace = computed(() => {
  if (!props.standings || !props.standings.length) return []
  return [...props.standings].filter(t => t.GP > 0).sort((a, b) => b.pace - a.pace)
})

// Win rate evolution: max 15 rounds
const evoSubset = computed(() => {
  if (!props.winRateEvolution) return []
  const data = props.winRateEvolution
  if (data.length <= 15) return data
  const step = Math.ceil(data.length / 15)
  return data.filter((_, i) => i % step === 0 || i === data.length - 1)
})

// Football ranking computeds
const currentRanking = computed(() => {
  if (!props.teamStats) return []
  const key = activeRankingTab.value
  if (key === 'corners') return [...props.teamStats].sort((a, b) => parseFloat(b.avgCorners || 0) - parseFloat(a.avgCorners || 0))
  if (key === 'shots') return [...props.teamStats].sort((a, b) => parseFloat(b.avgShots || 0) - parseFloat(a.avgShots || 0))
  if (key === 'possession') return [...props.teamStats].sort((a, b) => parseFloat(b.avgPossession || 0) - parseFloat(a.avgPossession || 0))
  if (key === 'cards') return [...props.teamStats].sort((a, b) => parseFloat(b.avgYellowCards || 0) - parseFloat(a.avgYellowCards || 0))
  return props.teamStats
})

const currentRankingGradient = computed(() => {
  const key = activeRankingTab.value
  if (key === 'corners') return 'bg-gradient-to-r from-yellow-600 to-amber-500'
  if (key === 'shots') return 'bg-gradient-to-r from-cyan-600 to-teal-500'
  if (key === 'possession') return 'bg-gradient-to-r from-blue-600 to-indigo-500'
  if (key === 'cards') return 'bg-gradient-to-r from-yellow-500 to-red-500'
  return 'bg-gradient-to-r from-blue-600 to-indigo-500'
})

// --- Functions ---

import { getTeamLogoUrl } from '~/utils/teamLogo'

function getBarHeight(count) {
  if (!props.goalsDistribution) return 0
  const max = Math.max(...Object.values(props.goalsDistribution))
  return Math.max((count / max) * 85, 12)
}

function getDistPct(count) {
  if (!props.goalsDistribution) return 0
  const total = Object.values(props.goalsDistribution).reduce((s, c) => s + c, 0)
  return Math.round((count / total) * 100)
}

function compWidth(val, otherVal) {
  const total = val + otherVal
  if (total === 0) return 50
  return Math.max((val / total) * 100, 8)
}

function getEvoX(idx) {
  const count = evoSubset.value.length
  if (count <= 1) return 400
  return 55 + (idx * (725 / (count - 1)))
}

function getEvoPoints(type) {
  if (!evoSubset.value || evoSubset.value.length === 0) return ''
  return evoSubset.value.map((evo, idx) => {
    const x = getEvoX(idx)
    let pct = 0
    if (type === 'home') pct = evo.homeWinPct
    else if (type === 'away') pct = evo.awayWinPct
    else if (type === 'draw') pct = evo.drawPct
    const y = 180 - (pct * 1.6)
    return `${x},${y}`
  }).join(' ')
}

function getEvoArea(type) {
  if (!evoSubset.value || evoSubset.value.length === 0) return ''
  const points = evoSubset.value.map((evo, idx) => {
    const x = getEvoX(idx)
    let pct = 0
    if (type === 'home') pct = evo.homeWinPct
    else if (type === 'away') pct = evo.awayWinPct
    const y = 180 - (pct * 1.6)
    return `${x},${y}`
  })
  const firstX = getEvoX(0)
  const lastX = getEvoX(evoSubset.value.length - 1)
  return `${firstX},180 ${points.join(' ')} ${lastX},180`
}

function getBttsColor(pct) {
  const colors = ['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857']
  return colors[Math.min(Math.floor(pct / 17), 5)]
}

function getRankingBarWidth(team) {
  const all = currentRanking.value
  if (!all.length) return 0
  const key = activeRankingTab.value
  const getValue = (t) => {
    if (key === 'corners') return parseFloat(t.avgCorners || 0)
    if (key === 'shots') return parseFloat(t.avgShots || 0)
    if (key === 'possession') return parseFloat(t.avgPossession || 0)
    if (key === 'cards') return parseFloat(t.avgYellowCards || 0)
    return 0
  }
  const max = Math.max(...all.map(getValue))
  if (max === 0) return 0
  return (getValue(team) / max) * 100
}

function getRankingValue(team) {
  const key = activeRankingTab.value
  if (key === 'corners') return team.avgCorners || '-'
  if (key === 'shots') return team.avgShots || '-'
  if (key === 'possession') return (team.avgPossession || '-') + '%'
  if (key === 'cards') return team.avgYellowCards || '-'
  return '-'
}

function getNRtgBarWidth(netrtg) {
  const absMax = Math.max(...sortedByNRtg.value.map(t => Math.abs(t.netrtg)), 1)
  return Math.min((Math.abs(netrtg) / absMax) * 45, 45)
}

function getRtgBarWidth(val, key) {
  let sorted
  if (key === 'ppg') sorted = sortedByORtg.value
  else if (key === 'opp_ppg') sorted = sortedByDRtg.value
  else sorted = sortedByPace.value
  
  if (!sorted.length) return 0
  const max = Math.max(...sorted.map(t => t[key] || 0))
  const min = Math.min(...sorted.map(t => t[key] || 0))
  if (max === min) return 50
  return Math.max(((val - min) / (max - min)) * 90 + 10, 10)
}

function getAvgColor(avgGoals) {
  const val = parseFloat(avgGoals)
  if (isBball.value) {
    if (val >= 180) return 'text-green-400'
    if (val >= 170) return 'text-green-500/80'
    if (val >= 160) return 'text-zinc-300'
    return 'text-zinc-400'
  }
  if (val >= 3.5) return 'text-green-400'
  if (val >= 2.5) return 'text-green-500/80'
  if (val >= 1.5) return 'text-zinc-300'
  return 'text-zinc-400'
}

function getPctColor(val) {
  if (val >= 70) return 'font-semibold text-red-400'
  if (val >= 50) return 'font-semibold text-orange-400'
  if (val >= 30) return 'font-semibold text-yellow-400'
  return 'font-semibold text-green-400'
}
</script>

<style scoped>
.analysis-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(42, 47, 58, 0.3);
  border: 1px solid rgba(42, 47, 58, 0.2);
}
.stat-label {
  font-size: 10px;
  font-weight: 500;
  color: rgb(113, 113, 122);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.stat-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.tbl-header {
  background: rgba(28, 31, 39, 0.95);
}
.tbl-th {
  padding: 6px 8px;
  font-size: 10px;
  font-weight: 600;
  color: rgb(161, 161, 170);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.tbl-td {
  padding: 5px 8px;
  font-size: 11px;
  white-space: nowrap;
}
</style>
