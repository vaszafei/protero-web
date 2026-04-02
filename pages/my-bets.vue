<template>
  <div class="p-3 sm:p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">My Bets</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-1">Track your personal betting history and performance</p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <USelect v-model="statusFilter" :options="statusOptions" placeholder="All" size="sm" />
        <USelect v-model="sportFilter" :options="sportOptions" placeholder="All Sports" size="sm" />
        <UButton icon="i-heroicons-plus" size="sm" @click="showNewBet = true">Log Bet</UButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div class="bg-surface-light/50 border border-edge rounded-lg p-3 sm:p-4 text-center">
        <p class="text-xl sm:text-2xl font-bold text-white">{{ stats.total_bets }}</p>
        <p class="text-[11px] sm:text-xs text-zinc-500">Total Bets</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-4 text-center">
        <p class="text-2xl font-bold" :class="stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'">
          {{ stats.win_rate }}%
        </p>
        <p class="text-xs text-zinc-500">Win Rate</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-4 text-center">
        <p class="text-2xl font-bold" :class="stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'">
          {{ stats.total_profit >= 0 ? '+' : '' }}{{ stats.total_profit }}€
        </p>
        <p class="text-xs text-zinc-500">Profit/Loss</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-4 text-center">
        <p class="text-2xl font-bold" :class="stats.roi >= 0 ? 'text-green-400' : 'text-red-400'">
          {{ stats.roi >= 0 ? '+' : '' }}{{ stats.roi }}%
        </p>
        <p class="text-xs text-zinc-500">ROI</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-white">{{ stats.avg_odds }}</p>
        <p class="text-xs text-zinc-500">Avg Odds</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-zinc-500" />
    </div>

    <!-- Empty state -->
    <div v-else-if="bets.length === 0" class="bg-surface-light/50 border border-edge rounded-xl p-8 text-center">
      <Banknote :size="48" class="mx-auto text-zinc-500 mb-4" />
      <h3 class="text-lg font-semibold text-white mb-2">No Bets Yet</h3>
      <p class="text-zinc-500 mb-4">Start tracking your bets or follow admin picks.</p>
      <div class="flex justify-center gap-3">
        <UButton variant="soft" color="primary" @click="showNewBet = true">Log a Bet</UButton>
        <UButton variant="ghost" to="/picks">View Picks</UButton>
      </div>
    </div>

    <!-- Bets List -->
    <div v-else class="space-y-3">
      <div v-for="bet in bets" :key="bet.id"
        class="bg-surface-light/50 border border-edge rounded-xl p-4 hover:border-edge-light transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-3 sm:gap-4">
            <span :class="statusClass(bet.status)" class="px-2 py-1 rounded text-xs font-semibold uppercase">
              {{ bet.status }}
            </span>
            <div>
              <p class="text-white font-medium">
                {{ bet.games?.home_team?.name || 'Home' }} vs {{ bet.games?.away_team?.name || 'Away' }}
              </p>
              <p class="text-zinc-500 text-xs mt-0.5">
                {{ bet.games?.league_key }} · {{ formatDate(bet.games?.date) }}
                <span v-if="bet.source === 'followed_pick'" class="text-blue-400 ml-1">· Followed Pick</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-6 text-right flex-wrap">
            <div>
              <p class="text-white font-medium">{{ bet.selection }}</p>
              <p class="text-zinc-500 text-xs">{{ bet.bet_type }}</p>
            </div>
            <div>
              <p class="text-white font-bold">{{ bet.stake }}€ @ {{ bet.odds?.toFixed(2) }}</p>
              <p v-if="bet.profit != null" class="text-xs" :class="bet.profit >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ bet.profit >= 0 ? '+' : '' }}{{ bet.profit.toFixed(2) }}€
              </p>
            </div>
            <!-- Actions for pending bets -->
            <UDropdown v-if="bet.status === 'pending'" :items="betActions(bet)">
              <UButton icon="i-heroicons-ellipsis-vertical" variant="ghost" size="xs" />
            </UDropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- New Bet Modal -->
    <UModal v-model="showNewBet">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-white">Log New Bet</h3>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Game ID">
            <UInput v-model="newBet.game_id" placeholder="Game ID" />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Bet Type">
              <USelect v-model="newBet.bet_type" :options="betTypeOptions" />
            </UFormGroup>
            <UFormGroup label="Sport">
              <USelect v-model="newBet.sport" :options="[{ label: 'Football', value: 'football' }, { label: 'Basketball', value: 'basketball' }]" />
            </UFormGroup>
          </div>
          <UFormGroup label="Selection">
            <UInput v-model="newBet.selection" placeholder="e.g. Home Win, Over 2.5" />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Stake (€)">
              <UInput v-model.number="newBet.stake" type="number" step="0.01" />
            </UFormGroup>
            <UFormGroup label="Odds">
              <UInput v-model.number="newBet.odds" type="number" step="0.01" />
            </UFormGroup>
          </div>
          <UFormGroup label="Bookmaker">
            <UInput v-model="newBet.bookmaker" placeholder="Optional" />
          </UFormGroup>
          <UFormGroup label="Notes">
            <UTextarea v-model="newBet.notes" placeholder="Optional notes" />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="showNewBet = false">Cancel</UButton>
            <UButton color="primary" :loading="saving" @click="saveBet">Save Bet</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
