<template>
  <div class="min-h-screen bg-surface-base p-3 sm:p-6">
    <div class="max-w-7xl mx-auto">

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="flex items-center gap-3 text-zinc-500">
          <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
          <span class="text-sm">Loading leagues...</span>
        </div>
      </div>

      <!-- League Cards Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <NuxtLink
          v-for="league in activeLeagues"
          :key="league.key"
          :to="`/league/${league.key}?season=${selectedSeason}`"
          class="group league-card flex flex-col items-center rounded-xl p-4 sm:p-5 transition-all duration-200"
        >
          <!-- League Logo -->
          <div class="w-20 h-20 sm:w-24 sm:h-24 mb-3 flex items-center justify-center rounded-xl overflow-hidden bg-surface-base/60 group-hover:scale-105 transition-transform duration-200">
            <img
              :src="leagueLogo(league.key)"
              :alt="league.name"
              class="w-full h-full object-contain"
              @error="(e) => { e.target.src = '/placeholder-logo.svg' }"
            />
          </div>

          <!-- League Name -->
          <h3 class="text-sm sm:text-base font-bold text-zinc-200 text-center group-hover:text-zinc-100 transition-colors leading-tight">
            {{ league.name }}
          </h3>

          <!-- Games Count Chip -->
          <div class="mt-2">
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              :class="league.sport === 'basketball' ? 'bg-orange-500/15 text-orange-400' : 'bg-primary-500/15 text-primary-400'">
              {{ leagueStats[league.key]?.played || 0 }} games
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && activeLeagues.length === 0" class="league-card rounded-xl p-8 text-center">
        <p class="text-zinc-400 text-sm">No leagues available yet</p>
        <p class="text-zinc-500 text-xs mt-1">Leagues will appear once data is synced</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const loading = ref(true)
const api = useApi()
const selectedSeason = '2025-2026'
const allLeagues = ref([])
const leagueStats = ref({})

// Flat list of all active leagues (no country grouping)
const activeLeagues = computed(() => {
  return allLeagues.value.filter(l => {
    const s = leagueStats.value[l.key]
    return s && s.total > 0
  })
})

// League logo path
const leagueLogo = (key) => `/data/leagues/${key}.png`

const loadLeagues = async () => {
  loading.value = true
  try {
    const [sportsData, leaguesApi] = await Promise.all([
      api.fetchSports(),
      api.fetchLeagues(selectedSeason).catch(() => null)
    ])

    // Flatten all leagues from all sports into a single list
    const leagues = []
    for (const sport of (sportsData.sports || [])) {
      for (const [country, countryLeagues] of Object.entries(sport.leagues || {})) {
          for (const l of countryLeagues) {
          leagues.push({ ...l, sport: sport.key, country })
        }
      }
    }
    allLeagues.value = leagues

    if (leaguesApi?.leagues) {
      const stats = {}
      for (const l of leaguesApi.leagues) {
        stats[l.key] = { played: l.played_count || 0, total: l.games_count || 0 }
      }
      leagueStats.value = stats
    }
  } catch (error) {
    console.error('Error loading leagues:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadLeagues)
</script>

<style scoped>
.league-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.league-card:hover {
  border-color: rgba(42, 47, 58, 0.7);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
