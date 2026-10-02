<template>
  <UiPageShell title="Wallets" subtitle="Every wallet in the ledger, scored the way common.wallet_significance scores it. Open one for its own page.">
    <!-- Two totals, not one. Money we staked and money an external tipster staked are not
         the same fleet, and summing them makes the console report exposure we never carried. -->
    <template v-if="totals" #actions>
      <div v-for="t in totals" :key="t.key" class="text-right text-xs">
        <p class="text-[10px] uppercase tracking-wider" :class="t.key === 'ours' ? 'text-zinc-400' : 'text-zinc-600'">
          {{ t.label }}
        </p>
        <div class="flex items-baseline gap-3 justify-end">
          <span class="text-[10px] text-zinc-500">n</span>
          <span class="text-base font-bold text-zinc-200 tabular-nums">{{ t.wagers.toLocaleString() }}</span>
          <span v-if="t.pending" class="text-[11px] font-semibold text-amber-400 tabular-nums">{{ t.pending }} open</span>
          <span class="text-base font-bold tabular-nums" :class="t.pnl >= 0 ? 'text-positive' : 'text-negative'">
            {{ formatMoney(t.pnl, { signed: true }) }}
          </span>
        </div>
      </div>
    </template>

    <Transition name="swap" mode="out-in">
      <UiSkeletonPanel v-if="loading" :rows="12" height="100%" />

      <UiErrorState
        v-else-if="walletsError"
        title="The wallets failed to load."
        :error="walletsError"
        @retry="load"
      />

      <!-- Without performance every row would read `n<10` — a failure, not a result. -->
      <UiErrorState
        v-else-if="performanceError"
        title="Wallet performance failed to load — no verdict or ROI to show."
        :error="performanceError"
        @retry="load"
      />

      <div v-else class="flex-1 min-h-0 flex flex-col gap-2">
        <UiErrorState
          v-if="coverageError"
          compact
          class="flex-shrink-0"
          title="Coverage unavailable — mirrored wallets' ROI is withheld."
          :error="coverageError"
          @retry="load"
        />
        <WalletRoster
          class="flex-1 min-h-0"
          :coverage-error="coverageError"
          :wallets="allWallets"
          :performance="performance"
          :coverage="coverageRows"
          :sources="tipsters?.sources || []"
          :selected-id="selectedId"
          @select="open"
        >
          <template v-if="tipsters && tipsters.sources.length" #sources>
            <WalletProvenance :sources="tipsters.sources" :unit-stake="tipsters.unit_stake" @select="open" />
          </template>
        </WalletRoster>
      </div>
    </Transition>
  </UiPageShell>
</template>

<script setup lang="ts">
/**
 * Wallet roster — the index. One wallet's detail lives at /wallet/[id].
 *
 * They were one page until 2026-08-23, and it stopped working the moment the
 * mirrored tipsters were projected into the ledger: 44 roster rows above a
 * 300-row bet list is 8,500px of scroll with no addressable position in it.
 * A wallet is now a URL, so it can be linked, bookmarked and reloaded. The cohorts
 * are tabs, so one screen holds one cohort.
 *
 * Every number comes from `get_wallet_performance`. Do not reintroduce a
 * client-side ROI: the three formulas this page used to carry all computed
 * bankroll return, which renders W7 as +69.7% where its ROI is +11.5%.
 */
import { ref, computed, onMounted } from 'vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { cohortOf } from '~/utils/wallet-stats'
import { errorText } from '~/utils/error-text'
import { formatMoney } from '~/utils/formatters'

const apiFetch = useApiFetch()

definePageMeta({ middleware: 'auth' })

const api = useApi()
const route = useRoute()

const selectedId = computed(() => {
  const w = Number(route.query.w)
  return Number.isFinite(w) && w > 0 ? w : null
})

const loading = ref(true)
const allWallets = ref<any[]>([])
const performance = ref<any[]>([])
const tipsters = ref<any>(null)
const walletsError = ref<string | null>(null)
const performanceError = ref<string | null>(null)
const coverageError = ref<string | null>(null)

const coverageRows = computed(() => tipsters.value?.authors || [])

/** Fleet totals, split by cohort — summed over wagers, so parlays count once. */
const totals = computed(() => {
  if (!performance.value.length) return null
  const cohortById = new Map(allWallets.value.map(w => [w.id, cohortOf(w)]))
  const zero = () => ({ wagers: 0, pending: 0, pnl: 0 })
  const acc = { ours: zero(), mirror: zero() }
  for (const p of performance.value) {
    const c = cohortById.get(p.wallet_id)
    // 'incubation' and 'user_mirror' are excluded from fleet totals entirely:
    // incubation accrues rows but is not a track record; user_mirror is a real
    // bettor's money, not ours. Neither may appear in a headline number.
    if (c === 'incubation' || c === 'user_mirror') continue
    // 'legacy' rolls into `ours`: it is our own history, frozen but ours.
    const bucket = c === 'mirror' ? 'mirror' : 'ours'
    acc[bucket].wagers += Number(p.n_wagers || 0)
    acc[bucket].pending += Number(p.n_pending || 0)
    acc[bucket].pnl += Number(p.pnl || 0)
  }
  return [
    { key: 'ours', label: 'Our wallets', ...acc.ours },
    { key: 'mirror', label: 'Mirrored tipsters', ...acc.mirror },
  ].filter(t => t.wagers || t.pending)
})

function open(id: number) {
  navigateTo(`/wallet/${id}`)
}

async function load() {
  loading.value = true
  const [w, p, t] = await Promise.allSettled([
    api.fetchWallets(),
    api.fetchWalletPerformance(),
    apiFetch('/api/wallet/tipsters'),
  ])
  walletsError.value = w.status === 'rejected' ? errorText(w.reason) : null
  performanceError.value = p.status === 'rejected' ? errorText(p.reason) : null
  coverageError.value = t.status === 'rejected' ? errorText(t.reason) : null
  allWallets.value = w.status === 'fulfilled' ? (w.value.wallets || []) : []
  performance.value = p.status === 'fulfilled' ? (p.value || []) : []
  tipsters.value = t.status === 'fulfilled' ? t.value : null
  loading.value = false
}

onMounted(load)

useHead({ title: 'Wallets · Protero' })
</script>
