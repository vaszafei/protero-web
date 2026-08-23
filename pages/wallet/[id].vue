<template>
  <div class="p-3 sm:p-6 max-w-[1600px] mx-auto min-h-screen pb-20 lg:pb-6">
    <!-- Breadcrumb + identity -->
    <div class="mb-4">
      <NuxtLink to="/wallet" class="text-[11px] text-zinc-500 hover:text-zinc-300">← All wallets</NuxtLink>

      <div v-if="wallet" class="mt-2 flex items-end justify-between gap-4 flex-wrap">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-bold text-white truncate">{{ meta.longName }}</h1>
            <span class="text-xs text-zinc-600 tabular-nums">W{{ wallet.id }}</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-light text-zinc-400 border border-edge">
              {{ meta.badge }}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" :class="cohortClass">
              {{ COHORT_LABEL[cohort] }}
            </span>
          </div>
          <p v-if="wallet.bio" class="text-[11px] text-zinc-500 leading-relaxed mt-1 max-w-3xl">
            {{ wallet.bio }}
          </p>
        </div>

        <!-- Sibling picker: an operator comparing wallets should not have to
             walk back to the index for every one. -->
        <div v-if="siblings.length > 1" class="flex items-center gap-1.5 flex-wrap justify-end max-w-lg">
          <NuxtLink
            v-for="s in siblings" :key="s.id"
            :to="`/wallet/${s.id}`"
            class="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
            :class="s.id === wallet.id
              ? 'bg-blue-500/15 text-blue-300'
              : 'bg-surface-light/40 text-zinc-500 hover:text-zinc-300'"
          >W{{ s.id }}</NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <div v-else-if="!wallet" class="py-20 text-center">
      <p class="text-sm text-zinc-400">No wallet {{ walletId }}.</p>
      <NuxtLink to="/wallet" class="text-[11px] text-zinc-500 hover:text-zinc-300 mt-2 inline-block">
        Back to the roster
      </NuxtLink>
    </div>

    <template v-else>
      <div class="grid lg:grid-cols-3 gap-4 mb-4">
        <WalletHero
          class="lg:col-span-1"
          :wallet="wallet"
          :performance="perf"
          :sparkline-points="sparklinePoints"
          :verdict="scored.verdict"
          :family="scored.family"
          :coverage="coverage"
        />
        <WalletPerformanceChart
          class="lg:col-span-2"
          :points="historyPoints"
          :model-value="historyDays"
          :loading="historyLoading"
          :seed="parseFloat(wallet.initial_balance || 0)"
          @update:days="setHistoryDays"
        />
      </div>

      <WalletBreakdown class="mb-4" :breakdown="breakdown" :loading="breakdownLoading" />

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

            <div v-if="parlays.length > 0 && bets.length > 0" class="border-t border-edge/30 my-3"></div>

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
  </div>
</template>

<script setup>
/**
 * One wallet. Split out of the combined /wallet page on 2026-08-23.
 *
 * **This page still loads the WHOLE roster's performance, on purpose.** The
 * verdict shown here is corrected for the cohort this wallet was picked from
 * (`utils/wallet-stats.scoreFamily`), and k is a property of that cohort, not
 * of this wallet — computing it from one row would silently reproduce the
 * uncorrected p, which is what makes W44 read EDGE at p=0.010 when its cohort
 * needs p<0.0045. The roster call is one RPC and it is what keeps this page
 * and the index from disagreeing.
 */
import { ref, computed, watch } from 'vue'
import { resolveWalletMeta } from '~/utils/wallet-meta'
import { cohortOf, scoreFamily, COHORT_LABEL } from '~/utils/wallet-stats'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()

const PAGE_SIZE = 50

const walletId = computed(() => Number(route.params.id))

const loading = ref(true)
const allWallets = ref([])
const performance = ref([])
const tipsters = ref(null)

const bets = ref([])
const betsTotal = ref(0)
const betsLoading = ref(false)
const betFilter = ref('')
const betsPage = ref(0)

