<template>
  <div class="p-3 sm:p-6 max-w-5xl mx-auto min-h-screen pb-20 lg:pb-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Wallets</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-0.5">
          {{ mode === 'subscribed' ? 'Your subscribed AI strategies' : 'Subscribe to AI strategies and follow their picks' }}
        </p>
      </div>
      <div v-if="balance != null" class="text-right">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Credits</p>
        <p class="text-base font-bold text-emerald-400 tabular-nums">{{ balance }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <template v-else>
      <!-- ════════════════════════════════════════════════════════════════
           MODE A — DISCOVERY (no subscriptions yet)
      ═════════════════════════════════════════════════════════════════ -->
      <WalletDiscovery
        v-if="mode === 'discovery'"
        :wallets="catalogueWallets"
        :pricing="pricing"
        :busy-wallet-id="busyWalletId"
        @subscribe="openSubscribeModal"
      />

      <!-- ════════════════════════════════════════════════════════════════
           MODE B — SUBSCRIBED VIEW
      ═════════════════════════════════════════════════════════════════ -->
      <template v-else>
        <!-- Subscribed wallet pill row -->
        <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          <button
            v-for="w in subscribedWallets" :key="w.id"
            @click="selectWallet(w.id)"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border"
            :class="activeWalletId === w.id
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-surface-light text-zinc-400 border-edge hover:border-zinc-600'"
          >
            <span>{{ getWalletMeta(w.id).shortName }}</span>
            <span class="ml-1.5 tabular-nums" :class="walletROIOf(w) >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'">
              {{ walletROIOf(w) >= 0 ? '+' : '' }}{{ walletROIOf(w).toFixed(0) }}%
            </span>
          </button>

          <!-- Add more button -->
          <button
            @click="showDiscoveryModal = true"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 whitespace-nowrap"
          >
            <UIcon name="i-heroicons-plus" class="w-3 h-3 inline -mt-0.5" />
            Subscribe
          </button>
        </div>

        <!-- Hero -->
        <div v-if="activeWallet" class="mb-4">
          <WalletHero
            :wallet="activeWallet"
            :subscription="activeSubscription"
            :sparkline-points="sparklinePoints"
          />
        </div>

        <!-- Performance chart -->
        <div v-if="activeWalletId" class="mb-4">
          <WalletPerformanceChart
            :points="historyPoints"
            :model-value="historyDays"
            :loading="historyLoading"
            :seed="parseFloat(activeWallet?.initial_balance || 0)"
            @update:days="setHistoryDays"
          />
        </div>

        <!-- Bets card -->
        <div class="rounded-xl bg-surface border border-edge overflow-hidden">
          <WalletBetFilterBar
            :status="betFilter"
            :total="combinedTotal"
            @update:status="setBetFilter"
          />

          <div class="p-2 sm:p-3">
            <div v-if="betsLoading || parlaysLoading" class="flex justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-zinc-600" />
            </div>

            <div v-else-if="bets.length === 0 && parlays.length === 0" class="text-center py-8">
              <p class="text-sm text-zinc-500">No {{ betFilter || '' }} bets found</p>
            </div>

            <template v-else>
              <!-- Parlays section -->
              <div v-if="parlays.length > 0" class="space-y-1.5">
                <p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-1.5">
                  Parlays · {{ parlaysTotal }}
                </p>
                <WalletParlayRow v-for="p in parlays" :key="`p${p.id}`" :parlay="p" />
              </div>

              <!-- Divider -->
              <div
                v-if="parlays.length > 0 && bets.length > 0"
                class="border-t border-edge/30 my-3"
              ></div>

              <!-- Singles section -->
              <div v-if="bets.length > 0" class="space-y-1.5">
                <p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-1.5">
                  Singles · {{ betsTotal }}
                </p>
                <WalletBetRow v-for="bet in bets" :key="`b${bet.id}`" :bet="bet" />
              </div>
            </template>

            <!-- Pagination (singles only — parlays display is fixed-window) -->
            <div v-if="!betsLoading && betsTotal > PAGE_SIZE" class="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-edge/30">
              <button
                :disabled="betsPage === 0"
                @click="prevPage"
                class="px-3 py-1.5 text-xs font-medium rounded bg-surface-light text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >Previous</button>
              <span class="text-[11px] text-zinc-500 tabular-nums">
                {{ betsPage * PAGE_SIZE + 1 }}–{{ Math.min((betsPage + 1) * PAGE_SIZE, betsTotal) }} of {{ betsTotal }}
              </span>
              <button
                :disabled="(betsPage + 1) * PAGE_SIZE >= betsTotal"
                @click="nextPage"
                class="px-3 py-1.5 text-xs font-medium rounded bg-surface-light text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >Next</button>
            </div>
          </div>
        </div>
      </template>

      <!-- Discovery modal (Mode B → "Subscribe" pill) -->
      <UModal v-model="showDiscoveryModal">
        <div class="p-4 sm:p-5 bg-surface rounded-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-zinc-100">More wallets</h2>
            <button @click="showDiscoveryModal = false" class="text-zinc-500 hover:text-zinc-300">
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>
          <WalletDiscovery
            :wallets="unsubscribedWallets"
            :pricing="pricing"
            :busy-wallet-id="busyWalletId"
            @subscribe="(w) => { showDiscoveryModal = false; openSubscribeModal(w) }"
          />
          <div v-if="unsubscribedWallets.length === 0" class="text-center py-6">
            <p class="text-sm text-zinc-500">You're subscribed to every available wallet.</p>
          </div>
        </div>
      </UModal>

      <!-- Subscribe confirm -->
      <WalletSubscribeModal
        v-model="showConfirmModal"
        :wallet="modalWallet"
        :pricing="pricing"
        :balance="balance ?? 0"
        :busy="confirming"
        @confirm="confirmSubscribe"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getWalletMeta } from '~/utils/wallet-meta'

