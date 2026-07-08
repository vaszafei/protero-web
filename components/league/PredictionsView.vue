<template>
  <!-- ========== BASKETBALL PREDICTIONS ========== -->
  <div v-if="isBball" class="space-y-2">
    <!-- Header -->
    <div class="pred-card rounded-lg">
      <div class="p-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-zinc-100">Upcoming Games</h3>
          <span class="text-[11px] font-semibold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">{{ bballMatches.length }} games</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingPredictions" class="pred-card rounded-lg p-8 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto animate-spin text-zinc-600 mb-2" />
      <p class="text-xs text-zinc-500">Loading...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="bballMatches.length === 0" class="pred-card rounded-lg p-8 text-center">
      <p class="text-xs text-zinc-500">No upcoming games found.</p>
    </div>

    <!-- Match Cards -->
    <div v-else v-for="match in bballMatches" :key="match.id" class="pred-card rounded-lg overflow-hidden">
      <div class="px-3 pt-2.5 pb-2">
        <!-- Date & Round -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] text-zinc-500 font-medium">{{ formatBballDate(match.date) }}</span>
          <div v-if="match.round" class="text-[10px] text-zinc-500 font-medium">Round {{ match.round }}</div>
        </div>

        <!-- Teams Row -->
        <div class="flex items-center justify-between mb-2">
          <!-- Home -->
          <div class="flex items-center gap-1.5 flex-1 min-w-0">
            <img v-if="match.homeTeam?.team_key" :src="getTeamLogoUrl(match.homeTeam.team_key)" class="w-7 h-7 object-contain flex-shrink-0" :alt="match.home_name" />
            <div class="min-w-0">
              <div class="text-[13px] font-bold text-zinc-100 truncate leading-tight">{{ match.home_name }}</div>
              <div class="text-[10px] text-zinc-500 leading-tight">{{ match.hStats.record }} home</div>
            </div>
          </div>
          <!-- VS / Spread -->
          <div class="flex flex-col items-center px-2 flex-shrink-0">
            <span class="text-[10px] text-zinc-500 font-medium uppercase leading-none">vs</span>
            <span v-if="match.spread !== 0" :class="['text-xs font-bold tabular-nums leading-tight', match.spread > 0 ? 'text-green-400' : 'text-red-400']">
              {{ match.spread > 0 ? '+' : '' }}{{ match.spread }}
            </span>
          </div>
          <!-- Away -->
          <div class="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
            <div class="min-w-0">
              <div class="text-[13px] font-bold text-zinc-100 truncate leading-tight">{{ match.away_name }}</div>
              <div class="text-[10px] text-zinc-500 leading-tight">{{ match.aStats.record }} away</div>
            </div>
            <img v-if="match.awayTeam?.team_key" :src="getTeamLogoUrl(match.awayTeam.team_key)" class="w-7 h-7 object-contain flex-shrink-0" :alt="match.away_name" />
          </div>
        </div>

        <!-- Odds + Projected Score — compact merged row -->
        <div class="flex items-stretch gap-1.5 mb-2">
          <!-- Odds -->
          <div v-if="match.home_odds || match.away_odds" class="flex gap-1 flex-shrink-0">
            <div class="bg-surface-light rounded px-2.5 py-1 text-center">
              <div class="text-[8px] text-zinc-500 font-medium uppercase leading-none">H</div>
              <div class="text-[11px] font-bold text-zinc-200 tabular-nums leading-tight">{{ match.home_odds || '-' }}</div>
            </div>
            <div v-if="match.draw_odds" class="bg-surface-light rounded px-2.5 py-1 text-center">
              <div class="text-[8px] text-zinc-500 font-medium uppercase leading-none">D</div>
              <div class="text-[11px] font-bold text-zinc-200 tabular-nums leading-tight">{{ match.draw_odds || '-' }}</div>
            </div>
            <div class="bg-surface-light rounded px-2.5 py-1 text-center">
              <div class="text-[8px] text-zinc-500 font-medium uppercase leading-none">A</div>
              <div class="text-[11px] font-bold text-zinc-200 tabular-nums leading-tight">{{ match.away_odds || '-' }}</div>
            </div>
          </div>
          <!-- Projected Score -->
          <div class="flex-1 bg-[rgba(8,72,168,0.08)] border border-[rgba(8,72,168,0.2)] rounded flex items-center justify-between px-2.5 py-1">
            <span class="text-base font-bold text-zinc-100 tabular-nums">{{ match.projection.home }}</span>
            <div class="flex flex-col items-center">
              <span class="text-[8px] font-semibold text-blue-400 uppercase leading-none">Proj</span>
              <span class="text-[9px] text-zinc-500 tabular-nums leading-tight">{{ match.projection.total }}</span>
            </div>
            <span class="text-base font-bold text-zinc-100 tabular-nums">{{ match.projection.away }}</span>
          </div>
        </div>

        <!-- Stat Comparison — home@home vs away@away (center-out bars) -->
        <div class="mb-2" v-if="match.homeTeam && match.awayTeam">
          <div class="flex items-center justify-between mb-0.5">
            <span class="text-[9px] text-zinc-500 font-medium">Home ({{ match.hStats.gp }}G)</span>
            <span class="text-[9px] text-zinc-500 font-medium">Away ({{ match.aStats.gp }}G)</span>
          </div>
          <!-- PPG -->
          <div class="py-0.5">
            <div class="flex items-center justify-between text-[11px] mb-0.5">
              <span class="font-semibold text-[#e8a0a0] tabular-nums w-10">{{ match.hStats.ppg }}</span>
              <span class="text-zinc-500 text-[9px] uppercase tracking-wider font-medium">PPG</span>
              <span class="font-semibold text-[#a0b8e8] tabular-nums w-10 text-right">{{ match.aStats.ppg }}</span>
            </div>
            <div class="flex items-center">
              <div class="flex-1 h-[4px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
                <div class="h-full rounded-l-full home-bar" :style="{ width: bballBarWidth(match.hStats.ppg, match.aStats.ppg) + '%' }"></div>
              </div>
              <div class="w-px h-2.5 bg-zinc-600/60 flex-shrink-0"></div>
              <div class="flex-1 h-[4px] bg-surface-light/60 rounded-r-full overflow-hidden">
                <div class="h-full rounded-r-full away-bar" :style="{ width: bballBarWidth(match.aStats.ppg, match.hStats.ppg) + '%' }"></div>
              </div>
            </div>
          </div>
          <!-- Opp PPG -->
          <div class="py-0.5">
            <div class="flex items-center justify-between text-[11px] mb-0.5">
              <span class="font-semibold text-[#e8a0a0] tabular-nums w-10">{{ match.hStats.opp_ppg }}</span>
              <span class="text-zinc-500 text-[9px] uppercase tracking-wider font-medium">OPP</span>
              <span class="font-semibold text-[#a0b8e8] tabular-nums w-10 text-right">{{ match.aStats.opp_ppg }}</span>
            </div>
            <div class="flex items-center">
              <div class="flex-1 h-[4px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
                <div class="h-full rounded-l-full home-bar" :style="{ width: bballBarWidth(match.aStats.opp_ppg, match.hStats.opp_ppg) + '%' }"></div>
              </div>
              <div class="w-px h-2.5 bg-zinc-600/60 flex-shrink-0"></div>
              <div class="flex-1 h-[4px] bg-surface-light/60 rounded-r-full overflow-hidden">
                <div class="h-full rounded-r-full away-bar" :style="{ width: bballBarWidth(match.hStats.opp_ppg, match.aStats.opp_ppg) + '%' }"></div>
              </div>
            </div>
          </div>
          <!-- Net Rating -->
          <div class="py-0.5">
            <div class="flex items-center justify-between text-[11px]">
              <span :class="['font-semibold tabular-nums w-10', match.hStats.netrtg > 0 ? 'text-green-400' : 'text-red-400']">{{ match.hStats.netrtg > 0 ? '+' : '' }}{{ match.hStats.netrtg }}</span>
              <span class="text-zinc-500 text-[9px] uppercase tracking-wider font-medium">NET</span>
              <span :class="['font-semibold tabular-nums w-10 text-right', match.aStats.netrtg > 0 ? 'text-green-400' : 'text-red-400']">{{ match.aStats.netrtg > 0 ? '+' : '' }}{{ match.aStats.netrtg }}</span>
            </div>
          </div>
          <!-- Pace -->
          <div class="py-0.5">
            <div class="flex items-center justify-between text-[11px] mb-0.5">
              <span class="font-semibold text-[#e8a0a0] tabular-nums w-10">{{ match.hStats.pace }}</span>
              <span class="text-zinc-500 text-[9px] uppercase tracking-wider font-medium">PACE</span>
              <span class="font-semibold text-[#a0b8e8] tabular-nums w-10 text-right">{{ match.aStats.pace }}</span>
            </div>
            <div class="flex items-center">
              <div class="flex-1 h-[4px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
                <div class="h-full rounded-l-full home-bar" :style="{ width: bballBarWidth(match.hStats.pace, match.aStats.pace) + '%' }"></div>
              </div>
              <div class="w-px h-2.5 bg-zinc-600/60 flex-shrink-0"></div>
              <div class="flex-1 h-[4px] bg-surface-light/60 rounded-r-full overflow-hidden">
                <div class="h-full rounded-r-full away-bar" :style="{ width: bballBarWidth(match.aStats.pace, match.hStats.pace) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form -->
        <div v-if="match.homeForm.length > 0 || match.awayForm.length > 0" class="flex items-center justify-between">
          <div class="flex items-center gap-px">
            <span v-for="(r, i) in match.homeForm" :key="'hf'+i" :class="['w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white', r === 'W' ? 'bg-green-500' : 'bg-red-500']">{{ r }}</span>
          </div>
          <span class="text-[9px] text-zinc-500 font-medium">Form</span>
          <div class="flex items-center gap-px">
            <span v-for="(r, i) in match.awayForm" :key="'af'+i" :class="['w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white', r === 'W' ? 'bg-green-500' : 'bg-red-500']">{{ r }}</span>
          </div>
        </div>

        <!-- Recent Games (collapsible) -->
        <details v-if="match.homeRecent.length > 0" class="mt-1.5 group">
          <summary class="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-zinc-300 flex items-center gap-1">
            <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 transition-transform group-open:rotate-90" />
            Recent Games
          </summary>
          <div class="mt-1.5 space-y-2">
            <!-- Home Recent -->
            <div>
              <div class="text-[9px] text-zinc-500 font-medium mb-1">{{ match.home_name }}</div>
              <div class="space-y-0.5">
                <div v-for="(g, i) in match.homeRecent" :key="'hr'+i" class="flex items-center justify-between text-[10px] bg-surface-light rounded px-2 py-1">
                  <span :class="['w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white', g.result === 'W' ? 'bg-green-500' : 'bg-red-500']">{{ g.result }}</span>
                  <span class="text-zinc-400 flex-1 text-center truncate px-1">vs {{ g.opponent }}</span>
                  <span class="text-zinc-200 font-bold tabular-nums">{{ g.pf }}-{{ g.pa }}</span>
                </div>
              </div>
            </div>
            <!-- Away Recent -->
            <div>
              <div class="text-[9px] text-zinc-500 font-medium mb-1">{{ match.away_name }}</div>
              <div class="space-y-0.5">
                <div v-for="(g, i) in match.awayRecent" :key="'ar'+i" class="flex items-center justify-between text-[10px] bg-surface-light rounded px-2 py-1">
                  <span :class="['w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white', g.result === 'W' ? 'bg-green-500' : 'bg-red-500']">{{ g.result }}</span>
                  <span class="text-zinc-400 flex-1 text-center truncate px-1">vs {{ g.opponent }}</span>
                  <span class="text-zinc-200 font-bold tabular-nums">{{ g.pf }}-{{ g.pa }}</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="pred-card rounded-lg p-3 border-amber-500/20" style="background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.15);">
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p class="text-[10px] text-amber-300/80 leading-relaxed">Projections based on season averages (home/away splits, pace, efficiency). No ML predictions available yet for basketball.</p>
      </div>
    </div>
  </div>

  <!-- ========== FOOTBALL PREDICTIONS (original) ========== -->
  <Card v-else padding="3">
    <!-- Header -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-bold text-zinc-100">{{ isBball ? 'Gameday' : 'Round ' + nextRound }} {{ isBball ? '' : 'Match ' }}Analysis</h2>
        <div class="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-1 rounded-full">
          <span class="font-bold">{{ enrichedPredictions.length }}</span> matches
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loadingPredictions" class="text-center py-12">
      <div class="text-zinc-500 mb-4">
        <UIcon name="i-heroicons-arrow-path" class="w-16 h-16 mx-auto animate-spin" />
      </div>
      <p class="text-zinc-500">Loading predictions...</p>
    </div>

    <!-- No Matches State -->
    <div v-else-if="enrichedPredictions.length === 0" class="text-center py-12">
      <div class="text-zinc-500 mb-4">
        <UIcon name="i-heroicons-check-circle" class="w-16 h-16 mx-auto" />
      </div>
      <p class="text-zinc-500">All rounds have been played. No predictions available.</p>
    </div>

    <!-- SECTION 2: AI MATCH PREDICTIONS -->
    <div v-else class="space-y-4">
      <!-- Match Cards -->
      <div
        v-for="match in enrichedPredictions"
        :key="match.id"
        class="bg-surface rounded-lg border border-edge hover:border-primary-500/50 hover:shadow-sm transition-all overflow-hidden"
      >
        <!-- Main Content - Ultra Compact Layout -->
        <div class="p-3">
          <!-- Match Info Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-zinc-100">{{ match.home_name }}</span>
              <span class="text-sm text-zinc-500">vs</span>
              <span class="text-base font-bold text-zinc-100">{{ match.away_name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                {{ match.expectedGoals }}{{ isBball ? 'pts' : 'g' }}
              </div>
            </div>
          </div>
          
          <!-- Stats and Trend Charts Row -->
          <div class="flex flex-col lg:flex-row gap-3 mb-3">
            <!-- Combined Form & Stats -->
            <div class="lg:flex-[3]">
              <div class="bg-surface-light rounded-lg p-2 border border-edge">
                <!-- Form Row -->
                <div class="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-edge">
                  <!-- Home Form -->
                  <div class="flex items-center gap-2">
                    <div class="flex items-center gap-0.5">
                      <span 
                        v-for="(result, i) in match.homeRecentForm" 
                        :key="i"
                        :class="[
                          'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white',
                          result.result === 'W' ? 'bg-green-500/200' : result.result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                        ]"
                      >
                        {{ result.result }}
                      </span>
                    </div>
                    <span class="text-xs font-bold text-green-400">{{ match.homeFormPoints }}pts</span>
                  </div>
                  
                  <!-- Center Label -->
                  <span class="text-xs font-semibold text-zinc-400">Form</span>
                  
                  <!-- Away Form -->
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-green-400">{{ match.awayFormPoints }}pts</span>
                    <div class="flex items-center gap-0.5">
                      <span 
                        v-for="(result, i) in match.awayRecentForm" 
                        :key="i"
                        :class="[
                          'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white',
                          result.result === 'W' ? 'bg-green-500/200' : result.result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                        ]"
                      >
                        {{ result.result }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Stats in Horizontal Bars (Home team HOME stats vs Away team AWAY stats) -->
                <div class="space-y-1.5">
                  <!-- Expected Goals/Points -->
                  <div>
                    <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                      <span class="font-bold">{{ match.homeStats.avgGoalsFor || '0.0' }}</span>
                      <span class="font-medium">Expected {{ isBball ? 'points' : 'goals' }}</span>
                      <span class="font-bold">{{ match.awayStats.avgGoalsFor || '0.0' }}</span>
                    </div>
                    <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                      <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsFor, match.awayStats.avgGoalsFor, 'left') }"></div>
                      <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsFor, match.awayStats.avgGoalsFor, 'right') }"></div>
                    </div>
                  </div>
                  
                  <!-- Goals/Points Against -->
                  <div>
                    <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                      <span class="font-bold">{{ match.homeStats.avgGoalsAgainst || '0.0' }}</span>
                      <span class="font-medium">Expected {{ isBball ? 'points' : 'goals' }} against</span>
                      <span class="font-bold">{{ match.awayStats.avgGoalsAgainst || '0.0' }}</span>
                    </div>
                    <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                      <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsAgainst, match.awayStats.avgGoalsAgainst, 'left') }"></div>
                      <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsAgainst, match.awayStats.avgGoalsAgainst, 'right') }"></div>
                    </div>
                  </div>
                  
                  <!-- Football-only stats -->
                  <template v-if="isFootball">
                    <!-- Possession -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.possession || '0' }}%</span>
                        <span class="font-medium">Ball possession</span>
                        <span class="font-bold">{{ match.awayStats.possession || '0' }}%</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.possession, match.awayStats.possession, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.possession, match.awayStats.possession, 'right') }"></div>
                      </div>
                    </div>
                    
                    <!-- Shots -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.shots || '0' }}</span>
                        <span class="font-medium">Total shots</span>
                        <span class="font-bold">{{ match.awayStats.shots || '0' }}</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.shots, match.awayStats.shots, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.shots, match.awayStats.shots, 'right') }"></div>
                      </div>
                    </div>
                    
                    <!-- Shots Against -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.avgShotsAgainst || '0' }}</span>
                        <span class="font-medium">Total shots against</span>
                        <span class="font-bold">{{ match.awayStats.avgShotsAgainst || '0' }}</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgShotsAgainst, match.awayStats.avgShotsAgainst, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgShotsAgainst, match.awayStats.avgShotsAgainst, 'right') }"></div>
                      </div>
                    </div>
                    
                    <!-- Corners -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.corners || '0' }}</span>
                        <span class="font-medium">Corner kicks</span>
                        <span class="font-bold">{{ match.awayStats.corners || '0' }}</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.corners, match.awayStats.corners, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.corners, match.awayStats.corners, 'right') }"></div>
                      </div>
                    </div>
                    
                    <!-- Corners Against -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.avgCornersAgainst || '0' }}</span>
                        <span class="font-medium">Corner kicks against</span>
                        <span class="font-bold">{{ match.awayStats.avgCornersAgainst || '0' }}</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgCornersAgainst, match.awayStats.avgCornersAgainst, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgCornersAgainst, match.awayStats.avgCornersAgainst, 'right') }"></div>
                      </div>
                    </div>
                    
                    <!-- Yellow Cards -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.yellowCards || '0' }}</span>
                        <span class="font-medium">Yellow cards</span>
                        <span class="font-bold">{{ match.awayStats.yellowCards || '0' }}</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.yellowCards, match.awayStats.yellowCards, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.yellowCards, match.awayStats.yellowCards, 'right') }"></div>
                      </div>
                    </div>
                    
                    <!-- Yellow Cards Against -->
                    <div>
                      <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span class="font-bold">{{ match.homeStats.avgCardsAgainst || '0' }}</span>
                        <span class="font-medium">Yellow cards against</span>
                        <span class="font-bold">{{ match.awayStats.avgCardsAgainst || '0' }}</span>
                      </div>
                      <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgCardsAgainst, match.awayStats.avgCardsAgainst, 'left') }"></div>
                        <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgCardsAgainst, match.awayStats.avgCardsAgainst, 'right') }"></div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Right Column: Trend Charts + Predictions -->
            <div class="lg:flex-[7] space-y-3">
              <!-- Trend Charts Component -->
              <div>
                <TrendChartsSimple
                  :homeName="match.home_name"
                  :awayName="match.away_name"
                  :games="games"
                />
              </div>

              <!-- Statistical Analysis & Match Insights Card -->
              <div class="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg p-3 border border-indigo-500/20">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-indigo-400" />
                    <span class="text-xs font-bold text-indigo-300">Statistical Predictions</span>
                  </div>
                  <div class="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                    {{ generateMatchAnalysis(match).confidence }}% confidence
                  </div>
                </div>
                
                <div :class="isFootball ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-2 gap-2'">
                  <!-- Expected Goals/Points -->
                  <div class="bg-surface rounded-lg p-1.5 border border-green-500/30">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="text-[11px] font-bold text-green-400 uppercase">Expected {{ isBball ? 'Points' : 'Goals' }}</span>
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-green-400">{{ generateMatchAnalysis(match).homeExpectedGoals }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-green-400">{{ generateMatchAnalysis(match).awayExpectedGoals }}</span>
                      </div>
                      <div class="pt-0.5 border-t border-green-500/20">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                          <span class="text-sm font-bold text-green-400">{{ generateMatchAnalysis(match).totalExpectedGoals }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Expected Shots (football only) -->
                  <div v-if="isFootball" class="bg-surface rounded-lg p-1.5 border border-orange-500/20">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="text-[11px] font-bold text-orange-400 uppercase">Expected Shots</span>
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-orange-400">{{ generateMatchAnalysis(match).homeExpectedShots }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-orange-400">{{ generateMatchAnalysis(match).awayExpectedShots }}</span>
                      </div>
                      <div class="pt-0.5 border-t border-orange-500/20">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                          <span class="text-sm font-bold text-orange-400">{{ generateMatchAnalysis(match).expectedShots }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Expected Corners (football only) -->
                  <div v-if="isFootball" class="bg-surface rounded-lg p-1.5 border border-cyan-500/20">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="text-[11px] font-bold text-cyan-400 uppercase">Expected Corners</span>
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-cyan-400">{{ generateMatchAnalysis(match).homeExpectedCorners }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-cyan-400">{{ generateMatchAnalysis(match).awayExpectedCorners }}</span>
                      </div>
                      <div class="pt-0.5 border-t border-cyan-500/20">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                          <span class="text-sm font-bold text-cyan-400">{{ generateMatchAnalysis(match).expectedCorners }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Expected Cards (football only) -->
                  <div v-if="isFootball" class="bg-surface rounded-lg p-1.5 border border-yellow-500/30">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="text-[11px] font-bold text-yellow-400 uppercase">Expected Cards</span>
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-yellow-400">{{ generateMatchAnalysis(match).homeExpectedCards }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                        <span class="text-sm font-bold text-yellow-400">{{ generateMatchAnalysis(match).awayExpectedCards }}</span>
                      </div>
                      <div class="pt-0.5 border-t border-yellow-500/20">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                          <span class="text-sm font-bold text-yellow-400">{{ generateMatchAnalysis(match).expectedCards }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Formula Explanation -->
                <div class="mt-2 bg-surface/50 rounded p-1.5 border border-indigo-500/20">
                  <p class="text-[11px] text-zinc-400 leading-relaxed">
                    <span class="font-bold">Methodology:</span> Weighted averages considering recent form (last 5 games), attack vs defense strength{{ isFootball ? ', possession influence,' : ',' }} and trend momentum. Form weights: Home {{ generateMatchAnalysis(match).formWeights.home }}× | Away {{ generateMatchAnalysis(match).formWeights.away }}×
                  </p>
                </div>
              </div>

              <!-- AI Predictions Component -->
              <div>
                <!-- Show message if no prediction -->
                <div v-if="!match.prediction" class="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20 p-4 flex items-center justify-center">
                  <div class="text-center">
                    <UIcon name="i-heroicons-information-circle" class="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p class="text-sm font-semibold text-zinc-400">No prediction yet</p>
                  </div>
                </div>
                <!-- Show predictions if available -->
                <AIPredictions
                  v-else
                    :confidence="match.prediction?.confidence || 50"
                    :predictedOutcome="getPredictedOutcome(match)"
                    :outcomeProbability="getOutcomeProbability(match)"
                    :expectedScore="match.prediction?.outcome || match.expectedGoals"
                    :over15Probability="match.prediction?.markets?.over15 || 0"
                    :over25Probability="match.prediction?.over25Probability || match.prediction?.markets?.over25 || 0"
                    :over35Probability="match.prediction?.markets?.over35 || 0"
                    :bttsProbability="match.prediction?.bttsProbability || match.prediction?.markets?.btts || 0"
                    :cornersOver85="match.prediction?.markets?.cornersOver85 || 0"
                    :cornersOver105="match.prediction?.markets?.cornersOver105 || 0"
                    :cardsOver35="match.prediction?.markets?.cardsOver35 || 0"
                    :cardsOver45="match.prediction?.markets?.cardsOver45 || 0"
                    :shotsRange="getShotsPrediction(match.prediction)"
                    :sport="sport"
                  />
              </div>
            </div>
          </div>
        
          <!-- Head to Head (if available) -->
          <div v-if="match.h2h && match.h2h.length > 0" class="mt-4 px-3">
            <details class="group">
              <summary class="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-zinc-100 flex items-center gap-1">
                <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 transition-transform group-open:rotate-90" />
                Head to Head ({{ match.h2h.length }} matches)
                <span v-if="match.h2hSummary" class="ml-2 text-zinc-500 font-normal">
                  {{ match.home_name }}: {{ match.h2hSummary.homeTeamWins }}W • 
                  {{ match.h2hSummary.draws }}D • 
                  {{ match.away_name }}: {{ match.h2hSummary.awayTeamWins }}W
                </span>
              </summary>
              <!-- H2H Summary Bar -->
              <div v-if="match.h2hSummary" class="mt-2 mb-2">
                <div class="flex h-2 rounded-full overflow-hidden bg-edge">
                  <div 
                    class="bg-green-500/200" 
                    :style="{ width: `${(match.h2hSummary.homeTeamWins / match.h2hSummary.totalMatches) * 100}%` }"
                    :title="`${match.home_name} wins: ${match.h2hSummary.homeTeamWins}`"
                  ></div>
                  <div 
                    class="bg-yellow-400" 
                    :style="{ width: `${(match.h2hSummary.draws / match.h2hSummary.totalMatches) * 100}%` }"
                    :title="`Draws: ${match.h2hSummary.draws}`"
                  ></div>
                  <div 
                    class="bg-red-500/200" 
                    :style="{ width: `${(match.h2hSummary.awayTeamWins / match.h2hSummary.totalMatches) * 100}%` }"
                    :title="`${match.away_name} wins: ${match.h2hSummary.awayTeamWins}`"
                  ></div>
                </div>
                <div class="flex justify-between text-[11px] text-zinc-500 mt-1">
                  <span>Avg {{ match.h2hSummary.avgGoalsPerMatch }} {{ isBball ? 'pts' : 'goals' }}/match</span>
                  <span>Total {{ match.h2hSummary.totalGoals }} {{ isBball ? 'pts' : 'goals' }}</span>
                </div>
              </div>
              <!-- Match List -->
              <div class="space-y-1">
                <div 
                  v-for="(game, idx) in match.h2h" 
                  :key="idx"
                  class="flex items-center justify-between text-xs bg-surface-light rounded px-3 py-2 border border-edge/50"
                >
                  <span class="text-zinc-500 w-16">{{ game.season }}</span>
                  <span class="font-medium text-zinc-200 flex-1 text-center">
                    <span :class="game.homeTeam === match.home_name ? 'font-bold' : ''">{{ game.homeTeam }}</span>
                    <span class="mx-2 px-2 py-0.5 bg-edge rounded">{{ game.homeGoals }}-{{ game.awayGoals }}</span>
                    <span :class="game.awayTeam === match.home_name ? 'font-bold' : ''">{{ game.awayTeam }}</span>
                  </span>
                  <span 
                    class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    :class="game.result === 'W' ? 'bg-green-500/200' : game.result === 'L' ? 'bg-red-500/200' : 'bg-yellow-500'"
                    :title="game.result === 'W' ? `${match.home_name} won` : game.result === 'L' ? `${match.away_name} won` : 'Draw'"
                  >
                    {{ game.result }}
                  </span>
                </div>
              </div>
            </details>
          </div>
        </div>
        <!-- End of Main Content -->
      </div>
      <!-- End of match v-for card -->

      <!-- Disclaimer -->
      <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-6">
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div class="text-xs text-amber-300/80">
            <p class="font-semibold mb-1">Disclaimer</p>
            <p>These predictions are based on statistical analysis. Past performance does not guarantee future results. Gamble responsibly.</p>
          </div>
        </div>
      </div>
      
      <!-- SECTION 3: TOP FORM TEAMS -->
      <div v-if="topFormTeams && topFormTeams.length > 0" class="mt-8">
        <div class="bg-surface rounded-xl border-2 border-amber-500/30 p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <UIcon name="i-heroicons-star" class="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-zinc-100">Top Form Teams</h3>
              <div class="flex items-center gap-2 mt-1">
                <span class="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-1 rounded-full">Last 5 Games</span>
                <span class="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full">{{ topFormTeams.length }} teams</span>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div 
              v-for="(team, idx) in topFormTeams.slice(0, 6)" 
              :key="idx"
              class="bg-surface-light rounded-lg p-3 hover:bg-surface-light transition-colors border border-edge"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {{ idx + 1 }}
                  </div>
                  <span class="font-bold text-zinc-100 text-sm">{{ team.name }}</span>
                </div>
                <div class="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                  {{ team.formScore }}pts
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span 
                  v-for="(result, i) in team.recentForm" 
                  :key="i"
                  :class="[
                    'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white',
                    result === 'W' ? 'bg-green-500/200' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                  ]"
                >
                  {{ result }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import Card from '~/components/ui/Card.vue'

const props = defineProps({
  nextRound: {
    type: Number,
    default: 0
  },
  roundMatches: {
    type: Array,
    default: () => []
  },
  teamStats: {
    type: Object,
    default: () => ({})
  },
  standings: {
    type: Array,
    default: () => []
  },
  games: {
    type: Array,
    default: () => []
  },
  leagueKey: {
    type: String,
    required: true
  },
  season: {
    type: [String, Number],
    default: 2025
  },
  sport: {
    type: String,
    default: 'football'
  }
})

const emit = defineEmits(['predictions-updated'])

// Sport helpers
const isFootball = computed(() => props.sport === 'football')
const isBball = computed(() => props.sport === 'basketball')
const goalLabel = computed(() => isBball.value ? 'points' : 'goals')

// Basketball: lookup team from liveStandings by name
function getBballTeam(name) {
  if (!props.standings || !name) return null
  return props.standings.find(t => t.name === name) || null
}

import { getTeamLogoUrl } from '~/utils/teamLogo'

// Basketball: project score from team stats
function projectBballScore(homeTeam, awayTeam) {
  if (!homeTeam || !awayTeam) return { home: 0, away: 0, total: 0 }
  // Use home team's home PPG & away team's away PPG with opponent adjustments
  const homePPG = homeTeam.home_ppg || homeTeam.ppg || 0
  const awayPPG = awayTeam.away_ppg || awayTeam.ppg || 0
  const homeOpp = homeTeam.home_opp_ppg || homeTeam.opp_ppg || 0
  const awayOpp = awayTeam.away_opp_ppg || awayTeam.opp_ppg || 0
  // Projected = (team scoring + opponent allowed) / 2
  const homeProj = +((homePPG + awayOpp) / 2).toFixed(1)
  const awayProj = +((awayPPG + homeOpp) / 2).toFixed(1)
  return { home: homeProj, away: awayProj, total: +(homeProj + awayProj).toFixed(1) }
}

// Basketball enriched matches
const bballMatches = computed(() => {
  if (!isBball.value || !props.roundMatches || props.roundMatches.length === 0) return []
  return props.roundMatches.map(match => {
    const homeTeam = getBballTeam(match.home_name)
    const awayTeam = getBballTeam(match.away_name)
    const projection = projectBballScore(homeTeam, awayTeam)
    const spread = +(projection.home - projection.away).toFixed(1)
    // Home team HOME stats, Away team AWAY stats
    const hStats = {
      ppg: homeTeam?.home_ppg || homeTeam?.ppg || 0,
      opp_ppg: homeTeam?.home_opp_ppg || homeTeam?.opp_ppg || 0,
      pace: homeTeam?.home_pace || homeTeam?.pace || 0,
      netrtg: homeTeam?.home_netrtg || homeTeam?.netrtg || 0,
      record: `${homeTeam?.home_W || 0}-${homeTeam?.home_L || 0}`,
      gp: homeTeam?.home_GP || 0
    }
    const aStats = {
      ppg: awayTeam?.away_ppg || awayTeam?.ppg || 0,
      opp_ppg: awayTeam?.away_opp_ppg || awayTeam?.opp_ppg || 0,
      pace: awayTeam?.away_pace || awayTeam?.pace || 0,
      netrtg: awayTeam?.away_netrtg || awayTeam?.netrtg || 0,
      record: `${awayTeam?.away_W || 0}-${awayTeam?.away_L || 0}`,
      gp: awayTeam?.away_GP || 0
    }
    return {
      ...match,
      homeTeam,
      awayTeam,
      hStats,
      aStats,
      projection,
      spread,
      homeForm: homeTeam?.allResults?.slice(-5) || [],
      awayForm: awayTeam?.allResults?.slice(-5) || [],
      homeRecent: homeTeam?.recentGames?.slice(-3) || [],
      awayRecent: awayTeam?.recentGames?.slice(-3) || []
    }
  })
})

// Basketball stat bar helper
function bballBarWidth(val, otherVal) {
  const a = parseFloat(val) || 0
  const b = parseFloat(otherVal) || 0
  const total = a + b
  if (total === 0) return 50
  return Math.max((a / total) * 100, 12)
}

// Import child components
import TeamFormCard from './predictions/TeamFormCard.vue'
import AIPredictions from './predictions/AIPredictions.vue'
import TrendChartsSimple from './predictions/TrendChartsSimple.vue'
import DetailedStats from './predictions/DetailedStats.vue'

// Helper function to calculate bar width for comparison bars
function getBarWidth(leftValue, rightValue, side) {
  const left = parseFloat(leftValue) || 0
  const right = parseFloat(rightValue) || 0
  const total = left + right
  
  if (total === 0) return '50%'
  
  if (side === 'left') {
    return `${(left / total) * 100}%`
  } else {
    return `${(right / total) * 100}%`
  }
}

// Database predictions
const dbPredictions = ref([])
const loadingPredictions = ref(true)
const api = useApi()

// Form teams and league patterns
const topFormTeams = ref([])
const leaguePatterns = ref(null)

// Stats filter - default to 'home' for home team @ home vs away team @ away comparison
const statsFilter = ref('home')

// H2H data cache
const h2hCache = ref({})

// Fetch H2H data for a match
const fetchH2H = async (homeTeam, awayTeam) => {
  const cacheKey = `${homeTeam}-${awayTeam}`
  if (h2hCache.value[cacheKey]) return h2hCache.value[cacheKey]
  
  try {
    const response = await api.fetchH2H(homeTeam, awayTeam, 10)
    if (response.summary) {
      h2hCache.value[cacheKey] = { success: true, ...response }
      return h2hCache.value[cacheKey]
    }
  } catch (error) {
    console.log(`No H2H data for ${homeTeam} vs ${awayTeam}`)
  }
  return null
}

// Fetch predictions from database (predictions now come with roundMatches from API)
const fetchDatabasePredictions = async () => {
  if (!props.roundMatches || props.roundMatches.length === 0) {
    loadingPredictions.value = false
    return
  }

  loadingPredictions.value = true
  const predictions = []

  try {
    // Predictions are already included in props.roundMatches from the API
    // Just format them to match the expected structure
    props.roundMatches.forEach(match => {
      if (match.prediction_id) {
        predictions.push({
          success: true,
          game: { id: match.id },
          prediction: match.prediction,
          confidence: match.confidence,
          model_version: match.model_version,
          over_15_prob: match.over_15_prob,
          over_25_prob: match.over_25_prob,
          over_35_prob: match.over_35_prob,
          over_85_corners_prob: match.over_85_corners_prob,
          over_95_corners_prob: match.over_95_corners_prob,
          over_105_corners_prob: match.over_105_corners_prob,
          odds_over_25: match.odds_over_25,
          odds_under_25: match.odds_under_25,
          expected_value: match.expected_value
        })
      }
    })
    
    // Fetch H2H in parallel
    const h2hPromises = props.roundMatches.map(match => 
      fetchH2H(match.home_name, match.away_name)
    )
    await Promise.all(h2hPromises)
    
  } catch (error) {
    console.error('Error fetching predictions:', error)
  } finally {
    dbPredictions.value = predictions
    loadingPredictions.value = false
  }
}

// Watch for changes in round matches
watch(() => props.roundMatches, () => {
  fetchDatabasePredictions()
}, { immediate: true })

onMounted(() => {
  fetchDatabasePredictions()
})

// Enriched predictions with team stats and recent form
// High confidence predictions count
const highConfidencePredictions = computed(() => {
  return enrichedPredictions.value.filter(match => 
    match.prediction?.confidence && match.prediction.confidence >= 70
  ).length
})

const enrichedPredictions = computed(() => {
  if (!props.roundMatches || props.roundMatches.length === 0) return []

  return props.roundMatches
    .map(match => {
      const homeTeam = props.teamStats[match.home_name]
      const awayTeam = props.teamStats[match.away_name]
      
      // Find database prediction for this match
      const dbPred = dbPredictions.value.find(p => p.game?.id === match.id)
      
      // Get recent form (last 5 games with details)
      const homeRecentForm = homeTeam?.formDetails?.slice(-5).reverse() || []
      const awayRecentForm = awayTeam?.formDetails?.slice(-5).reverse() || []
    
    // Calculate form points (last 5 games)
    const calcFormPoints = (form) => {
      if (!form || form.length === 0) return 0
      return form.reduce((sum, g) => {
        if (g.result === 'W') return sum + 3
        if (g.result === 'D') return sum + 1
        return sum
      }, 0)
    }
    
    // Calculate average goals
    const calcAvgGoals = (matches, key) => {
      if (!matches || matches.length === 0) return '0.0'
      const sum = matches.reduce((acc, m) => acc + (m[key] || 0), 0)
      return (sum / matches.length).toFixed(1)
    }
    
    // Calculate team stats from their matches based on filter
    // Smart logic: home team uses homeMatches, away team uses awayMatches for better prediction
    const getFilteredMatches = (team, isHomeTeam) => {
      if (!team) return []
      
      // Smart filter: for the actual match context
      // Home team playing at home -> use their home matches
      // Away team playing away -> use their away matches
      if (statsFilter.value === 'overall') {
        return team.matches
      } else if (statsFilter.value === 'home') {
        // Show home context: home team's home matches vs away team's away matches
        return isHomeTeam ? team.homeMatches : team.awayMatches
      } else if (statsFilter.value === 'away') {
        // Show away context: home team's away matches vs away team's home matches
        return isHomeTeam ? team.awayMatches : team.homeMatches
      }
      return team.matches
    }
    
    const homeFilteredMatches = getFilteredMatches(homeTeam, true)
    const awayFilteredMatches = getFilteredMatches(awayTeam, false)
    
    // Also get overall stats (all matches regardless of location)
    const homeOverallMatches = homeTeam?.matches || []
    const awayOverallMatches = awayTeam?.matches || []
    
    // Calculate stats from filtered matches including all stats from game data
    const calcFilteredStats = (matches, teamName, isHomeInMatch) => {
      if (!matches || matches.length === 0) {
        return {
          possession: '-',
          shots: '-',
          corners: '-',
          yellowCards: '-',
          avgShotsAgainst: '-',
          avgCornersAgainst: '-',
          avgCardsAgainst: '-',
          over25Pct: 0,
          bttsPct: 0,
          avgGoalsFor: '0.0',
          avgGoalsAgainst: '0.0'
        }
      }
      
      const playedMatches = matches.filter(m => m.goalsFor !== null && m.goalsAgainst !== null)
      if (playedMatches.length === 0) {
        return {
          possession: '-',
          shots: '-',
          corners: '-',
          yellowCards: '-',
          avgShotsAgainst: '-',
          avgCornersAgainst: '-',
          avgCardsAgainst: '-',
          over25Pct: 0,
          bttsPct: 0,
          avgGoalsFor: '0.0',
          avgGoalsAgainst: '0.0'
        }
      }
      
      // Find corresponding game data to extract detailed stats
      const relevantGames = []
      playedMatches.forEach(m => {
        const game = props.games?.find(g => 
          g.round === m.round && 
          ((g.home_name === teamName && g.away_name === m.opponent) ||
           (g.away_name === teamName && g.home_name === m.opponent))
        )
        if (game) relevantGames.push(game)
      })
      
      // Calculate stats from game data
      let totalPossession = 0, possessionCount = 0
      let totalShots = 0, totalCorners = 0, totalYellowCards = 0
      let totalShotsAgainst = 0, totalCornersAgainst = 0, totalYellowCardsAgainst = 0
      
      relevantGames.forEach(game => {
        const isHomeInGame = game.home_name === teamName
        
        if (isHomeInGame) {
          if (game.home_possession_pct) {
            totalPossession += game.home_possession_pct
            possessionCount++
          }
          if (game.home_shots) totalShots += game.home_shots
          if (game.home_corners) totalCorners += game.home_corners
          if (game.home_yellow_cards) totalYellowCards += game.home_yellow_cards
          // Against stats - opponent's stats
          if (game.away_shots) totalShotsAgainst += game.away_shots
          if (game.away_corners) totalCornersAgainst += game.away_corners
          if (game.away_yellow_cards) totalYellowCardsAgainst += game.away_yellow_cards
        } else {
          if (game.away_possession_pct) {
            totalPossession += game.away_possession_pct
            possessionCount++
          }
          if (game.away_shots) totalShots += game.away_shots
          if (game.away_corners) totalCorners += game.away_corners
          if (game.away_yellow_cards) totalYellowCards += game.away_yellow_cards
          // Against stats - opponent's stats
          if (game.home_shots) totalShotsAgainst += game.home_shots
          if (game.home_corners) totalCornersAgainst += game.home_corners
          if (game.home_yellow_cards) totalYellowCardsAgainst += game.home_yellow_cards
        }
      })
      
      const over25Count = playedMatches.filter(m => m.totalGoals > 2.5).length
      const bttsCount = playedMatches.filter(m => m.goalsFor > 0 && m.goalsAgainst > 0).length
      
      return {
        possession: possessionCount > 0 ? (totalPossession / possessionCount).toFixed(1) : '-',
        shots: relevantGames.length > 0 ? (totalShots / relevantGames.length).toFixed(1) : '-',
        corners: relevantGames.length > 0 ? (totalCorners / relevantGames.length).toFixed(1) : '-',
        yellowCards: relevantGames.length > 0 ? (totalYellowCards / relevantGames.length).toFixed(1) : '-',
        avgShotsAgainst: relevantGames.length > 0 ? (totalShotsAgainst / relevantGames.length).toFixed(1) : '-',
        avgCornersAgainst: relevantGames.length > 0 ? (totalCornersAgainst / relevantGames.length).toFixed(1) : '-',
        avgCardsAgainst: relevantGames.length > 0 ? (totalYellowCardsAgainst / relevantGames.length).toFixed(1) : '-',
        over25Pct: Math.round((over25Count / playedMatches.length) * 100),
        bttsPct: Math.round((bttsCount / playedMatches.length) * 100),
        avgGoalsFor: calcAvgGoals(playedMatches, 'goalsFor'),
        avgGoalsAgainst: calcAvgGoals(playedMatches, 'goalsAgainst')
      }
    }
    
    const homeStats = {
      ...calcFilteredStats(homeFilteredMatches, match.home_name, true),
      formPoints: calcFormPoints(homeRecentForm)
    }
    
    const awayStats = {
      ...calcFilteredStats(awayFilteredMatches, match.away_name, false),
      formPoints: calcFormPoints(awayRecentForm)
    }
    
    // Calculate overall stats (all matches)
    const homeStatsOverall = {
      ...calcFilteredStats(homeOverallMatches, match.home_name, true),
      formPoints: calcFormPoints(homeRecentForm)
    }
    
    const awayStatsOverall = {
      ...calcFilteredStats(awayOverallMatches, match.away_name, false),
      formPoints: calcFormPoints(awayRecentForm)
    }
    
    // Expected goals calculation - use predicted score from DB if available
    let expectedGoals = (
      (parseFloat(homeStats.avgGoalsFor) || 0) + 
      (parseFloat(awayStats.avgGoalsFor) || 0)
    ).toFixed(1)
    
    // Get predicted score from database prediction
    let predictedScore = null
    let predictedTotalGoals = null
    if (dbPred?.prediction?.outcome) {
      const scoreParts = dbPred.prediction.outcome.split('-').map(Number)
      if (scoreParts.length === 2 && !isNaN(scoreParts[0]) && !isNaN(scoreParts[1])) {
        predictedScore = dbPred.prediction.outcome
        predictedTotalGoals = scoreParts[0] + scoreParts[1]
      }
    }
    
    // Find head to head matches
    const h2h = findH2H(match.home_name, match.away_name)
    const h2hSummary = getH2HSummary(match.home_name, match.away_name)
    
    return {
      ...match,
      homeRecentForm,
      awayRecentForm,
      homeStats,
      awayStats,
      homeStatsOverall,
      awayStatsOverall,
      homeFormPoints: homeStats.formPoints,
      awayFormPoints: awayStats.formPoints,
      expectedGoals,
      predictedScore,
      predictedTotalGoals,
      h2h,
      h2hSummary,
      prediction: dbPred?.prediction || null
    }
  })
})

// Find head-to-head matches between two teams
function findH2H(home, away) {
  const cacheKey = `${home}-${away}`
  const data = h2hCache.value[cacheKey]
  if (!data || !data.matches) return []
  return data.matches
}

// Get H2H summary stats
function getH2HSummary(home, away) {
  const cacheKey = `${home}-${away}`
  const data = h2hCache.value[cacheKey]
  if (!data || !data.summary) return null
  return data.summary
}

// Helper to get confidence color
function getConfidenceColor(confidence) {
  if (confidence >= 70) return 'text-green-400'
  if (confidence >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

// Helper to get confidence color background
function getConfidenceColorBg(confidence) {
  if (confidence >= 70) return 'bg-green-500/200 text-white'
  if (confidence >= 50) return 'bg-yellow-500 text-zinc-100'
  return 'bg-red-500/200 text-white'
}

// Helper to compare stats and return appropriate class
function compareClass(value1, value2) {
  if (value1 === '-' || value2 === '-') return 'text-zinc-300'
  const v1 = parseFloat(value1)
  const v2 = parseFloat(value2)
  if (isNaN(v1) || isNaN(v2)) return 'text-zinc-300'
  if (v1 > v2) return 'text-green-400'
  if (v1 < v2) return 'text-red-400'
  return 'text-zinc-300'
}

// Get percentage width for possession bars
function getPercentageWidth(value, opposingValue) {
  const v = parseFloat(value) || 0
  const total = v + (parseFloat(opposingValue) || 0)
  if (total === 0) return '50%'
  return `${(v / total) * 100}%`
}

// Get stat bar width relative to max value
function getStatBarWidth(value, opposingValue, maxValue) {
  const v = parseFloat(value) || 0
  const max = Math.max(v, parseFloat(opposingValue) || 0, maxValue)
  if (max === 0) return '0%'
  return `${(v / max) * 100}%`
}

// Get stat advantage description
function getStatAdvantage(home, away) {
  const h = parseFloat(home) || 0
  const a = parseFloat(away) || 0
  if (h === 0 && a === 0) return 'No data'
  const diff = Math.abs(h - a)
  const higher = h > a ? 'Home' : h < a ? 'Away' : 'Even'
  if (higher === 'Even') return 'Even matchup'
  const pct = ((diff / Math.max(h, a)) * 100).toFixed(0)
  return `${higher} +${pct}%`
}

// Get winner for insights
function getWinner(home, away, homeName, awayName) {
  const h = parseFloat(home) || 0
  const a = parseFloat(away) || 0
  if (h === 0 && a === 0) return 'N/A'
  if (Math.abs(h - a) < 0.1) return 'Even'
  return h > a ? homeName.split(' ')[0] : awayName.split(' ')[0]
}

// Get advantage color indicator
function getAdvantageColor(home, away) {
  const h = parseFloat(home) || 0
  const a = parseFloat(away) || 0
  if (h === 0 && a === 0) return 'bg-zinc-600'
  const diff = Math.abs(h - a)
  const pct = (diff / Math.max(h, a)) * 100
  if (pct < 5) return 'bg-yellow-400'
  if (h > a) return 'bg-green-500/200'
  return 'bg-red-500/200'
}

/**
 * SOPHISTICATED STATISTICAL PREDICTION FUNCTION
 * Uses weighted averages, form factors, and trend analysis from last 7 rounds
 * Outputs: Expected Goals, Corners, Cards, Shots with confidence intervals
 */
function generateMatchAnalysis(match) {
  if (!match || !match.homeStats || !match.awayStats) return {
    homeExpectedGoals: 0,
    awayExpectedGoals: 0,
    expectedCorners: 0,
    expectedCards: 0,
    expectedShots: 0,
    confidence: 0
  }
  
  const homeStats = match.homeStats
  const awayStats = match.awayStats
  
  // Helper to safely parse numbers
  const parseNum = (val) => parseFloat(val) || 0
  
  // Form weight calculation (recent form influences prediction)
  const maxFormPoints = 15 // 5 wins
  const homeFormWeight = 0.7 + (homeStats.formPoints / maxFormPoints) * 0.3 // 0.7 to 1.0
  const awayFormWeight = 0.7 + (awayStats.formPoints / maxFormPoints) * 0.3
  
  // === EXPECTED GOALS CALCULATION ===
  // Formula: (Team Attack Strength × Opponent Defense Weakness) × Form Weight
  const homeAttackStrength = parseNum(homeStats.avgGoalsFor)
  const homeDefenseStrength = parseNum(homeStats.avgGoalsAgainst)
  const awayAttackStrength = parseNum(awayStats.avgGoalsFor)
  const awayDefenseStrength = parseNum(awayStats.avgGoalsAgainst)
  
  // Home Expected Goals = Home attack × Away defense weakness × Home form
  const homeExpectedGoals = (homeAttackStrength * (awayDefenseStrength / (awayDefenseStrength + homeDefenseStrength || 1)) * homeFormWeight)
  
  // Away Expected Goals = Away attack × Home defense weakness × Away form  
  const awayExpectedGoals = (awayAttackStrength * (homeDefenseStrength / (homeDefenseStrength + awayDefenseStrength || 1)) * awayFormWeight)
  
  // === EXPECTED SHOTS CALCULATION ===
  // Formula: Average shots weighted by possession and form
  const homeShots = parseNum(homeStats.shots)
  const awayShots = parseNum(awayStats.shots)
  const homePossession = parseNum(homeStats.possession) / 100
  const awayPossession = parseNum(awayStats.possession) / 100
  
  // Possession influences shot volume
  const homePossessionFactor = homePossession > 0.5 ? 1.1 : 0.9
  const awayPossessionFactor = awayPossession > 0.5 ? 1.1 : 0.9
  
  const homeExpectedShots = homeShots * homeFormWeight * homePossessionFactor
  const awayExpectedShots = awayShots * awayFormWeight * awayPossessionFactor
  const expectedShots = homeExpectedShots + awayExpectedShots
  
  // === EXPECTED CORNERS CALCULATION ===
  // Formula: Average corners + attacking pressure factor
  const homeCorners = parseNum(homeStats.corners)
  const awayCorners = parseNum(awayStats.corners)
  
  // Teams with more possession/shots generate more corners
  const homeCornerPressure = (homePossession + (homeShots / 20)) / 2
  const awayCornerPressure = (awayPossession + (awayShots / 20)) / 2
  
  const homeExpectedCorners = homeCorners * (1 + homeCornerPressure * 0.3) * homeFormWeight
  const awayExpectedCorners = awayCorners * (1 + awayCornerPressure * 0.3) * awayFormWeight
  const expectedCorners = homeExpectedCorners + awayExpectedCorners
  
  // === EXPECTED CARDS CALCULATION ===
  // Formula: Base cards weighted by form (simpler, more realistic)
  const homeCards = parseNum(homeStats.yellowCards)
  const awayCards = parseNum(awayStats.yellowCards)
  
  // Cards are less influenced by form, use lighter weighting
  const homeExpectedCards = homeCards * (0.85 + homeFormWeight * 0.15)
  const awayExpectedCards = awayCards * (0.85 + awayFormWeight * 0.15)
  const expectedCards = homeExpectedCards + awayExpectedCards
  
  // === CONFIDENCE CALCULATION ===
  // Based on data availability and form consistency
  const dataCompleteness = [homeShots, awayShots, homeCorners, awayCorners, homeCards, awayCards]
    .filter(v => v > 0).length / 6
  const formConfidence = Math.min((homeStats.formPoints + awayStats.formPoints) / 20, 1)
  const confidence = Math.round((dataCompleteness * 0.6 + formConfidence * 0.4) * 100)
  
  return {
    homeExpectedGoals: homeExpectedGoals.toFixed(2),
    awayExpectedGoals: awayExpectedGoals.toFixed(2),
    totalExpectedGoals: (homeExpectedGoals + awayExpectedGoals).toFixed(2),
    expectedShots: expectedShots.toFixed(1),
    homeExpectedShots: homeExpectedShots.toFixed(1),
    awayExpectedShots: awayExpectedShots.toFixed(1),
    expectedCorners: expectedCorners.toFixed(1),
    homeExpectedCorners: homeExpectedCorners.toFixed(1),
    awayExpectedCorners: awayExpectedCorners.toFixed(1),
    expectedCards: expectedCards.toFixed(1),
    homeExpectedCards: homeExpectedCards.toFixed(1),
    awayExpectedCards: awayExpectedCards.toFixed(1),
    confidence: confidence,
    formWeights: {
      home: homeFormWeight.toFixed(2),
      away: awayFormWeight.toFixed(2)
    }
  }
}

// Get predicted outcome based on database prediction or form stats
function getPredictedOutcome(match) {
  // Use database prediction if available
  if (match.prediction) {
    const { homeWinProb, drawProb, awayWinProb } = match.prediction
    if (homeWinProb && drawProb && awayWinProb) {
      const maxProb = Math.max(homeWinProb, drawProb, awayWinProb)
      if (maxProb === homeWinProb) return `${match.home_name.split(' ')[0]} Win`
      if (maxProb === drawProb) return 'Draw'
      return `${match.away_name.split(' ')[0]} Win`
    }
    // If outcome is a score like "1-0", parse it
    if (match.prediction.outcome) {
      const [home, away] = match.prediction.outcome.split('-').map(Number)
      if (!isNaN(home) && !isNaN(away)) {
        if (home > away) return `${match.home_name.split(' ')[0]} Win`
        if (away > home) return `${match.away_name.split(' ')[0]} Win`
        return 'Draw'
      }
    }
  }
  
  // Fallback to form-based calculation
  const homeAdvantage = match.homeFormPoints + (match.homeStats.avgGoalsFor || 0) * 2
  const awayAdvantage = match.awayFormPoints + (match.awayStats.avgGoalsFor || 0) * 2
  
  const diff = homeAdvantage - awayAdvantage
  
  if (Math.abs(diff) < 2) return 'Draw'
  if (diff > 2) return `${match.home_name.split(' ')[0]} Win`
  return `${match.away_name.split(' ')[0]} Win`
}

// Get outcome probability based on prediction
function getOutcomeProbability(match) {
  if (!match.prediction) return 50
  
  const { homeWinProb, drawProb, awayWinProb, outcome } = match.prediction
  
  if (homeWinProb && drawProb && awayWinProb) {
    const maxProb = Math.max(homeWinProb, drawProb, awayWinProb)
    return maxProb
  }
  
  // If outcome is a score like "1-0", determine which result and return that probability
  if (outcome) {
    const [home, away] = outcome.split('-').map(Number)
    if (!isNaN(home) && !isNaN(away)) {
      if (home > away) return homeWinProb || 50
      if (away > home) return awayWinProb || 50
      return drawProb || 50
    }
  }
  
  return 50
}

// Get Over 2.5 prediction
function getOver25Prediction(match) {
  // Use database prediction if available
  if (match.prediction?.over25Probability) {
    const prob = match.prediction.over25Probability
    if (prob >= 55) return 'YES'
    if (prob < 35) return 'NO'
    return 'MAYBE'
  }
  
  // Fallback to stats-based calculation
  const expectedGoals = parseFloat(match.expectedGoals) || 0
  const avgO25 = (match.homeStats.over25Pct + match.awayStats.over25Pct) / 2
  
  if (expectedGoals >= 3.0 || avgO25 >= 60) return 'YES'
  if (expectedGoals < 2.0 || avgO25 < 30) return 'NO'
  return 'MAYBE'
}

// Get BTTS prediction
function getBttsPrediction(match) {
  // Use database prediction if available
  if (match.prediction?.bttsProbability) {
    const prob = match.prediction.bttsProbability
    if (prob >= 55) return 'YES'
    if (prob < 35) return 'NO'
    return 'MAYBE'
  }
  
  // Fallback to stats-based calculation
  const avgBtts = (match.homeStats.bttsPct + match.awayStats.bttsPct) / 2
  const bothScore = (match.homeStats.avgGoalsFor > 0.8) && (match.awayStats.avgGoalsFor > 0.8)
  
  if (avgBtts >= 55 && bothScore) return 'YES'
  if (avgBtts < 30 || !bothScore) return 'NO'
  return 'MAYBE'
}

// Get Corners prediction from model
function getCornersPrediction(prediction) {
  if (!prediction || !prediction.markets) return 'N/A'
  const { cornersOver105, cornersOver85 } = prediction.markets
  if (!cornersOver105 || !cornersOver85) return 'N/A'
  if (cornersOver105 >= 55) return `O10.5 (${cornersOver105}%)`
  if (cornersOver85 >= 55) return `O8.5 (${cornersOver85}%)`
  return `U8.5 (${100 - cornersOver85}%)`
}

// Get Cards prediction from model
function getCardsPrediction(prediction) {
  if (!prediction || !prediction.markets) return 'N/A'
  const { cardsOver45, cardsOver35 } = prediction.markets
  if (!cardsOver45 || !cardsOver35) return 'N/A'
  if (cardsOver45 >= 55) return `O4.5 (${cardsOver45}%)`
  if (cardsOver35 >= 55) return `O3.5 (${cardsOver35}%)`
  return `U3.5 (${100 - cardsOver35}%)`
}

// Get Shots prediction from model
function getShotsPrediction(prediction) {
  if (!prediction || !prediction.shots || !prediction.shots.advantage) return 'N/A'
  if (prediction.shots.advantage === 'even') return 'Even'
  const team = prediction.shots.advantage === 'home' ? 'Home' : 'Away'
  return `${team} (${prediction.shots.probability}%)`
}

// Generate match insights
function getMatchInsights(match) {
  // Use the sophisticated analysis function
  return generateMatchAnalysis(match)
}

// Count v2.0 predictions
const v2PredictionsCount = computed(() => {
  return enrichedPredictions.value.filter(p => p.model_version === 'v2.0').length
})

// Emit predictions when they change (for parlay generator)
watch(enrichedPredictions, (newPredictions) => {
  const predictionsWithData = newPredictions
    .filter(p => p.prediction)
    .map(p => ({
      home: p.home_name,
      away: p.away_name,
      prediction: p.prediction,
      homeWinProb: p.prediction.homeWinProb,
      drawProb: p.prediction.drawProb,
      awayWinProb: p.prediction.awayWinProb,
      confidence: p.prediction.confidence
    }))
  emit('predictions-updated', predictionsWithData)
}, { immediate: true })

// Basketball date formatter
function formatBballDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { timeZone: 'Europe/Athens', weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>

<style scoped>
.pred-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.home-bar {
  background: linear-gradient(90deg, rgba(248, 40, 40, 0.35) 0%, rgba(248, 40, 40, 0.18) 100%);
  transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.away-bar {
  background: linear-gradient(270deg, rgba(8, 72, 168, 0.35) 0%, rgba(8, 72, 168, 0.18) 100%);
  transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
</style>
