<template>
  <div class="min-h-screen bg-surface-base">
   <div class="max-w-[1600px] mx-auto p-3 sm:p-6">
    <!-- Back Button -->
    <NuxtLink to="/leagues" class="inline-flex items-center gap-1.5 sm:gap-2 text-zinc-400 hover:text-zinc-200 mb-4 sm:mb-6 transition-colors">
      <ChevronLeft :size="18" />
      <span class="text-sm font-medium">{{ data?.name || leagueName }}</span>
    </NuxtLink>

    <!-- Loading State -->
    <div v-if="loading || !data" class="flex justify-center items-center py-16">
      <div class="flex items-center gap-3 text-zinc-500">
        <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
        <span class="text-sm">Loading league data...</span>
      </div>
    </div>
    
    <!-- Main Content -->
    <div v-else>
      <!-- Tab Navigation -->
      <TabNavigation 
        v-model:activeTab="activeTab"
      />

      <!-- Overview Tab (Games + Standings merged) -->
      <div v-show="activeTab === 'overview'">
        <OverviewView
          :selectedRound="selectedRound"
          :maxRound="maxRound"
          :roundGames="roundGames"
          :standings="filteredStandings"
          :sport="data.sport"
          :selectedDate="selectedRoundDate"
          :allGames="data.games"
          :leagueKey="data.key"
          v-model:filter="standingsFilter"
          @previousRound="previousRound"
          @nextRound="nextRound"
          @changeRound="changeRound"
        />
      </div>

      <!-- Statistics Tab -->
      <div v-show="activeTab === 'analysis'">
        <AnalysisView
          :overallStats="overallStats"
          :roundStats="roundStatistics"
          :teamStats="teamStatisticsFiltered"
          :standings="liveStandings"
          :goalsDistribution="goalsDistribution"
          :homeAwayComparison="homeAwayComparison"
          :winRateEvolution="winRateEvolution"
          :roundTrends="roundTrends"
          :topPerformers="topPerformers"
          :sport="data.sport"
          v-model:locationFilter="statsLocationFilter"
        />
      </div>

      <!-- Predictions Tab -->
      <div v-show="activeTab === 'predictions'">
        <PredictionsView
          ref="predictionsViewRef"
          :nextRound="nextUnplayedRound"
          :roundMatches="nextUnplayedMatches"
          :teamStats="computedStandings"
          :standings="liveStandings"
          :games="data?.games || []"
          :leagueKey="data.key"
          :season="selectedSeason"
          :sport="data.sport"
          @predictions-updated="onPredictionsUpdated"
        />
        
        <!-- Parlay Generator -->
        <ParlayGenerator
          v-if="predictionsList.length > 0"
          :predictions="predictionsList"
        />
      </div>
    </div>
   </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import TabNavigation from '~/components/league/TabNavigation.vue'
import OverviewView from '~/components/league/OverviewView.vue'
import AnalysisView from '~/components/league/AnalysisView.vue'
import PredictionsView from '~/components/league/PredictionsView.vue'
import ParlayGenerator from '~/components/league/ParlayGenerator.vue'
import { useLeagueStats } from '~/composables/useLeagueStats'

// Route and initial data
const route = useRoute()
const api = useApi()
const leagueName = route.params.slug
const selectedSeason = computed(() => route.query.season || '2025-2026')

// Fetch league data for the selected season
const { data: leagueData, refresh: refreshLeague } = await useAsyncData(
  `league-${leagueName}-${selectedSeason.value}`,
  () => api.fetchLeague(leagueName, selectedSeason.value)
)
const data = computed(() => leagueData.value ? {
  name: leagueData.value.league.name,
  flag: leagueData.value.league.flag,
  key: leagueData.value.league.key,
  sport: leagueData.value.league.sport || 'football',
  games: leagueData.value.games,
  standings: leagueData.value.standings
} : null)
const loading = ref(false)

// Is this a basketball league?
const isBball = computed(() => data.value?.sport === 'basketball')

// UI State
const activeTab = ref('overview')
const selectedRound = ref(1)
const standingsFilter = ref('overall')
const overUnderFilter = ref('all')
const statsLocationFilter = ref('all')

// Set initial round - find next upcoming round from today
// For basketball: date-based (each day = one "page")
// For football: round-based
if (data.value?.games) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const sport = leagueData.value?.league?.sport || 'football'

  if (sport === 'basketball') {
    // Build sorted unique dates
    const dates = [...new Set(
      data.value.games
        .map(g => g.date ? g.date.split('T')[0] : null)
        .filter(Boolean)
    )].sort()
    // Jump to today's date or the next upcoming game day
    const idx = dates.findIndex(d => d >= todayStr)
    selectedRound.value = idx >= 0 ? idx + 1 : dates.length || 1
  } else {
    const rounds = [...new Set(data.value.games.map(g => g.round || 1))].sort((a, b) => a - b)
    let nextUpcomingRound = null
    for (const round of rounds) {
      const roundGamesArr = data.value.games.filter(g => g.round === round)
      const hasFutureGames = roundGamesArr.some(g => {
        if (!g.date) return false
        return new Date(g.date) > today
      })
      if (hasFutureGames) {
        nextUpcomingRound = round
        break
      }
    }
    selectedRound.value = nextUpcomingRound || rounds[rounds.length - 1] || 1
  }
}

