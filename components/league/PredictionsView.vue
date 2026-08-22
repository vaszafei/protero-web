<template>
  <!-- ========== BASKETBALL PREDICTIONS ========== -->
  <BasketballPredictions
    v-if="isBball"
    :matches="bballMatches"
    :loading="loadingPredictions"
  />

  <!-- ========== FOOTBALL PREDICTIONS ========== -->
  <Card v-else padding="3">
    <!-- Header -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-bold text-zinc-100">Round {{ nextRound }} Match Analysis</h2>
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

    <!-- Match Cards -->
    <div v-else class="space-y-4">
      <FootballMatchCard
        v-for="match in enrichedPredictions"
        :key="match.id"
        :match="match"
        :games="games"
      />

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
    </div>
  </Card>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import Card from '~/components/ui/Card.vue'
import BasketballPredictions from './BasketballPredictions.vue'
import FootballMatchCard from './FootballMatchCard.vue'

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

const isFootball = computed(() => props.sport === 'football')
const isBball = computed(() => props.sport === 'basketball')

// Basketball: lookup team from liveStandings by name
function getBballTeam(name) {
  if (!props.standings || !name) return null
  return props.standings.find(t => t.name === name) || null
}

// Basketball: project score from team stats
function projectBballScore(homeTeam, awayTeam) {
  if (!homeTeam || !awayTeam) return { home: 0, away: 0, total: 0 }
  const homePPG = homeTeam.home_ppg || homeTeam.ppg || 0
  const awayPPG = awayTeam.away_ppg || awayTeam.ppg || 0
  const homeOpp = homeTeam.home_opp_ppg || homeTeam.opp_ppg || 0
  const awayOpp = awayTeam.away_opp_ppg || awayTeam.opp_ppg || 0
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

// Database predictions
const dbPredictions = ref([])
const loadingPredictions = ref(true)
const api = useApi()

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

watch(() => props.roundMatches, () => {
  fetchDatabasePredictions()
}, { immediate: true })

onMounted(() => {
  fetchDatabasePredictions()
})

// Enriched predictions with team stats, recent form, and the matched DB
// prediction — the shape FootballMatchCard consumes.
const enrichedPredictions = computed(() => {
  if (!props.roundMatches || props.roundMatches.length === 0) return []

  return props.roundMatches
    .map(match => {
      const homeTeam = props.teamStats[match.home_name]
      const awayTeam = props.teamStats[match.away_name]

      const dbPred = dbPredictions.value.find(p => p.game?.id === match.id)

      const homeRecentForm = homeTeam?.formDetails?.slice(-5).reverse() || []
      const awayRecentForm = awayTeam?.formDetails?.slice(-5).reverse() || []

      const calcFormPoints = (form) => {
        if (!form || form.length === 0) return 0
        return form.reduce((sum, g) => {
          if (g.result === 'W') return sum + 3
          if (g.result === 'D') return sum + 1
          return sum
        }, 0)
      }

      const calcAvgGoals = (matches, key) => {
        if (!matches || matches.length === 0) return '0.0'
        const sum = matches.reduce((acc, m) => acc + (m[key] || 0), 0)
        return (sum / matches.length).toFixed(1)
      }

      const getFilteredMatches = (team, isHomeTeam) => {
        if (!team) return []
        const filter = statsFilter.value
        if (filter === 'overall') return team.matches
        if (filter === 'home') {
          return isHomeTeam ? team.homeMatches : team.awayMatches
        }
        if (filter === 'away') {
          return isHomeTeam ? team.awayMatches : team.homeMatches
        }
        return team.matches
      }

      const homeFilteredMatches = getFilteredMatches(homeTeam, true)
      const awayFilteredMatches = getFilteredMatches(awayTeam, false)

      const homeOverallMatches = homeTeam?.matches || []
      const awayOverallMatches = awayTeam?.matches || []

      const calcFilteredStats = (matches, teamName, isHomeInMatch) => {
        const empty = {
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
        if (!matches || matches.length === 0) return empty

        const playedMatches = matches.filter(m => m.goalsFor !== null && m.goalsAgainst !== null)
        if (playedMatches.length === 0) return empty

        const relevantGames = []
        playedMatches.forEach(m => {
          const game = props.games?.find(g =>
            g.round === m.round &&
            ((g.home_name === teamName && g.away_name === m.opponent) ||
             (g.away_name === teamName && g.home_name === m.opponent))
          )
          if (game) relevantGames.push(game)
        })

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

      let expectedGoals = (
        (parseFloat(homeStats.avgGoalsFor) || 0) +
        (parseFloat(awayStats.avgGoalsFor) || 0)
      ).toFixed(1)

      let predictedScore = null
      let predictedTotalGoals = null
      if (dbPred?.prediction?.outcome) {
        const scoreParts = dbPred.prediction.outcome.split('-').map(Number)
        if (scoreParts.length === 2 && !isNaN(scoreParts[0]) && !isNaN(scoreParts[1])) {
          predictedScore = dbPred.prediction.outcome
          predictedTotalGoals = scoreParts[0] + scoreParts[1]
        }
      }

      const h2h = findH2H(match.home_name, match.away_name)
      const h2hSummary = getH2HSummary(match.home_name, match.away_name)

      return {
        ...match,
        homeRecentForm,
        awayRecentForm,
        homeStats,
        awayStats,
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

function findH2H(home, away) {
  const cacheKey = `${home}-${away}`
  const data = h2hCache.value[cacheKey]
  if (!data || !data.matches) return []
  return data.matches
}

function getH2HSummary(home, away) {
  const cacheKey = `${home}-${away}`
  const data = h2hCache.value[cacheKey]
  if (!data || !data.summary) return null
  return data.summary
}

// Stats filter - default to 'home' for home team @ home vs away team @ away comparison
const statsFilter = ref('home')

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
</script>
