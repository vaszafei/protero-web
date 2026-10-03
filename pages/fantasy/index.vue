<script setup lang="ts">
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'

const apiFetch = useApiFetch()
/**
 * Fantasy console — two tabs:
 * (1) Stoiximan DFS — one slate-intake system for every Stoiximan contest
 *     (Greek Super League, Champions League, Europa/Conference League,
 *     EuroLeague, NBA). Same CSV shape across sports
 *     (Tournament,PlayerID,Name,FName,Club,Lineup,Position,Price); football
 *     runs the D3 join + `ml.fantasy.generate`, basketball runs
 *     `fantasy.dfs_slate`/`fantasy.generate` — both write to the same
 *     `fantasy_slates`/`fantasy_entries` tables, so one history list covers
 *     every sport. Football's projection failed its M4 holdout; basketball's
 *     has no validated edge either (points b=+0.08, rebounds hint fails
 *     k=115) — neither is a demonstrated edge.
 * (2) The official EuroLeague Fantasy Challenge (season-long, `fantasy.elfc_round`)
 *     — a different game (PIR+win, captain ×2, coach), not a Stoiximan DFS
 *     contest, so it stays a separate tool. Round 1 squad was built and
 *     frozen; unscored until R1's box scores land.
 */
definePageMeta({ layout: 'default', middleware: 'auth' })

type Tab = 'stoiximan' | 'elfc'
const tab = ref<Tab>('stoiximan')
const TABS: { key: Tab; label: string }[] = [
  { key: 'stoiximan', label: 'Stoiximan DFS' },
  { key: 'elfc', label: 'EuroLeague Fantasy Challenge' },
]

// ═══════════════════════════════════════════════════════════════════════
// Stoiximan DFS — slate intake + history, all leagues
// ═══════════════════════════════════════════════════════════════════════
const slates = ref<any[]>([])
const slatesLoading = ref(true)
const slatesError = ref<string | null>(null)
const toast = useToast()

const csvText = ref('')
const tournament = ref('Greek Super League')
const leagueKey = ref('greek_super_league')

const LEAGUES = [
  { key: 'greek_super_league', label: 'Greek Super League' },
  { key: 'champions_league', label: 'Champions League' },
  { key: 'europa_league', label: 'Europa League' },
  { key: 'conference_league', label: 'Conference League' },
  { key: 'euroleague', label: 'EuroLeague (basketball)' },
  { key: 'nba', label: 'NBA' },
]
const LEAGUE_CONTEST_DEFAULTS: Record<string, Record<string, any>> = {
  greek_super_league: {
    name: 'Greek Freeroll', field_size: 344, prize_pool: '€500.00',
    salary_cap: 65, salary_cap_unit: 'M', lineup_size: 6,
  },
  champions_league: {
    name: 'CL Satellite', field_size: 4984, prize_pool: '€115.00',
    salary_cap: 63, salary_cap_unit: 'M', lineup_size: 6,
  },
  euroleague: {
    name: 'EuroLeague Round', field_size: 5000, salary_cap: 84, salary_cap_unit: 'M', lineup_size: 7,
  },
  nba: {
    name: 'NBA Daily', field_size: 5000, salary_cap: 88, salary_cap_unit: 'M', lineup_size: 7,
  },
}
const contest = reactive({
  name: '',
  field_size: undefined as number | undefined,
  prize_pool: '',
  salary_cap: undefined as number | undefined,
  salary_cap_unit: '',
  lineup_size: undefined as number | undefined,
  formation: '',
})

function onLeagueChange() {
  const league = LEAGUES.find(l => l.key === leagueKey.value)
  if (league) tournament.value = league.label
  const def = LEAGUE_CONTEST_DEFAULTS[leagueKey.value]
  if (def) {
    contest.name = def.name
    contest.field_size = def.field_size
    contest.prize_pool = def.prize_pool ?? ''
    contest.salary_cap = def.salary_cap
    contest.salary_cap_unit = def.salary_cap_unit ?? ''
    contest.lineup_size = def.lineup_size
    contest.formation = def.formation ?? ''
  }
}
const uploading = ref(false)
const joinResult = ref<{
  slate_id: number
  total_players: number
  matched: number
  unmatched_total: number
  unmatched_expected_possible: { name: string; fname: string; club: string; lineup: string }[]
} | null>(null)