// Basketball: sorted unique game dates (used instead of rounds)
const bballGameDates = computed(() => {
  if (!isBball.value || !data.value?.games) return []
  return [...new Set(
    data.value.games
      .map(g => g.date ? g.date.split('T')[0] : null)
      .filter(Boolean)
  )].sort()
})

// The date string for the currently selected "round" (basketball only)
const selectedRoundDate = computed(() => {
  if (!isBball.value) return null
  return bballGameDates.value[selectedRound.value - 1] || null
})

// Computed: Max round number
const maxRound = computed(() => {
  if (!data.value?.games) return 1
  if (isBball.value) return bballGameDates.value.length || 1
  return Math.max(...data.value.games.map(g => g.round || 1))
})

// Computed: Current round games
const roundGames = computed(() => {
  if (!data.value?.games) return []
  if (isBball.value) {
    const targetDate = selectedRoundDate.value
    if (!targetDate) return []
    return data.value.games.filter(g => g.date && g.date.startsWith(targetDate))
  }
  return data.value.games.filter(g => g.round === selectedRound.value)
})

// Use stats composable for statistics (not standings)
const games = computed(() => data.value?.games || [])
const { computedStandings, roundStatistics, overallStats } = useLeagueStats(games)

// Helper functions for streak/L10
function _computeStreak(results) {
  if (!results.length) return '-'
  const last = results[results.length - 1]
  let count = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === last) count++
    else break
  }
  return `${last}${count}`
}

function _computeLast10(results) {
  const last10 = results.slice(-10)
  const wins = last10.filter(r => r === 'W').length
  const losses = last10.filter(r => r === 'L').length
  return `${wins}-${losses}`
}

