<template>
  <Card padding="6">
    <!-- Filter Buttons -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div class="flex gap-1.5 sm:gap-2">
        <button 
          @click="$emit('update:filter', 'overall')"
          :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all',
            filter === 'overall' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-surface-light text-zinc-300 hover:bg-surface-hover'
          ]"
        >
          Overall
        </button>
        <button 
          @click="$emit('update:filter', 'home')"
          :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all',
            filter === 'home' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-surface-light text-zinc-300 hover:bg-surface-hover'
          ]"
        >
          Home
        </button>
        <button 
          @click="$emit('update:filter', 'away')"
          :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all',
            filter === 'away' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-surface-light text-zinc-300 hover:bg-surface-hover'
          ]"
        >
          Away
        </button>
      </div>
      
      <!-- Statistics Summary Chips -->
      <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <span class="px-2 sm:px-3 py-0.5 sm:py-1 bg-zinc-700 text-zinc-300 text-xs sm:text-sm font-medium rounded-full">
          {{ standings.length }} Teams
        </span>
        <span class="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500/20 text-blue-400 text-xs sm:text-sm font-semibold rounded-full">
          {{ totalGames }} Games
        </span>
        <span class="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-500/20 text-green-400 text-xs sm:text-sm font-semibold rounded-full">
          {{ avgGoalsPerGame }} {{ isBball ? 'Avg PPG' : 'Avg Goals' }}
        </span>
      </div>
    </div>

    <!-- Standings Table -->
    <div class="overflow-x-auto rounded-lg border border-edge shadow-sm shadow-black/20">
      <table class="min-w-full">
        <thead>
          <tr class="bg-surface-light text-zinc-200">
            <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 bg-surface-light z-10">Pos</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-12 bg-surface-light z-10">Team</th>
            <th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">GP</th>
            <th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">W</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">D</th>
            <th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">L</th>
            <th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">{{ isBball ? 'PF' : 'GF' }}</th>
            <th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">{{ isBball ? 'PA' : 'GA' }}</th>
            <th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">{{ isBball ? 'DIFF' : 'GD' }}</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-primary-600">{{ isBball ? 'W%' : 'Pts' }}</th>
            <th v-if="isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-orange-800">Win%</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-blue-800">Poss%</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-blue-800">Shots</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-blue-800">Corners</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-amber-800">YC</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-red-800">RC</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-green-800">CS%</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-purple-800">O2.5%</th>
            <th v-if="!isBball" class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-indigo-800">BTTS%</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Form</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(team, index) in standings" 
            :key="team.team_id || team.name"
            :class="[
              'border-b border-edge/50 hover:bg-primary-500/10 transition-all',
              index % 2 === 0 ? 'bg-surface' : 'bg-surface-light/50',
              getQualificationClass(index + 1)
            ]"
          >
            <td class="px-2 py-1.5 text-sm font-bold text-zinc-100 sticky left-0 bg-inherit z-10">
              <div class="flex items-center justify-center w-5 h-5 rounded-full bg-surface-light text-xs">
                {{ index + 1 }}
              </div>
            </td>
            <td class="px-3 py-1.5 text-sm font-semibold text-zinc-100 sticky left-12 bg-inherit z-10">{{ team.name }}</td>
            <td class="px-2 py-1.5 text-center text-sm text-zinc-400 font-medium">{{ team.GP }}</td>
            <td class="px-2 py-1.5 text-center">
              <span class="px-1.5 py-0.5 text-[11px] font-bold text-green-400 bg-green-500/20 rounded-full">{{ team.W }}</span>
            </td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center">
              <span class="px-1.5 py-0.5 text-[11px] font-bold text-yellow-400 bg-yellow-500/20 rounded-full">{{ team.D }}</span>
            </td>
            <td class="px-2 py-1.5 text-center">
              <span class="px-1.5 py-0.5 text-[11px] font-bold text-red-400 bg-red-500/20 rounded-full">{{ team.L }}</span>
            </td>
            <td class="px-2 py-1.5 text-center text-sm text-zinc-300 font-medium">{{ team.GF }}</td>
            <td class="px-2 py-1.5 text-center text-sm text-zinc-300 font-medium">{{ team.GA }}</td>
            <td class="px-2 py-1.5 text-center text-sm font-bold" :class="team.GD >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ team.GD > 0 ? '+' + team.GD : team.GD }}
            </td>
            <td class="px-3 py-1.5 text-center bg-primary-500/10">
              <span class="px-2 py-0.5 text-xs font-bold text-primary-400 bg-primary-500/20 rounded-full">
                {{ isBball ? team.W : team.Pts }}
              </span>
            </td>
            <td v-if="isBball" class="px-2 py-1.5 text-center">
              <span :class="[
                'px-1.5 py-0.5 text-[11px] font-bold rounded-full',
                getPercentagePillColor(team.GP > 0 ? Math.round(team.W / team.GP * 100) : 0)
              ]">{{ team.GP > 0 ? Math.round(team.W / team.GP * 100) : 0 }}%</span>
            </td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center text-sm font-semibold text-blue-400">{{ team.avg_possession || '-' }}%</td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center text-sm font-medium text-zinc-400">{{ team.avg_shots || '-' }}</td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center text-sm font-medium text-zinc-400">{{ team.avg_corners || '-' }}</td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center text-sm font-semibold text-amber-400">{{ team.avg_yellow_cards || '-' }}</td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center text-sm font-semibold text-red-400">{{ team.avg_red_cards || '-' }}</td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center">
              <span :class="[
                'px-1.5 py-0.5 text-[11px] font-bold rounded-full',
                getPercentagePillColor(team.clean_sheet_pct || 0)
              ]">{{ team.clean_sheet_pct || 0 }}%</span>
            </td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center">
              <span :class="[
                'px-1.5 py-0.5 text-[11px] font-bold rounded-full',
                getPercentagePillColor(team.over_25_pct || 0)
              ]">{{ team.over_25_pct || 0 }}%</span>
            </td>
            <td v-if="!isBball" class="px-2 py-1.5 text-center">
              <span :class="[
                'px-1.5 py-0.5 text-[11px] font-bold rounded-full',
                getPercentagePillColor(team.btts_pct || 0)
              ]">{{ team.btts_pct || 0 }}%</span>
            </td>
            <td class="px-3 py-1.5">
              <div class="flex gap-0.5 justify-center">
                <span 
                  v-for="(result, i) in (team.form || [])" 
                  :key="i"
                  :class="[
                    'w-4 h-4 rounded-full flex items-center justify-center text-white text-[11px] font-bold',
                    result === 'W' ? 'bg-green-500/200' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                  ]"
                >
                  {{ result }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="mt-6 p-4 bg-surface-light rounded-lg border border-edge">
      <h3 class="text-sm font-bold text-zinc-100 mb-3">Statistics Legend</h3>
      <!-- Basketball legend -->
      <div v-if="isBball" class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-zinc-700 text-zinc-300 rounded-full font-bold text-[11px]">PF</span>
          <span class="text-zinc-400"><span class="font-semibold">PF:</span> Points For</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-zinc-700 text-zinc-300 rounded-full font-bold text-[11px]">PA</span>
          <span class="text-zinc-400"><span class="font-semibold">PA:</span> Points Against</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-zinc-700 text-zinc-300 rounded-full font-bold text-[11px]">DIFF</span>
          <span class="text-zinc-400"><span class="font-semibold">DIFF:</span> Point Differential</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full font-bold text-[11px]">W%</span>
          <span class="text-zinc-400"><span class="font-semibold">Win%:</span> Win Percentage</span>
        </div>
      </div>
      <!-- Football legend -->
      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full font-bold text-[11px]">P</span>
          <span class="text-zinc-400"><span class="font-semibold">Poss%:</span> Avg Possession</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-zinc-700 text-zinc-300 rounded-full font-bold text-[11px]">S</span>
          <span class="text-zinc-400"><span class="font-semibold">Shots:</span> Avg per game</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-zinc-700 text-zinc-300 rounded-full font-bold text-[11px]">C</span>
          <span class="text-zinc-400"><span class="font-semibold">Corners:</span> Avg per game</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full font-bold text-[11px]">Y</span>
          <span class="text-zinc-400"><span class="font-semibold">YC:</span> Avg Yellow Cards</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-red-500/20 text-red-400 rounded-full font-bold text-[11px]">R</span>
          <span class="text-zinc-400"><span class="font-semibold">RC:</span> Avg Red Cards</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-bold text-[11px]">CS</span>
          <span class="text-zinc-400"><span class="font-semibold">CS%:</span> Clean Sheet %</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full font-bold text-[11px]">O</span>
          <span class="text-zinc-400"><span class="font-semibold">O2.5%:</span> Over 2.5 Goals</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full font-bold text-[11px]">B</span>
          <span class="text-zinc-400"><span class="font-semibold">BTTS%:</span> Both Teams Score</span>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import Card from '~/components/ui/Card.vue'
import { computed, ref } from 'vue'

const props = defineProps({
  standings: {
    type: Array,
    required: true,
    default: () => []
  },
  filter: {
    type: String,
    required: true,
    default: 'overall'
  },
  overUnderFilter: {
    type: String,
    required: true,
    default: 'all'
  },
  sport: {
    type: String,
    default: 'football'
  }
})

const isBball = computed(() => props.sport === 'basketball')

defineEmits(['update:filter', 'update:overUnderFilter'])

// Computed stats for summary cards
const totalGames = computed(() => {
  return props.standings.reduce((sum, team) => sum + team.GP, 0) / 2 // Divide by 2 since each game involves 2 teams
})

const totalGoals = computed(() => {
  return props.standings.reduce((sum, team) => sum + team.GF, 0)
})

const avgGoalsPerGame = computed(() => {
  const total = totalGames.value
  return total > 0 ? (totalGoals.value / total).toFixed(2) : 0
})

const totalCleanSheets = computed(() => {
  return props.standings.reduce((sum, team) => sum + (team.clean_sheets || 0), 0)
})

function getQualificationClass(position) {
  if (position <= 4) return 'border-l-4 border-green-500'
  if (position <= 8) return 'border-l-4 border-blue-400'
  if (position <= 12) return 'border-l-4 border-amber-400'
  return ''
}

function getPercentageColor(value) {
  if (value >= 70) return 'text-red-400 font-semibold'
  if (value >= 50) return 'text-orange-600 font-medium'
  if (value >= 30) return 'text-yellow-600'
  return 'text-green-400'
}

function getPercentagePillColor(value) {
  if (value >= 70) return 'bg-red-500/20 text-red-400'
  if (value >= 50) return 'bg-orange-500/20 text-orange-400'
  if (value >= 30) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-green-500/20 text-green-400'
}
</script>
