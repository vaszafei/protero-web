<template>
  <!-- Desktop operator page, sized to the viewport: nothing scrolls at
       1920×1080. Three columns — the wallet's standing, its ledger, and the
       selected slip with the analytics. The ledger pages to the rows its panel
       can hold instead of growing the page. -->
  <div class="h-full max-w-[1680px] mx-auto px-4 pt-3 pb-3 flex flex-col gap-3">
    <!-- Identity: back to the roster, the wallet's name, and its actions. -->
    <div class="flex items-center gap-3 flex-shrink-0 min-w-0">
      <NuxtLink to="/wallet" title="All wallets" class="flex items-center text-zinc-500 hover:text-zinc-200 flex-shrink-0">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      </NuxtLink>
      <template v-if="wallet">
        <h1 class="text-lg font-bold text-white truncate">{{ meta.longName }}</h1>

        <div class="ml-auto flex items-center gap-2 flex-shrink-0">
          <!-- User-mirror wallet: log a new real-money slip (with screenshot)
               straight from here. It lands in `user_real_bets`; the backend
               mirror chain (bind → project → settle) still runs separately. -->
          <UButton
            v-if="cohort === 'user_mirror'"
            icon="i-heroicons-plus"
            size="2xs"
            color="primary"
            @click="showAddBet = true"
          >Add Bet</UButton>

          <!-- Player-props wallets: tonight's slate. "Load props" runs injuries →
               Stoiximan capture → board → candidates as one job. -->
          <template v-if="propsLeague">
            <div class="flex items-center gap-0.5 mr-2">
              <button
                v-for="v in VIEWS" :key="v.key"
                class="text-[11px] px-2.5 py-1 rounded font-semibold transition-colors"
                :class="view === v.key ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'"
                @click="view = v.key"
              >{{ v.label }}</button>
            </div>
            <UButton
              size="2xs"
              color="primary"
              :loading="slate.loading.value"
              :title="`Stoiximan player props for ${slateDate}: every main line and N+ rung, each player's own games, candidate legs`"
              @click="loadSlate"
            >Load props</UButton>
          </template>
        </div>
      </template>
    </div>

    <WalletAddRealBetModal v-model="showAddBet" :wallet-id="walletId" @saved="onBetLogged" />
    <WalletPropsLoadModal
      v-if="propsLeague"
      v-model="showLoadProgress"
      :date="slateDate"
      :status="slate.status.value"
      :error="slate.error.value"
    />

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <div v-else-if="rosterError" class="flex-1 flex items-center justify-center">
      <UiErrorState class="max-w-md" title="The wallet failed to load." :error="rosterError" @retry="reloadRoster" />
    </div>

    <div v-else-if="!wallet" class="flex-1 flex flex-col items-center justify-center">
      <p class="text-sm text-zinc-400">No wallet {{ walletId }}.</p>
      <NuxtLink to="/wallet" class="text-[11px] text-zinc-500 hover:text-zinc-300 mt-2">
        Back to the roster
      </NuxtLink>
    </div>

    <WalletPropsSlate
      v-else-if="propsLeague && view === 'slate'"
      :date="slateDate"
      :status="slate.status.value"
      :error="slate.error.value"
      :bankroll="wallet ? Number(wallet.balance) : null"
    />

    <div v-else class="flex-1 min-h-0 grid gap-3" :class="hasRightColumn
      ? 'grid-cols-[340px_minmax(0,1fr)_minmax(0,1.2fr)]'
      : 'grid-cols-[340px_minmax(0,1fr)]'">
      <!-- ── Standing ── -->
      <div class="flex flex-col gap-3 min-h-0">
        <WalletHero
          class="flex-shrink-0"
          :wallet="wallet"
          :performance="perf"
          :verdict="scored.verdict"
          :family="scored.family"
          :coverage="coverage"
          :performance-error="performanceError"
          :coverage-error="isMirrorCohort ? coverageError : null"
          @retry="reloadRoster"
        />
        <WalletPerformanceChart
          class="flex-1 min-h-[180px]"
          :points="historyPoints"
          :model-value="historyDays"
          :loading="historyLoading"
          :seed="parseFloat(wallet.initial_balance || 0)"
          :start-balance="historyStart"
          :error="historyError"
          @retry="loadHistory"
          @update:days="setHistoryDays"
        />
        <UiErrorState v-if="seasonLadderError" class="flex-shrink-0" title="The season ladder failed to load." :error="seasonLadderError" @retry="loadSeasonLadder" />
        <WalletSeasonLadder
          v-else-if="seasonLadder.length || seasonLadderLoading"
          class="flex-initial min-h-0"
          :seasons="seasonLadder"
          :loading="seasonLadderLoading"
        />
        <!-- Settled singles only — a slips-only wallet has nothing to show here. -->
        <UiErrorState v-if="breakdownError" class="flex-shrink-0" title="The P&L breakdown failed to load." :error="breakdownError" @retry="loadBreakdown" />
        <WalletBreakdown
          v-else-if="breakdownLoading || breakdownHasRows"
          class="flex-none max-h-[45%]"
          :breakdown="breakdown"
          :loading="breakdownLoading"
        />
      </div>

      <!-- ── Ledger ── -->
      <div class="rounded-xl bg-surface border border-edge flex flex-col min-h-0 overflow-hidden">
        <div class="flex items-center gap-1 px-2.5 py-2 border-b border-edge/50 flex-shrink-0">
          <button
            v-for="t in LEDGER_TABS" :key="t.key"
            class="text-[11px] px-2.5 py-1 rounded font-semibold transition-colors"
            :class="ledgerTab === t.key ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'"
            @click="setLedgerTab(t.key)"
          >{{ t.label }} <span class="tabular-nums font-normal text-zinc-500">{{ t.key === 'slips' ? parlaysTotal : betsTotal }}</span></button>
          <div class="ml-auto flex items-center gap-0.5">
            <button
              v-for="f in STATUS_FILTERS" :key="f.value"
              class="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
              :class="betFilter === f.value ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'"
              @click="setBetFilter(f.value)"
            >{{ f.label }}</button>
          </div>
        </div>

        <div ref="listEl" class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          <div v-if="ledgerLoading" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-zinc-600" />
          </div>
          <template v-else-if="ledgerTab === 'slips'">
            <UiErrorState v-if="parlaysError" title="The slips failed to load." :error="parlaysError" @retry="loadParlays" />
            <p v-else-if="!parlays.length" class="text-center text-[11px] text-zinc-500 py-8">No {{ betFilter }} slips.</p>
            <WalletParlayRow
              v-for="p in parlays" :key="`p${p.id}`"
              :parlay="p"
              :selected="selectedParlay?.id === p.id"
              @select="selectedParlay = p"
            />
          </template>
          <template v-else>
            <UiErrorState v-if="betsError" title="The singles failed to load." :error="betsError" @retry="loadBets" />
            <p v-else-if="!bets.length" class="text-center text-[11px] text-zinc-500 py-8">No {{ betFilter }} singles.</p>
            <WalletBetRow v-for="bet in bets" :key="`b${bet.id}`" :bet="bet" />
          </template>
        </div>

        <div v-if="ledgerTotal > pageSize" class="flex items-center justify-center gap-3 px-2 py-1.5 border-t border-edge/40 flex-shrink-0">
          <button
            :disabled="ledgerPage === 0"
            class="px-2.5 py-0.5 text-[11px] font-medium rounded bg-surface-light text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="goPage(ledgerPage - 1)"
          >Previous</button>
          <span class="text-[11px] text-zinc-500 tabular-nums">
            {{ ledgerPage * pageSize + 1 }}–{{ Math.min((ledgerPage + 1) * pageSize, ledgerTotal) }} of {{ ledgerTotal }}
          </span>
          <button
            :disabled="(ledgerPage + 1) * pageSize >= ledgerTotal"
            class="px-2.5 py-0.5 text-[11px] font-medium rounded bg-surface-light text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="goPage(ledgerPage + 1)"
          >Next</button>
        </div>
      </div>

      <!-- ── Selected slip + analytics ── -->
      <div v-if="hasRightColumn" class="flex flex-col gap-3 min-h-0">
        <WalletSlipDetail v-if="parlaysTotal > 0 || selectedParlay" class="flex-shrink max-h-[60%]" :parlay="selectedParlay" />
        <UiErrorState v-if="marginOfLossError" class="flex-shrink-0" title="The margin-of-loss analytics failed to load." :error="marginOfLossError" @retry="loadMarginOfLoss" />
        <UiErrorState v-if="vulnerabilityError" class="flex-shrink-0" title="The wallet analytics failed to load." :error="vulnerabilityError" @retry="loadVulnerability" />
        <WalletVulnerability
          v-else
          class="flex-1 min-h-0"
          :data="vulnerability"
          :margin-of-loss="marginOfLoss"
          :loading="vulnerabilityLoading || marginOfLossLoading"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * One wallet. Split out of the combined /wallet page on 2026-08-23.
 *
 * **This page still loads the WHOLE roster's performance, on purpose.** The
 * verdict shown here is corrected for the cohort this wallet was picked from
 * (`utils/wallet-stats.scoreRoster`), and k is a property of that cohort, not
 * of this wallet — computing it from one row would silently reproduce the
 * uncorrected p, which is what makes W44 read EDGE at p=0.010 when its cohort
 * needs p<0.0045. The roster call is one RPC and it is what keeps this page
 * and the index from disagreeing.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { resolveWalletMeta } from '~/utils/wallet-meta'
