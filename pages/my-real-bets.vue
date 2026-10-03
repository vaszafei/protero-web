<template>
  <UiPageShell title="Real bets" subtitle="The money actually placed at Stoiximan and other bookmakers.">
    <template #actions>
      <div v-if="summary" class="flex items-baseline gap-5 text-xs tabular-nums">
        <span><span class="text-zinc-500">bets</span> <b class="text-zinc-100 text-base">{{ summary.total }}</b></span>
        <span><span class="text-zinc-500">won–lost</span> <b class="text-zinc-100 text-base">{{ summary.won }}–{{ summary.lost }}</b>
          <span class="text-zinc-500"> ({{ winRate.toFixed(1) }}%)</span></span>
        <span><span class="text-zinc-500">P&amp;L</span> <b class="text-base" :class="summary.profit >= 0 ? 'text-positive' : 'text-negative'">{{ formatMoney(summary.profit, { signed: true }) }}</b></span>
        <span><span class="text-zinc-500">ROI</span> <b class="text-base" :class="summary.roi >= 0 ? 'text-positive' : 'text-negative'">{{ summary.roi >= 0 ? '+' : '' }}{{ Number(summary.roi).toFixed(1) }}%</b></span>
      </div>
      <UButton icon="i-heroicons-plus" size="sm" color="primary" @click="openNew">Add Bet</UButton>
    </template>

    <Transition name="swap" mode="out-in">
      <UiSkeletonPanel v-if="loading" :rows="8" height="100%" />

      <UiErrorState v-else-if="error" title="Real bets failed to load." :error="error" @retry="load" />

      <section v-else class="panel panel-fill flex-1 min-h-0">
        <header class="panel-head !items-center gap-3 flex-shrink-0">
          <UiTabs v-model="statusFilter" :tabs="statusTabs" size="sm" />
          <span class="text-[10px] text-zinc-600">{{ filteredBets.length }} shown</span>
        </header>

        <p v-if="filteredBets.length === 0" class="px-3 py-3 text-[11px] text-zinc-500">
          {{ bets.length ? 'No bet with that status.' : 'No real bets logged — add a Stoiximan slip to track real-money performance.' }}
        </p>

        <div v-else class="panel-scroll">
          <table class="w-full text-xs">
            <thead class="sticky top-0 z-[1] bg-surface">
              <tr class="text-zinc-500">
                <th class="text-left font-medium px-3 py-1.5 w-40">Placed</th>
                <th class="text-left font-medium px-2 py-1.5 w-24">Status</th>
                <th class="text-left font-medium px-2 py-1.5 w-32">Type</th>
                <th class="text-left font-medium px-2 py-1.5">Legs</th>
                <th class="text-right font-medium px-2 py-1.5 w-20">Odds</th>
                <th class="text-right font-medium px-2 py-1.5 w-24">Stake</th>
                <th class="text-right font-medium px-2 py-1.5 w-24">P&amp;L</th>
                <th class="w-10" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(bet, i) in filteredBets" :key="bet.id" class="row-in border-t border-edge/40" :style="rowDelay(i)">
                <td class="px-3 py-1.5 text-zinc-500 tabular-nums whitespace-nowrap">{{ formatDate(bet.placed_at) }}</td>
                <td class="px-2 py-1.5"><span class="pill" :class="statusClass(bet.status)">{{ bet.status }}</span></td>
                <td class="px-2 py-1.5 text-zinc-300">
                  {{ formatBetType(bet.bet_type) }} · {{ bet.legs.length }}-leg
                  <span class="block text-[10px] text-zinc-600">{{ bet.bookmaker }}<template v-if="bet.bookmaker_external_id"> #{{ bet.bookmaker_external_id }}</template></span>
                </td>
                <td class="px-2 py-1.5">
                  <UiTooltip :width="420" placement="bottom">
                    <span class="text-zinc-300 truncate inline-block max-w-[560px] align-bottom">
                      {{ legLabel(bet.legs[0]) }}
                      <span v-if="bet.legs.length > 1" class="text-zinc-600"> +{{ bet.legs.length - 1 }} more</span>
                    </span>
                    <template #content>
                      <p v-for="(leg, j) in bet.legs" :key="j" class="flex gap-2">
                        <span :class="legClass(leg.result)">{{ leg.result || 'open' }}</span>
                        <span>{{ legLabel(leg) }}<template v-if="leg.odds"> @{{ Number(leg.odds).toFixed(2) }}</template><template v-if="leg.score"> · {{ leg.score }}</template></span>
                      </p>
                    </template>
                  </UiTooltip>
                  <a v-if="bet.screenshot_url" :href="bet.screenshot_url" target="_blank" rel="noopener" class="ml-2 text-[10px] text-zinc-500 hover:text-zinc-300">slip</a>
                </td>
                <td class="px-2 py-1.5 text-right tabular-nums text-zinc-200">{{ Number(bet.total_odds).toFixed(2) }}×</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-zinc-400">{{ formatMoney(bet.stake) }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums font-medium" :class="bet.profit >= 0 ? 'text-positive' : 'text-negative'">{{ formatMoney(bet.profit, { signed: true }) }}</td>
                <td class="px-1 py-1.5 text-right">
                  <UDropdown :items="rowMenu(bet)" :popper="{ placement: 'bottom-end' }">
                    <UButton icon="i-heroicons-ellipsis-vertical" size="2xs" variant="ghost" color="gray" />
                  </UDropdown>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </Transition>

    <WalletAddRealBetModal
      v-model="showForm"
      :editing-bet="editingBet"
      @saved="load"
    />
  </UiPageShell>