definePageMeta({ middleware: 'auth' })

const toast = useToast()
const api = useApi()

// ─── Constants ──────────────────────────────────────────
const PAGE_SIZE = 50

// ─── State ──────────────────────────────────────────────
const loading = ref(true)
const allWallets = ref([])         // every active wallet from `wallets`
const subscriptions = ref([])      // [{wallet_id, expires_at, ...}]
const pricing = ref({ cost_credits: 500, duration_days: 30 })
const balance = ref(null)          // user's credit balance
const activeWalletId = ref(null)

// Bets (singles)
const bets = ref([])
const betsTotal = ref(0)
const betsLoading = ref(false)
const betFilter = ref('')
const betsPage = ref(0)

// Parlays (no pagination — show recent 100 max)
const parlays = ref([])
const parlaysTotal = ref(0)
const parlaysLoading = ref(false)

const combinedTotal = computed(() => betsTotal.value + parlaysTotal.value)

// Performance chart
const historyDays = ref(30)
const historyPoints = ref([])
const historyLoading = ref(false)

// Modals
const showDiscoveryModal = ref(false)
const showConfirmModal = ref(false)
const modalWallet = ref(null)
const busyWalletId = ref(null)
const confirming = ref(false)

// ─── Computed ───────────────────────────────────────────
const subscribedIds = computed(() => new Set(subscriptions.value.map(s => s.wallet_id)))

const subscribedWallets = computed(() =>
  allWallets.value.filter(w => subscribedIds.value.has(w.id))
)
const unsubscribedWallets = computed(() =>
  allWallets.value.filter(w => !subscribedIds.value.has(w.id))
)
const catalogueWallets = computed(() => allWallets.value)

const mode = computed(() => subscribedWallets.value.length > 0 ? 'subscribed' : 'discovery')

const activeWallet = computed(() => allWallets.value.find(w => w.id === activeWalletId.value) || null)
const activeSubscription = computed(() => subscriptions.value.find(s => s.wallet_id === activeWalletId.value) || null)

const sparklinePoints = computed(() => {
  // Last 30 history points serve double-duty as the hero sparkline.
  return historyPoints.value.slice(-30)
})

// ─── Helpers ────────────────────────────────────────────
function walletROIOf(w) {
  const init = parseFloat(w.initial_balance) || 1
  return ((parseFloat(w.balance) - init) / init) * 100
}