async function loadSlates() {
  slatesLoading.value = true
  slatesError.value = null
  try {
    const res = await apiFetch<any>('/api/fantasy/slates')
    slates.value = res.slates
  } catch (e) {
    slatesError.value = errorText(e)
  } finally {
    slatesLoading.value = false
  }
}

async function uploadSlate() {
  if (!csvText.value.trim()) return
  uploading.value = true
  joinResult.value = null
  try {
    joinResult.value = await apiFetch('/api/fantasy/slates', {
      method: 'POST',
      body: {
        csv: csvText.value,
        tournament: tournament.value,
        league_key: leagueKey.value,
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
    toast.add({ title: 'Slate upload failed', description: e?.data?.statusMessage || e?.message || String(e), color: 'red' })
  } finally {
    uploading.value = false
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Official EuroLeague Fantasy Challenge
// ═══════════════════════════════════════════════════════════════════════
const elfc = ref<any>({ status: 'loading' })
const elfcBusy = ref(false)
const elfcError = ref('')
const elfcForm = reactive({ matchday: 1, prices: '' })

async function loadElfc() {
  try {
    elfc.value = await apiFetch('/api/fantasy/euroleague/elfc')
  } catch (e) {
    elfc.value = { status: 'error', error: errorText(e) }
  }
}

async function recomputeElfc() {
  if (!elfcForm.prices.trim()) {
    elfcError.value = 'paste the path to a freshly-exported official price-list CSV first'
    return
  }
  elfcBusy.value = true
  elfcError.value = ''
  try {
    await apiFetch('/api/fantasy/euroleague/elfc', {
      method: 'POST',
      body: { matchday: elfcForm.matchday, prices: elfcForm.prices.trim() },
    })
    pollElfc()
  } catch (e: any) {
    elfcError.value = e?.data?.statusMessage || e?.message || String(e)
    elfcBusy.value = false
  }
}

let elfcPoll: ReturnType<typeof setInterval> | null = null
function pollElfc() {
  if (elfcPoll) clearInterval(elfcPoll)
  const startedAt = elfc.value?.computed_at
  elfcPoll = setInterval(async () => {
    await loadElfc()
    if (elfc.value?.status !== 'loading' && elfc.value?.computed_at !== startedAt) {
      clearInterval(elfcPoll!)
      elfcPoll = null
      elfcBusy.value = false
    }
  }, 4000)
}

onMounted(() => {
  loadSlates()
  loadElfc()
})
onUnmounted(() => {
  if (elfcPoll) clearInterval(elfcPoll)
})

function formatWhen(iso: string | null | undefined): string {
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
  <UiPageShell title="Fantasy" subtitle="Stoiximan DFS and the official season-long EuroLeague Fantasy Challenge. Neither has a demonstrated edge — every projection is a mean estimate, not validated on holdout.">
    <template #actions>
      <UiTabs v-model="tab" :tabs="TABS" />
    </template>

    <!-- ═══ Stoiximan DFS ═══ -->
    <div v-if="tab === 'stoiximan'" class="grid-12 fantasy-grid">
      <!-- Slate intake -->
      <section class="col-4 panel panel-fill">
        <header class="panel-head">
          <h2 class="panel-title">Slate intake</h2>
          <UiTooltip class="ml-auto" :width="400" placement="bottom">
            <span class="panel-link">status</span>
            <template #content>
              <p>
                <b>Football — M4 holdout failed.</b> The projection model scored −3.9% vs the last-5-match-mean
                baseline on the full Greek 2025-26 holdout (n=10,367 player-matches). Track O's MILP degenerates to
                the max-score lineup — the variance machinery adds nothing over the mean objective.
              </p>
              <p class="mt-2">
                <b>EuroLeague/NBA — no validated edge either.</b> Scoring is DraftKings-classic (fixed 2026-09-23; the
                official contest scores PIR, Stoiximan does not). Our projection adds nothing on points (b=+0.08); the
                rebounds hint fails multiplicity (k=115).
              </p>
              <p class="mt-2">
                The honest next step for both is the forward experiment: enter a real contest, capture
                <code>Lineup</code> + finishing rank, score it after the fact.
              </p>
            </template>
          </UiTooltip>
        </header>
        <div class="panel-scroll p-3 space-y-2">
          <div>
            <label class="text-[11px] text-zinc-500 uppercase tracking-wider">League</label>
            <USelect
              v-model="leagueKey"
              :options="LEAGUES.map(l => ({ label: l.label, value: l.key }))"
              class="mt-1"
              @change="onLeagueChange"
            />
          </div>
          <div>
            <label class="text-[11px] text-zinc-500 uppercase tracking-wider">Tournament</label>
            <UInput v-model="tournament" class="mt-1" />
          </div>
          <div>
            <label class="text-[11px] text-zinc-500 uppercase tracking-wider">Player CSV (paste)</label>
            <UTextarea
              v-model="csvText"
              :rows="5"
              class="mt-1 font-mono text-xs"
              placeholder="Tournament,PlayerID,Name,FName,Club,Lineup,Position,Price&#10;1138895,113962,Ingason,Sverrir Ingi,PAO,injured,defender,8.9&#10;…"
            />
          </div>

          <details>
            <summary class="text-xs text-zinc-400 cursor-pointer">Contest parameters (not in the CSV)</summary>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <UInput v-model="contest.name" placeholder="contest name" size="xs" />
              <UInput v-model.number="contest.field_size" type="number" placeholder="field size (e.g. 344)" size="xs" />
              <UInput v-model="contest.prize_pool" placeholder="prize pool (€500.00)" size="xs" />
              <UInput v-model.number="contest.salary_cap" type="number" placeholder="salary cap" size="xs" />
              <UInput v-model="contest.salary_cap_unit" placeholder="cap unit (M / credits)" size="xs" />
              <UInput v-model.number="contest.lineup_size" type="number" placeholder="lineup size" size="xs" />
              <UInput v-model="contest.formation" placeholder="formation (3-4-3, football only)" size="xs" />
            </div>
          </details>

          <UButton :loading="uploading" block @click="uploadSlate">Upload slate</UButton>

          <div v-if="joinResult" class="rounded-lg border border-edge bg-surface/60 p-3">
            <div class="text-xs text-zinc-300 mb-1">
              {{ joinResult.matched }}/{{ joinResult.total_players }} players joined
              <span v-if="joinResult.unmatched_expected_possible.length" class="text-amber-400">
                — {{ joinResult.unmatched_expected_possible.length }} expected/possible unmatched
              </span>
              <span v-else class="text-zinc-400">— no expected/possible holes</span>
            </div>
            <ul v-if="joinResult.unmatched_expected_possible.length" class="text-[11px] text-zinc-500 space-y-0.5">
              <li v-for="u in joinResult.unmatched_expected_possible" :key="u.name + u.club">
                {{ u.name }} {{ u.fname }} ({{ u.club }}, {{ u.lineup }})
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Slates -->
      <section class="col-8 panel panel-fill">
        <header class="panel-head">
          <h2 class="panel-title">Slates</h2>
          <span class="panel-count">{{ slates.length }}</span>
        </header>
        <UiSkeletonPanel v-if="slatesLoading" :rows="10" :title="false" />
        <UiErrorState v-else-if="slatesError" class="m-3" title="The slate list failed to load." :error="slatesError" @retry="loadSlates" />
        <p v-else-if="slates.length === 0" class="px-3 py-3 text-sm text-zinc-500">No slates uploaded yet.</p>
        <div v-else class="panel-scroll">
          <table class="w-full text-xs">
            <thead class="sticky top-0 z-[1] bg-surface">
              <tr class="text-zinc-500">
                <th class="text-left font-medium px-3 py-1.5 w-12">#</th>
                <th class="text-left font-medium px-2 py-1.5">Slate</th>
                <th class="text-left font-medium px-2 py-1.5 w-40">League</th>
                <th class="text-left font-medium px-2 py-1.5 w-28">Date</th>
                <th class="text-right font-medium px-2 py-1.5 w-20">Cap</th>
                <th class="text-right font-medium px-3 py-1.5 w-44">Field · prize</th>
                <th class="text-right font-medium px-3 py-1.5 w-20">Added</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(s, i) in slates"
                :key="s.id"
                class="row-in border-t border-edge/40 cursor-pointer hover:bg-surface-light/30"
                :style="rowDelay(i)"
                @click="navigateTo(`/fantasy/${s.id}`)"
              >
                <td class="px-3 py-1 text-zinc-600 tabular-nums">{{ s.id }}</td>
                <td class="px-2 py-1 text-zinc-100 font-medium">
                  {{ s.tournament }}
                  <span v-if="s.contest_name" class="text-zinc-500 font-normal"> · {{ s.contest_name }}</span>
                </td>
                <td class="px-2 py-1 text-zinc-400 font-mono">{{ s.league_key || '—' }}</td>
                <td class="px-2 py-1 text-zinc-300 tabular-nums">{{ s.target_date || '—' }}</td>
                <td class="px-2 py-1 text-right text-zinc-400 tabular-nums">{{ s.salary_cap != null ? `${s.salary_cap}${s.salary_cap_unit || ''}` : '—' }}</td>
                <td class="px-3 py-1 text-right text-zinc-500 tabular-nums">{{ s.field_size ? `${s.field_size} · ${s.prize_pool ?? '—'}` : '—' }}</td>
                <td class="px-3 py-1 text-right text-zinc-600 tabular-nums">{{ formatWhen(s.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- ═══ Official EuroLeague Fantasy Challenge ═══ -->
    <section v-else class="panel panel-fill flex-1 min-h-0">
      <header class="panel-head">
        <h2 class="panel-title">EuroLeague Fantasy Challenge (official)</h2>
        <UiTooltip class="ml-auto" :width="360" placement="bottom">
          <span class="panel-link">how it works</span>
          <template #content>
            <p>
              Season-long: PIR +10% on a win, captain ×2, coach on margin bands. Needs a fresh price-list CSV exported
              from your own logged-in fantaking.dunkest.com session — nothing here logs in for you.
            </p>
          </template>
        </UiTooltip>
      </header>
      <div class="panel-scroll p-3">
        <div class="flex items-center gap-2 max-w-2xl">
          <UInput v-model.number="elfcForm.matchday" type="number" size="xs" placeholder="matchday" class="w-24" />
          <UInput v-model="elfcForm.prices" size="xs" placeholder="/path/to/prices_export.csv" class="flex-1" />
          <UButton size="2xs" :loading="elfcBusy" @click="recomputeElfc">Recompute</UButton>
        </div>

        <p v-if="elfcError" class="mt-2 text-[11px] text-negative">{{ elfcError }}</p>

        <p v-if="elfc.status === 'none'" class="mt-3 text-[11px] text-zinc-600">Nothing computed yet.</p>
        <UiErrorState v-else-if="elfc.status === 'error'" class="mt-3" title="The Fantasy Challenge result failed to load." :error="elfc.error" @retry="loadElfc" />
        <div v-else-if="elfc.status === 'ready'" class="mt-3">
          <div class="text-[11px] text-zinc-600 mb-2">
            computed {{ formatWhen(elfc.computed_at) }} ·
            target p{{ elfc.result.target_percentile }} = {{ elfc.result.target_score }}
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="t in elfc.result.teams"
              :key="t.team"
              class="rounded-lg border border-edge/60 bg-surface-light/30 p-2.5"
            >
              <div class="flex items-baseline justify-between">
                <span class="text-xs font-semibold text-zinc-200">Team {{ t.team }}</span>
                <span class="text-xs tabular-nums text-zinc-400">
                  E[round] {{ t.expected_round }} · {{ t.price_cr }} cr
                </span>
              </div>
              <div class="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                <span
                  v-for="(p, i) in t.squad"
                  :key="p.name"
                  :class="p.role === 'bench' ? 'text-zinc-600' : 'text-zinc-400'"
                >{{ p.name }}{{ p.captain ? ' (C)' : '' }}{{ i < t.squad.length - 1 ? ' · ' : '' }}</span>
              </div>
              <div class="text-[11px] text-zinc-600 mt-1">
                coach {{ t.coach.name }} ({{ t.coach.club }}) — E {{ t.coach.expected }}
              </div>
            </div>
          </div>
        </div>
        <UiSkeletonPanel v-else class="mt-3" :rows="4" :title="false" />
      </div>
    </section>
  </UiPageShell>
</template>

<style scoped>
.fantasy-grid {
  flex: 1 1 auto;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}
</style>
