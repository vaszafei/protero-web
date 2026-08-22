<template>
  <div class="space-y-2">
    <!-- Header -->
    <div class="pred-card rounded-lg">
      <div class="p-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-zinc-100">Upcoming Games</h3>
          <span class="text-[11px] font-semibold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">{{ matches.length }} games</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="pred-card rounded-lg p-8 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto animate-spin text-zinc-600 mb-2" />
      <p class="text-xs text-zinc-500">Loading...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="matches.length === 0" class="pred-card rounded-lg p-8 text-center">
      <p class="text-xs text-zinc-500">No upcoming games found.</p>
    </div>

    <!-- Match Cards -->
    <div v-else v-for="match in matches" :key="match.id" class="pred-card rounded-lg overflow-hidden">
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
</template>

<script setup>
import { getTeamLogoUrl } from '~/utils/teamLogo'

const props = defineProps({
  matches: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

// Basketball date formatter
function formatBballDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { timeZone: 'Europe/Athens', weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false })
}

// Center-out bar width for a home/away comparison
function bballBarWidth(val, otherVal) {
  const a = parseFloat(val) || 0
  const b = parseFloat(otherVal) || 0
  const total = a + b
  if (total === 0) return 50
  return Math.max((a / total) * 100, 12)
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
