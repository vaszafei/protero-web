<template>
  <div class="p-3 sm:p-6">
    <!-- Wait for subscriptions to load before rendering provider -->
    <div v-if="!subsLoaded" class="max-w-[1600px] mx-auto flex items-center justify-center py-20">
      <div class="flex items-center gap-3 text-zinc-500">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
        <span class="text-sm">Loading...</span>
      </div>
    </div>

    <DashboardDataProvider v-else :leagues="leagues" :user-league-keys="userLeagueKeys" :wallet-id="selectedWalletId" :user-id="user?.id" v-slot="{ games, predictions, bets, parlays, walletStats, loading: dataLoading, refresh, hasLeagueGames }">
      <!-- Sync slot-prop games into reactive ref (needed for computed filteredGames/availableSports) -->
      {{ captureGames(games) }}
      <div class="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        
        <!-- Toolbar: wallet switcher (left) + sport dropdown (right) -->
        <DashboardToolbar
          :wallets="wallets"
          :selected-wallet-id="selectedWalletId"
          :available-sports="availableSports"
          :selected-sport="selectedSport"
          @wallet-change="selectedWalletId = $event"
          @sport-change="selectedSport = $event"
        />

        <!-- Mini wallet card (only when wallet data exists) -->
        <DashboardWalletCard v-if="walletStats" :wallet-stats="walletStats" />
        
        <div v-if="filteredGames.length === 0 && !dataLoading">
          <EmptyStateCard 
            title="No matches found"
            description="Add leagues to your profile to see matches and predictions"
          />
        </div>
        
        <template v-else>
          <!-- MOBILE: Date bar + game cards (hidden on lg+) -->
          <div class="lg:hidden">
            <MobileDateBar
              :games="filteredGames"
              :predictions="predictions"
              :leagues="leagues"
              :bets="bets"
              :parlays="parlays"
              :show-bets="bets.length > 0"
              @select-day="handleDaySelect"
            />
          </div>

          <!-- DESKTOP: Calendar + Side panel (hidden below lg) -->
          <div class="hidden lg:flex gap-6">
            <div class="flex-[11]">
              <GamesCalendar 
                :games="filteredGames" 
                :predictions="predictions"
                :leagues="leagues"
                :bets="bets"
                :parlays="parlays"
                :show-bets="bets.length > 0"
                @select-day="handleDaySelect"
              />
            </div>
            <div class="flex-[5] space-y-4">
              <DayMatchesPanel
                v-if="selectedDay"
                :key="selectedDay.date?.getTime() || 0"
                :date="selectedDay.date"
                :games="selectedDay.games"
                :leagues="leagues"
                :bets="bets"
                :parlays="parlays"
                :show-bets="bets.length > 0"
              />
              <div v-else class="select-day-card p-8 text-center">
                <p class="font-medium text-zinc-400">Select a day</p>
                <p class="text-sm mt-1 text-zinc-600">Click on any day in the calendar to view matches</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </DashboardDataProvider>
  </div>
</template>

<script setup>
import DashboardDataProvider from '~/components/dashboard/DashboardDataProvider.vue'
import GamesCalendar from '~/components/dashboard/GamesCalendar.vue'
import MobileDateBar from '~/components/dashboard/MobileDateBar.vue'
import EmptyStateCard from '~/components/dashboard/EmptyStateCard.vue'
import DayMatchesPanel from '~/components/dashboard/DayMatchesPanel.vue'
import DashboardWalletCard from '~/components/dashboard/DashboardWalletCard.vue'
import DashboardToolbar from '~/components/dashboard/DashboardToolbar.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { isAdmin, user } = useAuth()
const api = useApi()
const leagues = ref([])
const userLeagueKeys = ref([])
const selectedDay = ref(null)
const subsLoaded = ref(false)
const selectedSport = ref('all')
const wallets = ref([])
const selectedWalletId = ref(user.value?.preferred_wallet_id ?? null)

// Captured from slot to allow computed derivations
const capturedGames = ref([])

function captureGames(games) {
  if (games !== capturedGames.value) capturedGames.value = games
  return ''
}

const availableSports = computed(() => {
  const sports = new Set(
    capturedGames.value.map(g =>
      sportOf(g)
    )
  )
  return [...sports].filter(Boolean)
})

const filteredGames = computed(() => {
  if (selectedSport.value === 'all') return capturedGames.value
  return capturedGames.value.filter(g => {
    return sportOf(g) === selectedSport.value
  })
})

const handleDaySelect = (day) => {
  selectedDay.value = day
}

// Auto-select today when filteredGames first becomes non-empty
watch(filteredGames, (games) => {
  if (!selectedDay.value && games.length > 0) {
    autoSelectToday(games)
  }
}, { immediate: false })

// Auto-select today's date when games are loaded
const autoSelectToday = (games) => {
  if (!selectedDay.value && games.length > 0) {
    // Use Athens timezone so NBA late-night games (UTC date ≠ Athens date) are grouped correctly
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Athens',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    const todayGames = games.filter(game => {
      if (!game.date) return false
      const gameDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Athens',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(game.date))
      return gameDateStr === dateStr
    })
    
    if (todayGames.length > 0) {
      const today = new Date()
      selectedDay.value = {
        date: today,
        dayNumber: today.getDate(),
        isCurrentMonth: true,
        isToday: true,
        games: todayGames
      }
    }
  }
}

onMounted(async () => {
  try {
    // Load leagues, user subscriptions, and wallet list in parallel
    const [leaguesData, subsData, walletsData] = await Promise.all([
      api.fetchLeagues().catch(() => ({ leagues: [] })),
      api.fetchSubscriptions().catch(() => ({ subscriptions: [] })),
      user.value?.id
        ? api.fetchWallets().catch(() => ({ wallets: [] }))
        : Promise.resolve({ wallets: [] })
    ])

    if (leaguesData?.leagues) {
      leagues.value = leaguesData.leagues
    }

    if (walletsData?.wallets) {
      wallets.value = walletsData.wallets
      // If selectedWalletId not set yet (no preferred wallet), use the first available
      if (!selectedWalletId.value && wallets.value.length > 0) {
        selectedWalletId.value = wallets.value[0].id
      }
    }

    // For admin users, show all leagues; for regular users, only subscribed ones
    if (subsData?.subscriptions?.length > 0 && !isAdmin.value) {
      userLeagueKeys.value = subsData.subscriptions.map(s => s.league_key)
    }
  } catch (error) {
    console.error('Error loading leagues:', error)
  } finally {
    // Signal that subscriptions are ready — provider can now mount and fetch
    subsLoaded.value = true
  }
})
</script>

<style scoped>
.select-day-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02);
}
</style>
