<template>
  <div class="p-3 sm:p-6 max-w-4xl mx-auto pb-24">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">My Real Bets</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-1">
          Log the actual money you've placed at Stoiximan / other bookmakers ·
          <NuxtLink to="/my-bets" class="text-blue-400 hover:underline">Followed picks →</NuxtLink>
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

    <!-- Add/Edit modal -->
    <UModal v-model="showForm" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-white">
              {{ editingBet ? 'Edit Bet' : 'Add Real Bet' }}
            </h3>
            <UButton icon="i-heroicons-x-mark" size="xs" variant="ghost" color="gray" @click="showForm = false" />
          </div>
        </template>

        <!-- OCR upload (hidden when editing) -->
        <div v-if="!editingBet" class="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white">Scan Stoiximan slip</p>
              <p class="text-xs text-zinc-400">
                Upload a screenshot — OCR extracts stake, odds, legs, slip ID
              </p>
            </div>
            <!-- Two inputs: gallery (no capture) + camera (capture). User picks intent. -->
            <input ref="fileInputGallery" type="file" accept="image/*"
                   class="hidden" @change="onFileSelected" />
            <input ref="fileInputCamera" type="file" accept="image/*" capture="environment"
                   class="hidden" @change="onFileSelected" />
            <div class="flex gap-1">
              <UButton size="xs" icon="i-heroicons-photo" :loading="ocr.running.value"
                       :disabled="ocr.running.value" variant="solid" color="primary"
                       @click="fileInputGallery?.click()">
                {{ ocr.running.value ? ocr.status.value : 'Gallery' }}
              </UButton>
              <UButton size="xs" icon="i-heroicons-camera" :disabled="ocr.running.value"
                       variant="soft" color="primary"
                       @click="fileInputCamera?.click()" />
            </div>
          </div>
          <p v-if="ocrFeedback" class="text-xs mt-2"
             :class="ocrFeedback.error ? 'text-red-400' : 'text-green-400'">
            {{ ocrFeedback.message }}
          </p>
          <details v-if="ocr.lastRawText.value" class="mt-2">
            <summary class="text-[11px] text-zinc-500 cursor-pointer">Raw OCR text</summary>
            <pre class="text-[10px] text-zinc-400 max-h-32 overflow-y-auto whitespace-pre-wrap mt-1">{{ ocr.lastRawText.value }}</pre>
          </details>
        </div>

        <div class="space-y-3">
          <!-- Top-level fields -->
          <div class="grid grid-cols-2 gap-3">
            <UFormGroup label="Bookmaker">
              <UInput v-model="form.bookmaker" placeholder="Stoiximan" />
            </UFormGroup>
            <UFormGroup label="Slip ID (optional)">
              <UInput v-model="form.bookmaker_external_id" placeholder="20009204897" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <UFormGroup label="Bet Type">
              <USelect v-model="form.bet_type" :options="betTypeOptions" />
            </UFormGroup>
            <UFormGroup label="Date Placed">
              <UInput v-model="form.placed_at" type="datetime-local" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <UFormGroup label="Stake (€)">
              <UInput v-model.number="form.stake" type="number" step="0.01" min="0" />
            </UFormGroup>
            <UFormGroup label="Total Odds">
              <UInput v-model.number="form.total_odds" type="number" step="0.01" min="1" />
              <template #help>
                <button class="text-xs text-blue-400 underline" @click="autoComputeOdds">
                  Auto from legs
                </button>
              </template>
            </UFormGroup>
            <UFormGroup label="Status">
              <USelect v-model="form.status" :options="statusOptionsForm" />
            </UFormGroup>
          </div>

          <UFormGroup label="Notes (optional)">
            <UTextarea v-model="form.notes" :rows="2" />
          </UFormGroup>

          <!-- Legs -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-semibold text-white">Legs ({{ form.legs.length }})</h4>
              <UButton size="2xs" icon="i-heroicons-plus" @click="addLeg">Add Leg</UButton>
            </div>
            <div class="space-y-2">
              <div v-for="(leg, i) in form.legs" :key="i"
                   class="bg-surface-light/40 border border-edge rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-zinc-400">Leg {{ i + 1 }}</span>
                  <UButton size="2xs" icon="i-heroicons-trash" variant="ghost" color="red"
                           v-if="form.legs.length > 1" @click="removeLeg(i)" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <USelect v-model="leg.sport" :options="sportLegOptions" placeholder="Sport" />
                  <UInput v-model="leg.league" placeholder="League (e.g. la_liga)" />
                </div>
                <UInput v-model="leg.match" placeholder="Match (e.g. Osasuna vs Barcelona)" />
                <div class="grid grid-cols-2 gap-2">
                  <UInput v-model="leg.market" placeholder="Market (e.g. FINAL_RESULT)" />
                  <UInput v-model="leg.selection" placeholder="Selection (e.g. Barcelona)" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <UInput v-model.number="leg.odds" type="number" step="0.01" min="1" placeholder="Odds" />
                  <USelect v-model="leg.result" :options="resultOptions" placeholder="Result" />
                  <UInput v-model="leg.score" placeholder="Score (e.g. 1-2)" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between">
            <p class="text-xs text-zinc-500">
              Auto profit: <span :class="autoProfit >= 0 ? 'text-green-400' : 'text-red-400'">{{ autoProfit >= 0 ? '+' : '' }}€{{ autoProfit.toFixed(2) }}</span>
            </p>
            <div class="flex gap-2">
              <UButton variant="ghost" color="gray" @click="showForm = false">Cancel</UButton>
              <UButton color="primary" :loading="saving" @click="save">
                {{ editingBet ? 'Update' : 'Save Bet' }}
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const supabase = useSupabaseClient()

