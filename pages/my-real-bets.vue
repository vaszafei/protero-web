<template>
  <div class="p-3 sm:p-6 max-w-4xl mx-auto pb-24">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">My Real Bets</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-1">
          Log the actual money you've placed at Stoiximan / other bookmakers
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <USelect v-model="statusFilter" :options="statusOptions" placeholder="All Status" size="sm" />
        <UButton icon="i-heroicons-plus" size="sm" color="primary" @click="openNew">Add Bet</UButton>
      </div>
    </div>

    <!-- Stats Summary -->
    <div v-if="summary" class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div class="bg-surface-light/50 border border-edge rounded-lg p-3 text-center">
        <p class="text-xl sm:text-2xl font-bold text-white">{{ summary.total }}</p>
        <p class="text-[11px] text-zinc-500">Total Bets</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-3 text-center">
        <p class="text-xl sm:text-2xl font-bold" :class="winRate >= 50 ? 'text-green-400' : 'text-red-400'">
          {{ winRate.toFixed(1) }}%
        </p>
        <p class="text-[11px] text-zinc-500">Win Rate ({{ summary.won }}-{{ summary.lost }})</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-3 text-center">
        <p class="text-xl sm:text-2xl font-bold" :class="summary.profit >= 0 ? 'text-green-400' : 'text-red-400'">
          {{ summary.profit >= 0 ? '+' : '' }}{{ Number(summary.profit).toFixed(2) }}€
        </p>
        <p class="text-[11px] text-zinc-500">P/L</p>
      </div>
      <div class="bg-surface-light/50 border border-edge rounded-lg p-3 text-center">
        <p class="text-xl sm:text-2xl font-bold" :class="summary.roi >= 0 ? 'text-green-400' : 'text-red-400'">
          {{ summary.roi >= 0 ? '+' : '' }}{{ Number(summary.roi).toFixed(1) }}%
        </p>
        <p class="text-[11px] text-zinc-500">ROI</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-zinc-500" />
    </div>

    <!-- Empty -->
    <div v-else-if="filteredBets.length === 0" class="bg-surface-light/50 border border-edge rounded-xl p-8 text-center">
      <UIcon name="i-heroicons-ticket" class="text-5xl text-zinc-600 mb-3 mx-auto block" />
      <h3 class="text-lg font-semibold text-white mb-2">No Real Bets Logged</h3>
      <p class="text-zinc-500 text-sm mb-4">
        Add your Stoiximan slips here to track real-money performance over the season.
      </p>
      <UButton color="primary" @click="openNew">Add First Bet</UButton>
    </div>

    <!-- Bet list -->
    <div v-else class="space-y-3">
      <div v-for="bet in filteredBets" :key="bet.id"
           class="bg-surface-light/50 border border-edge rounded-xl p-4">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span :class="statusClass(bet.status)"
                  class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
              {{ bet.status }}
            </span>
            <span class="text-zinc-400 text-xs">
              {{ formatBetType(bet.bet_type) }} · {{ bet.legs.length }}-leg
            </span>
            <span class="text-zinc-500 text-[11px]">
              {{ bet.bookmaker }}<span v-if="bet.bookmaker_external_id"> #{{ bet.bookmaker_external_id }}</span>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-white text-sm font-medium">{{ Number(bet.total_odds).toFixed(2) }}×</span>
            <UDropdown :items="rowMenu(bet)" :popper="{ placement: 'bottom-end' }">
              <UButton icon="i-heroicons-ellipsis-vertical" size="2xs" variant="ghost" color="gray" />
            </UDropdown>
          </div>
        </div>

        <!-- Legs -->
        <div class="space-y-1.5 mb-3">
          <div v-for="(leg, i) in bet.legs" :key="i"
               class="flex items-center gap-2 text-xs">
            <UIcon
              :name="legIcon(leg.result)"
              :class="legIconClass(leg.result)"
              class="text-base shrink-0"
            />
            <span class="text-white truncate flex-1">
              <span class="text-zinc-500">{{ leg.match || '?' }}</span>
              · <span class="text-white">{{ leg.selection }}</span>
            </span>
            <span class="text-zinc-400 shrink-0">@{{ Number(leg.odds || 0).toFixed(2) }}</span>
            <span v-if="leg.score" class="text-zinc-500 shrink-0">{{ leg.score }}</span>
          </div>
        </div>

        <!-- Screenshot -->
        <a v-if="bet.screenshot_url" :href="bet.screenshot_url" target="_blank" rel="noopener"
           class="block mb-3">
          <img :src="bet.screenshot_url" alt="Slip screenshot"
               class="max-h-32 rounded border border-edge" />
        </a>

        <!-- Footer -->
        <div class="flex items-center justify-between pt-2 border-t border-edge text-xs">
          <span class="text-zinc-500">{{ formatDate(bet.placed_at) }}</span>
          <div class="flex items-center gap-3">
            <span class="text-zinc-400">Stake €{{ Number(bet.stake).toFixed(2) }}</span>
            <span :class="bet.profit >= 0 ? 'text-green-400' : 'text-red-400'" class="font-medium">
              {{ bet.profit > 0 ? '+' : '' }}€{{ Number(bet.profit).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <WalletAddRealBetModal
      v-model="showForm"
      :editing-bet="editingBet"
      @saved="load"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()

const loading = ref(true)
const bets = ref<any[]>([])
const summary = ref<any>(null)
const statusFilter = ref('')

const showForm = ref(false)
const editingBet = ref<any>(null)

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'void', label: 'Void' },
]

const winRate = computed(() => {
  const decided = (summary.value?.won || 0) + (summary.value?.lost || 0)
  return decided > 0 ? ((summary.value.won / decided) * 100) : 0
})

const filteredBets = computed(() => {
  if (!statusFilter.value) return bets.value
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
    await $fetch(`/api/user-real-bets/${bet.id}`, { method: 'PATCH', body: { status } })
    toast.add({ title: `Marked ${status}`, color: 'green' })
    await load()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'red' })
  }
}

async function deleteBet(id: number) {
  if (!confirm('Delete this bet?')) return
  try {
    await $fetch(`/api/user-real-bets/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', color: 'green' })
    await load()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'red' })
  }
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ bets: any[]; summary: any }>('/api/user-real-bets')
    bets.value = res.bets || []
    summary.value = res.summary || null
  } catch (e: any) {
    toast.add({ title: 'Load failed', description: e.message, color: 'red' })
  } finally {
    loading.value = false
  }
}

function statusClass(status: string) {
  return {
    'bg-amber-500/20 text-amber-300': status === 'pending',
    'bg-green-500/20 text-green-300': status === 'won',
    'bg-red-500/20 text-red-300': status === 'lost',
    'bg-zinc-500/20 text-zinc-300': status === 'void' || status === 'cashout' || status === 'partial',
  }
}

function legIcon(result?: string) {
  if (result === 'won') return 'i-heroicons-check-circle'
  if (result === 'lost') return 'i-heroicons-x-circle'
  if (result === 'void') return 'i-heroicons-minus-circle'
  return 'i-heroicons-clock'
}
function legIconClass(result?: string) {
  if (result === 'won') return 'text-green-400'
  if (result === 'lost') return 'text-red-400'
  if (result === 'void') return 'text-zinc-400'
  return 'text-amber-400'
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
