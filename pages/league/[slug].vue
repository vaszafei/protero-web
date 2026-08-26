<template>
  <div class="min-h-screen bg-surface-base">
   <div class="max-w-[1600px] mx-auto p-3 sm:p-6">
    <!-- ═══ Header ════════════════════════════════════════════════════════ -->
    <div class="mb-4">
      <NuxtLink to="/leagues" class="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors mb-2">
        <ChevronLeft :size="14" />
        <span class="text-[11px] font-medium">Competitions</span>
      </NuxtLink>

      <!-- One row: the hero card (identity + season status) on the left, three
           loose metric cards on the right — no wrapping card around them
           (removed 2026-08-25, owner call), Clubs/Fitted on dropped the same
           day since they describe the twin's bookkeeping, not the competition. -->
      <div class="grid lg:grid-cols-[1.3fr_1fr] gap-3 items-stretch">
        <div class="hero rounded-xl px-4 py-3.5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="inline-flex items-center gap-2.5 min-w-0">
              <img
                v-if="leagueLogo"
                :src="leagueLogo"
                class="w-7 h-7 object-contain flex-shrink-0"
                :alt="data?.name || leagueName"
                @error="($event.target).style.display = 'none'"
              />
              <div class="min-w-0 flex items-baseline gap-1.5 flex-wrap">
                <h1 class="text-lg font-bold text-white whitespace-nowrap">{{ data?.name || leagueName }}</h1>
                <span v-if="twin?.is_cup" class="idchip">CUP</span>
                <span v-else-if="twin?.tier" class="idchip">TIER {{ twin.tier }}</span>
                <span v-if="data?.sport === 'basketball'" class="idchip idchip-orange">BASKETBALL</span>
                <span v-if="!twin && !twinPending" class="idchip idchip-dim">NOT FITTED</span>
              </div>
            </div>

            <label class="season-pill" title="Season">
              <select :value="selectedSeason" @change="selectedSeason = $event.target.value">
                <option v-if="!availableSeasons.length" :value="selectedSeason">{{ seasonLabel(selectedSeason) }}</option>
                <option v-for="s in availableSeasons" :key="s.season" :value="s.season">
                  {{ s.label || seasonLabel(s.season) }}
                </option>
              </select>
            </label>
          </div>

          <LeagueSeasonBar
            :is-current-season="isCurrentSeason"
            :round="selectedRound"
            :max-round="maxRound"
            :live-round="liveRound"
            :rounds="roundProgress"
            :unrounded="unroundedCount"
            :total="totalCount"
            :completed="completedCount"
            :by-date="byDate"
            @update:round="changeRound"
          />
        </div>

        <div class="flex items-center">
          <LeagueMetricsGrid
            :twin="twin"
            :pending="twinPending"
            :peers="twinPeers"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading || !data" class="flex justify-center items-center py-16">
      <div class="flex items-center gap-3 text-zinc-500">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
        <span class="text-sm">Loading league data...</span>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else>
      <TabNavigation
        v-model:activeTab="activeTab"
        :fixture-count="roundGames.length"
        :analysis-count="completedCount"
        :prediction-count="nextUnplayedMatches.length"
        :predictions-disabled="!isCurrentSeason"
        :predictions-hint="isCurrentSeason ? '' : 'Predictions exist only for the season being played'"
      />

      <!-- Overview — the twin and the fixtures it is fitted on, one pane -->
      <div v-show="activeTab === 'overview'" class="tab-anim">
        <LeagueOverview
          :league-key="data.key"
          :twin="twin"
          :pending="twinPending"
          :clubs="twinClubs"
          :standings="standingsAsOfRound"
          :round="roundLabel"
          :round-num="selectedRound"
          :max-round="maxRound"
          :round-games="roundGames"
          :all-games="data.games"
          :transitions="twinTransitions"
          :leagues="allLeagues"
          :by-date="byDate"
          :is-current-season="isCurrentSeason"
          @update:round="changeRound"
        >
          <!-- Competitions outside the fitted corpus keep their own table -
               basketball's ORtg / DRtg / pace columns have no twin equivalent. -->
          <template #standings>
            <LeagueStandingsTable
              :standings="filteredStandings"
              :sport="data.sport"
              :allGames="data.games"
              :leagueKey="data.key"
              v-model:filter="standingsFilter"
            />
          </template>
        </LeagueOverview>
      </div>

      <!-- Analysis -->
      <div v-show="activeTab === 'analysis'" class="tab-anim">
        <AnalysisView
          :leagueKey="data.key"
          :season="selectedSeason"
        />
      </div>

      <!-- Predictions — current season only; the tab is disabled otherwise -->
      <div v-show="activeTab === 'predictions'" class="tab-anim">
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
import { ref, computed, watch } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import TabNavigation from '~/components/league/TabNavigation.vue'
import LeagueSeasonBar from '~/components/league/LeagueSeasonBar.vue'
import LeagueOverview from '~/components/league/LeagueOverview.vue'
import LeagueStandingsTable from '~/components/league/LeagueStandingsTable.vue'
import AnalysisView from '~/components/league/AnalysisView.vue'
import PredictionsView from '~/components/league/PredictionsView.vue'
import ParlayGenerator from '~/components/league/ParlayGenerator.vue'
import { useLeagueStats } from '~/composables/useLeagueStats'
import { getLeagueLogoUrl } from '~/utils/teamLogo'

