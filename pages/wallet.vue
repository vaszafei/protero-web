<template>
  <div class="p-3 sm:p-6 max-w-[1600px] mx-auto min-h-screen pb-20 lg:pb-6">
    <!-- Header -->
    <div class="mb-4 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Wallets</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-0.5">
          Every wallet in the ledger, scored the way
          <code class="text-zinc-600">common.wallet_significance</code> scores it.
        </p>
      </div>
      <div v-if="fleet" class="flex items-center gap-5 text-xs">
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Settled</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ fleet.wagers }}</p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Open</p>
          <p class="text-base font-bold tabular-nums" :class="fleet.pending ? 'text-amber-400' : 'text-zinc-600'">
            {{ fleet.pending }}
          </p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">P&amp;L</p>
          <p class="text-base font-bold tabular-nums" :class="fleet.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ fleet.pnl >= 0 ? '+' : '' }}{{ fleet.pnl.toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <template v-else>
      <!-- Roster -->
      <WalletRoster
        :wallets="allWallets"
        :performance="performance"
        :selected-id="activeWalletId"
        @select="selectWallet"
        class="mb-6"
      />

      <!-- ── Selected wallet ─────────────────────────────────────── -->
      <div v-if="activeWallet" class="border-t border-edge pt-5">
        <div class="flex items-baseline gap-2 mb-3">
          <h2 class="text-sm font-bold text-zinc-100">{{ activeMeta.longName }}</h2>
          <span class="text-[11px] text-zinc-600">W{{ activeWallet.id }}</span>
          <button
            @click="activeWalletId = null"
            class="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300"
          >Close</button>
        </div>

        <p v-if="activeWallet.bio" class="text-[11px] text-zinc-500 leading-relaxed mb-3 max-w-3xl">
          {{ activeWallet.bio }}
        </p>

        <div class="grid lg:grid-cols-3 gap-4 mb-4">
          <WalletHero
            class="lg:col-span-1"
            :wallet="activeWallet"
            :performance="activePerformance"
            :sparkline-points="sparklinePoints"
          />
          <WalletPerformanceChart
            class="lg:col-span-2"
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
              <div v-if="parlays.length > 0" class="space-y-1.5">
                <p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-1.5">
                  Parlays · {{ parlaysTotal }}
                </p>
                <WalletParlayRow v-for="p in parlays" :key="`p${p.id}`" :parlay="p" />
              </div>

              <div
                v-if="parlays.length > 0 && bets.length > 0"
                class="border-t border-edge/30 my-3"
              ></div>

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
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Operator wallet console.
 *
 * Was a consumer subscribe-with-credits flow (discovery mode → 500-credit
 * subscribe modal → subscribed view). The app is an operator console, so the
 * roster is simply visible: no pricing, no gating, and frozen wallets are shown
 * rather than filtered out, because a wallet that stopped writing is history an
 * operator still needs to read.
 *
 * Every number comes from the `get_wallet_performance` RPC. Do not reintroduce
 * a client-side ROI: the three formulas this page used to carry all computed
 * bankroll return, which renders W7 as +69.7% where its ROI is +11.5%.
 */
import { ref, computed, onMounted } from 'vue'
import { resolveWalletMeta } from '~/utils/wallet-meta'

definePageMeta({ middleware: 'auth' })

const toast = useToast()
const api = useApi()

const PAGE_SIZE = 50

const loading = ref(true)
const allWallets = ref([])
const performance = ref([])
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

const activeWallet = computed(() => allWallets.value.find(w => w.id === activeWalletId.value) || null)
const activeMeta = computed(() => activeWallet.value ? resolveWalletMeta(activeWallet.value) : null)
const activePerformance = computed(() =>
  performance.value.find(p => p.wallet_id === activeWalletId.value) || null)

const sparklinePoints = computed(() => historyPoints.value.slice(-30))

/** Fleet totals — summed over wagers, so parlays count once. */
const fleet = computed(() => {
  if (!performance.value.length) return null
  return performance.value.reduce((acc, p) => ({
    wagers: acc.wagers + Number(p.n_wagers || 0),
    pending: acc.pending + Number(p.n_pending || 0),
    pnl: acc.pnl + Number(p.pnl || 0),
  }), { wagers: 0, pending: 0, pnl: 0 })
})

// ─── Data loading ───────────────────────────────────────
async function loadAll() {
  try {
    const [walletsData, perf] = await Promise.all([
      api.fetchWallets(),
      api.fetchWalletPerformance().catch(() => []),
    ])
    allWallets.value = walletsData.wallets || []
    performance.value = perf || []
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

onMounted(async () => {
  await loadAll()
  loading.value = false
  // Open the wallet actually carrying exposure — the one an operator checks first.
  const withOpen = performance.value
    .filter(p => Number(p.n_pending) > 0)
    .sort((a, b) => Number(b.n_pending) - Number(a.n_pending))[0]
  if (withOpen) selectWallet(withOpen.wallet_id)
})

useHead({ title: 'Wallets · Protero' })
</script>
