<template>
  <div class="p-3 sm:p-6 max-w-6xl mx-auto min-h-screen">
    <!-- Header -->
    <div class="mb-5 sm:mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-white">Wallet</h1>
      <p class="text-zinc-500 text-xs sm:text-sm mt-1">AI wallet performance & your personal bets</p>
    </div>

    <!-- ═══ FOLLOWED WALLET CARDS ═══ -->
    <div v-if="wallets.length > 0" class="space-y-4 mb-6">
      <!-- Wallet selector if multiple -->
      <div v-if="wallets.length > 1" class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="w in wallets" :key="w.id"
          @click="activeWalletId = w.id"
          class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
          :class="activeWalletId === w.id
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : 'bg-surface-light text-zinc-400 border border-edge hover:border-zinc-600'"
        >
          {{ w.name }}
        </button>
      </div>

      <!-- Active wallet hero card -->
      <div v-if="activeWallet" class="wallet-hero rounded-xl p-4 sm:p-6 relative overflow-hidden">
        <div class="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-500"></div>
          <div class="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500"></div>
        </div>

        <div class="relative">
          <!-- Wallet name + unfollow -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm sm:text-base font-bold text-zinc-200">{{ activeWallet.name }}</h2>
              <p class="text-[10px] text-zinc-500 mt-0.5">AI-managed · Auto-updated daily</p>
            </div>
            <button
              @click="unfollowWallet(activeWallet.id)"
              class="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
            >
              Unfollow
            </button>
          </div>

          <!-- Balance -->
          <div class="mb-4">
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Balance</p>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">${{ formatNum(activeWallet.balance) }}</span>
              <span class="text-sm font-bold tabular-nums" :class="walletPL >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ walletPL >= 0 ? '+' : '' }}{{ formatNum(walletPL) }}
              </span>
            </div>
          </div>

          <!-- Stats row -->
          <div class="grid grid-cols-4 gap-2">
            <div>
              <p class="text-[10px] text-zinc-500">ROI</p>
              <p class="text-sm font-bold tabular-nums" :class="walletROI >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ walletROI >= 0 ? '+' : '' }}{{ walletROI.toFixed(1) }}%
              </p>
            </div>
            <div>
              <p class="text-[10px] text-zinc-500">Win Rate</p>
              <p class="text-sm font-bold text-zinc-200 tabular-nums">{{ activeWallet.win_rate?.toFixed(1) || '0' }}%</p>
            </div>
            <div>
              <p class="text-[10px] text-zinc-500">Bets</p>
              <p class="text-sm font-bold text-zinc-200 tabular-nums">{{ activeWallet.total_bets || 0 }}</p>
            </div>
            <div>
              <p class="text-[10px] text-zinc-500">W / L</p>
              <p class="text-sm font-bold text-zinc-200 tabular-nums">{{ activeWallet.total_won || 0 }}/{{ activeWallet.total_lost || 0 }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Browse wallets CTA (when no followed wallets) -->
    <div v-else-if="!loading" class="bg-surface-light/50 border border-edge rounded-xl p-6 sm:p-8 text-center mb-6">
      <Wallet :size="40" class="mx-auto text-zinc-500 mb-3" />
      <h3 class="text-base font-semibold text-white mb-1">No Wallets Followed</h3>
      <p class="text-zinc-500 text-sm mb-4">Follow an AI wallet to track its bets and performance.</p>
      <button
        @click="showBrowse = true"
        class="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-colors"
      >
        Browse Wallets
      </button>
    </div>

    <!-- ═══ TABS: AI Bets | My Bets ═══ -->
    <div class="wallet-tabs-card rounded-lg overflow-hidden">
      <div class="flex border-b border-edge/50">
        <button
          @click="tab = 'ai'"
          class="flex-1 px-4 py-3 text-sm font-medium transition-all relative"
          :class="tab === 'ai' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
        >
          AI Bets
          <span v-if="pendingCount > 0" class="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{{ pendingCount }}</span>
          <div v-if="tab === 'ai'" class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/30"></div>
        </button>
        <button
          @click="tab = 'personal'"
          class="flex-1 px-4 py-3 text-sm font-medium transition-all relative"
          :class="tab === 'personal' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
        >
          My Bets
          <div v-if="tab === 'personal'" class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-blue-500/60 to-blue-400/30"></div>
        </button>
      </div>

      <div class="p-3 sm:p-4">
        <!-- ─── AI BETS TAB ─── -->
        <div v-if="tab === 'ai'">
          <!-- Filters -->
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <button
              v-for="f in statusFilters" :key="f.value"
              @click="aiBetFilter = f.value"
              class="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
              :class="aiBetFilter === f.value
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-300'"
            >{{ f.label }}</button>
          </div>

          <!-- Loading -->
          <div v-if="aiBetsLoading" class="flex justify-center py-8">
            <svg class="w-5 h-5 animate-spin text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>

          <!-- No bets -->
          <div v-else-if="filteredAiBets.length === 0" class="text-center py-8">
            <p class="text-sm text-zinc-500">No {{ aiBetFilter || '' }} bets found</p>
          </div>

          <!-- Bet list -->
          <div v-else class="space-y-1.5">
            <div
              v-for="bet in filteredAiBets" :key="bet.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
            >
              <!-- Status dot -->
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDot(bet.status)"></div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-[12px] font-medium text-zinc-200 truncate">
                  {{ bet.home_name || 'Home' }} vs {{ bet.away_name || 'Away' }}
                </p>
                <p class="text-[10px] text-zinc-500 truncate">
                  {{ bet.bet_type_display }} · {{ formatDate(bet.date) }}
                </p>
              </div>

              <!-- Odds + stake -->
              <div class="text-right flex-shrink-0">
                <p class="text-[12px] font-bold text-zinc-200 tabular-nums">
                  ${{ bet.stake?.toFixed(2) }} @ {{ bet.odds?.toFixed(2) }}
                </p>
                <p v-if="bet.profit != null" class="text-[10px] font-bold tabular-nums"
                  :class="bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'">
                  {{ bet.profit >= 0 ? '+' : '' }}{{ bet.profit.toFixed(2) }}
                </p>
                <p v-else class="text-[10px] text-amber-400/70">Pending</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── PERSONAL BETS TAB ─── -->
        <div v-if="tab === 'personal'">
          <!-- User bet stats -->
          <div v-if="userStats" class="grid grid-cols-3 gap-2 mb-3">
            <div class="bg-surface-light/30 rounded-lg p-2.5 text-center">
              <p class="text-lg font-bold text-white tabular-nums">{{ userStats.total_bets }}</p>
              <p class="text-[10px] text-zinc-500">Bets</p>
            </div>
            <div class="bg-surface-light/30 rounded-lg p-2.5 text-center">
              <p class="text-lg font-bold tabular-nums" :class="userStats.win_rate >= 50 ? 'text-emerald-400' : 'text-zinc-300'">
                {{ userStats.win_rate }}%
              </p>
              <p class="text-[10px] text-zinc-500">Win Rate</p>
            </div>
            <div class="bg-surface-light/30 rounded-lg p-2.5 text-center">
              <p class="text-lg font-bold tabular-nums" :class="userStats.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ userStats.total_profit >= 0 ? '+' : '' }}{{ userStats.total_profit }}€
              </p>
              <p class="text-[10px] text-zinc-500">P/L</p>
            </div>
          </div>

          <div v-if="userBets.length === 0 && !personalLoading" class="text-center py-8">
            <p class="text-sm text-zinc-500 mb-3">No personal bets yet</p>
            <button
              @click="showNewBet = true"
              class="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors"
            >
              Log a Bet
            </button>
          </div>

          <div v-else class="space-y-1.5">
            <div
              v-for="bet in userBets" :key="bet.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-light/30 hover:bg-surface-light/50 transition-colors"
            >
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDot(bet.status)"></div>
              <div class="flex-1 min-w-0">
                <p class="text-[12px] font-medium text-zinc-200 truncate">
                  {{ bet.games?.home_team?.name || 'Home' }} vs {{ bet.games?.away_team?.name || 'Away' }}
                </p>
                <p class="text-[10px] text-zinc-500 truncate">
                  {{ bet.selection }} · {{ formatDate(bet.games?.date) }}
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-[12px] font-bold text-zinc-200 tabular-nums">
                  {{ bet.stake }}€ @ {{ bet.odds?.toFixed(2) }}
                </p>
                <p v-if="bet.profit != null" class="text-[10px] font-bold tabular-nums"
                  :class="bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'">
                  {{ bet.profit >= 0 ? '+' : '' }}{{ bet.profit.toFixed(2) }}€
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ BROWSE WALLETS SECTION ═══ -->
    <div class="mt-6">
      <button
        @click="showBrowse = !showBrowse"
        class="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
      >
        <ChevronRight :size="14" :class="showBrowse ? 'rotate-90 transition-transform' : 'transition-transform'" />
        Browse All Wallets
      </button>

      <div v-if="showBrowse" class="grid gap-2 sm:grid-cols-2">
        <div
          v-for="w in allWallets" :key="w.id"
          class="bg-surface-light/30 border border-edge rounded-lg p-3 flex items-center justify-between"
        >
          <div>
            <p class="text-sm font-medium text-zinc-200">{{ w.name }}</p>
            <div class="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
              <span>${{ formatNum(w.balance) }}</span>
              <span :class="walletROIOf(w) >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ walletROIOf(w) >= 0 ? '+' : '' }}{{ walletROIOf(w).toFixed(1) }}% ROI
              </span>
              <span>{{ w.total_bets }} bets</span>
            </div>
          </div>
          <button
            v-if="!isFollowed(w.id)"
            @click="followWallet(w.id)"
            class="px-3 py-1 text-[11px] font-medium bg-emerald-600/20 text-emerald-400 rounded-full hover:bg-emerald-600/30 transition-colors"
          >
            Follow
          </button>
          <span v-else class="px-3 py-1 text-[11px] font-medium text-zinc-500">Following</span>
        </div>
      </div>
    </div>

    <!-- ═══ NEW BET MODAL ═══ -->
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
          <UFormGroup label="Notes">
            <UTextarea v-model="newBet.notes" placeholder="Optional notes" />
          </UFormGroup>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="showNewBet = false">Cancel</UButton>
            <UButton color="primary" :loading="saving" @click="saveBet">Save</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
import { Wallet, ChevronRight } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const supabase = useSupabaseClient()
const toast = useToast()

// ─── State ──────────────────────────────────────────────
const loading = ref(true)
const wallets = ref([])
const allWallets = ref([])
const activeWalletId = ref(null)
const tab = ref('ai')
const showBrowse = ref(false)

// AI bets
const aiBets = ref([])
const aiBetsLoading = ref(false)
const aiBetFilter = ref('')
const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' }
]

