<script setup lang="ts">
/**
 * One DFS slate (§F) — projections table placeholder + result capture.
 *
 * Projections are intentionally absent: the model did not clear its M4 holdout
 * gate, so no projection number is shown rather than a fabricated one. Result
 * capture is live — it is the only real validation the system will ever get.
 */
const route = useRoute()
const slateId = route.params.slateId as string

const data = ref<{ slate: any; players: any[]; entries: any[] } | null>(null)
const loading = ref(true)

// result capture (§F.5)
const result = reactive({
  entry_id: undefined as number | undefined,
  actual_rank: undefined as number | undefined,
  winning_score: undefined as number | undefined,
  own_score: undefined as number | undefined,
  field_size: undefined as number | undefined,
})
const saving = ref(false)
const saved = ref(false)

async function load() {
  loading.value = true
  try {
    data.value = await $fetch(`/api/fantasy/slates/${slateId}`)
  } catch (e) {
    console.warn('slate fetch failed:', e)
  } finally {
    loading.value = false
  }
}

async function saveResult() {
  if (!result.entry_id) return
  saving.value = true
  saved.value = false
  try {
    await $fetch(`/api/fantasy/entries/${result.entry_id}/result`, {
      method: 'POST',
      body: {
        actual_rank: result.actual_rank ?? null,
        winning_score: result.winning_score ?? null,
        own_score: result.own_score ?? null,
        field_size: result.field_size ?? null,
      },
    })
    saved.value = true
  } catch (e: any) {
    alert(`Result save failed: ${e?.data?.statusMessage || e?.message || e}`)
  } finally {
    saving.value = false
  }
}

onMounted(load)

function lineupStatusClass(status: string) {
  if (status === 'expected') return 'text-emerald-400'
  if (status === 'possible') return 'text-amber-400'
  if (status === 'injured' || status === 'suspended') return 'text-red-400'
  return 'text-zinc-500'
}
</script>

<template>
  <div class="p-3 sm:p-6 max-w-[1200px] mx-auto">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <NuxtLink to="/fantasy" class="text-xs text-zinc-500 hover:text-zinc-300">← fantasy</NuxtLink>
        <h1 class="text-xl sm:text-2xl font-bold text-white mt-1">
          {{ data?.slate?.tournament || 'Slate' }}
        </h1>
        <p class="text-zinc-500 text-xs mt-0.5">
          {{ data?.players?.length ?? 0 }} players ·
          {{ data?.slate?.contest_name || 'no contest' }}
        </p>
      </div>
      <div v-if="data?.slate?.field_size" class="text-right text-xs text-zinc-500">
        <div>field {{ data.slate.field_size }}</div>
        <div>prize {{ data.slate.prize_pool }}</div>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-zinc-600 py-16 text-center">loading…</div>

    <template v-else-if="data">
      <!-- Generate picks (§F.4) -->
      <div class="rounded-xl border border-edge bg-surface p-4 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-zinc-100">Best picks</h2>
            <p class="text-[11px] text-zinc-500 mt-0.5">
              Runs the optimiser (MILP + field reconstruction). The projection is
              the M4-failed model — these are mean-projection picks, not a
              demonstrated edge.
            </p>
          </div>
          <UButton :loading="generating" @click="generatePicks" size="sm">
            Generate picks
          </UButton>
        </div>

        <!-- generated lineups -->
        <div v-if="data.entries?.length" class="mt-3 space-y-2">
          <div
            v-for="e in data.entries"
            :key="e.id"
            class="rounded-lg border border-edge bg-surface/60 p-3"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-zinc-200">{{ e.name }} — {{ e.projected_score?.toFixed(1) }} pts</span>
              <span v-if="e.p_in_money != null" class="text-zinc-500">P(top-20%) {{ (e.p_in_money * 100).toFixed(1) }}%</span>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="p in parseLineup(e.lineup)"
                :key="p.source_id"
                class="px-2 py-1 rounded bg-surface text-[11px] text-zinc-300 border border-edge"
              >
                {{ p.name }} <span class="text-zinc-500">· {{ p.club_code }} {{ p.position }} · {{ p.price_m }}M</span>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="mt-3 text-xs text-zinc-600">
          No picks generated yet.
        </div>
      </div>
      <!-- Projections table (§F.3) — no fabricated numbers -->
      <div class="rounded-xl border border-edge bg-surface overflow-hidden mb-4">
        <div class="p-3 border-b border-edge text-xs text-zinc-400">
          Projections are not shown — the projection model did not clear its M4
          holdout gate (see the plan's Track M), and the O3 optimiser
          degenerates to the max-score lineup, so no per-player interval is
          shown rather than a number that would over-trust the forward priors.
          The optimiser is built (D5 resolved; see <NuxtLink to="/fantasy"
          class="text-zinc-300 underline">the fantasy index</NuxtLink>) and the
          honest next step is the forward experiment: enter a real freeroll and
          capture <code class="text-zinc-300">Lineup</code> + finishing rank.
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="text-zinc-500 text-left border-b border-edge">
              <th class="p-2">Player</th>
              <th class="p-2">Club</th>
              <th class="p-2">Pos</th>
              <th class="p-2">Lineup</th>
              <th class="p-2 text-right">Price</th>
              <th class="p-2">Join</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in data.players" :key="p.id" class="border-b border-edge/50">
              <td class="p-2 text-zinc-200">{{ p.name }} {{ p.fname }}</td>
              <td class="p-2 text-zinc-400">{{ p.club_code }}</td>
              <td class="p-2 text-zinc-400">{{ p.position }}</td>
              <td class="p-2" :class="lineupStatusClass(p.lineup_status)">{{ p.lineup_status }}</td>
              <td class="p-2 text-right text-zinc-300 tabular-nums">{{ p.price }}</td>
              <td class="p-2">
                <span v-if="p.mapped_player_id" class="text-emerald-400">{{ p.map_confidence?.toFixed(2) }}</span>
                <span v-else class="text-red-400">unmatched</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Result capture (§F.5) -->
      <div class="rounded-xl border border-edge bg-surface p-4">
        <h2 class="text-sm font-bold text-zinc-100 mb-2">Result capture</h2>
        <p class="text-[11px] text-zinc-500 mb-3">
          After the contest, enter the actual finishing rank and winning score.
          This closes the loop and is the only real validation the system gets.
        </p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <UInput v-model.number="result.entry_id" type="number" placeholder="entry id" size="xs" />
          <UInput v-model.number="result.actual_rank" type="number" placeholder="actual rank" size="xs" />
          <UInput v-model.number="result.winning_score" type="number" placeholder="winning score" size="xs" />
          <UInput v-model.number="result.own_score" type="number" placeholder="own score" size="xs" />
          <UInput v-model.number="result.field_size" type="number" placeholder="field size" size="xs" />
        </div>
        <UButton :loading="saving" @click="saveResult" size="xs">Record result</UButton>
        <span v-if="saved" class="text-emerald-400 text-xs ml-3">saved</span>
      </div>
    </template>
  </div>
</template>