// Calculate live standings from game results
const liveStandings = computed(() => {
  if (!data.value?.games) return []
  
  const standings = {}
  
  // Get all teams from games
  data.value.games.forEach(game => {
    if (!standings[game.home_team_id]) {
      standings[game.home_team_id] = {
        team_id: game.home_team_id,
        name: game.home_name,
        team_key: game.home_key || null,
        GP: 0, W: 0, D: 0, L: 0,
        GF: 0, GA: 0,
        home_GF: 0, home_GA: 0, away_GF: 0, away_GA: 0,
        home_W: 0, home_D: 0, home_L: 0,
        away_W: 0, away_D: 0, away_L: 0,
        form: [],
        allResults: [],
        recentGames: [],
        // Enhanced stats (overall)
        shots: 0, shots_against: 0,
        corners: 0, corners_against: 0,
        fouls: 0, fouls_against: 0,
        yellow_cards: 0, red_cards: 0,
        possession_total: 0, possession_count: 0,
        clean_sheets: 0,
        games_over_15: 0, games_over_25: 0, games_over_35: 0,
        btts: 0,
        // Home stats
        home_GP: 0,
        home_shots: 0, home_corners: 0, home_fouls: 0,
        home_yellow_cards: 0, home_red_cards: 0,
        home_possession_total: 0, home_possession_count: 0,
        home_clean_sheets: 0,
        home_games_over_15: 0, home_games_over_25: 0,
        home_btts: 0,
        // Away stats
        away_GP: 0,
        away_shots: 0, away_corners: 0, away_fouls: 0,
        away_yellow_cards: 0, away_red_cards: 0,
        away_possession_total: 0, away_possession_count: 0,
        away_clean_sheets: 0,
        away_games_over_15: 0, away_games_over_25: 0,
        away_btts: 0
      }
    }
    if (!standings[game.away_team_id]) {
      standings[game.away_team_id] = {
        team_id: game.away_team_id,
        name: game.away_name,
        team_key: game.away_key || null,
        GP: 0, W: 0, D: 0, L: 0,
        GF: 0, GA: 0,
        home_GF: 0, home_GA: 0, away_GF: 0, away_GA: 0,
        home_W: 0, home_D: 0, home_L: 0,
        away_W: 0, away_D: 0, away_L: 0,
        form: [],
        allResults: [],
        recentGames: [],
        // Enhanced stats (overall)
        shots: 0, shots_against: 0,
        corners: 0, corners_against: 0,
        fouls: 0, fouls_against: 0,
        yellow_cards: 0, red_cards: 0,
        possession_total: 0, possession_count: 0,
        clean_sheets: 0,
        games_over_15: 0, games_over_25: 0, games_over_35: 0,
        btts: 0,
        // Home stats
        home_GP: 0,
        home_shots: 0, home_corners: 0, home_fouls: 0,
        home_yellow_cards: 0, home_red_cards: 0,
        home_possession_total: 0, home_possession_count: 0,
        home_clean_sheets: 0,
        home_games_over_15: 0, home_games_over_25: 0,
        home_btts: 0,
        // Away stats
        away_GP: 0,
        away_shots: 0, away_corners: 0, away_fouls: 0,
        away_yellow_cards: 0, away_red_cards: 0,
        away_possession_total: 0, away_possession_count: 0,
        away_clean_sheets: 0,
        away_games_over_15: 0, away_games_over_25: 0,
        away_btts: 0
      }
    }
  })
  
  // Process played games
  data.value.games
    .filter(g => g.home_goals !== null && g.away_goals !== null)
    .forEach(game => {
      const homeTeam = standings[game.home_team_id]
      const awayTeam = standings[game.away_team_id]
      
      if (!homeTeam || !awayTeam) return
      
      const totalGoals = game.home_goals + game.away_goals
      
      // Basic stats
      homeTeam.GP++
      awayTeam.GP++
      homeTeam.home_GP++
      awayTeam.away_GP++
      homeTeam.GF += game.home_goals
      homeTeam.GA += game.away_goals
      homeTeam.home_GF += game.home_goals
      homeTeam.home_GA += game.away_goals
      awayTeam.GF += game.away_goals
      awayTeam.GA += game.home_goals
      awayTeam.away_GF += game.away_goals
      awayTeam.away_GA += game.home_goals
      
      // Result
      if (game.home_goals > game.away_goals) {
        homeTeam.W++
        homeTeam.home_W++
        homeTeam.form.push('W')
        awayTeam.L++
        awayTeam.away_L++
        awayTeam.form.push('L')
      } else if (game.home_goals < game.away_goals) {
        awayTeam.W++
        awayTeam.away_W++
        awayTeam.form.push('W')
        homeTeam.L++
        homeTeam.home_L++
        homeTeam.form.push('L')
      } else {
        homeTeam.D++
        homeTeam.home_D++
        homeTeam.form.push('D')
        awayTeam.D++
        awayTeam.away_D++
        awayTeam.form.push('D')
      }
      
      // Enhanced stats
      if (game.home_shots) {
        homeTeam.shots += game.home_shots
        homeTeam.home_shots += game.home_shots
        awayTeam.shots_against += game.home_shots
      }
      if (game.away_shots) {
        awayTeam.shots += game.away_shots
        awayTeam.away_shots += game.away_shots
        homeTeam.shots_against += game.away_shots
      }
      if (game.home_corners) {
        homeTeam.corners += game.home_corners
        homeTeam.home_corners += game.home_corners
        awayTeam.corners_against += game.home_corners
      }
      if (game.away_corners) {
        awayTeam.corners += game.away_corners
        awayTeam.away_corners += game.away_corners
        homeTeam.corners_against += game.away_corners
      }
      if (game.home_fouls) {
        homeTeam.fouls += game.home_fouls
        homeTeam.home_fouls += game.home_fouls
        awayTeam.fouls_against += game.home_fouls
      }
      if (game.away_fouls) {
        awayTeam.fouls += game.away_fouls
        awayTeam.away_fouls += game.away_fouls
        homeTeam.fouls_against += game.away_fouls
      }
      if (game.home_yellow_cards) {
        homeTeam.yellow_cards += game.home_yellow_cards
        homeTeam.home_yellow_cards += game.home_yellow_cards
      }
      if (game.away_yellow_cards) {
        awayTeam.yellow_cards += game.away_yellow_cards
        awayTeam.away_yellow_cards += game.away_yellow_cards
      }
      if (game.home_red_cards) {
        homeTeam.red_cards += game.home_red_cards
        homeTeam.home_red_cards += game.home_red_cards
      }
      if (game.away_red_cards) {
        awayTeam.red_cards += game.away_red_cards
        awayTeam.away_red_cards += game.away_red_cards
      }
      
      if (game.home_possession_pct) {
        homeTeam.possession_total += game.home_possession_pct
        homeTeam.possession_count++
        homeTeam.home_possession_total += game.home_possession_pct
        homeTeam.home_possession_count++
      }
      if (game.away_possession_pct) {
        awayTeam.possession_total += game.away_possession_pct
        awayTeam.possession_count++
        awayTeam.away_possession_total += game.away_possession_pct
        awayTeam.away_possession_count++
      }
      
      // Clean sheets
      if (game.away_goals === 0) {
        homeTeam.clean_sheets++
        homeTeam.home_clean_sheets++
      }
      if (game.home_goals === 0) {
        awayTeam.clean_sheets++
        awayTeam.away_clean_sheets++
      }
      
      // Goals thresholds
      if (totalGoals > 1.5) {
        homeTeam.games_over_15++
        awayTeam.games_over_15++
        homeTeam.home_games_over_15++
        awayTeam.away_games_over_15++
      }
      if (totalGoals > 2.5) {
        homeTeam.games_over_25++
        awayTeam.games_over_25++
        homeTeam.home_games_over_25++
        awayTeam.away_games_over_25++
      }
      if (totalGoals > 3.5) {
        homeTeam.games_over_35++
        awayTeam.games_over_35++
      }
      
      // BTTS
      if (game.home_goals > 0 && game.away_goals > 0) {
        homeTeam.btts++
        awayTeam.btts++
        homeTeam.home_btts++
        awayTeam.away_btts++
      }
      
      // Track full history for streak & L10
      const homeRes = game.home_goals > game.away_goals ? 'W' : game.home_goals < game.away_goals ? 'L' : 'D'
      const awayRes = homeRes === 'W' ? 'L' : homeRes === 'L' ? 'W' : 'D'
      homeTeam.allResults.push(homeRes)
      awayTeam.allResults.push(awayRes)
      homeTeam.recentGames.push({ date: game.date, opponent: game.away_name, opponentKey: game.away_key, pf: game.home_goals, pa: game.away_goals, result: homeRes, isHome: true })
      awayTeam.recentGames.push({ date: game.date, opponent: game.home_name, opponentKey: game.home_key, pf: game.away_goals, pa: game.home_goals, result: awayRes, isHome: false })

      // Keep only last 5 for form
      if (homeTeam.form.length > 5) homeTeam.form.shift()
      if (awayTeam.form.length > 5) awayTeam.form.shift()
    })
  
  // Calculate points and averages
  return Object.values(standings).map(team => ({
    ...team,
    // Basketball: Pts = W count; Football: Pts = W*3 + D
    Pts: isBball.value ? team.W : (team.W * 3 + team.D),
    GD: team.GF - team.GA,
    avg_possession: team.possession_count > 0 ? (team.possession_total / team.possession_count).toFixed(1) : 0,
    avg_shots: team.GP > 0 ? (team.shots / team.GP).toFixed(1) : 0,
    avg_corners: team.GP > 0 ? (team.corners / team.GP).toFixed(1) : 0,
    avg_yellow_cards: team.GP > 0 ? (team.yellow_cards / team.GP).toFixed(1) : 0,
    avg_red_cards: team.GP > 0 ? (team.red_cards / team.GP).toFixed(2) : 0,
    over_15_pct: team.GP > 0 ? ((team.games_over_15 / team.GP) * 100).toFixed(0) : 0,
    over_25_pct: team.GP > 0 ? ((team.games_over_25 / team.GP) * 100).toFixed(0) : 0,
    btts_pct: team.GP > 0 ? ((team.btts / team.GP) * 100).toFixed(0) : 0,
    clean_sheet_pct: team.GP > 0 ? ((team.clean_sheets / team.GP) * 100).toFixed(0) : 0,
    // Advanced basketball stats
    ppg: team.GP > 0 ? +(team.GF / team.GP).toFixed(1) : 0,
    opp_ppg: team.GP > 0 ? +(team.GA / team.GP).toFixed(1) : 0,
    diff_pg: team.GP > 0 ? +((team.GF - team.GA) / team.GP).toFixed(1) : 0,
    pace: team.GP > 0 ? +((team.GF + team.GA) / team.GP).toFixed(1) : 0,
    ortg: (team.GF + team.GA) > 0 ? +(team.GF * 200 / (team.GF + team.GA)).toFixed(1) : 0,
    drtg: (team.GF + team.GA) > 0 ? +(team.GA * 200 / (team.GF + team.GA)).toFixed(1) : 0,
    netrtg: (team.GF + team.GA) > 0 ? +((team.GF - team.GA) * 200 / (team.GF + team.GA)).toFixed(1) : 0,
    streak: _computeStreak(team.allResults),
    last10: _computeLast10(team.allResults),
    // Home/Away per-game for modal
    home_ppg: team.home_GP > 0 ? +(team.home_GF / team.home_GP).toFixed(1) : 0,
    home_opp_ppg: team.home_GP > 0 ? +(team.home_GA / team.home_GP).toFixed(1) : 0,
    home_pace: team.home_GP > 0 ? +((team.home_GF + team.home_GA) / team.home_GP).toFixed(1) : 0,
    home_netrtg: (team.home_GF + team.home_GA) > 0 ? +((team.home_GF - team.home_GA) * 200 / (team.home_GF + team.home_GA)).toFixed(1) : 0,
    away_ppg: team.away_GP > 0 ? +(team.away_GF / team.away_GP).toFixed(1) : 0,
    away_opp_ppg: team.away_GP > 0 ? +(team.away_GA / team.away_GP).toFixed(1) : 0,
    away_pace: team.away_GP > 0 ? +((team.away_GF + team.away_GA) / team.away_GP).toFixed(1) : 0,
    away_netrtg: (team.away_GF + team.away_GA) > 0 ? +((team.away_GF - team.away_GA) * 200 / (team.away_GF + team.away_GA)).toFixed(1) : 0
  })).sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts
    // Basketball tiebreaker: point differential; Football: GD then GF
    const gdA = a.GF - a.GA
    const gdB = b.GF - b.GA
    if (gdB !== gdA) return gdB - gdA
    return b.GF - a.GF
  })
})