// ─── Data loading ───────────────────────────────────────
async function loadAll() {
  try {
    const [subsData, creditsData] = await Promise.all([
      api.fetchWalletSubscriptions(),
      api.fetchCredits().catch(() => null),
    ])
    allWallets.value = subsData.wallets || []
    subscriptions.value = subsData.subscriptions || []
    pricing.value = subsData.pricing || pricing.value
    balance.value = creditsData?.balance ?? creditsData?.credits ?? null

    // Auto-select first subscribed wallet (or first wallet if discovery mode)
    if (!activeWalletId.value && subscribedWallets.value.length > 0) {
      activeWalletId.value = subscribedWallets.value[0].id
    }
  } catch (e) {
    console.error('Failed to load wallet data:', e)
    toast.add({ title: 'Failed to load wallets', color: 'red' })
  }
}

async function loadBets() {
  if (!activeWalletId.value) return
  betsLoading.value = true
  try {
    const data = await api.fetchWalletBets(activeWalletId.value, {
      limit: PAGE_SIZE,
      offset: betsPage.value * PAGE_SIZE,
      status: betFilter.value || undefined,
    })
    bets.value = data.bets || []
    betsTotal.value = data.total || 0
  } catch (e) {
    console.error('Failed to load bets:', e)
  } finally {
    betsLoading.value = false
  }
}

async function loadParlays() {
  if (!activeWalletId.value) return
  parlaysLoading.value = true
  try {
    const data = await api.fetchWalletParlays(activeWalletId.value, {
      limit: 100,
      offset: 0,
      status: betFilter.value || undefined,
    })
    parlays.value = data.parlays || []
    parlaysTotal.value = data.total || 0
  } catch (e) {
    console.error('Failed to load parlays:', e)
    parlays.value = []
    parlaysTotal.value = 0
  } finally {
    parlaysLoading.value = false
  }
}

async function loadHistory() {
  if (!activeWalletId.value) return
  historyLoading.value = true
  try {
    const data = await api.fetchWalletBalanceHistory(activeWalletId.value, historyDays.value)
    historyPoints.value = data.points || []
  } catch (e) {
    console.error('Failed to load wallet history:', e)
    historyPoints.value = []
  } finally {
    historyLoading.value = false
  }
}

function selectWallet(id) {
  if (activeWalletId.value === id) return
  activeWalletId.value = id
  betsPage.value = 0
  betFilter.value = ''
  loadBets()
  loadParlays()
  loadHistory()
}

function setBetFilter(val) {
  betFilter.value = val
  betsPage.value = 0
  loadBets()
  loadParlays()
}

function setHistoryDays(d) {
  historyDays.value = d
  loadHistory()
}

function prevPage() { betsPage.value--; loadBets() }
function nextPage() { betsPage.value++; loadBets() }

// ─── Subscribe flow ─────────────────────────────────────
function openSubscribeModal(w) {
  modalWallet.value = { ...w, meta: getWalletMeta(w.id) }
  showConfirmModal.value = true
}

async function confirmSubscribe(w) {
  if (!w) return
  confirming.value = true
  busyWalletId.value = w.id
  try {
    const res = await api.subscribeToWallet(w.id)
    if (res?.success) {
      toast.add({ title: 'Subscribed', description: `Active until ${new Date(res.expires_at).toLocaleDateString()}` })
      balance.value = res.balance_after ?? balance.value
      showConfirmModal.value = false
      // Refresh subscriptions and select the new wallet
      await loadAll()
      activeWalletId.value = w.id
      betsPage.value = 0
      betFilter.value = ''
      await Promise.all([loadBets(), loadParlays(), loadHistory()])
    } else {
      toast.add({
        title: 'Could not subscribe',
        description: res?.error === 'insufficient_credits'
          ? `Need ${res.required} credits, have ${res.balance}`
          : (res?.error || 'unknown error'),
        color: 'red',
      })
    }
  } catch (e) {
    console.error('Subscribe failed:', e)
    toast.add({ title: 'Subscribe failed', description: e.message || String(e), color: 'red' })
  } finally {
    confirming.value = false
    busyWalletId.value = null
  }
}

// ─── Init ───────────────────────────────────────────────
onMounted(async () => {
  await loadAll()
  loading.value = false
  if (activeWalletId.value) {
    await Promise.all([loadBets(), loadParlays(), loadHistory()])
  }
})
</script>
