<template>
  <UModal v-model="open" :ui="{ width: 'sm:max-w-2xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-white">
            {{ editingBet ? 'Edit Bet' : 'Add Real Bet' }}
          </h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="ghost" color="gray" @click="open = false" />
        </div>
      </template>

      <!-- Slip screenshot: OCR pre-fill + kept as the visual record -->
      <div v-if="!editingBet" class="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white">Scan Stoiximan slip</p>
            <p class="text-xs text-zinc-400">
              Upload a screenshot — OCR extracts stake, odds, legs, slip ID. The image is stored with the bet.
            </p>
          </div>
          <input ref="fileInputGallery" type="file" accept="image/*"
                 class="hidden" @change="onFileSelected" />
          <input ref="fileInputCamera" type="file" accept="image/*" capture="environment"
                 class="hidden" @change="onFileSelected" />
          <div class="flex gap-1">
            <UButton size="xs" icon="i-heroicons-photo" :loading="ocr.running.value || processing"
                     :disabled="ocr.running.value || processing" variant="solid" color="primary"
                     @click="fileInputGallery?.click()">
              {{ ocr.running.value ? ocr.status.value : (processing ? 'Processing…' : 'Gallery') }}
            </UButton>
            <UButton size="xs" icon="i-heroicons-camera" :disabled="ocr.running.value || processing"
                     variant="soft" color="primary"
                     @click="fileInputCamera?.click()" />
          </div>
        </div>
        <p v-if="feedback" class="text-xs mt-2"
           :class="feedback.error ? 'text-red-400' : 'text-green-400'">
          {{ feedback.message }}
        </p>
        <div v-if="form.screenshot_url" class="mt-2 flex items-start gap-2">
          <img :src="form.screenshot_url" alt="Slip screenshot"
               class="max-h-40 rounded border border-edge" />
          <UButton size="2xs" icon="i-heroicons-x-mark" variant="ghost" color="gray"
                   @click="form.screenshot_url = ''" />
        </div>
        <details v-if="ocr.lastRawText.value" class="mt-2">
          <summary class="text-[11px] text-zinc-500 cursor-pointer">Raw OCR text</summary>
          <pre class="text-[10px] text-zinc-400 max-h-32 overflow-y-auto whitespace-pre-wrap mt-1">{{ ocr.lastRawText.value }}</pre>
        </details>
      </div>

      <!-- Editing: show the stored screenshot (replace via re-upload on a new bet) -->
      <div v-else-if="form.screenshot_url" class="mb-4">
        <img :src="form.screenshot_url" alt="Slip screenshot"
             class="max-h-40 rounded border border-edge" />
      </div>

      <div class="space-y-3">
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
            Auto profit:
            <span :class="autoProfit >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ autoProfit >= 0 ? '+' : '' }}€{{ autoProfit.toFixed(2) }}
            </span>
          </p>
          <div class="flex gap-2">
            <UButton variant="ghost" color="gray" @click="open = false">Cancel</UButton>
            <UButton color="primary" :loading="saving" @click="save">
              {{ editingBet ? 'Update' : 'Save Bet' }}
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Add / edit a real-money slip (`user_real_bets`, CD #31).
 *
 * Shared by `/my-real-bets` and `/wallet/[id]` (the W54 user-mirror wallet).
 *
 * The screenshot is downscaled client-side (≤1200px, JPEG q0.75) to a base64
 * data URI and stored directly in `user_real_bets.screenshot_url` — local
 * Supabase Storage is disabled for protero (`config.toml [storage] enabled =
 * false`), and this table holds ~1.4k rows total, so an inline ~100–250 KB
 * image per slip is acceptable and needs no bucket. OCR (`useStoiximanOcr`)
 * pre-fills the form from the same file.
 *
 * On success it emits `saved` — the parent reloads. A slip logged here still
 * needs the backend mirror chain (bind → project → settle) to appear as a wager
 * in W54; the toast says so.
 */
const props = defineProps<{
  modelValue: boolean
  editingBet?: any | null
  /**
   * When set, a NEW slip is logged against this user_mirror wallet's own
   * user (`POST /api/wallet/:id/real-bet`) so the projector picks it up.
   * Omitted on `/my-real-bets`, where the slip is the caller's own.
   */
  walletId?: number | null
}>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: []
}>()