// Use database standings from API (deprecated - using live calculation now)
const dbStandings = computed(() => data.value?.standings || [])

// Computed: Get the round of the most recent upcoming games
const nextUnplayedRound = computed(() => {
  if (!data.value?.games) return 0
  
  const now = new Date()
  
  // Get all unplayed games
  const unplayedGames = data.value.games.filter(g => 
    g.home_goals === null && g.away_goals === null && g.date
  )
  
  if (unplayedGames.length === 0) return 0
  
  // Find the closest upcoming game date
  const closestGame = unplayedGames
    .map(g => ({ ...g, dateObj: new Date(g.date) }))
    .filter(g => g.dateObj >= now || (now - g.dateObj) / (1000 * 60 * 60 * 24) <= 1) // Include games from last 24h
    .sort((a, b) => Math.abs(a.dateObj - now) - Math.abs(b.dateObj - now))[0]
  
  return closestGame ? (closestGame.round || 0) : 0
})

// Computed: All matches closest to today's date (most recent upcoming games)
const nextUnplayedMatches = computed(() => {
  if (!data.value?.games) return []
  
  const now = new Date()
  
  // Get all unplayed games with valid dates
  const unplayedGames = data.value.games.filter(g => 
    g.home_goals === null && g.away_goals === null && g.date
  )
  
  if (unplayedGames.length === 0) return []
  
  // Find the closest upcoming game date
  const gamesWithDate = unplayedGames
    .map(g => ({ ...g, dateObj: new Date(g.date) }))
    .filter(g => g.dateObj >= now || (now - g.dateObj) / (1000 * 60 * 60 * 24) <= 1) // Include games from last 24h
  
  if (gamesWithDate.length === 0) return []
  
  const closestDate = gamesWithDate
    .sort((a, b) => Math.abs(a.dateObj - now) - Math.abs(b.dateObj - now))[0].dateObj
  
  // Get all games within 3 days of the closest date
  const threeDays = 3 * 24 * 60 * 60 * 1000
  return gamesWithDate
    .filter(g => Math.abs(g.dateObj - closestDate) <= threeDays)
    .sort((a, b) => a.dateObj - b.dateObj)
})

