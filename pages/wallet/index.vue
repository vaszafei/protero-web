<template>
  <div class="p-3 sm:p-6 max-w-[1600px] mx-auto min-h-screen pb-20 lg:pb-6">
    <!-- Header -->
    <div class="mb-4 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Wallets</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-0.5">
          Every wallet in the ledger, scored the way
          <code class="text-zinc-600">common.wallet_significance</code> scores it.
          Open one for its own page.
        </p>
      </div>

      <!-- Two totals, not one. Money we staked and money an external tipster
           staked are not the same fleet, and summing them makes the console
           report exposure we never carried. -->
      <div v-if="totals" class="flex items-start gap-6 text-xs">
        <div v-for="t in totals" :key="t.key" class="text-right">
          <p class="text-[10px] uppercase tracking-wider" :class="t.key === 'ours' ? 'text-zinc-400' : 'text-zinc-600'">
            {{ t.label }}
          </p>
          <div class="flex items-baseline gap-3 justify-end mt-0.5">
            <span class="text-[10px] text-zinc-500">n</span>
            <span class="text-base font-bold text-zinc-200 tabular-nums">{{ t.wagers.toLocaleString() }}</span>
            <span v-if="t.pending" class="text-[11px] font-semibold text-amber-400 tabular-nums">{{ t.pending }} open</span>
            <span class="text-base font-bold tabular-nums" :class="t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ t.pnl >= 0 ? '+' : '' }}{{ t.pnl.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <template v-else>
      <WalletRoster
        :wallets="allWallets"
        :performance="performance"
        :coverage="coverageRows"
        :sources="tipsters?.sources || []"
        @select="open"
        class="mb-6"
      />

      <!-- Provenance for the mirrored cohort. Below the roster because it
           qualifies those rows rather than introducing them. -->
      <WalletProvenance
        v-if="tipsters && tipsters.sources.length"
        :sources="tipsters.sources"
        :unit-stake="tipsters.unit_stake"
        @select="open"
      />
    </template>
  </div>
</template>

<script setup>
/**
 * Wallet roster — the index. One wallet's detail lives at /wallet/[id].
 *
 * They were one page until 2026-08-23, and it stopped working the moment the
 * mirrored tipsters were projected into the ledger: 44 roster rows above a
 * 300-row bet list is 8,500px of scroll with no addressable position in it.
 * A wallet is now a URL, so it can be linked, bookmarked and reloaded.
 *
 * Every number comes from `get_wallet_performance`. Do not reintroduce a
 * client-side ROI: the three formulas this page used to carry all computed
 * bankroll return, which renders W7 as +69.7% where its ROI is +11.5%.
 */
import { ref, computed, onMounted } from 'vue'
import { cohortOf } from '~/utils/wallet-stats'

definePageMeta({ middleware: 'auth' })

const toast = useToast()
const api = useApi()

const loading = ref(true)
const allWallets = ref([])
const performance = ref([])
const tipsters = ref(null)

const coverageRows = computed(() => tipsters.value?.authors || [])

/** Fleet totals, split by cohort — summed over wagers, so parlays count once. */
const totals = computed(() => {
  if (!performance.value.length) return null
  const cohortById = new Map(allWallets.value.map(w => [w.id, cohortOf(w)]))
  const zero = () => ({ wagers: 0, pending: 0, pnl: 0 })
  const acc = { ours: zero(), mirror: zero() }
  for (const p of performance.value) {
    const c = cohortById.get(p.wallet_id)
    // 'incubation' is excluded from fleet totals entirely: it accrues rows but
    // is not a track record and must not appear in any headline number.
    if (c === 'incubation') continue
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

function open(id) {
  navigateTo(`/wallet/${id}`)
}

onMounted(async () => {
  try {
    const [walletsData, perf, tips] = await Promise.all([
      api.fetchWallets(),
      api.fetchWalletPerformance().catch(() => []),
      $fetch('/api/wallet/tipsters').catch(() => null),
    ])
    allWallets.value = walletsData.wallets || []
    performance.value = perf || []
    tipsters.value = tips
  } catch (e) {
    console.error('Failed to load wallet data:', e)
    toast.add({ title: 'Failed to load wallets', color: 'red' })
  } finally {
    loading.value = false
  }
})

useHead({ title: 'Wallets · Protero' })
</script>