const parlays = ref([])
const parlaysTotal = ref(0)
const parlaysLoading = ref(false)

const breakdown = ref(null)
const breakdownLoading = ref(false)

const historyDays = ref(0)
const historyPoints = ref([])
const historyLoading = ref(false)

const combinedTotal = computed(() => betsTotal.value + parlaysTotal.value)

const wallet = computed(() => allWallets.value.find(w => w.id === walletId.value) || null)
const meta = computed(() => wallet.value ? resolveWalletMeta(wallet.value) : null)
const perf = computed(() => performance.value.find(p => p.wallet_id === walletId.value) || null)
const coverage = computed(() =>
  (tipsters.value?.authors || []).find(a => a.wallet_id === walletId.value) || null)

const cohort = computed(() => wallet.value ? cohortOf(wallet.value) : 'legacy')

const cohortClass = computed(() => ({
  ours:   'bg-emerald-500/10 text-emerald-300',
  mirror: 'bg-sky-500/10 text-sky-300',
  legacy: 'bg-zinc-700/40 text-zinc-400',
}[cohort.value]))

/** The other wallets in the same cohort, most-traded first. */
const siblings = computed(() => {
  const perfById = new Map(performance.value.map(p => [p.wallet_id, p]))
  return allWallets.value
    .filter(w => cohortOf(w) === cohort.value)
    .sort((a, b) =>
      Number(perfById.get(b.id)?.n_wagers || 0) - Number(perfById.get(a.id)?.n_wagers || 0)
      || a.id - b.id)
})

/** Cohort-corrected verdict — see the module docstring. */
const scored = computed(() => {
  if (!wallet.value) return { verdict: 'n<10', family: null }
  const perfById = new Map(performance.value.map(p => [p.wallet_id, p]))
  const family = scoreFamily(siblings.value.map(w => ({
    wallet_id: w.id,
    p_luck: perfById.get(w.id)?.p_luck ?? null,
    n_wagers: Number(perfById.get(w.id)?.n_wagers ?? 0),
  })))
  return { verdict: family.verdictById.get(wallet.value.id) ?? 'n<10', family }
})

const sparklinePoints = computed(() => historyPoints.value.slice(-30))

async function loadRoster() {
  const [walletsData, p, tips] = await Promise.all([
    api.fetchWallets(),
    api.fetchWalletPerformance().catch(() => []),
    $fetch('/api/wallet/tipsters').catch(() => null),
  ])
  allWallets.value = walletsData.wallets || []
  performance.value = p || []
  tipsters.value = tips
}

async function loadBets() {
  betsLoading.value = true
  try {
    const data = await api.fetchWalletBets(walletId.value, {
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
  parlaysLoading.value = true
  try {
    const data = await api.fetchWalletParlays(walletId.value, { limit: 100, offset: 0, status: betFilter.value || undefined })
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
  historyLoading.value = true
  try {
    const data = await api.fetchWalletBalanceHistory(walletId.value, historyDays.value)
    historyPoints.value = data.points || []
  } catch (e) {
    console.error('Failed to load wallet history:', e)
    historyPoints.value = []
  } finally {
    historyLoading.value = false
  }
}

async function loadBreakdown() {
  breakdownLoading.value = true
  try {
    breakdown.value = await api.fetchWalletBreakdown(walletId.value)
  } catch (e) {
    console.error('Failed to load wallet breakdown:', e)
    breakdown.value = null
  } finally {
    breakdownLoading.value = false
  }
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

// Re-runs on sibling navigation — /wallet/40 → /wallet/41 reuses the component.
watch(walletId, async (id) => {
  if (!Number.isFinite(id)) return
  loading.value = true
  betsPage.value = 0
  betFilter.value = ''
  if (!allWallets.value.length) await loadRoster()
  loading.value = false
  await Promise.all([loadBets(), loadParlays(), loadHistory(), loadBreakdown()])
}, { immediate: true })

useHead(() => ({ title: meta.value ? `${meta.value.longName} · Wallets · Protero` : 'Wallet · Protero' }))
</script>
