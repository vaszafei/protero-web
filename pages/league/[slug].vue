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
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
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
          :leagueKey="data.key"
          :season="selectedSeason"
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
const selectedSeason = computed(() => route.query.season || currentSeason(route.params.slug))

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

// Computed: Get the round of the most recent upcoming games
const nextUnplayedRound = computed(() => {
  if (!data.value?.games) return 0
  
  const now = new Date()
  
  // Get all unplayed games
  const unplayedGames = data.value.games.filter(g => 
    g.home_goals === null && g.away_goals === null && g.date
  )
  
  if (unplayedGames.length === 0) return 0
  
  // Closest upcoming game first, but skip any whose round we do not know.
  //
  // A fixture that has kicked off is briefly in neither FlashScore feed — off
  // `fixtures` because it started, not yet on `results` because it has not
  // finished — so bin/backfill-rounds.js leaves its round NULL until the next
  // run. Reading the single closest game meant one such fixture rendered the
  // whole heading as "Round 0"; taking the nearest game that HAS a round shows
  // the right matchday, because its siblings all carry it.
  const candidates = unplayedGames
    .map(g => ({ ...g, dateObj: new Date(g.date) }))
    .filter(g => g.dateObj >= now || (now - g.dateObj) / (1000 * 60 * 60 * 24) <= 1) // Include games from last 24h
    .sort((a, b) => Math.abs(a.dateObj - now) - Math.abs(b.dateObj - now))

  return candidates.find(g => g.round)?.round || 0
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
  
  return liveStandings.value
})

// ────────────────────────────────────────────────────────────────────────
// NOTE: ~330 LOC of chart computeds (goalsDistribution, roundTrends,
// avgGoalsPoints, cumulativeGoals, positionTrackingData, topPerformers,
// homeAwayComparison, resultDistribution, winRateEvolution,
// cleanSheetsTrend) were removed May 1 2026. Charts now live inside their
// own components (OverviewView/AnalysisView) and fetch what they need.
// ────────────────────────────────────────────────────────────────────────

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