// Route and initial data
const route = useRoute()
const api = useApi()
const leagueName = route.params.slug

// Season is a query param, defaulting to the league's current season. Changing
// it re-runs the useAsyncData below (its key carries the season), which swaps
// the fixtures and recomputes the table — the "visit an older season" control.
const selectedSeason = computed({
  get: () => String(route.query.season || currentSeason(route.params.slug)),
  set: (v) => {
    const query = { ...route.query }
    if (v === currentSeason(route.params.slug)) delete query.season
    else query.season = v
    navigateTo({ path: route.path, query })
  }
})

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

/**
 * The twin layer for this competition. Loaded alongside the fixture data
 * rather than behind a tab, because the twin is what a competition IS — the
 * games are what happened in it.
 *
 * Fetched via useAsyncData (not onMounted) so the page does NOT paint the
 * fixtures/tabs first and then swap in the twin a second later. The two views
 * are one page and must appear together — awaiting this in setup holds the
 * render until both the league data and the twin are ready.
 *
 * Absent for anything outside the European football corpus (basketball,
 * LATAM), which LeagueOverview renders explicitly rather than as an empty panel.
 */
const twins = useTwins()

const { data: twinData, pending: twinPending } = await useAsyncData(
  `twin-${leagueName}`,
  async () => {
    const [t, clubs, trans, peers, lgs] = await Promise.all([
      twins.fetchTwinLeague(leagueName).catch(() => null),
      twins.fetchTwinTeams({ league: leagueName, limit: 100 }).catch(() => []),
      twins.fetchLeagueTransitions(leagueName).catch(() => []),
      twins.fetchTwinLeagues().catch(() => []),
      api.fetchLeagues().then(d => d.leagues || []).catch(() => []),
    ])
    // Strongest attack first — the ordering an operator reads a league in.
    const twinClubs = [...clubs].sort((a, b) => (b.attack ?? -99) - (a.attack ?? -99))
    return { twin: t, twinClubs, twinTransitions: trans, twinPeers: peers, allLeagues: lgs }
  }
)

const twin = computed(() => twinData.value?.twin ?? null)
const twinClubs = computed(() => twinData.value?.twinClubs ?? [])
const twinTransitions = computed(() => twinData.value?.twinTransitions ?? [])
const twinPeers = computed(() => twinData.value?.twinPeers ?? [])
const allLeagues = computed(() => twinData.value?.allLeagues ?? [])