const loading = ref(true)
const saving = ref(false)
const bets = ref<any[]>([])
const summary = ref<any>(null)
const statusFilter = ref('')

const showForm = ref(false)
const editingBet = ref<any>(null)

// OCR — Stoiximan slip parsing
const ocr = useStoiximanOcr()
const fileInputGallery = ref<HTMLInputElement | null>(null)
const fileInputCamera = ref<HTMLInputElement | null>(null)
const ocrFeedback = ref<{ message: string; error: boolean } | null>(null)

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  ocrFeedback.value = null
  try {
    const draft = await ocr.parseSlip(file)
    // Pre-fill form
    form.value.bookmaker = draft.bookmaker
    form.value.bookmaker_external_id = draft.bookmaker_external_id
    form.value.bet_type = draft.bet_type
    form.value.placed_at = draft.placed_at
    form.value.stake = draft.stake || form.value.stake
    form.value.total_odds = draft.total_odds || form.value.total_odds
    form.value.status = draft.status
    form.value.legs = draft.legs.length
      ? draft.legs.map(l => ({ ...emptyLeg(), ...l }))
      : form.value.legs
    ocrFeedback.value = {
      message: `✓ Parsed ${draft.legs.length} leg(s) — review fields below before saving`,
      error: false,
    }
  } catch (err: any) {
    ocrFeedback.value = {
      message: 'OCR failed: ' + (err?.message || 'Unknown error') + ' — fill manually',
      error: true,
    }
  } finally {
    if (target) target.value = ''  // allow re-selecting same file
  }
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'void', label: 'Void' },
]
const statusOptionsForm = statusOptions.filter(o => o.value)

const betTypeOptions = [
  { value: 'single', label: 'Single (1 leg)' },
  { value: 'parlay', label: 'Parlay (2+ legs)' },
  { value: 'bet_builder', label: 'Bet Builder (same game)' },
  { value: 'system', label: 'System' },
]

const sportLegOptions = [
  { value: 'football', label: 'Football' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'other', label: 'Other' },
]

const resultOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'void', label: 'Void' },
]

function emptyForm() {
  return {
    bookmaker: 'Stoiximan',
    bookmaker_external_id: '',
    bet_type: 'parlay',
    placed_at: new Date().toISOString().slice(0, 16),
    stake: 5,
    total_odds: 1,
    status: 'pending',
    notes: '',
    legs: [emptyLeg(), emptyLeg()],
  }
}
function emptyLeg() {
  return { sport: 'football', league: '', match: '', market: '', selection: '', odds: 1, result: 'pending', score: '' }
}

const form = ref<any>(emptyForm())

const winRate = computed(() => {
  const decided = (summary.value?.won || 0) + (summary.value?.lost || 0)
  return decided > 0 ? ((summary.value.won / decided) * 100) : 0
})

const filteredBets = computed(() => {
  if (!statusFilter.value) return bets.value
  return bets.value.filter(b => b.status === statusFilter.value)
})

const autoProfit = computed(() => {
  const s = Number(form.value.stake) || 0
  const o = Number(form.value.total_odds) || 1
  if (form.value.status === 'won') return s * o - s
  if (form.value.status === 'lost') return -s
  return 0
})

function autoComputeOdds() {
  if (!form.value.legs?.length) return
  const product = form.value.legs.reduce((acc: number, l: any) => acc * (Number(l.odds) || 1), 1)
  form.value.total_odds = +product.toFixed(2)
}

function addLeg() { form.value.legs.push(emptyLeg()) }
function removeLeg(i: number) {
  if (form.value.legs.length > 1) form.value.legs.splice(i, 1)
}

function openNew() {
  editingBet.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(bet: any) {
  editingBet.value = bet
  form.value = {
    bookmaker: bet.bookmaker || 'Stoiximan',
    bookmaker_external_id: bet.bookmaker_external_id || '',
    bet_type: bet.bet_type,
    placed_at: bet.placed_at?.slice(0, 16) || '',
    stake: Number(bet.stake) || 0,
    total_odds: Number(bet.total_odds) || 1,
    status: bet.status,
    notes: bet.notes || '',
    legs: Array.isArray(bet.legs) && bet.legs.length ? bet.legs.map((l: any) => ({ ...emptyLeg(), ...l })) : [emptyLeg()],
  }
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

async function save() {
  saving.value = true
  try {
    const payload: any = {
      bookmaker: form.value.bookmaker,
      bookmaker_external_id: form.value.bookmaker_external_id || undefined,
      bet_type: form.value.bet_type,
      placed_at: new Date(form.value.placed_at).toISOString(),
      stake: form.value.stake,
      total_odds: form.value.total_odds,
      status: form.value.status,
      notes: form.value.notes,
      legs: form.value.legs,
    }
    if (editingBet.value) {
      await $fetch(`/api/user-real-bets/${editingBet.value.id}`, {
        method: 'PATCH',
        body: { status: payload.status, legs: payload.legs, notes: payload.notes },
      })
    } else {
      await $fetch('/api/user-real-bets', { method: 'POST', body: payload })
    }
    toast.add({ title: editingBet.value ? 'Bet updated' : 'Bet logged', color: 'green' })
    showForm.value = false
    await load()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e.message, color: 'red' })
  } finally {
    saving.value = false
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
