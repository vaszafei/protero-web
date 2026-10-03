<script setup lang="ts">
/**
 * One DFS slate (§F) — projections table placeholder + result capture.
 *
 * Projections are intentionally absent: the model did not clear its M4 holdout
 * gate, so no projection number is shown rather than a fabricated one. Result
 * capture is live — it is the only real validation the system will ever get.
 */
definePageMeta({ layout: 'default', middleware: 'auth' })

import { computed, reactive, ref } from 'vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { getTeamLogoUrl } from '~/utils/teamLogo'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'

const apiFetch = useApiFetch()
const toast = useToast()

const route = useRoute()
const slateId = route.params.slateId as string

const data = ref<{ slate: any; players: any[]; entries: any[] } | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const generating = ref(false)

type SlateTab = 'picks' | 'players' | 'result'
const tab = ref<SlateTab>('picks')

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetch(`/api/fantasy/slates/${slateId}`)
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

async function generatePicks() {
  generating.value = true
  try {
    await apiFetch(`/api/fantasy/slates/${slateId}/generate`, {
      method: 'POST',
      body: { n_lineups: 5 },
    })
    // poll until entries land (generation is detached)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1500))
      await load()
      if (data.value?.entries?.length) break
    }
  } catch (e: any) {
    toast.add({ title: 'Generate failed', description: e?.data?.statusMessage || e?.message || String(e), color: 'red' })
  } finally {
    generating.value = false
  }
}

function parseLineup(lineup: any): any[] {
  if (Array.isArray(lineup)) return lineup
  if (typeof lineup === 'string') {
    try { return JSON.parse(lineup) } catch { return [] }
  }
  return []
}

// ── manual pick (§F.6) — admin attributes a user's entry ──────────────────
const users = ref<{ id: number; label: string; username: string; email: string }[]>([])
const usersError = ref<string | null>(null)
const pickUser = ref<number | undefined>(undefined)
const pickPlayerIds = ref<string[]>([])
const savingPick = ref(false)
const pickSaved = ref(false)

async function loadUsers() {
  usersError.value = null
  try {
    const res = await apiFetch<any>('/api/fantasy/users')
    users.value = res.users
  } catch (e) {
    usersError.value = errorText(e)
  }
}

function lineupOptions() {
  return (data.value?.players ?? []).map((p: any) => ({
    value: p.source_player_id,
    label: `${p.name} ${p.fname ?? ''}`.trim() + ` — ${p.club_code} ${p.position}`,
  }))
}

async function saveManualPick() {
  if (!pickUser.value || pickPlayerIds.value.length === 0) {
    toast.add({ title: 'Select a user and at least one player', color: 'amber' })
    return
  }
  const players = data.value?.players ?? []
  const lineup = pickPlayerIds.value
    .map(id => players.find(p => p.source_player_id === id))
    .filter(Boolean)
    .map((p: any) => ({
      source_id: p.source_player_id,
      name: `${p.name} ${p.fname ?? ''}`.trim(),
      club_code: p.club_code,
      position: p.position,
      price_m: p.price,
    }))
  savingPick.value = true
  pickSaved.value = false
  try {
    await apiFetch(`/api/fantasy/slates/${slateId}/manual-pick`, {
      method: 'POST',
      body: { user_id: pickUser.value, lineup },
    })
    pickSaved.value = true
    pickPlayerIds.value = []
    await load()
  } catch (e: any) {
    toast.add({ title: 'Manual pick failed', description: e?.data?.statusMessage || e?.message || String(e), color: 'red' })
  } finally {
    savingPick.value = false
  }
}

function isManual(e: any): boolean {
  return e.entry_type === 'manual'
}

function ownerLabel(e: any): string {
  if (!e.user_id) return ''
  const u = e.owner
  return u ? (u.display_name || u.name || u.username || u.email || `#${e.user_id}`) : `#${e.user_id}`
}

// ── quick recommended picks — the top generated lineup, one-click fill ─────
const recommendedLineup = computed(() => {
  const entries = data.value?.entries ?? []
  const top = entries.find((e: any) => !isManual(e) && e.projected_score != null)
  if (!top) return []
  return parseLineup(top.lineup).filter((p: any) => p.source_id)
})

