<template>
  <div class="flex flex-col h-full p-3 sm:p-4 gap-3">

    <!-- Sport filter pills -->
    <div class="flex items-center gap-1.5">
      <button
        v-for="sport in ['all', ...availableSports]"
        :key="sport"
        @click="selectedSport = sport"
        :class="[
          'px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize',
          selectedSport === sport
            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
            : 'sport-pill-inactive'
        ]"
      >
        {{ sport === 'all' ? 'All Sports' : sport }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex justify-center items-center">
      <div class="flex items-center gap-3 text-zinc-500">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
        <span class="text-sm">Loading leagues...</span>
      </div>
    </div>

    <!-- League Cards Grid -->
    <div v-else-if="filteredLeagues.length > 0" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
      <NuxtLink
        v-for="league in filteredLeagues"
        :key="league.key"
        :to="`/league/${league.key}?season=${selectedSeason}`"
        class="group league-card flex flex-col items-center rounded-xl p-2.5 sm:p-3 transition-all duration-200"
      >
        <!-- League Logo -->
        <div class="w-12 h-12 sm:w-14 sm:h-14 mb-2 flex items-center justify-center rounded-lg overflow-hidden bg-surface-base/60 group-hover:scale-105 transition-transform duration-200">
          <img
            :src="leagueLogo(league.key)"
            :alt="league.name"
            class="w-full h-full object-contain"
            @error="(e) => { e.target.src = '/placeholder-logo.svg' }"
          />
        </div>

        <!-- League Name -->
        <h3 class="text-[11px] sm:text-xs font-semibold text-zinc-200 text-center group-hover:text-zinc-100 transition-colors leading-tight line-clamp-2">
          {{ league.name }}
        </h3>

        <!-- Games Count Chip -->
        <div class="mt-1.5">
          <span
            class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            :class="league.sport === 'basketball' ? 'bg-orange-500/15 text-orange-400' : 'bg-primary-500/15 text-primary-400'"
          >
            {{ leagueStats[league.key]?.played || 0 }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="flex-1 flex items-center justify-center">
      <div class="league-card rounded-xl p-8 text-center">
        <p class="text-zinc-400 text-sm">No leagues available</p>
        <p class="text-zinc-500 text-xs mt-1">Leagues will appear once data is synced</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const loading = ref(true)
const api = useApi()
const selectedSeason = currentSeason()
const allLeagues = ref([])
const leagueStats = ref({})
const selectedSport = ref('all')

// The operator sees every league with games — the subscription/credit gate
// was removed with the consumer surface (2026-08-22).
const activeLeagues = computed(() => {
  return allLeagues.value.filter(l => (leagueStats.value[l.key]?.total || 0) > 0)
})

// Sports that actually have accessible leagues
const availableSports = computed(() => {
  const sports = [...new Set(activeLeagues.value.map(l => l.sport))]
  return sports.sort()
})

// Leagues filtered by selected sport
const filteredLeagues = computed(() => {
  if (selectedSport.value === 'all') return activeLeagues.value
  return activeLeagues.value.filter(l => l.sport === selectedSport.value)
})

// League logo path
const leagueLogo = (key) => `/data/leagues/${key}.png`

const loadLeagues = async () => {
  loading.value = true
  try {
    const [sportsData, leaguesApi] = await Promise.all([
      api.fetchSports(),
      api.fetchLeagues(selectedSeason).catch(() => null),
    ])

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

.sport-pill-inactive {
  background: rgba(28, 31, 39, 0.85);
  border: 1px solid rgba(42, 47, 58, 0.6);
  color: rgb(113 113 122);
}

.sport-pill-inactive:hover {
  color: rgb(212 212 216);
}
</style>