// Computed: Predictions list for parlay generator (this mirrors PredictionsView computed)
const predictionsList = ref([])

// Computed: Filtered standings - use live calculated standings
const filteredStandings = computed(() => {
  if (!liveStandings.value || liveStandings.value.length === 0) return []
  
  // Apply home/away/overall filter
  if (standingsFilter.value === 'home') {
    return liveStandings.value.map(team => ({
      ...team,
      GP: team.home_GP,
      W: team.home_W,
      D: team.home_D,
      L: team.home_L,
      Pts: isBball.value ? team.home_W : (team.home_W * 3 + team.home_D),
      // Recalculate averages for home games only
      avg_possession: team.home_possession_count > 0 ? (team.home_possession_total / team.home_possession_count).toFixed(1) : 0,
      avg_shots: team.home_GP > 0 ? (team.home_shots / team.home_GP).toFixed(1) : 0,
      avg_corners: team.home_GP > 0 ? (team.home_corners / team.home_GP).toFixed(1) : 0,
      avg_yellow_cards: team.home_GP > 0 ? (team.home_yellow_cards / team.home_GP).toFixed(1) : 0,
      avg_red_cards: team.home_GP > 0 ? (team.home_red_cards / team.home_GP).toFixed(2) : 0,
      clean_sheet_pct: team.home_GP > 0 ? ((team.home_clean_sheets / team.home_GP) * 100).toFixed(0) : 0,
      over_25_pct: team.home_GP > 0 ? ((team.home_games_over_25 / team.home_GP) * 100).toFixed(0) : 0,
      btts_pct: team.home_GP > 0 ? ((team.home_btts / team.home_GP) * 100).toFixed(0) : 0,
      ppg: team.home_GP > 0 ? +(team.home_GF / team.home_GP).toFixed(1) : 0,
      opp_ppg: team.home_GP > 0 ? +(team.home_GA / team.home_GP).toFixed(1) : 0,
      diff_pg: team.home_GP > 0 ? +((team.home_GF - team.home_GA) / team.home_GP).toFixed(1) : 0,
      pace: team.home_GP > 0 ? +((team.home_GF + team.home_GA) / team.home_GP).toFixed(1) : 0,
      ortg: (team.home_GF + team.home_GA) > 0 ? +(team.home_GF * 200 / (team.home_GF + team.home_GA)).toFixed(1) : 0,
      drtg: (team.home_GF + team.home_GA) > 0 ? +(team.home_GA * 200 / (team.home_GF + team.home_GA)).toFixed(1) : 0,
      netrtg: (team.home_GF + team.home_GA) > 0 ? +((team.home_GF - team.home_GA) * 200 / (team.home_GF + team.home_GA)).toFixed(1) : 0,
      streak: _computeStreak(team.recentGames.filter(g => g.isHome).map(g => g.result)),
      last10: _computeLast10(team.recentGames.filter(g => g.isHome).map(g => g.result))
    })).sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts
      if (b.GD !== a.GD) return b.GD - a.GD
      return b.GF - a.GF
    })
  } else if (standingsFilter.value === 'away') {
    return liveStandings.value.map(team => ({
      ...team,
      GP: team.away_GP,
      W: team.away_W,
      D: team.away_D,
      L: team.away_L,
      Pts: isBball.value ? team.away_W : (team.away_W * 3 + team.away_D),
      // Recalculate averages for away games only
      avg_possession: team.away_possession_count > 0 ? (team.away_possession_total / team.away_possession_count).toFixed(1) : 0,
      avg_shots: team.away_GP > 0 ? (team.away_shots / team.away_GP).toFixed(1) : 0,
      avg_corners: team.away_GP > 0 ? (team.away_corners / team.away_GP).toFixed(1) : 0,
      avg_yellow_cards: team.away_GP > 0 ? (team.away_yellow_cards / team.away_GP).toFixed(1) : 0,
      avg_red_cards: team.away_GP > 0 ? (team.away_red_cards / team.away_GP).toFixed(2) : 0,
      clean_sheet_pct: team.away_GP > 0 ? ((team.away_clean_sheets / team.away_GP) * 100).toFixed(0) : 0,
      over_25_pct: team.away_GP > 0 ? ((team.away_games_over_25 / team.away_GP) * 100).toFixed(0) : 0,
      btts_pct: team.away_GP > 0 ? ((team.away_btts / team.away_GP) * 100).toFixed(0) : 0,
      ppg: team.away_GP > 0 ? +(team.away_GF / team.away_GP).toFixed(1) : 0,
      opp_ppg: team.away_GP > 0 ? +(team.away_GA / team.away_GP).toFixed(1) : 0,
      diff_pg: team.away_GP > 0 ? +((team.away_GF - team.away_GA) / team.away_GP).toFixed(1) : 0,
      pace: team.away_GP > 0 ? +((team.away_GF + team.away_GA) / team.away_GP).toFixed(1) : 0,
      ortg: (team.away_GF + team.away_GA) > 0 ? +(team.away_GF * 200 / (team.away_GF + team.away_GA)).toFixed(1) : 0,
      drtg: (team.away_GF + team.away_GA) > 0 ? +(team.away_GA * 200 / (team.away_GF + team.away_GA)).toFixed(1) : 0,
      netrtg: (team.away_GF + team.away_GA) > 0 ? +((team.away_GF - team.away_GA) * 200 / (team.away_GF + team.away_GA)).toFixed(1) : 0,
      streak: _computeStreak(team.recentGames.filter(g => !g.isHome).map(g => g.result)),
      last10: _computeLast10(team.recentGames.filter(g => !g.isHome).map(g => g.result))
    })).sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts
      if (b.GD !== a.GD) return b.GD - a.GD
      return b.GF - a.GF
    })
  }
  
  // Apply over/under filter
  if (overUnderFilter.value !== 'all') {
    return liveStandings.value.filter(team => {
      if (overUnderFilter.value === 'over2.5') return team.over_25_pct >= 50
      if (overUnderFilter.value === 'under2.5') return team.over_25_pct < 50
      if (overUnderFilter.value === 'btts') return team.btts_pct >= 50
      return true
    })
  }
  
  return liveStandings.value
})