import { cohortOf, scoreRoster } from '~/utils/wallet-stats'
import { errorText } from '~/utils/error-text'
import { usePropsSlate, athensToday } from '~/composables/usePropsSlate'

const apiFetch = useApiFetch()

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()

const LEDGER_TABS = [
  { key: 'slips',   label: 'Slips' },
  { key: 'singles', label: 'Singles' },
]
const STATUS_FILTERS = [
  { label: 'All',     value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won',     value: 'won' },
  { label: 'Lost',    value: 'lost' },
]

/** Rendered row heights (row + the list's 4px gap). A mirror single carries a
 *  third provenance line. The ledger fetches exactly what its panel holds. */
const SLIP_ROW_PX = 36
const SINGLE_ROW_PX = 48
const MIRROR_ROW_PX = 62
const LIST_PAD_PX = 16

const walletId = computed(() => Number(route.params.id))

const loading = ref(true)
const allWallets = ref([])
const performance = ref([])
const tipsters = ref(null)

// One error ref per panel. A panel renders its empty state only when its call
// succeeded with zero rows; a failure renders UiErrorState (and, for the roster
// calls, withholds the verdict / ROI that would otherwise read as `n<10`).
const rosterError = ref(null)       // wallets — the page cannot render without it
const performanceError = ref(null)  // get_wallet_performance — every verdict and ROI
const coverageError = ref(null)     // /api/wallet/tipsters — a mirror's ROI qualifier
const betsError = ref(null)
const parlaysError = ref(null)
const historyError = ref(null)
const breakdownError = ref(null)
const seasonLadderError = ref(null)
const vulnerabilityError = ref(null)
const marginOfLossError = ref(null)

const bets = ref([])
const betsTotal = ref(0)
const betsLoading = ref(false)
const betFilter = ref('')
const ledgerTab = ref('slips')
const ledgerPage = ref(0)
const selectedParlay = ref(null)

const listEl = ref(null)
const listHeight = ref(0)

const parlays = ref([])
const parlaysTotal = ref(0)
const parlaysLoading = ref(false)

const breakdown = ref(null)
const breakdownLoading = ref(false)

const seasonLadder = ref([])
const seasonLadderLoading = ref(false)

const vulnerability = ref(null)
const vulnerabilityLoading = ref(false)

const marginOfLoss = ref(null)
const marginOfLossLoading = ref(false)

const showAddBet = ref(false)

/** Hand-built player-props wallets and the competition each one's slate is built for. */
const PROPS_LEAGUE_BY_WALLET = { 29: 'euroleague', 58: 'eurocup' }
const VIEWS = [
  { key: 'ledger', label: 'Ledger' },
  { key: 'slate',  label: 'Slate' },
]
const view = ref('ledger')
const slateDate = ref(athensToday())
const propsLeague = computed(() => PROPS_LEAGUE_BY_WALLET[walletId.value] || null)
const slate = usePropsSlate(propsLeague, slateDate)

const historyDays = ref(0)
const historyPoints = ref([])
const historyStart = ref(null)
const historyLoading = ref(false)

const rowPx = computed(() => ledgerTab.value === 'slips' ? SLIP_ROW_PX
  : cohort.value === 'mirror' ? MIRROR_ROW_PX : SINGLE_ROW_PX)
const pageSize = computed(() =>
  Math.max(5, Math.floor((listHeight.value - LIST_PAD_PX + 4) / rowPx.value)))

const ledgerTotal = computed(() => ledgerTab.value === 'slips' ? parlaysTotal.value : betsTotal.value)
const ledgerLoading = computed(() => ledgerTab.value === 'slips' ? parlaysLoading.value : betsLoading.value)

const breakdownHasRows = computed(() =>
  Object.values(breakdown.value?.cuts || {}).some(rows => rows.length))

/** Mirrors WalletVulnerability's own hasAnyData — the panel renders nothing without it. */
const vulnerabilityHasData = computed(() => {
  const v = vulnerability.value || {}
  return (v.near_miss?.by_losing_legs?.length || 0) > 0
    || (v.cashout?.n_parlays || 0) > 0
    || (v.odds_band?.length || 0) > 0
    || (marginOfLoss.value?.by_bucket?.length || 0) > 0
    || Object.values(v.participation?.cuts || {}).some(rows => rows.length)
})

const hasRightColumn = computed(() =>
  parlaysTotal.value > 0 || vulnerabilityHasData.value || !!vulnerabilityError.value || !!marginOfLossError.value)

const wallet = computed(() => allWallets.value.find(w => w.id === walletId.value) || null)
const meta = computed(() => wallet.value ? resolveWalletMeta(wallet.value) : null)
const perf = computed(() => performance.value.find(p => p.wallet_id === walletId.value) || null)
const coverage = computed(() =>
  (tipsters.value?.authors || []).find(a => a.wallet_id === walletId.value) || null)

const cohort = computed(() => wallet.value ? cohortOf(wallet.value) : 'legacy')
const isMirrorCohort = computed(() => cohort.value === 'mirror' || cohort.value === 'user_mirror')
const showLoadProgress = ref(false)
function loadSlate() {
  view.value = 'slate'
  showLoadProgress.value = true
  slate.load()
}

/** Cohort-corrected verdict — see the module docstring. */
const scored = computed(() => {
  const score = wallet.value
    ? scoreRoster(allWallets.value, performance.value).get(wallet.value.id)
    : null
  return {
    verdict: score?.verdict ?? 'n<10',
    family: score ? { k: score.k, bonferroni: score.bar } : null,
  }
})

/**
 * Every wallet-scoped loader captures the id it was started for and drops its
 * result (data, error AND loading flag) if the route has moved on. Sibling
 * navigation (/wallet/40 → /wallet/41) reuses this component, so without the
 * check a slow response for the previous wallet landed on the new one.
 */
const isCurrent = (id) => id === walletId.value

async function loadRoster() {
  const [w, p, t] = await Promise.allSettled([
    api.fetchWallets(),
    api.fetchWalletPerformance(),
    apiFetch('/api/wallet/tipsters'),
  ])
  rosterError.value = w.status === 'rejected' ? errorText(w.reason) : null
  performanceError.value = p.status === 'rejected' ? errorText(p.reason) : null
  coverageError.value = t.status === 'rejected' ? errorText(t.reason) : null
  allWallets.value = w.status === 'fulfilled' ? (w.value.wallets || []) : []
  performance.value = p.status === 'fulfilled' ? (p.value || []) : []
  tipsters.value = t.status === 'fulfilled' ? t.value : null
}

async function reloadRoster() {
  loading.value = true
  await loadRoster()
  loading.value = false
}

async function loadBets() {
  const id = walletId.value
  betsLoading.value = true
  betsError.value = null
  try {
    const data = await api.fetchWalletBets(id, {
      limit: pageSize.value,
      offset: ledgerTab.value === 'singles' ? ledgerPage.value * pageSize.value : 0,
      status: betFilter.value || undefined,
    })
    if (!isCurrent(id)) return
    bets.value = data.bets || []
    betsTotal.value = data.total || 0
  } catch (e) {
    if (!isCurrent(id)) return
    bets.value = []
    betsTotal.value = 0
    betsError.value = errorText(e)
  } finally {
    if (isCurrent(id)) betsLoading.value = false
  }
}

async function loadParlays() {
  const id = walletId.value
  parlaysLoading.value = true
  parlaysError.value = null
  try {
    const data = await api.fetchWalletParlays(id, {
      limit: pageSize.value,
      offset: ledgerTab.value === 'slips' ? ledgerPage.value * pageSize.value : 0,
      status: betFilter.value || undefined,
    })
    if (!isCurrent(id)) return
    parlays.value = data.parlays || []
    parlaysTotal.value = data.total || 0
    // Keep a slip the operator picked, even off this page; otherwise open the newest.
    if (!selectedParlay.value || selectedParlay.value.wallet_id !== id) {
      selectedParlay.value = parlays.value[0] || null
    }
  } catch (e) {
    if (!isCurrent(id)) return
    parlays.value = []
    parlaysTotal.value = 0
    parlaysError.value = errorText(e)
  } finally {
    if (isCurrent(id)) parlaysLoading.value = false
  }
}

async function loadHistory() {
  const id = walletId.value
  historyLoading.value = true
  historyError.value = null
  try {
    const data = await api.fetchWalletBalanceHistory(id, historyDays.value)
    if (!isCurrent(id)) return
    historyPoints.value = data.points || []
    historyStart.value = data.start_balance ?? null
  } catch (e) {
    if (!isCurrent(id)) return
    historyPoints.value = []
    historyStart.value = null
    historyError.value = errorText(e)
  } finally {
    if (isCurrent(id)) historyLoading.value = false
  }
}

async function loadBreakdown() {
  const id = walletId.value
  breakdownLoading.value = true
  breakdownError.value = null
  try {
    const data = await api.fetchWalletBreakdown(id)
    if (isCurrent(id)) breakdown.value = data
  } catch (e) {
    if (!isCurrent(id)) return
    breakdown.value = null
    breakdownError.value = errorText(e)
  } finally {
    if (isCurrent(id)) breakdownLoading.value = false
  }
}

async function loadSeasonLadder() {
  const id = walletId.value
  seasonLadderLoading.value = true
  seasonLadderError.value = null
  try {
    const data = await api.fetchWalletSeasonLadder(id)
    if (isCurrent(id)) seasonLadder.value = data
  } catch (e) {
    if (!isCurrent(id)) return
    seasonLadder.value = []
    seasonLadderError.value = errorText(e)
  } finally {
    if (isCurrent(id)) seasonLadderLoading.value = false
  }
}

async function loadVulnerability() {
  const id = walletId.value
  vulnerabilityLoading.value = true
  vulnerabilityError.value = null
  try {
    const data = await api.fetchWalletVulnerability(id)
    if (isCurrent(id)) vulnerability.value = data
  } catch (e) {
    if (!isCurrent(id)) return
    vulnerability.value = null
    vulnerabilityError.value = errorText(e)
  } finally {
    if (isCurrent(id)) vulnerabilityLoading.value = false
  }
}

/**
 * Scoped to mirrored tipster wallets (cohort 'mirror') only, even though the
 * RPC itself is generic over any wallet with goal-based singles — it also
 * returns real data for our own single-betting strategies (e.g. W26), which
 * is out of scope for this pass. Gate lives here, at the call site, not in
 * the RPC, so it stays a reusable primitive if a future session wants it
 * elsewhere.
 */
async function loadMarginOfLoss() {
  const id = walletId.value
  marginOfLossError.value = null
  if (cohort.value !== 'mirror') { marginOfLoss.value = null; return }
  marginOfLossLoading.value = true
  try {
    const data = await api.fetchWalletMarginOfLoss(id)
    if (isCurrent(id)) marginOfLoss.value = data
  } catch (e) {
    if (!isCurrent(id)) return
    marginOfLoss.value = null
    marginOfLossError.value = errorText(e)
  } finally {
    if (isCurrent(id)) marginOfLossLoading.value = false
  }
}

function setBetFilter(val) {
  betFilter.value = val
  ledgerPage.value = 0
  loadBets()
  loadParlays()
}

function setLedgerTab(tab) {
  if (ledgerTab.value === tab) return
  ledgerTab.value = tab
  ledgerPage.value = 0
  tab === 'slips' ? loadParlays() : loadBets()
}

function goPage(n) {
  ledgerPage.value = n
  ledgerTab.value === 'slips' ? loadParlays() : loadBets()
}

function setHistoryDays(d) {
  historyDays.value = d
  loadHistory()
}


/**
 * A slip was logged. It is in `user_real_bets` now, not yet in `bets` — the
 * mirror chain (bind → project → settle) runs backend-side — so refresh the
 * bet lists / breakdown but expect no change until that runs.
 */
function onBetLogged() {
  loadBets()
  loadParlays()
  loadBreakdown()
  loadHistory()
}

/** Drop everything the previous wallet loaded, so its rows can never show under the next. */
function resetWalletState() {
  bets.value = []; betsTotal.value = 0
  parlays.value = []; parlaysTotal.value = 0
  historyPoints.value = []; historyStart.value = null
  breakdown.value = null; seasonLadder.value = []
  vulnerability.value = null; marginOfLoss.value = null
  for (const e of [betsError, parlaysError, historyError, breakdownError, seasonLadderError, vulnerabilityError, marginOfLossError]) e.value = null
  betsLoading.value = parlaysLoading.value = historyLoading.value = false
  breakdownLoading.value = seasonLadderLoading.value = vulnerabilityLoading.value = marginOfLossLoading.value = false
}

// Re-runs on sibling navigation — /wallet/40 → /wallet/41 reuses the component.
watch(walletId, async (id) => {
  if (!Number.isFinite(id)) return
  loading.value = true
  ledgerPage.value = 0
  betFilter.value = ''
  selectedParlay.value = null
  view.value = 'ledger'
  resetWalletState()
  if (!allWallets.value.length) await loadRoster()
  if (!isCurrent(id)) return
  loading.value = false
  if (rosterError.value) return
  await Promise.all([loadBets(), loadParlays(), loadHistory(), loadBreakdown(), loadSeasonLadder(), loadVulnerability(), loadMarginOfLoss()])
  if (!isCurrent(id)) return
  // Open on the tab that holds this wallet's wagers; singles rows are taller,
  // so their page is re-fetched at the size that fits.
  ledgerTab.value = parlaysTotal.value > 0 ? 'slips' : 'singles'
  if (ledgerTab.value === 'singles') loadBets()
}, { immediate: true })

// Re-page when the panel's height changes the number of rows it holds.
let resizeObserver = null
let resizeTimer = null
watch(listEl, (el) => {
  resizeObserver?.disconnect()
  if (!el) return
  resizeObserver = new ResizeObserver(([entry]) => {
    const h = Math.round(entry.contentRect.height + LIST_PAD_PX)
    if (Math.abs(h - listHeight.value) < 8) return
    const before = pageSize.value
    listHeight.value = h
    if (pageSize.value === before) return
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => { ledgerPage.value = 0; loadBets(); loadParlays() }, 150)
  })
  resizeObserver.observe(el)
})
onBeforeUnmount(() => { resizeObserver?.disconnect(); clearTimeout(resizeTimer) })

useHead(() => ({ title: meta.value ? `${meta.value.longName} · Wallets · Protero` : 'Wallet · Protero' }))
</script>
