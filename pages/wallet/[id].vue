<template>
  <div class="h-full max-w-[1680px] mx-auto px-4 pt-3 pb-3 flex flex-col gap-3">
    <!-- Desktop operator page, sized to the viewport: nothing scrolls at
         1920×1080. Three columns — the wallet's standing, its ledger, and the
         selected slip with the analytics. The ledger pages to the rows its panel
         can hold instead of growing the page. -->
    <!-- Identity: back to the roster, the wallet's name, and its actions. -->
    <div class="flex items-center gap-3 flex-shrink-0 min-w-0">
      <NuxtLink to="/wallet" title="All wallets" class="flex items-center text-zinc-500 hover:text-zinc-200 flex-shrink-0">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      </NuxtLink>
      <template v-if="wallet">
        <h1 class="text-lg font-bold text-white truncate">{{ meta.longName }}</h1>

        <div class="ml-auto flex items-center gap-2 flex-shrink-0">
          <span
            class="text-[10px] tabular-nums"
            :class="live.state === 'live' ? 'text-emerald-400/70' : 'text-zinc-500'"
            :title="live.state === 'live'
              ? 'Subscribed to this wallet\'s bets + parlays — the ledger refreshes when one is placed or settled.'
              : live.state === 'offline'
                ? `Realtime is not delivering (${live.reason}); reload to refresh.`
                : 'Connecting to Realtime…'"
          >{{ live.state }}</span>
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
            <UiTabs v-model="view" :tabs="VIEWS" size="sm" class="mr-2" />
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
          :truncated="historyTruncated"
          :error="historyError"
          @retry="loadHistory"
          @update:days="setHistoryDays"
        />
        <UiErrorState v-if="seasonLadderError" class="flex-shrink-0" title="The season ladder failed to load." :error="seasonLadderError" @retry="loadPage()" />
        <WalletSeasonLadder
          v-else-if="seasonLadder.length || seasonLadderLoading"
          class="flex-initial min-h-0"
          :seasons="seasonLadder"
          :loading="seasonLadderLoading"
        />
        <!-- Settled singles only — a slips-only wallet has nothing to show here. -->
        <UiErrorState v-if="breakdownError" class="flex-shrink-0" title="The P&L breakdown failed to load." :error="breakdownError" @retry="loadPage()" />
        <WalletBreakdown
          v-else-if="breakdownLoading || breakdownHasRows"
          class="flex-none max-h-[45%]"
          :breakdown="breakdown"
          :loading="breakdownLoading"
        />
      </div>

      <!-- ── Ledger ── -->
      <div class="panel flex flex-col min-h-0 overflow-hidden">
        <div class="panel-head !items-center gap-3 flex-shrink-0">
          <UiTabs :model-value="ledgerTab" :tabs="ledgerTabs" size="sm" @update:model-value="setLedgerTab" />
          <UiTabs
            class="ml-auto"
            :model-value="betFilter || 'all'"
            :tabs="STATUS_FILTERS"
            size="sm"
            @update:model-value="(k) => setBetFilter(k === 'all' ? '' : k)"
          />
        </div>

        <div ref="listEl" class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          <div v-if="ledgerLoading" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-zinc-600" />
          </div>
          <template v-else-if="ledgerTab === 'slips'">
            <UiErrorState v-if="parlaysError" title="The slips failed to load." :error="parlaysError" @retry="loadLedger('parlays')" />
            <p v-else-if="!parlays.length" class="text-center text-[11px] text-zinc-500 py-8">No {{ betFilter }} slips.</p>
            <WalletParlayRow
              v-for="(p, i) in parlays" :key="`p${p.id}`"
              class="row-in"
              :style="rowDelay(i)"
              :parlay="p"
              :selected="selectedParlay?.id === p.id"
              @select="selectedParlay = p"
            />
          </template>
          <template v-else>
            <UiErrorState v-if="betsError" title="The singles failed to load." :error="betsError" @retry="loadLedger('bets')" />
            <p v-else-if="!bets.length" class="text-center text-[11px] text-zinc-500 py-8">No {{ betFilter }} singles.</p>
            <WalletBetRow v-for="(bet, i) in bets" :key="`b${bet.id}`" class="row-in" :style="rowDelay(i)" :bet="bet" />
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
        <UiErrorState v-if="marginOfLossError" class="flex-shrink-0" title="The margin-of-loss analytics failed to load." :error="marginOfLossError" @retry="loadPage()" />
        <UiErrorState v-if="vulnerabilityError" class="flex-shrink-0" title="The wallet analytics failed to load." :error="vulnerabilityError" @retry="loadPage()" />
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
import { cohortOf, scoreRoster } from '#logic/wallet-stats'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'
import { usePropsSlate, athensToday } from '~/composables/usePropsSlate'