// Computed: Team statistics with location filter
const teamStatisticsFiltered = computed(() => {
  const teams = computedStandings.value
  if (!teams || Object.keys(teams).length === 0) return []
  
  return Object.values(teams).map(team => {
    // Filter matches based on location
    let matches = team.matches
    if (statsLocationFilter.value === 'home') {
      matches = team.homeMatches
    } else if (statsLocationFilter.value === 'away') {
      matches = team.awayMatches
    }
    
    matches = matches.filter(m => m.goalsFor !== null && m.goalsAgainst !== null)
    const played = matches.length
    
    if (played === 0) return null
    
    // Calculate over/under stats
    const over05 = matches.filter(m => m.totalGoals > 0.5).length
    const over15 = matches.filter(m => m.totalGoals > 1.5).length
    const over25 = matches.filter(m => m.totalGoals > 2.5).length
    const over35 = matches.filter(m => m.totalGoals > 3.5).length
    const over45 = matches.filter(m => m.totalGoals > 4.5).length
    const over55 = matches.filter(m => m.totalGoals > 5.5).length
    const btts = matches.filter(m => m.goalsFor > 0 && m.goalsAgainst > 0).length
    const cleanSheets = matches.filter(m => m.goalsAgainst === 0).length
    
    // Get enriched stats from games data for this team
    const teamGames = data.value?.games?.filter(g => 
      (g.home_name === team.name || g.away_name === team.name) &&
      g.home_goals !== null && g.away_goals !== null
    ) || []
    
    let totalPossession = 0, possessionCount = 0
    let totalShots = 0, totalCorners = 0, totalYellowCards = 0
    
    teamGames.forEach(game => {
      const isHome = game.home_name === team.name
      
      if (isHome && game.home_possession_pct) {
        totalPossession += game.home_possession_pct
        possessionCount++
      } else if (!isHome && game.away_possession_pct) {
        totalPossession += game.away_possession_pct
        possessionCount++
      }
      
      if (isHome) {
        if (game.home_shots) totalShots += game.home_shots
        if (game.home_corners) totalCorners += game.home_corners
        if (game.home_yellow_cards) totalYellowCards += game.home_yellow_cards
      } else {
        if (game.away_shots) totalShots += game.away_shots
        if (game.away_corners) totalCorners += game.away_corners
        if (game.away_yellow_cards) totalYellowCards += game.away_yellow_cards
      }
    })
    
    return {
      name: team.name,
      matches: played,
      avgPossession: possessionCount > 0 ? (totalPossession / possessionCount).toFixed(1) : '-',
      avgShots: teamGames.length > 0 ? (totalShots / teamGames.length).toFixed(1) : '-',
      avgCorners: teamGames.length > 0 ? (totalCorners / teamGames.length).toFixed(1) : '-',
      avgYellowCards: teamGames.length > 0 ? (totalYellowCards / teamGames.length).toFixed(1) : '-',
      over05,
      over05Pct: Math.round((over05 / played) * 100),
      over15,
      over15Pct: Math.round((over15 / played) * 100),
      over25,
      over25Pct: Math.round((over25 / played) * 100),
      over35,
      over35Pct: Math.round((over35 / played) * 100),
      over45,
      over45Pct: Math.round((over45 / played) * 100),
      over55,
      over55Pct: Math.round((over55 / played) * 100),
      btts,
      bttsPct: Math.round((btts / played) * 100),
      cleanSheets,
      cleanSheetsPct: Math.round((cleanSheets / played) * 100)
    }
  }).filter(t => t !== null).sort((a, b) => a.name.localeCompare(b.name))
})

