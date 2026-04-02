<template>
  <div class="p-3 sm:p-6">
    <!-- Wait for subscriptions to load before rendering provider -->
    <div v-if="!subsLoaded" class="max-w-[1600px] mx-auto flex items-center justify-center py-20">
      <div class="flex items-center gap-3 text-zinc-500">
        <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
        <span class="text-sm">Loading...</span>
      </div>
    </div>

    <DashboardDataProvider v-else :leagues="leagues" :user-league-keys="userLeagueKeys" :wallet-id="selectedWalletId" :user-id="user?.id" v-slot="{ games, predictions, bets, parlays, walletStats, loading: dataLoading, refresh, hasLeagueGames }">
      <!-- Capture games into reactive ref for sport filtering -->
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
        
        <!-- Auto-select today on mount (desktop calendar only) -->
        <template v-if="!selectedDay && filteredGames.length > 0">
          {{ autoSelectToday(filteredGames) }}
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
const { fetchCredits } = useCredits()
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
      g.sport || (g.league_key === 'nba' || g.league_key === 'euroleague' ? 'basketball' : 'football')
    )
  )
  return [...sports].filter(Boolean)
})

const filteredGames = computed(() => {
  if (selectedSport.value === 'all') return capturedGames.value
  return capturedGames.value.filter(g => {
    const sport = g.sport || (g.league_key === 'nba' || g.league_key === 'euroleague' ? 'basketball' : 'football')
    return sport === selectedSport.value
  })
})

const handleDaySelect = (day) => {
  selectedDay.value = day
}

// Auto-select today's date when games are loaded
const autoSelectToday = (games) => {
  if (!selectedDay.value && games.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const todayGames = games.filter(game => {
      if (!game.date) return false
      const gameDate = new Date(game.date)
      const gameYear = gameDate.getFullYear()
      const gameMonth = String(gameDate.getMonth() + 1).padStart(2, '0')
      const gameDay = String(gameDate.getDate()).padStart(2, '0')
      const gameDateStr = `${gameYear}-${gameMonth}-${gameDay}`
      return gameDateStr === dateStr
    })
    
    if (todayGames.length > 0) {
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
    // Load leagues, user subscriptions, credits, and wallet list in parallel
    const [leaguesData, subsData, walletsData] = await Promise.all([
      api.fetchLeagues().catch(() => ({ leagues: [] })),
      api.fetchSubscriptions().catch(() => ({ subscriptions: [] })),
      user.value?.id
        ? $fetch(`/api/wallet/list?userId=${user.value.id}`).catch(() => ({ wallets: [] }))
        : Promise.resolve({ wallets: [] }),
      fetchCredits().catch(() => {})
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
