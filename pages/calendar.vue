<template>
  <UiPageShell title="Calendar" subtitle="Fixtures by day, with the selected wallet's wagers on them.">
    <!-- Wait for subscriptions to load before rendering provider -->
    <div v-if="!subsLoaded" class="flex gap-6">
      <div class="flex-[11]"><UiSkeletonPanel :rows="10" /></div>
      <div class="flex-[5]"><UiSkeletonPanel :rows="6" /></div>
    </div>

    <div v-else class="calendar-body">
    <UiErrorState
      v-if="bootError"
      compact
      class="mb-3"
      title="Leagues or wallets failed to load — the calendar may be incomplete."
      :error="bootError"
      @retry="boot"
    />
    <DashboardDataProvider :leagues="leagues" :wallet-id="selectedWalletId" :user-id="user?.id" v-slot="{ games, predictions, bets, parlays, walletStats, loading: dataLoading, refresh, hasLeagueGames, errors }">
      <!-- Sync slot-prop games into reactive ref (needed for computed filteredGames/availableSports) -->
      {{ captureGames(games) }}
      <div class="space-y-4 sm:space-y-6">
        <UiErrorState
          v-if="errors.games && !dataLoading"
          title="The matches failed to load."
          :error="errors.games"
          @retry="refresh"
        />
        <div v-else-if="filteredGames.length === 0 && !dataLoading">
          <EmptyStateCard 
            title="No matches found"
            description="Add leagues to your profile to see matches and predictions"
          />
        </div>
        
        <template v-else>
          <!-- Calendar + Side panel (all viewports; stacks on narrow screens) -->
          <div class="flex flex-col xl:flex-row gap-6">
            <div class="xl:flex-[11]">
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
            <div class="xl:flex-[5] space-y-4">
              <!-- Toolbar + wallet card live in the game-list column -->
              <DashboardToolbar
                :wallets="wallets"
                :selected-wallet-id="selectedWalletId"
                :available-sports="availableSports"
                :selected-sport="selectedSport"
                @wallet-change="selectedWalletId = $event"
                @sport-change="selectedSport = $event"
              />
              <UiErrorState
                v-if="errors.walletStats"
                compact
                title="The wallet's performance failed to load — no ROI or verdict to show."
                :error="errors.walletStats"
                @retry="refresh"
              />
              <DashboardWalletCard v-else-if="walletStats" :wallet-stats="walletStats" :data-wallet-id="selectedWalletId" />
              <UiErrorState
                v-if="errors.parlays"
                compact
                title="The wallet's slips failed to load."
                :error="errors.parlays"
                @retry="refresh"
              />

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
              <div v-else class="panel p-6 text-center">
                <p class="font-medium text-zinc-400">Select a day</p>
                <p class="text-sm mt-1 text-zinc-600">Click on any day in the calendar to view matches</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </DashboardDataProvider>
    </div>
  </UiPageShell>
</template>

<script setup lang="ts">
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import DashboardDataProvider from '~/components/dashboard/DashboardDataProvider.vue'
import GamesCalendar from '~/components/dashboard/GamesCalendar.vue'
import EmptyStateCard from '~/components/dashboard/EmptyStateCard.vue'
import DayMatchesPanel from '~/components/dashboard/DayMatchesPanel.vue'
import DashboardWalletCard from '~/components/dashboard/DashboardWalletCard.vue'
import DashboardToolbar from '~/components/dashboard/DashboardToolbar.vue'

import { errorText } from '~/utils/error-text'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { user } = useAuth()
const api = useApi()
const leagues = ref<any[]>([])
const selectedDay = ref<any>(null)
const subsLoaded = ref(false)
const selectedSport = ref('all')
const wallets = ref<any[]>([])
const selectedWalletId = ref<any>(null)

// Captured from slot to allow computed derivations
const capturedGames = ref<any[]>([])

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

// A failed leagues / wallets / performance read is REPORTED, not turned into an empty
// roster that reads as "no matches" or silently picks the wrong default wallet.
const bootError = ref<string | null>(null)

async function boot() {
  bootError.value = null
  subsLoaded.value = false
  try {
    // Load leagues and wallet list in parallel
    const [leaguesData, walletsData] = await Promise.all([
      api.fetchLeagues(),
      user.value?.id ? api.fetchWallets() : Promise.resolve({ wallets: [] }),
    ])

    if (leaguesData?.leagues) {
      leagues.value = leaguesData.leagues
    }

    if (walletsData?.wallets) {
      wallets.value = walletsData.wallets
      // Default to the wallet actually carrying open exposure — the one an
      // operator checks first — not `preferred_wallet_id`, which for the
      // admin is W2 (V18, inactive, zero bet rows) and would open the
      // dashboard on a dead wallet. Same logic as pages/wallet.vue.
      if (!selectedWalletId.value && wallets.value.length > 0) {
        let perf = []
        try {
          perf = await api.fetchWalletPerformance()
        } catch (e) {
          bootError.value = errorText(e)
        }
        const withOpen = perf
          .filter(p => Number(p.n_pending) > 0)
          .sort((a, b) => Number(b.n_pending) - Number(a.n_pending))[0]
        selectedWalletId.value = withOpen
          ? withOpen.wallet_id
          : (wallets.value.find(w => w.lifecycle === 'trader') || wallets.value[0]).id
      }
    }
  } catch (e) {
    bootError.value = errorText(e)
  } finally {
    // Signal that data is ready — provider can now mount and fetch
    subsLoaded.value = true
  }
}

onMounted(boot)
</script>

<style scoped>
.calendar-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
</style>