// Charts data computations
const goalsDistribution = computed(() => {
  if (!data.value?.games) return {}
  const games = data.value.games.filter(g => g.home_goals !== null && g.away_goals !== null)

  if (isBball.value) {
    // Basketball: dynamic 10-pt buckets centered on league average
    const totals = games.map(g => g.home_goals + g.away_goals)
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    const center = Math.round(avg / 10) * 10          // e.g. 172 → 170
    const edges = []
    for (let i = -2; i <= 3; i++) edges.push(center + i * 10) // 6 boundaries → 7 buckets
    const dist = {}
    dist[`<${edges[0]}`] = 0
    for (let i = 0; i < edges.length - 1; i++) dist[`${edges[i]}-${edges[i + 1]}`] = 0
    dist[`${edges[edges.length - 1]}+`] = 0
    games.forEach(g => {
      const total = g.home_goals + g.away_goals
      if (total < edges[0]) { dist[`<${edges[0]}`]++; return }
      for (let i = 0; i < edges.length - 1; i++) {
        if (total < edges[i + 1]) { dist[`${edges[i]}-${edges[i + 1]}`]++; return }
      }
      dist[`${edges[edges.length - 1]}+`]++
    })
    return dist
  } else {
    // Football: bucket by total goals per game
    const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 }
    games.forEach(g => {
      const total = g.home_goals + g.away_goals
      if (total <= 4) dist[total]++
      else dist['5+']++
    })
    return dist
  }
})

const roundTrends = computed(() => {
  if (!roundStatistics.value || roundStatistics.value.length === 0) return []
  
  return roundStatistics.value.map(r => ({
    round: r.round,
    over25: r.over25Pct,
    under25: r.under25Pct
  }))
})

const avgGoalsPoints = computed(() => {
  if (!roundStatistics.value || roundStatistics.value.length === 0) return []
  
  return roundStatistics.value.map(r => ({
    round: r.round,
    avgGoals: parseFloat(r.avgGoals)
  }))
})

const avgGoalsLinePoints = computed(() => avgGoalsPoints.value)
const avgGoalsAreaPoints = computed(() => avgGoalsPoints.value)

const cumulativeGoals = computed(() => {
  if (!roundStatistics.value || roundStatistics.value.length === 0) return []
  
  let cumulative = 0
  return roundStatistics.value.map(r => {
    cumulative += r.totalGoals
    return {
      round: r.round,
      goals: cumulative
    }
  })
})

// Position tracking data for charts
const positionTrackingData = computed(() => {
  if (!data.value?.games) return []
  
  // Get all unique team names first
  const allTeamNames = new Set()
  data.value.games.forEach(game => {
    allTeamNames.add(game.home_name)
    allTeamNames.add(game.away_name)
  })
  
  // Get all unique rounds (only rounds with played games)
  const rounds = [...new Set(
    data.value.games
      .filter(g => g.home_goals !== null && g.away_goals !== null)
      .map(g => g.round)
  )].sort((a, b) => a - b)
  
  if (rounds.length === 0) return []
  
  const teams = {}
  
  // Initialize all teams
  allTeamNames.forEach(name => {
    teams[name] = []
  })
  
  rounds.forEach(round => {
    const gamesUpToRound = data.value.games.filter(g => 
      g.round <= round && 
      g.home_goals !== null && 
      g.away_goals !== null
    )
    
    const standings = {}
    
    // Initialize all teams with zero stats for this round
    allTeamNames.forEach(name => {
      standings[name] = { name, pts: 0, gf: 0, ga: 0 }
    })
    
    // Calculate standings up to this round
    gamesUpToRound.forEach(game => {
      standings[game.home_name].gf += game.home_goals
      standings[game.home_name].ga += game.away_goals
      standings[game.away_name].gf += game.away_goals
      standings[game.away_name].ga += game.home_goals
      
      if (game.home_goals > game.away_goals) {
        standings[game.home_name].pts += 3
      } else if (game.away_goals > game.home_goals) {
        standings[game.away_name].pts += 3
      } else {
        standings[game.home_name].pts += 1
        standings[game.away_name].pts += 1
      }
    })
    
    // Sort teams by points, goal difference, goals for, then alphabetically
    const sorted = Object.values(standings).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdA = a.gf - a.ga
      const gdB = b.gf - b.ga
      if (gdB !== gdA) return gdB - gdA
      if (b.gf !== a.gf) return b.gf - a.gf
      // If all stats are equal (especially for first round), sort alphabetically
      return a.name.localeCompare(b.name)
    })
    
    // Store position for each team in this round
    sorted.forEach((team, idx) => {
      teams[team.name].push({ round, position: idx + 1 })
    })
  })
  
  // Convert to array format for chart, filter out teams with no positions
  return Object.entries(teams)
    .filter(([name, positions]) => positions.length > 0)
    .map(([name, positions]) => ({
      name,
      positions
    }))
    .sort((a, b) => {
      // Sort by final position
      const lastPosA = a.positions[a.positions.length - 1]?.position || 999
      const lastPosB = b.positions[b.positions.length - 1]?.position || 999
    })
})

