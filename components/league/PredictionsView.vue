<template>
  <!-- ========== BASKETBALL ========== -->
  <BasketballPredictions
    v-if="isBball"
    :matches="bballMatches"
    :loading="loadingPredictions"
  />

  <!-- ========== FOOTBALL ========== -->
  <div v-else class="space-y-3 sm:space-y-4">
    <!-- An archived season has no unplayed fixture to predict. The tab is
         disabled upstream; this is the guard for a direct hit on the route. -->
    <div v-if="!isCurrentSeason" class="panel px-4 py-10 text-center">
      <p class="text-sm text-zinc-300 font-medium">{{ seasonLabel }} is finished.</p>
      <p class="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
        Predictions are a claim about fixtures that have not been played. Switch to
        {{ currentSeasonLabel }} to see them; what happened in {{ seasonLabel }} is on the
        Analysis tab.
      </p>
    </div>

    <template v-else>
      <div v-if="loadingPredictions" class="panel px-4 py-12 text-center text-zinc-500">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 mx-auto animate-spin mb-3" />
        <p class="text-sm">Loading predictions…</p>
      </div>

      <div v-else-if="enrichedPredictions.length === 0" class="panel px-4 py-12 text-center">
        <p class="text-sm text-zinc-300 font-medium">No fixture ahead.</p>
        <p class="text-xs text-zinc-500 mt-1">Every round in this season has been played.</p>
      </div>

      <template v-else>
        <!-- Modelled matches — full analysis card -->
        <section v-if="modelled.length" class="space-y-3">
          <header class="flex items-baseline gap-2 px-0.5">
            <h2 class="text-sm font-bold text-zinc-100 uppercase tracking-wider">Round {{ nextRound }}</h2>
            <span class="pill pill-blue">{{ modelled.length }} {{ modelled.length === 1 ? 'match' : 'matches' }}</span>
            <span class="ml-auto text-[10px] text-zinc-600">{{ currentSeasonLabel }}</span>
          </header>

          <FootballMatchCard
            v-for="match in modelled"
            :key="match.id"
            :match="match"
            :games="games"
          />
        </section>

        <!-- Fixtures whose sides have not played yet this season. The analysis
             card renders these as a wall of 0.00 — every input it averages is
             an empty list — so they get the fixture, the price and the model
             call, and nothing that pretends to be a form read. -->
        <section v-if="unformed.length" class="panel">
          <header class="panel-head">
            <h3 class="panel-title">Awaiting form</h3>
            <span class="pill pill-dim">{{ unformed.length }}</span>
            <span class="ml-auto text-[10px] text-zinc-600 hidden sm:inline">no completed fixture for either side yet</span>
          </header>
          <div class="p-2.5 grid gap-2.5 unformed-grid">
            <LeagueFixtureCard v-for="m in unformed" :key="m.id" :game="m" />
          </div>
          <p class="px-3 py-2 border-t border-white/5 text-[10px] text-zinc-600 leading-relaxed">
            Season-to-date averages need played fixtures. These cards carry the market price and the
            stored model call only.
          </p>
        </section>

        <div class="disclaimer">
          <span class="disclaimer-dot" />
          <p>
            Model output, not advice. Nothing on this page is evidence of edge — no wallet in this
            project reaches p&lt;0.05. Sizing and settlement live on the wallet console.
          </p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import BasketballPredictions from './BasketballPredictions.vue'
import FootballMatchCard from './FootballMatchCard.vue'
import LeagueFixtureCard from './LeagueFixtureCard.vue'

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

/**
 * Has either side played a fixture this season?
 *
 * `calcFilteredStats` returns its `empty` shape — '-' and '0.0' across the
 * board — when the team has no played match, and FootballMatchCard renders that
 * as "Expected goals 0.0 / Ball possession -% / 0% confidence" for every row.
 * On 2026-08-23 that was the whole Ligue 1 predictions tab: eight cards of
 * zeroes on matchday two of a season with one completed game.
 */
const modelled = computed(() =>
  enrichedPredictions.value.filter(m => playedSample(m) > 0)
)
const unformed = computed(() =>
  enrichedPredictions.value.filter(m => playedSample(m) === 0)
)

function playedSample(match) {
  const count = (name) => {
    const team = props.teamStats?.[name]
    if (!team?.matches) return 0
    return team.matches.filter(m => m.goalsFor !== null && m.goalsAgainst !== null).length
  }
  return count(match.home_name) + count(match.away_name)
}

/* ── Season framing ─────────────────────────────────────────────────────── */

const isCurrentSeason = computed(
  () => String(props.season) === currentSeason(props.leagueKey)
)
const seasonLabel = computed(() => fmtSeason(props.season))
const currentSeasonLabel = computed(() => fmtSeason(currentSeason(props.leagueKey)))

function fmtSeason(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{4})$/)
  return m ? `${m[1]}/${m[2].slice(2)}` : String(s || '')
}

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

<style scoped>
.panel {
  border-radius: 0.7rem;
  background: linear-gradient(180deg, rgba(37, 40, 48, 0.4), rgba(28, 31, 39, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.panel-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.panel-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgb(212, 212, 216);
}
.pill {
  padding: 0.06rem 0.4rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.pill-blue { background: rgba(57, 135, 229, 0.18); color: #8fbdf5; }
.pill-dim { background: rgba(255, 255, 255, 0.06); color: rgb(140, 143, 152); }

.unformed-grid { grid-template-columns: repeat(auto-fill, minmax(158px, 1fr)); }

.disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.7rem;
  background: rgba(250, 178, 25, 0.06);
  border: 1px solid rgba(250, 178, 25, 0.18);
  font-size: 0.68rem;
  line-height: 1.55;
  color: rgb(180, 168, 145);
}
.disclaimer-dot {
  width: 0.4rem;
  height: 0.4rem;
  margin-top: 0.4rem;
  border-radius: 999px;
  background: #fab219;
  flex-shrink: 0;
}
</style>
