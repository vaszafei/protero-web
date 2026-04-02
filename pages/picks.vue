<template>
  <div class="p-3 sm:p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Admin Picks</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-1">Betting picks from the admin wallet for your subscribed leagues</p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <USelect v-model="sport" :options="sportOptions" placeholder="All Sports" size="sm" />
        <USelect v-model="days" :options="dayOptions" size="sm" />
      </div>
    </div>

    <!-- No subscriptions message -->
    <div v-if="!loading && picks.length === 0 && subscribedLeagues.length === 0"
      class="bg-surface-light/50 border border-edge rounded-xl p-8 text-center">
      <Target :size="48" class="mx-auto text-zinc-500 mb-4" />
      <h3 class="text-lg font-semibold text-white mb-2">No League Subscriptions</h3>
      <p class="text-zinc-500 mb-4">Subscribe to leagues in your preferences to see admin picks.</p>
      <UButton to="/preferences" variant="soft" color="primary">Manage Preferences</UButton>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-zinc-500" />
    </div>

    <!-- Picks List -->
    <div v-else class="space-y-4">
      <!-- Stats bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div class="bg-surface-light/50 border border-edge rounded-lg p-3 sm:p-4 text-center">
          <p class="text-xl sm:text-2xl font-bold text-white">{{ picks.length }}</p>
          <p class="text-[11px] sm:text-xs text-zinc-500">Total Picks</p>
        </div>
        <div class="bg-surface-light/50 border border-edge rounded-lg p-3 sm:p-4 text-center">
          <p class="text-xl sm:text-2xl font-bold text-green-400">{{ wonPicks }}</p>
          <p class="text-[11px] sm:text-xs text-zinc-500">Won</p>
        </div>
        <div class="bg-surface-light/50 border border-edge rounded-lg p-3 sm:p-4 text-center">
          <p class="text-xl sm:text-2xl font-bold text-red-400">{{ lostPicks }}</p>
          <p class="text-[11px] sm:text-xs text-zinc-500">Lost</p>
        </div>
        <div class="bg-surface-light/50 border border-edge rounded-lg p-3 sm:p-4 text-center">
          <p class="text-xl sm:text-2xl font-bold text-amber-400">{{ pendingPicks }}</p>
          <p class="text-[11px] sm:text-xs text-zinc-500">Pending</p>
        </div>
      </div>

      <!-- No picks -->
      <div v-if="picks.length === 0" class="bg-surface-light/50 border border-edge rounded-xl p-8 text-center">
        <p class="text-zinc-500">No picks found for the selected period.</p>
      </div>

      <!-- Pick cards -->
      <div v-for="pick in picks" :key="pick.id"
        class="bg-surface-light/50 border border-edge rounded-xl p-3 sm:p-4 hover:border-edge-light transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div class="flex items-center gap-3 sm:gap-4">
            <!-- Status badge -->
            <span :class="statusClass(pick.status)" class="px-2 py-1 rounded text-xs font-semibold uppercase flex-shrink-0">
              {{ pick.status }}
            </span>
            <!-- Match info -->
            <div class="min-w-0">
              <p class="text-white font-medium text-sm sm:text-base truncate">
                {{ pick.games?.home_team?.name || 'Home' }} vs {{ pick.games?.away_team?.name || 'Away' }}
              </p>
              <p class="text-zinc-500 text-xs mt-0.5">
                {{ pick.games?.league_key }} · {{ formatDate(pick.games?.date) }}
                <span v-if="pick.games?.home_score != null"> · {{ pick.games.home_score }}-{{ pick.games.away_score }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-6 text-right ml-auto sm:ml-0">
            <!-- Bet details -->
            <div>
              <p class="text-white font-medium text-sm">{{ pick.selection }}</p>
              <p class="text-zinc-500 text-xs">{{ pick.bet_type }} · {{ pick.strategy || 'N/A' }}</p>
            </div>
            <!-- Odds & EV -->
            <div>
              <p class="text-white font-bold text-sm">@ {{ pick.odds?.toFixed(2) }}</p>
              <p v-if="pick.expected_value" class="text-xs" :class="pick.expected_value > 0 ? 'text-green-400' : 'text-red-400'">
                EV: {{ (pick.expected_value * 100).toFixed(1) }}%
              </p>
            </div>
            <!-- Follow pick button -->
            <UButton
              v-if="pick.status === 'pending'"
              size="xs"
              variant="soft"
              color="primary"
              @click="followPick(pick)"
            >
              Follow Pick
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Target } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const sport = ref('')
const days = ref('7')
const loading = ref(true)
const picks = ref([])
const subscribedLeagues = ref([])

const sportOptions = [
  { label: 'All Sports', value: '' },
  { label: 'Football', value: 'football' },
  { label: 'Basketball', value: 'basketball' }
]

const dayOptions = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 14 days', value: '14' },
  { label: 'Last 30 days', value: '30' }
]

const wonPicks = computed(() => picks.value.filter(p => p.status === 'won').length)
const lostPicks = computed(() => picks.value.filter(p => p.status === 'lost').length)
const pendingPicks = computed(() => picks.value.filter(p => p.status === 'pending').length)

const statusClass = (status) => ({
  'bg-green-500/20 text-green-400': status === 'won',
  'bg-red-500/20 text-red-400': status === 'lost',
  'bg-amber-500/20 text-amber-400': status === 'pending',
  'bg-surface-light0/20 text-zinc-500': status === 'void' || status === 'cashout'
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fetchPicks = async () => {
  loading.value = true
  try {
    const data = await api.fetchPicks({
      sport: sport.value || undefined,
      days: parseInt(days.value)
    })
    picks.value = data.picks || []
    subscribedLeagues.value = data.subscribed_leagues || []
  } catch (err) {
    console.error('Failed to fetch picks:', err)
  } finally {
    loading.value = false
  }
}

const followPick = async (pick) => {
  try {
    await api.createUserBet({
      game_id: pick.game_id,
      bet_type: pick.bet_type,
      selection: pick.selection,
      stake: pick.stake,
      odds: pick.odds,
      sport: pick.sport || 'football',
      source: 'followed_pick',
      admin_bet_id: pick.id
    })
    useToast().add({ title: 'Pick followed!', description: `Added ${pick.selection} to your bets`, color: 'green' })
  } catch (err) {
    useToast().add({ title: 'Error', description: err.data?.statusMessage || 'Failed to follow pick', color: 'red' })
  }
}

watch([sport, days], fetchPicks)
onMounted(fetchPicks)
</script>
