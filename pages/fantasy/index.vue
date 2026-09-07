<script setup lang="ts">
/**
 * Fantasy DFS operator console (§F) — Stoiximan football slate intake,
 * contest parameters, projections table, and result capture.
 *
 * Blocked pieces are rendered as such: the optimiser (Track O) is gated on the
 * owner resolving D5's salary-cap units, and the projection model failed its
 * M4 holdout against the naive baseline, so neither number is fabricated here.
 */
const api = useApi()

const slates = ref<any[]>([])
const loading = ref(true)

// ── slate intake ──────────────────────────────────────────────────────────
const csvText = ref('')
const tournament = ref('Greek Super League')
const contest = reactive({
  name: '',
  field_size: undefined as number | undefined,
  prize_pool: '',
  salary_cap: undefined as number | undefined,
  salary_cap_unit: '',
  lineup_size: undefined as number | undefined,
  formation: '',
})
const uploading = ref(false)
const joinResult = ref<{
  slate_id: number
  total_players: number
  matched: number
  unmatched_total: number
  unmatched_expected_possible: { name: string; fname: string; club: string; lineup: string }[]
} | null>(null)

async function loadSlates() {
  loading.value = true
  try {
    const res = await $fetch('/api/fantasy/slates')
    slates.value = res.slates
  } catch (e) {
    console.warn('slate list failed:', e)
  } finally {
    loading.value = false
  }
}

async function uploadSlate() {
  if (!csvText.value.trim()) return
  uploading.value = true
  joinResult.value = null
  try {
    joinResult.value = await $fetch('/api/fantasy/slates', {
      method: 'POST',
      body: {
        csv: csvText.value,
        tournament: tournament.value,
        contest: {
          name: contest.name || null,
          field_size: contest.field_size ?? null,
          prize_pool: contest.prize_pool || null,
          salary_cap: contest.salary_cap ?? null,
          salary_cap_unit: contest.salary_cap_unit || null,
          lineup_size: contest.lineup_size ?? null,
          formation: contest.formation || null,
        },
      },
    })
    csvText.value = ''
    await loadSlates()
  } catch (e: any) {
    alert(`Slate upload failed: ${e?.data?.statusMessage || e?.message || e}`)
  } finally {
    uploading.value = false
  }
}

onMounted(loadSlates)

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const ageMs = Date.now() - d.getTime()
  const h = Math.floor(ageMs / 3600_000)
  const days = Math.floor(h / 24)
  if (days > 0) return `${days}d ago`
  if (h > 0) return `${h}h ago`
  return `${Math.max(0, Math.floor(ageMs / 60_000))}m ago`
}
</script>

