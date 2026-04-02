<template>
  <Card padding="6">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-zinc-100 mb-2">Predictive Match Analytics</h2>
      <p class="text-sm text-zinc-400">AI-powered insights for upcoming matches based on form, stats & patterns</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-zinc-500 mb-4">
        <svg class="w-16 h-16 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <p class="text-zinc-500 ml-3">Analyzing upcoming matches...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
      <p class="text-red-400">{{ error }}</p>
      <button 
        @click="fetchInsights" 
        class="mt-2 text-sm text-red-400 hover:text-red-400 underline"
      >
        Try Again
      </button>
    </div>

    <!-- No Upcoming Matches -->
    <div v-else-if="!upcomingMatches.length" class="text-center py-12">
      <div class="text-zinc-500 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <p class="text-zinc-500">No upcoming matches in the next 7 days</p>
      <p class="text-zinc-500 text-sm mt-2">Check back when fixtures are scheduled</p>
    </div>

    <!-- Results -->
    <div v-else class="space-y-6">
      <!-- League Patterns -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
        <div class="flex items-center gap-3 mb-3">
          <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <h3 class="text-lg font-bold text-blue-900">League Trends ({{ metadata.analyzedGamesCount }} games)</h3>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-surface/70 rounded p-2">
            <div class="text-2xl font-bold text-blue-400">{{ patterns.avgGoalsPerGame }}</div>
            <div class="text-xs text-zinc-400">Avg Goals/Game</div>
          </div>
          <div class="bg-surface/70 rounded p-2">
            <div class="text-2xl font-bold text-green-400">{{ patterns.over25Percentage }}%</div>
            <div class="text-xs text-zinc-400">Over 2.5 Rate</div>
          </div>
          <div class="bg-surface/70 rounded p-2">
            <div class="text-2xl font-bold text-purple-400">{{ patterns.bttsPercentage }}%</div>
            <div class="text-xs text-zinc-400">BTTS Rate</div>
          </div>
          <div class="bg-surface/70 rounded p-2">
            <div class="text-2xl font-bold text-orange-400">{{ patterns.homeWinPercentage }}%</div>
            <div class="text-xs text-zinc-400">Home Win Rate</div>
          </div>
        </div>
      </div>

      <!-- Upcoming Matches with Predictions -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Next {{ upcomingMatches.length }} Matches - Predictions
        </h3>

        <div 
          v-for="(match, idx) in upcomingMatches" 
          :key="idx"
          class="bg-surface border-2 border-edge rounded-lg p-4 hover:border-blue-300 hover:shadow-lg transition-all"
        >
          <!-- Match Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="text-lg font-bold text-zinc-100">{{ match.match.home }}</span>
                <div class="flex gap-0.5">
                  <span 
                    v-for="(result, i) in match.homeTeamStats.form.split('')" 
                    :key="i"
                    :class="[
                      'w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center text-white',
                      result === 'W' ? 'bg-green-500/200' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                    ]"
                  >
                    {{ result }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold text-zinc-100">{{ match.match.away }}</span>
                <div class="flex gap-0.5">
                  <span 
                    v-for="(result, i) in match.awayTeamStats.form.split('')" 
                    :key="i"
                    :class="[
                      'w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center text-white',
                      result === 'W' ? 'bg-green-500/200' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                    ]"
                  >
                    {{ result }}
                  </span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-zinc-500">Round {{ match.match.round }}</div>
              <div class="text-sm font-medium text-zinc-300">{{ formatDate(match.match.date) }}</div>
            </div>
          </div>

          <!-- Stats Comparison -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="bg-blue-500/20 rounded p-2">
              <div class="text-[11px] text-zinc-400 mb-1">Home Record</div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-bold text-blue-400">{{ match.homeTeamStats.homeWinRate }}%</span>
                <span class="text-xs text-zinc-400">win rate</span>
              </div>
              <div class="text-xs text-zinc-400 mt-1">
                {{ match.homeTeamStats.avgGoalsFor }} goals/game • {{ match.homeTeamStats.avgShots }} shots
              </div>
            </div>
            <div class="bg-red-500/20 rounded p-2">
              <div class="text-[11px] text-zinc-400 mb-1">Away Record</div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-bold text-red-400">{{ match.awayTeamStats.awayWinRate }}%</span>
                <span class="text-xs text-zinc-400">win rate</span>
              </div>
              <div class="text-xs text-zinc-400 mt-1">
                {{ match.awayTeamStats.avgGoalsFor }} goals/game • {{ match.awayTeamStats.avgShots }} shots
              </div>
            </div>
          </div>

          <!-- Prediction -->
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-500/30 rounded-lg p-3 mb-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-bold text-green-900">Prediction</div>
              <div class="text-xs text-green-400">Expected: {{ match.prediction.expectedGoals }} goals</div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div class="font-semibold text-zinc-300">Result</div>
                <div class="font-bold text-green-400">{{ match.prediction.recommendation }}</div>
              </div>
              <div>
                <div class="font-semibold text-zinc-300">Over 2.5</div>
                <div :class="[
                  'font-bold',
                  match.prediction.over25Likelihood === 'High' ? 'text-green-400' : 
                  match.prediction.over25Likelihood === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                ]">
                  {{ match.prediction.over25Likelihood }}
                </div>
              </div>
              <div>
                <div class="font-semibold text-zinc-300">BTTS</div>
                <div :class="[
                  'font-bold',
                  match.prediction.bttsLikelihood === 'High' ? 'text-green-400' : 'text-yellow-400'
                ]">
                  {{ match.prediction.bttsLikelihood }}
                </div>
              </div>
            </div>
          </div>

          <!-- Insights -->
          <div v-if="match.insights.length" class="space-y-1">
            <div 
              v-for="(insight, i) in match.insights" 
              :key="i"
              class="text-xs text-zinc-300 flex items-start gap-2 bg-surface-light rounded px-2 py-1"
            >
              <span class="text-blue-400">•</span>
              <span>{{ insight }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Form Teams -->
      <div class="bg-surface-light border border-edge rounded-lg p-4">
        <h3 class="text-lg font-semibold text-zinc-100 mb-3 flex items-center gap-2">
          <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
          </svg>
          Top Form Teams
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div 
            v-for="(team, idx) in teamStats.slice(0, 6)" 
            :key="idx"
            class="flex items-center justify-between bg-surface rounded px-3 py-2 text-sm"
          >
            <div class="flex items-center gap-2">
              <span class="text-zinc-500 font-mono text-xs">{{ idx + 1 }}</span>
              <span class="font-semibold text-zinc-200">{{ team.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex gap-0.5">
                <span 
                  v-for="(result, i) in team.recentForm" 
                  :key="i"
                  :class="[
                    'w-4 h-4 rounded text-[11px] font-bold flex items-center justify-center text-white',
                    result === 'W' ? 'bg-green-500/200' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                  ]"
                >
                  {{ result }}
                </span>
              </div>
              <span class="text-xs font-bold text-green-400">{{ team.formScore }}pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import Card from '~/components/ui/Card.vue'

const props = defineProps({
  leagueKey: {
    type: String,
    required: true
  },
  season: {
    type: String,
    default: null
  }
})

const loading = ref(false)
const error = ref(null)
const upcomingMatches = ref([])
const patterns = ref({})
const teamStats = ref([])
const metadata = ref({})

const fetchInsights = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/analytics/predictive-insights', {
      method: 'POST',
      body: {
        leagueKey: props.leagueKey,
        season: props.season ? parseInt(props.season) : 2025
      }
    })

    upcomingMatches.value = response.upcomingMatches || []
    patterns.value = response.patterns || {}
    teamStats.value = response.teamStats || []
    metadata.value = response.metadata || {}
  } catch (err) {
    console.error('Failed to fetch predictive insights:', err)
    error.value = err.message || 'Failed to load predictive insights'
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Fetch on mount and when props change
watch(() => [props.leagueKey, props.season], () => {
  fetchInsights()
}, { immediate: true })

onMounted(() => {
  fetchInsights()
})
</script>