const toast = useToast()
const ocr = useStoiximanOcr()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const editingBet = computed(() => props.editingBet ?? null)

const fileInputGallery = ref<HTMLInputElement | null>(null)
const fileInputCamera = ref<HTMLInputElement | null>(null)
const feedback = ref<{ message: string; error: boolean } | null>(null)
const processing = ref(false)
const saving = ref(false)

/** Downscale to ≤maxPx on the long edge and re-encode as a JPEG data URI. */
function toDataUri(file: File, maxPx = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas unsupported'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')) }
    img.src = url
  })
}

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
const statusOptionsForm = [
  { value: 'pending', label: 'Pending' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'void', label: 'Void' },
  { value: 'cashout', label: 'Cashout' },
]

function emptyLeg() {
  return { sport: 'football', league: '', match: '', market: '', selection: '', odds: 1, result: 'pending', score: '' }
}
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
    screenshot_url: '',
    legs: [emptyLeg(), emptyLeg()],
  }
}
const form = ref<any>(emptyForm())

// Reset / hydrate whenever the modal opens
watch(open, (isOpen) => {
  if (!isOpen) return
  feedback.value = null
  if (editingBet.value) {
    const b = editingBet.value
    form.value = {
      bookmaker: b.bookmaker || 'Stoiximan',
      bookmaker_external_id: b.bookmaker_external_id || '',
      bet_type: b.bet_type,
      placed_at: b.placed_at?.slice(0, 16) || '',
      stake: Number(b.stake) || 0,
      total_odds: Number(b.total_odds) || 1,
      status: b.status,
      notes: b.notes || '',
      screenshot_url: b.screenshot_url || '',
      legs: Array.isArray(b.legs) && b.legs.length ? b.legs.map((l: any) => ({ ...emptyLeg(), ...l })) : [emptyLeg()],
    }
  } else {
    form.value = emptyForm()
  }
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

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  feedback.value = null

  // 1. Downscale + inline the image as the visual record
  processing.value = true
  try {
    form.value.screenshot_url = await toDataUri(file)
  } catch (err: any) {
    feedback.value = { message: 'Image processing failed: ' + (err?.message || 'unknown'), error: true }
  } finally {
    processing.value = false
  }

  // 2. OCR pre-fill (best-effort — never blocks saving)
  try {
    const draft = await ocr.parseSlip(file)
    form.value.bookmaker = draft.bookmaker
    form.value.bookmaker_external_id = draft.bookmaker_external_id
    form.value.bet_type = draft.bet_type
    form.value.placed_at = draft.placed_at
    form.value.stake = draft.stake || form.value.stake
    form.value.total_odds = draft.total_odds || form.value.total_odds
    form.value.status = draft.status
    form.value.legs = draft.legs.length
      ? draft.legs.map((l) => ({ ...emptyLeg(), ...l }))
      : form.value.legs
    if (!feedback.value?.error) {
      feedback.value = {
        message: `✓ Parsed ${draft.legs.length} leg(s) — review fields below before saving`,
        error: false,
      }
    }
  } catch (err: any) {
    if (!feedback.value?.error) {
      feedback.value = { message: 'OCR failed: ' + (err?.message || 'unknown') + ' — fill manually', error: true }
    }
  } finally {
    if (target) target.value = ''
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
      screenshot_url: form.value.screenshot_url || undefined,
      legs: form.value.legs,
    }
    if (editingBet.value) {
      await $fetch(`/api/user-real-bets/${editingBet.value.id}`, {
        method: 'PATCH',
        body: {
          status: payload.status,
          legs: payload.legs,
          notes: payload.notes,
          screenshot_url: payload.screenshot_url,
        },
      })
    } else if (props.walletId) {
      await $fetch(`/api/wallet/${props.walletId}/real-bet`, { method: 'POST', body: payload })
    } else {
      await $fetch('/api/user-real-bets', { method: 'POST', body: payload })
    }
    toast.add({
      title: editingBet.value ? 'Bet updated' : 'Slip logged',
      description: editingBet.value ? undefined : 'Run the mirror chain (bind → project → settle) to reflect it in W54.',
      color: 'green',
    })
    open.value = false
    emit('saved')
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage || e.message, color: 'red' })
  } finally {
    saving.value = false
  }
}
</script>