// Every season this league has fixtures for — the "visit an older season" picker.
const { data: seasonsData } = await useAsyncData(
  `seasons-${leagueName}`,
  () => $fetch(`/api/seasons/${leagueName}`).catch(() => ({ seasons: [] }))
)
const availableSeasons = computed(() => seasonsData.value?.seasons || [])

// Is this a basketball league?
const isBball = computed(() => data.value?.sport === 'basketball')

/**
 * How this competition is paged: by round, or by match day.
 *
 * Basketball has no rounds and never did. What forced this to become a
 * question is that FOOTBALL competitions can have none either — `games.round`
 * is filled by bin/backfill-rounds.js from the FlashScore tournament feed, and
 * for the UEFA cups and the six domestic cups it fills nothing at all. On
 * 2026-08-23 champions_league 2026/27 held 90 fixtures, every one with a NULL
 * round: round paging showed "Rd 1 / 1" containing zero games, and all 90 were
 * unreachable from the page. Paging those by date makes them visible using the
 * machinery basketball already uses.
 */
const hasRounds = computed(() => (data.value?.games || []).some(g => g.round))
const byDate = computed(() => isBball.value || !hasRounds.value)

// UI State. "Twin" and "Fixtures" were merged into one Overview on 2026-08-23 —
// they were two halves of one subject and reading either needed the other.
const activeTab = ref('overview')
const selectedRound = ref(1)
const standingsFilter = ref('overall')

// Set initial round - find next upcoming round from today
// For basketball: date-based (each day = one "page")
// For football: round-based
function resetRound() {
  if (!data.value?.games) return
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  if (byDate.value) {
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
    // A round can finish out of order — a handful of round-N fixtures get
    // postponed past round N+1 (European-competition clubs, most often).
    // Stopping at the first round with ANY future-dated game strands the page
    // on round N while N+1 (already mostly played) sits one arrow away. Pick
    // the highest round that's at least half played instead, so a couple of
    // stragglers don't block progression to the round the league has reached.
    const rounds = [...new Set(data.value.games.map(g => g.round).filter(r => r != null))].sort((a, b) => a - b)
    let currentRound = null
    for (const round of rounds) {
      const roundGamesArr = data.value.games.filter(g => g.round === round)
      const playedCount = roundGamesArr.filter(g => g.home_goals != null).length
      if (playedCount / roundGamesArr.length >= 0.5) {
        currentRound = round
      }
    }
    selectedRound.value = currentRound || rounds[0] || 1
  }
}
resetRound()

// Changing the season only updates the route query (same component instance),
// so useAsyncData will not re-run on its own — refresh the league data when the
// season changes, then jump to that season's latest round once it lands.
watch(selectedSeason, () => refreshLeague())
watch(leagueData, () => resetRound())

// Basketball: sorted unique game dates (used instead of rounds)
const gameDates = computed(() => {
  if (!byDate.value || !data.value?.games) return []
  return [...new Set(
    data.value.games
      .map(g => g.date ? g.date.split('T')[0] : null)
      .filter(Boolean)
  )].sort()
})

// The date string for the currently selected "round" (basketball only)
const selectedRoundDate = computed(() => {
  if (!byDate.value) return null
  return gameDates.value[selectedRound.value - 1] || null
})

// Computed: Max round number
const maxRound = computed(() => {
  if (!data.value?.games) return 1
  if (byDate.value) return gameDates.value.length || 1
  return Math.max(...data.value.games.map(g => g.round || 1))
})

// Computed: Current round games
const roundGames = computed(() => {
  if (!data.value?.games) return []
  if (byDate.value) {
    const targetDate = selectedRoundDate.value
    if (!targetDate) return []
    return data.value.games.filter(g => g.date && g.date.startsWith(targetDate))
  }
  return data.value.games.filter(g => g.round === selectedRound.value)
})

