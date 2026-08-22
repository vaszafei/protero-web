<template>
  <div class="p-3 sm:p-6 max-w-[1600px] mx-auto min-h-screen pb-20 lg:pb-6">
    <div class="mb-4">
      <h1 class="text-xl sm:text-2xl font-bold text-white">Entities</h1>
      <p class="text-zinc-500 text-xs sm:text-sm mt-0.5 max-w-3xl">
        The digital-twin layer — the club, competition and player that survive a league change.
        Context and blind-spot detection, <span class="text-zinc-400">never a pricing input</span>.
      </p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-edge mb-4 overflow-x-auto scrollbar-hide">
      <button
        v-for="t in tabs" :key="t.key"
        @click="tab = t.key"
        class="px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors"
        :class="tab === t.key
          ? 'border-blue-500 text-zinc-100'
          : 'border-transparent text-zinc-500 hover:text-zinc-300'"
      >
        {{ t.label }}
        <span v-if="t.count != null" class="ml-1 text-[10px] text-zinc-600 tabular-nums">{{ t.count }}</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <template v-else>
      <!-- ═══ BLIND SPOTS ═══════════════════════════════════════════ -->
      <section v-if="tab === 'risk'">
        <p class="text-[11px] text-zinc-500 leading-relaxed mb-3 max-w-3xl">
          Upcoming fixtures where a club has no history in the division it is playing in — it was
          promoted, relegated, or moved. A rating learned in another division is what prices a
          promoted club as mid-table, so these are the fixtures to distrust rather than to bet.
        </p>

        <div v-if="!risk.length" class="text-sm text-zinc-500 py-8 text-center">
          No fixtures in the next 30 days involve a club that changed division.
        </div>

        <div v-else class="rounded-lg border border-edge overflow-x-auto">
          <table class="w-full text-xs min-w-[720px]">
            <thead>
              <tr class="bg-surface-light/40 text-zinc-500">
                <th class="text-left font-medium px-3 py-2 w-24">Date</th>
                <th class="text-left font-medium px-3 py-2">Fixture</th>
                <th class="text-left font-medium px-3 py-2 w-36">League</th>
                <th class="text-left font-medium px-3 py-2 w-52">Rating learned in</th>
                <th class="text-center font-medium px-2 py-2 w-28" title="Games played in the current division this season">In division</th>
                <th class="text-left font-medium px-3 py-2 w-24">Blind</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in risk" :key="r.game_id" class="border-t border-edge/40 hover:bg-surface-light/20">
                <td class="px-3 py-2 text-zinc-500 tabular-nums whitespace-nowrap">{{ shortDate(r.date) }}</td>
                <td class="px-3 py-2">
                  <NuxtLink :to="`/game/${r.game_id}`" class="text-zinc-200 hover:text-blue-400">
                    <span :class="isBlind(r, 'home') ? 'text-amber-300 font-medium' : ''">{{ r.home_team }}</span>
                    <span class="text-zinc-600 mx-1">v</span>
                    <span :class="isBlind(r, 'away') ? 'text-amber-300 font-medium' : ''">{{ r.away_team }}</span>
                  </NuxtLink>
                </td>
                <td class="px-3 py-2 text-zinc-500">{{ leagueName(r.league_key) }}</td>
                <td class="px-3 py-2 text-[11px] text-zinc-500">
                  <span v-if="isBlind(r, 'home')">H: {{ leagueName(r.home_evidence_league) }}</span>
                  <span v-if="r.blind_side === 'both'" class="mx-1 text-zinc-700">·</span>
                  <span v-if="isBlind(r, 'away')">A: {{ leagueName(r.away_evidence_league) }}</span>
                </td>
                <td class="px-2 py-2 text-center tabular-nums text-zinc-400">
                  {{ r.home_games_in_league }} / {{ r.away_games_in_league }}
                </td>
                <td class="px-3 py-2">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        :class="r.blind_side === 'both' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'">
                    {{ r.blind_side }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ COMPETITIONS ══════════════════════════════════════════ -->
      <section v-else-if="tab === 'leagues'">
        <p class="text-[11px] text-zinc-500 leading-relaxed mb-3 max-w-3xl">
          Every competition the twin layer has fitted, on one scale. <span class="text-zinc-400">Level</span>
          is the fitted strength of the division; <span class="text-zinc-400">spread</span> is how far apart
          its clubs are (zero for cups, which pool tiers); <span class="text-zinc-400">home</span> is its
          home-advantage term. Comparable across leagues — that is the whole point of the layer.
        </p>

        <div class="rounded-lg border border-edge overflow-x-auto">
          <table class="w-full text-xs min-w-[680px]">
            <thead>
              <tr class="bg-surface-light/40 text-zinc-500">
                <th class="text-left font-medium px-3 py-2">Competition</th>
                <th class="text-left font-medium px-2 py-2 w-16">Tier</th>
                <th class="text-right font-medium px-2 py-2 w-20">Teams</th>
                <th class="text-right font-medium px-2 py-2 w-20">Games</th>
                <th class="text-right font-medium px-2 py-2 w-24">Avg goals</th>
                <th class="text-right font-medium px-2 py-2 w-24">Level</th>
                <th class="text-right font-medium px-2 py-2 w-20">Home</th>
                <th class="text-right font-medium px-2 py-2 w-20">Spread</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in twinLeagues" :key="l.league_key"
                  class="border-t border-edge/40 hover:bg-surface-light/20">
                <td class="px-3 py-2">
                  <span class="text-zinc-200">{{ leagueName(l.league_key) }}</span>
                  <span v-if="l.is_cup" class="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-zinc-700/40 text-zinc-400">CUP</span>
                </td>
                <td class="px-2 py-2 text-zinc-500">{{ l.tier ?? '—' }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ l.n_teams }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ l.n_games }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(l.avg_goals, 2) }}</td>
                <td class="px-2 py-2 text-right tabular-nums font-semibold text-zinc-200">{{ num(l.level, 3) }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(l.home_adv, 3) }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(l.spread, 3) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-[10px] text-zinc-600 mt-3 max-w-3xl leading-relaxed">
          Cups sit high on level because they pool clubs from every tier, so their fitted strength is not
          comparable to a league's in the way two leagues are comparable to each other. Leagues with no
          level (argentina_primera, brazil_serie_a) are not fitted — they sit outside the European
          corpus the layer is built on.
        </p>
      </section>

      <!-- ═══ CLUBS ═════════════════════════════════════════════════ -->
      <section v-else-if="tab === 'clubs'">
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <input
            v-model="clubSearch"
            @keyup.enter="loadClubs"
            placeholder="Search clubs…"
            class="px-3 py-1.5 rounded-md bg-surface-light border border-edge text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 w-56"
          />
          <button
            @click="changedOnly = !changedOnly; loadClubs()"
            class="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
            :class="changedOnly
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-surface-light text-zinc-400 border-edge hover:text-zinc-200'"
          >Changed division only</button>
          <span class="text-[11px] text-zinc-600 tabular-nums">{{ clubs.length }} shown</span>
        </div>

        <div class="rounded-lg border border-edge overflow-x-auto">
          <table class="w-full text-xs min-w-[700px]">
            <thead>
              <tr class="bg-surface-light/40 text-zinc-500">
                <th class="text-left font-medium px-3 py-2">Club</th>
                <th class="text-left font-medium px-3 py-2 w-40">Plays in</th>
                <th class="text-left font-medium px-3 py-2 w-40">Rating learned in</th>
                <th class="text-right font-medium px-2 py-2 w-20">Games</th>
                <th class="text-right font-medium px-2 py-2 w-24" title="Effective sample size after time decay">Eff. n</th>
                <th class="text-right font-medium px-2 py-2 w-20">Attack</th>
                <th class="text-right font-medium px-2 py-2 w-20">Defence</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in clubs" :key="c.team_id"
                  class="border-t border-edge/40 hover:bg-surface-light/20 cursor-pointer"
                  @click="$router.push(`/team/${c.team_id}`)">
                <td class="px-3 py-2">
                  <span class="text-zinc-200">{{ c.name }}</span>
                  <span v-if="c.league_changed" class="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300">MOVED</span>
                </td>
                <td class="px-3 py-2 text-zinc-500">{{ leagueName(c.current_league) }}</td>
                <td class="px-3 py-2" :class="c.league_changed ? 'text-amber-300/80' : 'text-zinc-600'">
                  {{ leagueName(c.evidence_league) }}
                </td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ c.total_games }}</td>
                <td class="px-2 py-2 text-right tabular-nums"
                    :class="(c.effective_games ?? 0) < 12 ? 'text-amber-400' : 'text-zinc-500'">
                  {{ num(c.effective_games, 1) }}
                </td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(c.attack, 2) }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(c.defence, 2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ TRANSITIONS ═══════════════════════════════════════════ -->
      <section v-else-if="tab === 'transitions'">
        <p class="text-[11px] text-zinc-500 leading-relaxed mb-3 max-w-3xl">
          Clubs that moved division, with the form they carried in. The twin exists so this record
          survives the move instead of resetting to league-average.
        </p>

        <div class="rounded-lg border border-edge overflow-x-auto">
          <table class="w-full text-xs min-w-[760px]">
            <thead>
              <tr class="bg-surface-light/40 text-zinc-500">
                <th class="text-left font-medium px-3 py-2">Club</th>
                <th class="text-left font-medium px-3 py-2 w-24">Direction</th>
                <th class="text-left font-medium px-3 py-2">From</th>
                <th class="text-right font-medium px-2 py-2 w-20" title="Points per game in the division it left">PPG</th>
                <th class="text-left font-medium px-3 py-2">To</th>
                <th class="text-right font-medium px-2 py-2 w-24">Games since</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in transitions" :key="`${t.team_id}-${t.to_season}-${i}`"
                  class="border-t border-edge/40 hover:bg-surface-light/20 cursor-pointer"
                  @click="$router.push(`/team/${t.team_id}`)">
                <td class="px-3 py-2 text-zinc-200">{{ t.name }}</td>
                <td class="px-3 py-2">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="directionClass(t.direction)">
                    {{ t.direction }}
                  </span>
                </td>
                <td class="px-3 py-2 text-zinc-500">
                  {{ leagueName(t.from_league) }} <span class="text-zinc-700">{{ t.from_season }}</span>
                </td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ num(t.from_ppg, 2) }}</td>
                <td class="px-3 py-2 text-zinc-300">
                  {{ leagueName(t.to_league) }} <span class="text-zinc-700">{{ t.to_season }}</span>
                </td>
                <td class="px-2 py-2 text-right tabular-nums"
                    :class="t.to_games < 5 ? 'text-amber-400' : 'text-zinc-500'">{{ t.to_games }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

const twins = useTwins()
const api = useApi()

const loading = ref(true)
const tab = ref('risk')

const twinLeagues = ref([])
const risk = ref([])
const clubs = ref([])
const transitions = ref([])
const leagues = ref([])

const clubSearch = ref('')
const changedOnly = ref(true)

const tabs = computed(() => [
  { key: 'risk',        label: 'Blind spots',  count: risk.value.length },
  { key: 'leagues',     label: 'Competitions', count: twinLeagues.value.length },
  { key: 'clubs',       label: 'Clubs',        count: null },
  { key: 'transitions', label: 'Transitions',  count: null },
])

const leagueNames = computed(() => {
  const m = new Map()
  for (const l of leagues.value) m.set(l.key, l.name)
  return m
})

function leagueName(key) {
  if (!key) return '—'
  return leagueNames.value.get(key) || key.replace(/_/g, ' ')
}

function num(v, dp) {
  return v == null ? '—' : Number(v).toFixed(dp)
}

function shortDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function isBlind(r, side) {
  return r.blind_side === 'both' || r.blind_side === side
}

function directionClass(dir) {
  const d = (dir || '').toLowerCase()
  if (d.includes('promot') || d.includes('up')) return 'bg-emerald-500/15 text-emerald-300'
  if (d.includes('relegat') || d.includes('down')) return 'bg-red-500/15 text-red-300'
  return 'bg-zinc-700/40 text-zinc-400'
}

async function loadClubs() {
  clubs.value = await twins.fetchTwinTeams({
    search: clubSearch.value.trim() || undefined,
    changedOnly: changedOnly.value,
    limit: 200,
  }).catch(() => [])
}

onMounted(async () => {
  const [lg, tl, rk, tr] = await Promise.all([
    api.fetchLeagues().then(d => d.leagues || []).catch(() => []),
    twins.fetchTwinLeagues().catch(() => []),
    twins.fetchFixtureRisk().catch(() => []),
    twins.fetchTransitions({ limit: 300 }).catch(() => []),
  ])
  leagues.value = lg
  twinLeagues.value = tl
  risk.value = rk
  transitions.value = tr
  await loadClubs()
  loading.value = false
})

useHead({ title: 'Entities · Protero' })
</script>
