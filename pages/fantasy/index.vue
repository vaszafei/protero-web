<script setup lang="ts">
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
  { key: 'elfc', label: 'EuroLeague Fantasy Challenge (official)' },
]

// ═══════════════════════════════════════════════════════════════════════
// Stoiximan DFS — slate intake + history, all leagues
// ═══════════════════════════════════════════════════════════════════════
const slates = ref<any[]>([])
const slatesLoading = ref(true)

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
  try {
    const res = await apiFetch('/api/fantasy/slates')
    slates.value = res.slates
  } catch (e) {
    console.warn('slate list failed:', e)
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
    alert(`Slate upload failed: ${e?.data?.statusMessage || e?.message || e}`)
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
    elfc.value = { status: 'error', error: String(e) }
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
  <div class="p-3 sm:p-6 max-w-[1400px] mx-auto pb-20 lg:pb-6">
    <div class="mb-4">
      <h1 class="text-xl sm:text-2xl font-bold text-white">Fantasy</h1>
      <p class="text-zinc-500 text-xs sm:text-sm mt-0.5 max-w-3xl">
        Stoiximan DFS (football + EuroLeague + NBA, one slate history) and the official
        season-long EuroLeague Fantasy Challenge. Neither has a demonstrated edge — every
        projection below is a mean estimate, not validated on holdout.
      </p>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 border-b border-edge mb-4 overflow-x-auto">
      <button
        v-for="t in TABS" :key="t.key"
        @click="tab = t.key"
        class="px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
        :class="tab === t.key
          ? 'border-blue-500 text-white'
          : 'border-transparent text-zinc-500 hover:text-zinc-300'"
      >{{ t.label }}</button>
    </div>

    <!-- ═══ Stoiximan DFS ═══ -->
    <div v-if="tab === 'stoiximan'">
      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Slate intake -->
        <div class="rounded-xl border border-edge bg-surface p-4">
          <h2 class="text-sm font-bold text-zinc-100 mb-2">Slate intake</h2>
          <div class="mb-2">
            <label class="text-[11px] text-zinc-500 uppercase tracking-wider">League</label>
            <USelect
              v-model="leagueKey"
              :options="LEAGUES.map(l => ({ label: l.label, value: l.key }))"
              class="mt-1"
              @change="onLeagueChange"
            />
          </div>
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
              <UInput v-model="contest.formation" placeholder="formation (3-4-3, football only)" size="xs" />
            </div>
          </details>

          <UButton :loading="uploading" @click="uploadSlate" block>
            Upload slate
          </UButton>

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

        <!-- Status -->
        <div class="rounded-xl border border-edge bg-surface p-4">
          <h2 class="text-sm font-bold text-zinc-100 mb-2">Status</h2>
          <ul class="text-xs text-zinc-400 space-y-2">
            <li>
              <span class="text-zinc-200">Football — M4 holdout failed.</span>
              The projection model scored <span class="text-amber-400">−3.9% vs the
              last-5-match-mean baseline</span> on the full Greek 2025-26 holdout
              (n=10,367 player-matches). Track O's MILP degenerates to the
              max-score lineup — the variance machinery adds nothing over the
              mean objective.
            </li>
            <li>
              <span class="text-zinc-200">EuroLeague/NBA — no validated edge either.</span>
              Scoring is DraftKings-classic (fixed 2026-09-23; the official contest scores
              PIR, Stoiximan does not). Our projection adds nothing on points
              (b=+0.08); the rebounds hint fails multiplicity (k=115).
            </li>
            <li>
              The honest next step for both is the forward experiment: enter a
              real contest, capture <code class="text-zinc-300">Lineup</code> +
              finishing rank, score it after the fact.
            </li>
          </ul>
        </div>
      </div>

      <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-6 mb-2">
        Slates
      </h2>
      <div v-if="slatesLoading" class="text-sm text-zinc-600 py-8 text-center">loading…</div>
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
            <div v-if="s.league_key" class="text-zinc-400 font-mono">{{ s.league_key }}</div>
            <div v-if="s.contest_name">{{ s.contest_name }}</div>
            <div v-if="s.target_date" class="text-zinc-300">{{ s.target_date }}</div>
            <div v-if="s.field_size">field {{ s.field_size }} · prize {{ s.prize_pool }}</div>
            <div v-if="s.salary_cap != null">cap {{ s.salary_cap }}{{ s.salary_cap_unit || '' }}</div>
            <div class="text-zinc-600">{{ formatWhen(s.created_at) }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- ═══ Official EuroLeague Fantasy Challenge ═══ -->
    <div v-else class="rounded-xl border border-edge bg-surface p-4">
      <h2 class="text-sm font-bold text-zinc-100">EuroLeague Fantasy Challenge (official)</h2>
      <p class="text-[11px] text-zinc-500 mt-1">
        Season-long: PIR +10% on a win, captain ×2, coach on margin bands. Needs a fresh price-list
        CSV exported from your own logged-in fantaking.dunkest.com session — nothing here logs in
        for you.
      </p>

      <div class="grid grid-cols-[80px_1fr] gap-2 mt-3 max-w-lg">
        <UInput v-model.number="elfcForm.matchday" type="number" size="xs" placeholder="matchday" />
        <UInput v-model="elfcForm.prices" size="xs" placeholder="/path/to/prices_export.csv" />
      </div>
      <UButton size="2xs" class="mt-2" :loading="elfcBusy" @click="recomputeElfc">Recompute</UButton>

      <div v-if="elfcError" class="mt-2 text-[11px] text-red-400">{{ elfcError }}</div>

      <div v-if="elfc.status === 'none'" class="mt-3 text-[11px] text-zinc-600 py-6 text-center">
        Nothing computed yet.
      </div>
      <div v-else-if="elfc.status === 'error'" class="mt-3 text-[11px] text-red-400 py-3">
        {{ elfc.error }}
      </div>
      <div v-else-if="elfc.status === 'ready'" class="mt-3">
        <div class="text-[11px] text-zinc-600 mb-2">
          computed {{ formatWhen(elfc.computed_at) }} ·
          target p{{ elfc.result.target_percentile }} = {{ elfc.result.target_score }}
        </div>
        <div class="grid sm:grid-cols-2 gap-2">
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
      <div v-else class="mt-3 text-[11px] text-zinc-600 py-6 text-center">loading…</div>
    </div>
  </div>
</template>