import { Banknote } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()

const statusFilter = ref('')
const sportFilter = ref('')
const loading = ref(true)
const saving = ref(false)
const showNewBet = ref(false)
const bets = ref([])
const stats = ref(null)

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' }
]

const sportOptions = [
  { label: 'All Sports', value: '' },
  { label: 'Football', value: 'football' },
  { label: 'Basketball', value: 'basketball' }
]

const betTypeOptions = [
  { label: '1X2', value: '1x2' },
  { label: 'Over/Under', value: 'over_under' },
  { label: 'BTTS', value: 'btts' },
  { label: 'Double Chance', value: 'double_chance' },
  { label: 'Asian Handicap', value: 'asian_handicap' },
  { label: 'Other', value: 'other' }
]

const newBet = ref({
  game_id: '',
  bet_type: '1x2',
  selection: '',
  stake: 10,
  odds: 1.80,
  bookmaker: '',
  sport: 'football',
  notes: ''
})

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

const betActions = (bet) => [[
  {
    label: 'Mark as Won',
    icon: 'i-heroicons-check-circle',
    click: () => updateBet(bet.id, 'won', bet.stake * bet.odds - bet.stake)
  },
  {
    label: 'Mark as Lost',
    icon: 'i-heroicons-x-circle',
    click: () => updateBet(bet.id, 'lost', -bet.stake)
  },
  {
    label: 'Void',
    icon: 'i-heroicons-minus-circle',
    click: () => updateBet(bet.id, 'void', 0)
  }
]]

const fetchBets = async () => {
  loading.value = true
  try {
    const data = await api.fetchUserBets({
      status: statusFilter.value || undefined,
      sport: sportFilter.value || undefined
    })
    bets.value = data.bets || []
  } catch (err) {
    console.error('Failed to fetch bets:', err)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const data = await api.fetchBetStats()
    stats.value = data.stats
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  }
}

const saveBet = async () => {
  saving.value = true
  try {
    await api.createUserBet(newBet.value)
    toast.add({ title: 'Bet saved', color: 'green' })
    showNewBet.value = false
    newBet.value = { game_id: '', bet_type: '1x2', selection: '', stake: 10, odds: 1.80, bookmaker: '', sport: 'football', notes: '' }
    fetchBets()
    fetchStats()
  } catch (err) {
    toast.add({ title: 'Error', description: err.data?.statusMessage || 'Failed to save bet', color: 'red' })
  } finally {
    saving.value = false
  }
}

const updateBet = async (id, status, profit) => {
  try {
    await api.updateUserBet(id, { status, profit })
    toast.add({ title: `Bet marked as ${status}`, color: status === 'won' ? 'green' : 'amber' })
    fetchBets()
    fetchStats()
  } catch (err) {
    toast.add({ title: 'Error', description: 'Failed to update bet', color: 'red' })
  }
}

watch([statusFilter, sportFilter], fetchBets)
onMounted(() => {
  fetchBets()
  fetchStats()
})
</script>