definePageMeta({ middleware: 'auth' })

const route = useRoute()

const ledgerTabs = computed(() => [
  { key: 'slips',   label: 'Slips',   badge: parlaysTotal.value },
  { key: 'singles', label: 'Singles', badge: betsTotal.value },
])
// UiTabs keys are strings, so "All" is 'all' here and '' only where the API is called.
const STATUS_FILTERS = [
  { label: 'All',     key: 'all' },
  { label: 'Pending', key: 'pending' },
  { label: 'Won',     key: 'won' },
  { label: 'Lost',    key: 'lost' },
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
const historyTruncated = ref(false)
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

/**
 * One request builds the whole page (`wallet-page` Edge Function, section `page`): the roster the
 * verdict is scored against, every panel, and the ledger's first page sized to this panel. A part
 * that failed comes back as its own `error` — the panel it feeds renders UiErrorState, and a roster
 * failure withholds the verdict instead of reading as `n<10`.
 */
const edge = useEdge()

/** The page size the ledger was last fetched at — the page re-pages only when its panel measures differently. */
let fetchedLimit = 0

async function loadPage(silent = false) {
  const id = walletId.value
  // A Realtime refresh keeps the panels on screen: no skeletons, and the ledger (its tab and page)
  // is re-read separately by `loadLedger`, so a silent refresh never snaps the operator back to page 0.
  if (!silent) {
    historyLoading.value = breakdownLoading.value = seasonLadderLoading.value = vulnerabilityLoading.value = true
    marginOfLossLoading.value = cohort.value === 'mirror'
    betsLoading.value = parlaysLoading.value = true
  }
  const limit = pageSize.value
  let b
  try {
    b = await edge('wallet-page', {
      section: 'page', walletId: id, historyDays: historyDays.value, limit, status: betFilter.value || undefined,
    })
  } catch (e) {
    if (!isCurrent(id)) return
    rosterError.value = errorText(e)
    historyLoading.value = breakdownLoading.value = seasonLadderLoading.value = vulnerabilityLoading.value = false
    marginOfLossLoading.value = betsLoading.value = parlaysLoading.value = false
    return
  }
  if (!isCurrent(id)) return

  rosterError.value = b.wallets.error
  performanceError.value = b.performance.error
  coverageError.value = b.coverage.error
  allWallets.value = b.wallets.data || []
  performance.value = b.performance.data || []
  tipsters.value = b.coverage.data

  applyHistory(b.history)
  breakdownError.value = b.breakdown.error
  breakdown.value = b.breakdown.data
  breakdownLoading.value = false
  seasonLadderError.value = b.seasonLadder.error
  seasonLadder.value = b.seasonLadder.data || []
  seasonLadderLoading.value = false
  vulnerabilityError.value = b.vulnerability.error
  vulnerability.value = b.vulnerability.data
  vulnerabilityLoading.value = false
  // Scoped to mirrored tipster wallets only (the RPC is generic; the gate lives at the call site).
  marginOfLossError.value = b.marginOfLoss?.error ?? null
  marginOfLoss.value = b.marginOfLoss?.data ?? null
  marginOfLossLoading.value = false

  if (silent) return
  fetchedLimit = limit
  ledgerTab.value = b.ledgerTab
  applyLedger(b.ledger)
}

function applyHistory(h) {
  historyError.value = h.error
  historyPoints.value = h.data?.points || []
  historyStart.value = h.data?.start_balance ?? null
  historyTruncated.value = !!h.data?.truncated
  historyLoading.value = false
}

function applyLedger(r) {
  if (r.bets) {
    betsError.value = r.bets.error
    bets.value = r.bets.data?.bets || []
    betsTotal.value = r.bets.data?.total || 0
    betsLoading.value = false
  }
  if (r.parlays) {
    parlaysError.value = r.parlays.error
    parlays.value = r.parlays.data?.parlays || []
    parlaysTotal.value = r.parlays.data?.total || 0
    parlaysLoading.value = false
    // Keep a slip the operator picked, even off this page; otherwise open the newest.
    if (!selectedParlay.value || selectedParlay.value.wallet_id !== walletId.value) {
      selectedParlay.value = parlays.value[0] || null
    }
  }
}

/**
 * One page of the ledger. `only` skips the list a paging click does not touch; omitted, both lists
 * are fetched (the tab badges need both totals).
 */
async function loadLedger(only) {
  const id = walletId.value
  if (only !== 'parlays') betsLoading.value = true
  if (only !== 'bets') parlaysLoading.value = true
  const limit = pageSize.value
  try {
    const r = await edge('wallet-page', {
      section: 'ledger', walletId: id, tab: ledgerTab.value, limit, page: ledgerPage.value,
      status: betFilter.value || undefined, only,
    })
    if (!isCurrent(id)) return
    fetchedLimit = limit
    applyLedger(r)
  } catch (e) {
    if (!isCurrent(id)) return
    const msg = errorText(e)
    if (only !== 'parlays') { bets.value = []; betsTotal.value = 0; betsError.value = msg; betsLoading.value = false }
    if (only !== 'bets') { parlays.value = []; parlaysTotal.value = 0; parlaysError.value = msg; parlaysLoading.value = false }
  }
}

async function loadHistory() {
  const id = walletId.value
  historyLoading.value = true
  historyError.value = null
  try {
    const data = await edge('wallet-page', { section: 'history', walletId: id, days: historyDays.value })
    if (!isCurrent(id)) return
    applyHistory({ data, error: null })
  } catch (e) {
    if (!isCurrent(id)) return
    historyPoints.value = []
    historyStart.value = null
    historyError.value = errorText(e)
    historyLoading.value = false
  }
}

async function reloadRoster() {
  loading.value = true
  rosterError.value = null
  await loadPage()
  loading.value = false
}

function setBetFilter(val) {
  betFilter.value = val
  ledgerPage.value = 0
  loadLedger()
}

function setLedgerTab(tab) {
  if (ledgerTab.value === tab) return
  ledgerTab.value = tab
  ledgerPage.value = 0
  loadLedger(tab === 'slips' ? 'parlays' : 'bets')
}

function goPage(n) {
  ledgerPage.value = n
  loadLedger(ledgerTab.value === 'slips' ? 'parlays' : 'bets')
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
  loadPage()
}

/** Drop everything the previous wallet loaded, so its rows can never show under the next. */
function resetWalletState() {
  bets.value = []; betsTotal.value = 0
  parlays.value = []; parlaysTotal.value = 0
  historyPoints.value = []; historyStart.value = null; historyTruncated.value = false
  breakdown.value = null; seasonLadder.value = []
  vulnerability.value = null; marginOfLoss.value = null
  for (const e of [betsError, parlaysError, historyError, breakdownError, seasonLadderError, vulnerabilityError, marginOfLossError]) e.value = null
  betsLoading.value = parlaysLoading.value = historyLoading.value = false
  breakdownLoading.value = seasonLadderLoading.value = vulnerabilityLoading.value = marginOfLossLoading.value = false
}

// A wager struck or settled on THIS wallet: refresh its standing and its ledger page, debounced.
const live = useRealtimeRefetch(
  'wallet',
  () => Number.isFinite(walletId.value)
    ? [{ table: 'bets', filter: `wallet_id=eq.${walletId.value}` }, { table: 'parlays', filter: `wallet_id=eq.${walletId.value}` }]
    : [],
  () => { if (!loading.value && !rosterError.value) { loadPage(true); loadLedger() } },
  2000,
)

// Re-runs on sibling navigation — /wallet/40 → /wallet/41 reuses the component.
watch(walletId, async (id) => {
  if (!Number.isFinite(id)) return
  loading.value = true
  ledgerPage.value = 0
  betFilter.value = ''
  selectedParlay.value = null
  view.value = 'ledger'
  resetWalletState()
  rosterError.value = null
  await loadPage()
  if (!isCurrent(id)) return
  loading.value = false
  // Slips and singles rows differ in height, so the page size that fits can differ from the one the
  // first call used; re-page once if the panel measures differently.
  if (!rosterError.value && fetchedLimit !== pageSize.value) loadLedger()
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
    resizeTimer = setTimeout(() => { ledgerPage.value = 0; loadLedger() }, 150)
  })
  resizeObserver.observe(el)
})
onBeforeUnmount(() => { resizeObserver?.disconnect(); clearTimeout(resizeTimer) })

useHead(() => ({ title: meta.value ? `${meta.value.longName} · Wallets · Protero` : 'Wallet · Protero' }))
</script>