// Top performers for summary cards
const topPerformers = computed(() => {
  if (!dbStandings.value || dbStandings.value.length === 0 || !teamStatisticsFiltered.value) {
    return {
      mostAttacking: null,
      mostDefensive: null,
      highestBtts: null,
      bestHome: null,
      bestAway: null
    }
  }
  
  const standings = dbStandings.value
  const teamStats = teamStatisticsFiltered.value
  
  // Most attacking (highest GF)
  const mostAttacking = [...standings].sort((a, b) => b.gf - a.gf)[0]
  
  // Most defensive (lowest GA)
  const mostDefensive = [...standings].sort((a, b) => a.ga - b.ga)[0]
  
  // Highest BTTS %
  const highestBtts = [...teamStats].sort((a, b) => b.bttsPct - a.bttsPct)[0]
  
  // Best home form (calculate from computedStandings)
  const teams = computedStandings.value
  let bestHome = null
  let bestHomeWinPct = 0
  
  Object.values(teams).forEach(team => {
    const homeMatches = team.homeMatches.filter(m => m.goalsFor !== null)
    if (homeMatches.length >= 3) {
      const homeWins = homeMatches.filter(m => m.result === 'W').length
      const winPct = (homeWins / homeMatches.length) * 100
      if (winPct > bestHomeWinPct) {
        bestHomeWinPct = winPct
        bestHome = { name: team.name, winPct: Math.round(winPct), matches: homeMatches.length }
      }
    }
  })
  
  // Best away form
  let bestAway = null
  let bestAwayWinPct = 0
  
  Object.values(teams).forEach(team => {
    const awayMatches = team.awayMatches.filter(m => m.goalsFor !== null)
    if (awayMatches.length >= 3) {
      const awayWins = awayMatches.filter(m => m.result === 'W').length
      const winPct = (awayWins / awayMatches.length) * 100
      if (winPct > bestAwayWinPct) {
        bestAwayWinPct = winPct
        bestAway = { name: team.name, winPct: Math.round(winPct), matches: awayMatches.length }
      }
    }
  })
  
  return {
    mostGoals: mostAttacking ? { name: mostAttacking.team_name, totalGoals: mostAttacking.gf, matches: mostAttacking.gp } : null,
    bestDefense: mostDefensive ? { name: mostDefensive.team_name, conceded: mostDefensive.ga, matches: mostDefensive.gp } : null,
    highBtts: highestBtts ? { name: highestBtts.name, bttsPct: highestBtts.bttsPct, matches: highestBtts.matches } : null,
    bestHome: bestHome ? { name: bestHome.name, homeWinPct: bestHome.winPct, matches: bestHome.matches } : null,
    bestAway: bestAway ? { name: bestAway.name, awayWinPct: bestAway.winPct, matches: bestAway.matches } : null
  }
})

// Home vs Away comparison
const homeAwayComparison = computed(() => {
  if (!data.value?.games) return { home: {}, away: {} }
  
  const games = data.value.games.filter(g => g.home_goals !== null && g.away_goals !== null)
  
  let homeGoals = 0, awayGoals = 0
  let homeWins = 0, awayWins = 0, draws = 0
  
  games.forEach(g => {
    homeGoals += g.home_goals
    awayGoals += g.away_goals
    
    if (g.home_goals > g.away_goals) homeWins++
    else if (g.away_goals > g.home_goals) awayWins++
    else draws++
  })
  
  const total = games.length
  
  return {
    home: {
      goals: homeGoals,
      avgGoals: (homeGoals / total).toFixed(2),
      wins: homeWins,
      winPct: Math.round((homeWins / total) * 100)
    },
    away: {
      goals: awayGoals,
      avgGoals: (awayGoals / total).toFixed(2),
      wins: awayWins,
      winPct: Math.round((awayWins / total) * 100)
    },
    draws: {
      count: draws,
      drawPct: Math.round((draws / total) * 100)
    }
  }
})

// Result distribution for pie chart
const resultDistribution = computed(() => {
  const comparison = homeAwayComparison.value
  const total = comparison.home.wins + comparison.away.wins + comparison.draws.count
  
  return {
    homeWins: comparison.home.wins,
    homeWinsPct: comparison.home.winPct,
    draws: comparison.draws.count,
    drawsPct: comparison.draws.drawPct,
    awayWins: comparison.away.wins,
    awayWinsPct: comparison.away.winPct,
    total
  }
})

// Win rate evolution by round
const winRateEvolution = computed(() => {
  if (!data.value?.games) return []
  
  const rounds = {}
  
  data.value.games.forEach(game => {
    if (game.home_goals === null || game.away_goals === null) return
    
    if (!rounds[game.round]) {
      rounds[game.round] = { round: game.round, homeWins: 0, draws: 0, awayWins: 0, total: 0 }
    }
    
    rounds[game.round].total++
    
    if (game.home_goals > game.away_goals) rounds[game.round].homeWins++
    else if (game.away_goals > game.home_goals) rounds[game.round].awayWins++
    else rounds[game.round].draws++
  })
  
  return Object.values(rounds).map(r => ({
    round: r.round,
    homeWinPct: Math.round((r.homeWins / r.total) * 100),
    drawPct: Math.round((r.draws / r.total) * 100),
    awayWinPct: Math.round((r.awayWins / r.total) * 100)
  })).sort((a, b) => a.round - b.round)
})

// Clean sheets trend by round
const cleanSheetsTrend = computed(() => {
  if (!roundStatistics.value || roundStatistics.value.length === 0) return []
  
  return roundStatistics.value.map(r => ({
    round: r.round,
    cleanSheets: r.cleanSheets,
    cleanSheetsPct: r.cleanSheetsPct,
    matches: r.matches
  }))
})

// Round navigation
function previousRound() {
  if (selectedRound.value > 1) {
    selectedRound.value--
  }
}

function nextRound() {
  if (selectedRound.value < maxRound.value) {
    selectedRound.value++
  }
}

function changeRound(round) {
  selectedRound.value = round
}

// Predictions handler for parlay generator
function onPredictionsUpdated(predictions) {
  predictionsList.value = predictions
}
</script>