</template>

<script setup lang="ts">
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { formatMoney } from '~/utils/formatters'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'
const apiFetch = useApiFetch()
definePageMeta({ middleware: 'auth' })

const toast = useToast()

const loading = ref(true)
const bets = ref<any[]>([])
const summary = ref<any>(null)
const statusFilter = ref('all')

const showForm = ref(false)
const editingBet = ref<any>(null)

const error = ref<string | null>(null)

// UiTabs keys are strings: 'all' here, '' never — the filter compares against the bet's own status.
const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'void', label: 'Void' },
]

const winRate = computed(() => {
  const decided = (summary.value?.won || 0) + (summary.value?.lost || 0)
  return decided > 0 ? ((summary.value.won / decided) * 100) : 0
})

const filteredBets = computed(() => {
  if (statusFilter.value === 'all') return bets.value
  return bets.value.filter(b => b.status === statusFilter.value)
})

function openNew() {
  editingBet.value = null
  showForm.value = true
}

function openEdit(bet: any) {
  editingBet.value = bet
  showForm.value = true
}

function rowMenu(bet: any) {
  return [[
    { label: 'Edit', icon: 'i-heroicons-pencil', click: () => openEdit(bet) },
    { label: 'Mark Won', icon: 'i-heroicons-check-circle',
      click: () => quickStatus(bet, 'won'), disabled: bet.status === 'won' },
    { label: 'Mark Lost', icon: 'i-heroicons-x-circle',
      click: () => quickStatus(bet, 'lost'), disabled: bet.status === 'lost' },
    { label: 'Delete', icon: 'i-heroicons-trash', click: () => deleteBet(bet.id) },
  ]]
}

async function quickStatus(bet: any, status: string) {
  try {
    await apiFetch(`/api/user-real-bets/${bet.id}`, { method: 'PATCH', body: { status } })
    toast.add({ title: `Marked ${status}`, color: 'green' })
    await load()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'red' })
  }
}

async function deleteBet(id: number) {
  if (!confirm('Delete this bet?')) return
  try {
    await apiFetch(`/api/user-real-bets/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', color: 'green' })
    await load()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'red' })
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<{ bets: any[]; summary: any }>('/api/user-real-bets')
    bets.value = res.bets || []
    summary.value = res.summary || null
  } catch (e: any) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

function statusClass(status: string) {
  if (status === 'pending') return 'pill-amber'
  if (status === 'won') return 'pill-good'
  if (status === 'lost') return 'pill-red'
  return 'pill-dim'
}

/** Slips logged before the leg shape settled carry `market` instead of `match`/`selection`. */
function legLabel(leg: any) {
  if (!leg) return '—'
  return [leg.match || leg.market, leg.selection].filter(Boolean).join(' · ') || '—'
}

function legClass(result?: string) {
  if (result === 'won') return 'text-positive'
  if (result === 'lost') return 'text-negative'
  return 'text-zinc-500'
}

function formatBetType(t: string) {
  return ({ single: 'Single', parlay: 'Parlay', bet_builder: 'Bet Builder', system: 'System' } as any)[t] || t
}

function formatDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>