<template>
  <div class="p-3 sm:p-6 max-w-[1200px] mx-auto">
    <div class="mb-4">
      <h1 class="text-xl sm:text-2xl font-bold text-white">Fantasy DFS</h1>
      <p class="text-zinc-500 text-xs sm:text-sm mt-0.5">
        Stoiximan football DFS operator console. Slate intake, the D3 join, and
        contest parameters. The optimiser is gated on the salary-cap decision
        (D5) and the projection model did not clear its holdout gate.
      </p>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <!-- Slate intake -->
      <div class="rounded-xl border border-edge bg-surface p-4">
        <h2 class="text-sm font-bold text-zinc-100 mb-2">Slate intake</h2>
        <div class="mb-2">
          <label class="text-[11px] text-zinc-500 uppercase tracking-wider">Tournament</label>
          <UInput v-model="tournament" class="mt-1" />
        </div>
        <div class="mb-2">
          <label class="text-[11px] text-zinc-500 uppercase tracking-wider">Player CSV (paste)</label>
          <UTextarea
            v-model="csvText"
            :rows="6"
            class="mt-1 font-mono text-xs"
            placeholder="Tournament,PlayerID,Name,FName,Club,Lineup,Position,Price&#10;1138895,113962,Ingason,Sverrir Ingi,PAO,injured,defender,8.9&#10;…"
          />
        </div>

        <details class="mb-3">
          <summary class="text-xs text-zinc-400 cursor-pointer">Contest parameters (not in the CSV)</summary>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UInput v-model="contest.name" placeholder="contest name" size="xs" />
            <UInput v-model.number="contest.field_size" type="number" placeholder="field size (e.g. 344)" size="xs" />
            <UInput v-model="contest.prize_pool" placeholder="prize pool (€500.00)" size="xs" />
            <UInput v-model.number="contest.salary_cap" type="number" placeholder="salary cap" size="xs" />
            <UInput v-model="contest.salary_cap_unit" placeholder="cap unit (M / credits)" size="xs" />
            <UInput v-model.number="contest.lineup_size" type="number" placeholder="lineup size" size="xs" />
            <UInput v-model="contest.formation" placeholder="formation (3-4-3)" size="xs" />
          </div>
        </details>

        <UButton :loading="uploading" @click="uploadSlate" block>
          Upload slate
        </UButton>

        <!-- Join result inline (§F.1) -->
        <div v-if="joinResult" class="mt-3 rounded-lg border border-edge bg-surface/60 p-3">
          <div class="text-xs text-zinc-300 mb-1">
            {{ joinResult.matched }}/{{ joinResult.total_players }} players joined
            <span v-if="joinResult.unmatched_expected_possible.length" class="text-amber-400">
              — {{ joinResult.unmatched_expected_possible.length }} expected/possible unmatched
            </span>
            <span v-else class="text-emerald-400">— no expected/possible holes</span>
          </div>
          <ul v-if="joinResult.unmatched_expected_possible.length" class="text-[11px] text-zinc-500 space-y-0.5">
            <li v-for="u in joinResult.unmatched_expected_possible" :key="u.name + u.club">
              {{ u.name }} {{ u.fname }} ({{ u.club }}, {{ u.lineup }})
            </li>
          </ul>
        </div>
      </div>

      <!-- Blocked tracks -->
      <div class="rounded-xl border border-edge bg-surface p-4">
        <h2 class="text-sm font-bold text-zinc-100 mb-2">Blocked — owner decisions pending</h2>
        <ul class="text-xs text-zinc-400 space-y-2">
          <li>
            <span class="text-zinc-200">D5 salary-cap units.</span>
            The CSV prices are 3.5–13.8; screenshots say 65M (Greek) and 63M (CL).
            Lineup size, formation, per-club cap and the cap unit are not published
            anywhere public. The optimiser cannot run until these are entered here.
          </li>
          <li>
            <span class="text-zinc-200">M4 holdout.</span>
            The projection model scored <span class="text-amber-400">−3.9% vs the
            last-5-match-mean baseline</span> on the full Greek 2025-26 holdout
            (n=10,367 player-matches) and stopped. A starters-only slice (+10.6%)
            is registered as a forward hypothesis, not a result.
          </li>
        </ul>
      </div>
    </div>

    <!-- Slate list -->
    <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-6 mb-2">
      Slates
    </h2>
    <div v-if="loading" class="text-sm text-zinc-600 py-8 text-center">loading…</div>
    <div v-else-if="slates.length === 0" class="rounded-xl border border-edge bg-surface p-4 text-sm text-zinc-500">
      No slates uploaded yet.
    </div>
    <div v-else class="grid sm:grid-cols-2 gap-3">
      <NuxtLink
        v-for="s in slates"
        :key="s.id"
        :to="`/fantasy/${s.id}`"
        class="rounded-xl border border-edge bg-surface p-4 hover:border-zinc-600"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-zinc-100">{{ s.tournament }}</span>
          <span class="text-[10px] text-zinc-600">#{{ s.id }}</span>
        </div>
        <div class="text-[11px] text-zinc-500 mt-1 space-y-0.5">
          <div v-if="s.contest_name">{{ s.contest_name }}</div>
          <div v-if="s.field_size">field {{ s.field_size }} · prize {{ s.prize_pool }}</div>
          <div v-if="s.salary_cap != null">cap {{ s.salary_cap }}{{ s.salary_cap_unit || '' }}</div>
          <div class="text-zinc-600">{{ formatWhen(s.created_at) }}</div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