// Human label for the current round — "Rd 12" or "Day 34".
const roundLabel = computed(() => {
  if (byDate.value) return `Day ${selectedRound.value}`
  return `Rd ${selectedRound.value}`
})

/**
 * Season progress, per round.
 *
 * `games.round` is filled by bin/backfill-rounds.js from the FlashScore
 * tournament feed, whose first page covers roughly twelve rounds around today —
 * so a season in progress legitimately holds fixtures with no round yet. Those
 * belong in NO round and are counted separately rather than silently folded
 * into round 1, which is what `g.round || 1` did: on 2026-08-23 that would have
 * put 189 of Ligue 1's 301 fixtures into a round that has nine games.
 */
const roundProgress = computed(() => {
  const games = data.value?.games || []
  if (!games.length) return []

  if (byDate.value) {
    return gameDates.value.map((d, i) => {
      const dayGames = games.filter(g => g.date && g.date.startsWith(d))
      return {
        round: i + 1,
        total: dayGames.length,
        completed: dayGames.filter(g => g.home_goals != null).length,
      }
    })
  }

  const out = []
  for (let r = 1; r <= maxRound.value; r++) {
    const rg = games.filter(g => g.round === r)
    out.push({ round: r, total: rg.length, completed: rg.filter(g => g.home_goals != null).length })
  }
  return out
})

/** Fixtures carrying no round number — they render in no round below. */
const unroundedCount = computed(() => {
  if (byDate.value) return 0
  return (data.value?.games || []).filter(g => !g.round).length
})

/** Completed fixtures in the season — what Analysis actually has to work with. */
const completedCount = computed(() =>
  (data.value?.games || []).filter(g => g.home_goals != null).length
)

/** Every fixture in the season, round or no round. */
const totalCount = computed(() => (data.value?.games || []).length)

/**
 * The round the calendar is on, for the "go to now" jump. Same rule resetRound
 * uses, kept as a computed so the button knows whether it is already there.
 */
const liveRound = computed(() => {
  const games = data.value?.games || []
  if (!games.length) return null
  const today = new Date()

  if (byDate.value) {
    const todayStr = today.toISOString().split('T')[0]
    const idx = gameDates.value.findIndex(d => d >= todayStr)
    return idx >= 0 ? idx + 1 : gameDates.value.length || null
  }

  const rounds = [...new Set(games.map(g => g.round).filter(Boolean))].sort((a, b) => a - b)
  for (const r of rounds) {
    if (games.some(g => g.round === r && g.date && new Date(g.date) > today)) return r
  }
  return rounds[rounds.length - 1] || null
})

/**
 * Predictions are a claim about fixtures not yet played. An archived season has
 * none, and rendering the view against one produced a wall of zeroes — every
 * form and stat input is empty because the model never ran on it.
 */
/**
 * The newest season this competition actually has fixtures for.
 *
 * Not the same thing as `currentSeason()`, which is a calendar rule. A cup that
 * has not been drawn yet, or a competition we stopped collecting, has no row
 * for the season the calendar says we are in: on 2026-08-23 `fa_cup` resolved
 * to 2026-2027, which holds zero fixtures and is not in its own season list —
 * so the <select> read 2026-2027 while DISPLAYING 2025/26, its first option.
 */
const latestSeason = computed(
  () => availableSeasons.value[0]?.season || currentSeason(route.params.slug)
)

/**
 * Predictions are a claim about fixtures not yet played, so they belong to the
 * season being played and nowhere else. An archived season rendered the view
 * against empty inputs — a wall of 0.00 for every stat the model averages.
 */
const isCurrentSeason = computed(() => selectedSeason.value === latestSeason.value)

// Land on a season that exists. Without this the picker showed one season and
// the page loaded another.
watch(availableSeasons, (list) => {
  if (!list.length) return
  if (list.some(s => s.season === selectedSeason.value)) return
  selectedSeason.value = list[0].season
}, { immediate: true })

