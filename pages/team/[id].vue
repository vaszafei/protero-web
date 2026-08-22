<template>
  <div class="p-3 sm:p-6 max-w-[1400px] mx-auto min-h-screen pb-20 lg:pb-6">
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <div v-else-if="!twin" class="py-20 text-center">
      <p class="text-sm text-zinc-400">No twin for team #{{ teamId }}.</p>
      <p class="text-[11px] text-zinc-600 mt-1">
        The entity layer covers European football clubs. Run
        <code>python3 -m ml.twins.build --persist</code> if this club is new.
      </p>
      <NuxtLink to="/leagues" class="text-xs text-blue-400 hover:underline mt-3 inline-block">Back to Competitions</NuxtLink>
    </div>

    <template v-else>
      <!-- Identity -->
      <div class="mb-5">
        <NuxtLink
          :to="twin.current_league ? `/league/${twin.current_league}` : '/leagues'"
          class="text-[11px] text-zinc-500 hover:text-zinc-300"
        >← {{ twin.current_league ? leagueName(twin.current_league) : 'Competitions' }}</NuxtLink>
        <div class="flex items-baseline gap-2 flex-wrap mt-1">
          <h1 class="text-xl sm:text-2xl font-bold text-white">{{ twin.name }}</h1>
          <span class="text-[11px] text-zinc-600">#{{ twin.team_id }}</span>
          <span v-if="twin.league_changed"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300">
            CHANGED DIVISION
          </span>
        </div>
        <p class="text-xs text-zinc-500 mt-1">
          Plays in <span class="text-zinc-300">{{ leagueName(twin.current_league) }}</span>
          <template v-if="twin.league_changed">
            · rating learned in <span class="text-amber-300">{{ leagueName(twin.evidence_league) }}</span>
          </template>
          · {{ twin.total_games }} games tracked
          <template v-if="twin.state_as_of"> · state as of {{ twin.state_as_of }}</template>
        </p>
      </div>

      <!-- The warning, when it applies -->
      <div v-if="twin.league_changed"
           class="mb-5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
        <p class="text-xs text-amber-200 font-medium">This club's rating comes from another division.</p>
        <p class="text-[11px] text-amber-200/70 mt-1 leading-relaxed max-w-3xl">
          Its attack and defence were learned in {{ leagueName(twin.evidence_league) }}, not
          {{ leagueName(twin.current_league) }}. A model that treats an unrated club as league-average
          prices a promoted side as mid-table — read fixtures involving this club with that in mind.
          Twins are context, not a price.
        </p>
      </div>

      <!-- Ratings -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="rounded-lg border border-edge bg-surface p-3">
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Attack</p>
          <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ num(twin.attack, 2) }}</p>
          <p class="text-[10px] text-zinc-600 tabular-nums">± {{ sd(twin.attack_var) }}</p>
        </div>
        <div class="rounded-lg border border-edge bg-surface p-3">
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Defence</p>
          <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ num(twin.defence, 2) }}</p>
          <p class="text-[10px] text-zinc-600 tabular-nums">± {{ sd(twin.defence_var) }}</p>
        </div>
        <div class="rounded-lg border border-edge bg-surface p-3">
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="Sample size behind the rating, after time decay">Effective n</p>
          <p class="text-lg font-bold tabular-nums"
             :class="(twin.effective_games ?? 0) < 12 ? 'text-amber-400' : 'text-zinc-100'">
            {{ num(twin.effective_games, 1) }}
          </p>
          <p class="text-[10px] text-zinc-600">of {{ twin.total_games }} played</p>
        </div>
        <div class="rounded-lg border border-edge bg-surface p-3">
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Divisions</p>
          <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ Object.keys(twin.leagues_played || {}).length }}</p>
          <p class="text-[10px] text-zinc-600">{{ Object.keys(twin.seasons_played || {}).length }} seasons</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-5 gap-6">
        <!-- Season history -->
        <section class="lg:col-span-3">
          <h2 class="text-sm font-bold text-zinc-100 mb-2">Season history</h2>
          <p class="text-[11px] text-zinc-500 mb-2">
            League and cup seasons, oldest first — one continuous record across every division.
          </p>
          <div class="rounded-lg border border-edge overflow-x-auto">
            <table class="w-full text-xs min-w-[620px]">
              <thead>
                <tr class="bg-surface-light/40 text-zinc-500">
                  <th class="text-left font-medium px-3 py-2 w-24">Season</th>
                  <th class="text-left font-medium px-3 py-2">Competition</th>
                  <th class="text-right font-medium px-2 py-2 w-14">P</th>
                  <th class="text-right font-medium px-2 py-2 w-24">W-D-L</th>
                  <th class="text-right font-medium px-2 py-2 w-20">GF/GA</th>
                  <th class="text-right font-medium px-2 py-2 w-16" title="Points per game">PPG</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in history" :key="`${s.season}-${s.league_key}-${i}`"
                    class="border-t border-edge/40"
                    :class="s.tier ? 'hover:bg-surface-light/20' : 'text-zinc-500'">
                  <td class="px-3 py-2 tabular-nums text-zinc-500">{{ s.season }}</td>
                  <td class="px-3 py-2">
                    <span :class="s.tier ? 'text-zinc-200' : 'text-zinc-500'">{{ leagueName(s.league_key) }}</span>
                    <span v-if="s.tier" class="ml-1.5 text-[9px] text-zinc-600">T{{ s.tier }}</span>
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ s.games }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ s.wins }}-{{ s.draws }}-{{ s.losses }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ s.goals_for }}/{{ s.goals_against }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium"
                      :class="ppgClass(s.points_per_game)">{{ num(s.points_per_game, 2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Squad continuity -->
        <section class="lg:col-span-2">
          <h2 class="text-sm font-bold text-zinc-100 mb-2">Squad continuity</h2>
          <p class="text-[11px] text-zinc-500 mb-2">
            Players currently at the club, by appearances tracked across every club they have played for.
          </p>

          <div v-if="!players.length" class="text-xs text-zinc-600 py-6 text-center rounded-lg border border-edge">
            No player twins for this club.
          </div>

          <div v-else class="rounded-lg border border-edge divide-y divide-edge/40">
            <div v-for="p in players" :key="p.player_key" class="px-3 py-2 flex items-center gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs text-zinc-200 truncate">{{ p.player_name }}</span>
                  <span v-if="isLikelyMergedPlayer(p)"
                        class="flex-shrink-0 px-1 py-0.5 rounded text-[9px] bg-red-500/15 text-red-300"
                        title="This name key spans many clubs — almost certainly several different players merged">
                    MERGED?
                  </span>
                </div>
                <div class="text-[10px] text-zinc-600 tabular-nums">
                  {{ Object.keys(p.teams_played || {}).length }} clubs ·
                  {{ Object.keys(p.leagues_played || {}).length }} divisions
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-xs text-zinc-300 tabular-nums">{{ p.appearances }}</div>
                <div class="text-[10px] text-zinc-600 tabular-nums">
                  {{ p.avg_rating ? Number(p.avg_rating).toFixed(2) : '—' }}
                </div>
              </div>
            </div>
          </div>

          <p class="text-[10px] text-zinc-600 mt-2 leading-relaxed">
            Player twins are keyed on the abbreviated name FlashScore publishes, so distinct people with
            the same short name collapse into one twin — "Rodriguez J." carries 475 appearances across 16
            clubs. Anything flagged MERGED? is a name key, not a career.
          </p>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { isLikelyMergedPlayer } from '~/composables/useTwins'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const twins = useTwins()
const api = useApi()

const teamId = computed(() => Number(route.params.id))

const loading = ref(true)
const twin = ref(null)
const history = ref([])
const players = ref([])
const leagues = ref([])

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

/** twin_team stores variance; a standard deviation is the readable form. */
function sd(variance) {
  return variance == null ? '—' : Math.sqrt(Number(variance)).toFixed(2)
}

function ppgClass(ppg) {
  if (ppg == null) return 'text-zinc-600'
  const n = Number(ppg)
  if (n >= 2.0) return 'text-emerald-400'
  if (n >= 1.3) return 'text-zinc-300'
  return 'text-red-400/80'
}

onMounted(async () => {
  const [t, h, p, lg] = await Promise.all([
    twins.fetchTwinTeam(teamId.value).catch(() => null),
    twins.fetchTwinTeamHistory(teamId.value).catch(() => []),
    twins.fetchTwinPlayers(teamId.value, 40).catch(() => []),
    api.fetchLeagues().then(d => d.leagues || []).catch(() => []),
  ])
  twin.value = t
  history.value = h
  players.value = p
  leagues.value = lg
  loading.value = false
  if (t) useHead({ title: `${t.name} · Protero` })
})

useHead({ title: 'Club · Protero' })
</script>