// Personal bets
const userBets = ref([])
const userStats = ref(null)
const personalLoading = ref(false)

// New bet modal
const showNewBet = ref(false)
const saving = ref(false)
const newBet = ref({
  game_id: '',
  bet_type: '1x2',
  selection: '',
  stake: 10,
  odds: 1.80,
  sport: 'football',
  notes: ''
})
const betTypeOptions = [
  { label: '1X2', value: '1x2' },
  { label: 'Over/Under', value: 'over_under' },
  { label: 'Spread', value: 'spread' },
  { label: 'Other', value: 'other' }
]

// ─── Computed ───────────────────────────────────────────
const activeWallet = computed(() => wallets.value.find(w => w.id === activeWalletId.value) || wallets.value[0] || null)

const walletPL = computed(() => {
  if (!activeWallet.value) return 0
  return parseFloat(activeWallet.value.balance) - parseFloat(activeWallet.value.initial_balance)
})

const walletROI = computed(() => {
  if (!activeWallet.value) return 0
  const init = parseFloat(activeWallet.value.initial_balance) || 1
  return ((parseFloat(activeWallet.value.balance) - init) / init) * 100
})

const pendingCount = computed(() => aiBets.value.filter(b => b.status === 'pending').length)

const filteredAiBets = computed(() => {
  if (!aiBetFilter.value) return aiBets.value
  return aiBets.value.filter(b => b.status === aiBetFilter.value)
})