function fillRecommended() {
  pickPlayerIds.value = recommendedLineup.value.map((p: any) => p.source_id)
}

onMounted(() => { load(); loadUsers() })

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

async function saveResult() {
  if (!result.entry_id) return
  saving.value = true
  saved.value = false
  try {
    await apiFetch(`/api/fantasy/entries/${result.entry_id}/result`, {
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
    toast.add({ title: 'Result save failed', description: e?.data?.statusMessage || e?.message || String(e), color: 'red' })
  } finally {
    saving.value = false
  }
}

function lineupStatusClass(status: string) {
  if (status === 'expected') return 'text-[var(--brand-blue)]'
  if (status === 'possible') return 'text-amber-400'
  if (status === 'injured' || status === 'suspended') return 'text-negative'
  return 'text-zinc-500'
}

// ── club logos — club_code → team_key → crest, with a text fallback ────────
// The slate CSV names clubs by code (BVB, LOSC…); the API now embeds the
// club's `team_key` (from the clubs table FK), and the crest resolves through
// the same `getTeamLogoUrl` path every other surface uses.
const clubTeamKeys = computed<Record<string, string | null>>(() => {
  const out: Record<string, string | null> = {}
  for (const p of data.value?.players ?? []) {
    const key = p.club?.team_key ?? null
    if (p.club_code && !(p.club_code in out)) out[p.club_code] = key
  }
  return out
})

function clubLogoUrl(clubCode: string | null | undefined): string | null {
  if (!clubCode) return null
  const key = clubTeamKeys.value[clubCode]
  return getTeamLogoUrl(key)
}

// Basketball slates (EuroLeague/NBA) have no D3 map (fantasy_player_map is football-only) —
// fantasy.dfs_slate does its own name/club matching at generate time instead, so "unmatched"
// here would be a false positive, not a real join failure.
const TABS = [
  { key: 'picks', label: 'Picks' },
  { key: 'players', label: 'Players' },
  { key: 'result', label: 'Result' },
]

const isBasketball = computed(() => ['euroleague', 'nba'].includes(data.value?.slate?.league_key ?? ''))
</script>

<template>
  <UiPageShell :title="data?.slate?.tournament || 'Slate'">
    <template #eyebrow>
      <NuxtLink to="/fantasy" class="text-[11px] text-zinc-500 hover:text-zinc-300">← Fantasy</NuxtLink>
    </template>
    <template #subtitle>
      <p class="text-xs text-zinc-500 mt-0.5">
        {{ data?.players?.length ?? 0 }} players · {{ data?.slate?.contest_name || 'no contest' }}
        <template v-if="data?.slate?.field_size"> · field {{ data.slate.field_size }} · prize {{ data.slate.prize_pool }}</template>
      </p>
    </template>
    <template #actions>
      <UiTabs v-model="tab" :tabs="TABS" size="sm" />
    </template>

    <Transition name="swap" mode="out-in">
      <UiSkeletonPanel v-if="loading && !data" :rows="10" height="100%" />

      <UiErrorState v-else-if="error" title="The slate failed to load." :error="error" @retry="load" />

      <div v-else-if="data" class="flex-1 min-h-0 flex flex-col">
        <!-- ═══ Picks ═══ -->
        <div v-if="tab === 'picks'" class="grid-12 slate-grid">
          <!-- Generate picks (§F.4) -->
          <section class="col-7 panel panel-fill">
            <header class="panel-head !items-center">
              <h2 class="panel-title">Best picks</h2>
              <UiTooltip :width="340" placement="bottom">
                <span class="panel-link !ml-0">how it works</span>
                <template #content>
                  <p>
                    Runs the optimiser (MILP + field reconstruction). The projection is the M4-failed model — these are
                    mean-projection picks, not a demonstrated edge.
                  </p>
                </template>
              </UiTooltip>
              <UButton class="ml-auto" :loading="generating" size="2xs" @click="generatePicks">Generate picks</UButton>
            </header>
            <div class="panel-scroll p-3">
              <div v-if="data.entries?.length" class="space-y-2">
                <div v-for="e in data.entries" :key="e.id" class="rounded-lg border border-edge bg-surface/60 p-3">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-zinc-200">
                      {{ e.name }} — {{ e.projected_score?.toFixed(1) ?? '—' }} pts
                      <span v-if="isManual(e)" class="pill pill-amber ml-1">manual</span>
                    </span>
                    <span class="flex items-center gap-2">
                      <span v-if="ownerLabel(e)" class="text-zinc-400">@{{ ownerLabel(e) }}</span>
                      <span v-if="e.p_in_money != null" class="text-zinc-500">P(top-20%) {{ (e.p_in_money * 100).toFixed(1) }}%</span>
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <span
                v-for="p in parseLineup(e.lineup)"
                :key="p.source_id"
                class="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface text-[11px] text-zinc-300 border border-edge"
              >
                <img
                  v-if="clubLogoUrl(p.club_code)"
                  :src="clubLogoUrl(p.club_code)!"
                  loading="lazy"
                  width="14"
                  height="14"
                  class="w-[14px] h-[14px] object-contain flex-shrink-0"
                  :alt="p.club_code"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                {{ p.name }} <span class="text-zinc-500">· {{ p.club_code }} {{ p.position }} · {{ p.price_m }}M</span>
              </span>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-zinc-600">No picks generated yet.</p>
            </div>
          </section>

          <!-- Manual pick (§F.6) — attribute a user's entry -->
          <section class="col-5 panel panel-fill">
            <header class="panel-head">
              <h2 class="panel-title">Manual pick</h2>
              <UiTooltip class="ml-auto" :width="300" placement="bottom">
                <span class="panel-link">how it works</span>
                <template #content>
                  <p>Enter a user's pick by hand. Stored as the user's entry and never overwritten by "Generate picks".</p>
                </template>
              </UiTooltip>
            </header>
            <div class="panel-scroll p-3 space-y-3">
              <UiErrorState v-if="usersError" compact title="The user list failed to load." :error="usersError" @retry="loadUsers" />

              <div v-if="recommendedLineup.length" class="rounded-lg border border-edge bg-surface/60 p-2">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[11px] text-zinc-500">Recommended — top generated lineup, a mean projection, not an edge</span>
                  <UButton size="2xs" variant="soft" @click="fillRecommended">Use these</UButton>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                v-for="p in recommendedLineup"
                :key="p.source_id"
                class="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface text-[11px] text-zinc-300 border border-edge"
              >
                <img
                  v-if="clubLogoUrl(p.club_code)"
                  :src="clubLogoUrl(p.club_code)!"
                  loading="lazy"
                  width="14"
                  height="14"
                  class="w-[14px] h-[14px] object-contain flex-shrink-0"
                  :alt="p.club_code"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                {{ p.name }} <span class="text-zinc-500">· {{ p.club_code }} {{ p.position }} · {{ p.price_m }}M</span>
              </span>
                </div>
              </div>

              <div>
                <label class="text-[11px] text-zinc-500 uppercase tracking-wider">User</label>
                <USelectMenu
                  v-model="pickUser"
                  :options="users.map(u => ({ value: u.id, label: u.label }))"
                  value-attribute="value"
                  option-attribute="label"
                  placeholder="Select user…"
                  class="mt-1"
                />
              </div>
              <div>
                <label class="text-[11px] text-zinc-500 uppercase tracking-wider">Players</label>
                <USelectMenu
                  v-model="pickPlayerIds"
                  :options="lineupOptions()"
                  multiple
                  value-attribute="value"
                  option-attribute="label"
                  placeholder="Select players…"
                  class="mt-1"
                />
              </div>
              <div class="flex items-center gap-3">
                <UButton :loading="savingPick" size="xs" @click="saveManualPick">Save pick</UButton>
                <span v-if="pickSaved" class="text-[var(--brand-blue)] text-xs">saved</span>
              </div>
            </div>
          </section>
        </div>

        <!-- ═══ Players ═══ -->
        <section v-else-if="tab === 'players'" class="panel panel-fill flex-1 min-h-0">
          <header class="panel-head">
            <h2 class="panel-title">Players</h2>
            <span class="panel-count">{{ data.players.length }}</span>
            <UiTooltip class="ml-auto" :width="420" placement="bottom">
              <span class="panel-link">why no projections</span>
              <template #content>
                <p>
                  Projections are not shown — the projection model did not clear its M4 holdout gate (see the plan's
                  Track M), and the O3 optimiser degenerates to the max-score lineup, so no per-player interval is shown
                  rather than a number that would over-trust the forward priors. The optimiser is built (D5 resolved) and
                  the honest next step is the forward experiment: enter a real freeroll and capture <code>Lineup</code> +
                  finishing rank.
                </p>
              </template>
            </UiTooltip>
          </header>
          <div class="panel-scroll">
            <table class="w-full text-xs">
              <thead class="sticky top-0 z-[1] bg-surface">
                <tr class="text-zinc-500 text-left border-b border-edge">
                  <th class="px-3 py-1.5">Player</th>
                  <th class="p-1.5">Club</th>
                  <th class="p-1.5">Pos</th>
                  <th class="p-1.5">Lineup</th>
                  <th class="p-1.5 text-right">Price</th>
                  <th class="px-3 py-1.5">Join</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in data.players" :key="p.id" class="border-b border-edge/50 row-in" :style="rowDelay(i)">
                  <td class="px-3 py-1 text-zinc-200">{{ p.name }} {{ p.fname }}</td>
                  <td class="p-1 text-zinc-400">
                    <span class="inline-flex items-center gap-1">
                      <img
                        v-if="clubLogoUrl(p.club_code)"
                        :src="clubLogoUrl(p.club_code)!"
                        loading="lazy"
                        width="14"
                        height="14"
                        class="w-[14px] h-[14px] object-contain flex-shrink-0"
                        :alt="p.club_code"
                        @error="($event.target as HTMLImageElement).style.display = 'none'"
                      />
                      {{ p.club_code }}
                    </span>
                  </td>
                  <td class="p-1 text-zinc-400">{{ p.position }}</td>
                  <td class="p-1" :class="lineupStatusClass(p.lineup_status)">{{ p.lineup_status }}</td>
                  <td class="p-1 text-right text-zinc-300 tabular-nums">{{ p.price }}</td>
                  <td class="px-3 py-1">
                    <span v-if="isBasketball" class="text-zinc-600">—</span>
                    <span v-else-if="p.mapped_player_id" class="text-zinc-300 tabular-nums">{{ p.map_confidence?.toFixed(2) }}</span>
                    <span v-else class="text-negative">unmatched</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ═══ Result capture (§F.5) ═══ -->
        <section v-else class="panel max-w-3xl">
          <header class="panel-head">
            <h2 class="panel-title">Result capture</h2>
            <UiTooltip class="ml-auto" :width="320" placement="bottom">
              <span class="panel-link">how it works</span>
              <template #content>
                <p>After the contest, enter the actual finishing rank and winning score. This closes the loop and is the only real validation the system gets.</p>
              </template>
            </UiTooltip>
          </header>
          <div class="p-3">
            <div class="grid grid-cols-3 gap-2 mb-3">
              <UInput v-model.number="result.entry_id" type="number" placeholder="entry id" size="xs" />
              <UInput v-model.number="result.actual_rank" type="number" placeholder="actual rank" size="xs" />
              <UInput v-model.number="result.winning_score" type="number" placeholder="winning score" size="xs" />
              <UInput v-model.number="result.own_score" type="number" placeholder="own score" size="xs" />
              <UInput v-model.number="result.field_size" type="number" placeholder="field size" size="xs" />
            </div>
            <div class="flex items-center gap-3">
              <UButton :loading="saving" size="xs" @click="saveResult">Record result</UButton>
              <span v-if="saved" class="text-[var(--brand-blue)] text-xs">saved</span>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </UiPageShell>
</template>

<style scoped>
.slate-grid {
  flex: 1 1 auto;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}
</style>