// Leaving Predictions selected while switching to an archived season would show
// a disabled tab's contents.
watch(isCurrentSeason, (now) => {
  if (!now && activeTab.value === 'predictions') activeTab.value = 'overview'
})

const leagueLogo = computed(() => getLeagueLogoUrl(data.value?.key || leagueName))

// '2026-2027' → '2026/27'
function seasonLabel(season) {
  const s = String(season || '')
  const m = s.match(/^(\d{4})-(\d{4})$/)
  if (m) return `${m[1]}/${m[2].slice(2)}`
  return s
}

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

// Calculate a standings table from a games array.
// Used twice: season-to-date (all games) and "as of round N" (games up to N).
function buildStandings(gamesArr) {
  if (!gamesArr?.length) return []
  
  const standings = {}
  
  // Get all teams from games
  gamesArr.forEach(game => {
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
  gamesArr
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
}

// Season-to-date table — all completed games. Feeds the twin table and
// PredictionsView (basketball projection needs the full season, not a cut).
const liveStandings = computed(() => buildStandings(data.value?.games || []))

// "As of round N" table — games up to and including the selected round, so the
// operator can walk a season backwards and see the table at any point.
const gamesAsOfRound = computed(() => {
  if (!data.value?.games) return []
  if (byDate.value) {
    // Basketball: one "round" = one day. Include days up to the selected day.
    const targetIdx = selectedRound.value - 1
    const dates = gameDates.value
    const targetDate = dates[targetIdx]
    if (!targetDate) return data.value.games
    return data.value.games.filter(g => g.date && g.date.split('T')[0] <= targetDate)
  }
  return data.value.games.filter(g => (g.round || 1) <= selectedRound.value)
})
const standingsAsOfRound = computed(() => buildStandings(gamesAsOfRound.value))

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

// Round navigation. LeagueSeasonBar emits an absolute round for every control
// it owns — stepper, rail segment and "go to now" — so there is one setter.
function changeRound(round) {
  selectedRound.value = Math.min(maxRound.value, Math.max(1, Number(round) || 1))
}

// Predictions handler for parlay generator
function onPredictionsUpdated(predictions) {
  predictionsList.value = predictions
}
</script>

<style scoped>
.hero {
  background: linear-gradient(165deg, rgba(41, 45, 54, 0.55), rgba(26, 29, 36, 0.95));
  border: 1px solid #2a2f3a;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 10px 28px -18px rgba(0, 0, 0, 0.9);
  transition: border-color 220ms ease, box-shadow 220ms ease;
}
.hero:hover {
  border-color: #353c48;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 14px 32px -16px rgba(0, 0, 0, 0.95);
}

.idchip {
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: rgba(255, 255, 255, 0.07);
  color: rgb(161, 161, 170);
}
.idchip-orange { background: rgba(217, 89, 38, 0.16); color: #e8905f; }
.idchip-dim { background: rgba(255, 255, 255, 0.04); color: rgb(113, 113, 122); }

/* Season selector — minimal rounded pill, no label text. */
.season-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #1c1f27;
  border: 1px solid #2a2f3a;
}
.season-pill select {
  appearance: none;
  max-width: 8rem;
  padding: 0.32rem 1.6rem 0.32rem 0.85rem;
  border-radius: 999px;
  background:
    linear-gradient(45deg, transparent 50%, rgb(113, 113, 122) 50%) calc(100% - 12px) calc(50% + 1px) / 5px 5px no-repeat,
    transparent;
  border: none;
  color: rgb(228, 231, 236);
  font-size: 0.72rem;
  font-weight: 600;
}
.season-pill select:focus { outline: none; }
.season-pill:focus-within { border-color: rgba(57, 135, 229, 0.6); }

/* Tab panes fade-slide in on every switch. The animation restarts because
   v-show toggles the element from display:none to block — no remount, so the
   heavy views keep their fetched state. */
.tab-anim {
  animation: pane-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes pane-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tab-anim { animation: none; }
  .hero { transition: none; }
}
</style>