// ─── Helpers ────────────────────────────────────────────
function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function statusDot(status) {
  if (status === 'won') return 'bg-emerald-400'
  if (status === 'lost') return 'bg-red-400'
  if (status === 'pending') return 'bg-amber-400 animate-pulse'
  return 'bg-zinc-500'
}

function walletROIOf(w) {
  const init = parseFloat(w.initial_balance) || 1
  return ((parseFloat(w.balance) - init) / init) * 100
}

function isFollowed(walletId) {
  return wallets.value.some(w => w.id === walletId)
}

// ─── Data Loading ───────────────────────────────────────
async function loadFollowedWallets() {
  try {
    const res = await $fetch('/api/user/wallet-subscriptions')
    wallets.value = res.wallets || []
    if (wallets.value.length > 0 && !activeWalletId.value) {
      activeWalletId.value = wallets.value[0].id
    }
  } catch (e) {
    console.error('Failed to load wallet subscriptions:', e)
  }
}

async function loadAllWallets() {
  try {
    const data = await supabase
      .from('wallets')
      .select('id, name, balance, initial_balance, total_bets, win_rate, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true })
    allWallets.value = data.data || []
  } catch (e) {
    console.error('Failed to load all wallets:', e)
  }
}

async function loadAiBets() {
  if (!activeWallet.value) return
  aiBetsLoading.value = true
  try {
    const { data, error } = await supabase
      .from('bets')
      .select(`
        id, bet_type, stake, odds, status, profit, placed_at, notes, sport, strategy,
        games!inner(date, league_key, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name))
      `)
      .eq('wallet_id', activeWallet.value.id)
      .order('placed_at', { ascending: false })
      .limit(100)

    if (error) throw error

    aiBets.value = (data || []).map(b => {
      const notes = typeof b.notes === 'string' ? tryParse(b.notes) : b.notes
      return {
        ...b,
        home_name: b.games?.home_team?.name || 'Home',
        away_name: b.games?.away_team?.name || 'Away',
        date: b.games?.date,
        bet_type_display: notes?.selection || b.bet_type
      }
    })
  } catch (e) {
    console.error('Failed to load AI bets:', e)
  } finally {
    aiBetsLoading.value = false
  }
}

async function loadUserBets() {
  personalLoading.value = true
  try {
    const [betsRes, statsRes] = await Promise.all([
      api.fetchUserBets({}),
      api.fetchBetStats()
    ])
    userBets.value = betsRes.bets || []
    userStats.value = statsRes?.stats || null
  } catch (e) {
    console.error('Failed to load user bets:', e)
  } finally {
    personalLoading.value = false
  }
}

function tryParse(s) {
  try { return JSON.parse(s) } catch { return null }
}

// ─── Actions ────────────────────────────────────────────
async function followWallet(walletId) {
  try {
    await $fetch('/api/user/wallet-subscriptions', {
      method: 'POST',
      body: { walletId, action: 'follow' }
    })
    await loadFollowedWallets()
    toast.add({ title: 'Wallet followed', color: 'green' })
  } catch (e) {
    toast.add({ title: 'Failed to follow wallet', color: 'red' })
  }
}

async function unfollowWallet(walletId) {
  try {
    await $fetch('/api/user/wallet-subscriptions', {
      method: 'POST',
      body: { walletId, action: 'unfollow' }
    })
    wallets.value = wallets.value.filter(w => w.id !== walletId)
    if (activeWalletId.value === walletId) {
      activeWalletId.value = wallets.value[0]?.id || null
    }
    toast.add({ title: 'Wallet unfollowed', color: 'gray' })
  } catch (e) {
    toast.add({ title: 'Failed to unfollow', color: 'red' })
  }
}

async function saveBet() {
  if (!newBet.value.selection || !newBet.value.stake) return
  saving.value = true
  try {
    await api.createUserBet(newBet.value)
    toast.add({ title: 'Bet logged', color: 'green' })
    showNewBet.value = false
    await loadUserBets()
    newBet.value = { game_id: '', bet_type: '1x2', selection: '', stake: 10, odds: 1.80, sport: 'football', notes: '' }
  } catch (e) {
    toast.add({ title: 'Failed to save bet', color: 'red' })
  } finally {
    saving.value = false
  }
}

// ─── Watchers ───────────────────────────────────────────
watch(activeWalletId, () => { loadAiBets() })
watch(tab, (t) => {
  if (t === 'personal' && userBets.value.length === 0) loadUserBets()
})

// ─── Init ───────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadFollowedWallets(), loadAllWallets()])
  loading.value = false
  loadAiBets()
})
</script>

<style scoped>
.wallet-hero {
  background: linear-gradient(135deg, rgba(28, 31, 39, 0.98) 0%, rgba(16, 55, 40, 0.2) 100%);
  border: 1px solid rgba(52, 211, 153, 0.15);
}
.wallet-tabs-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
</style>
