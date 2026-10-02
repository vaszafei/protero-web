<template>
  <UiPageShell :title="twin?.name || 'Club'">
    <template v-if="twin" #eyebrow>
      <NuxtLink
        :to="twin.current_league ? `/league/${twin.current_league}` : '/leagues'"
        class="text-[11px] text-zinc-500 hover:text-zinc-300"
      >← {{ twin.current_league ? leagueName(twin.current_league) : 'Competitions' }}</NuxtLink>
    </template>
    <template v-if="twin" #subtitle>
      <p class="text-xs text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
        <span>
          Plays in <span class="text-zinc-300">{{ leagueName(twin.current_league) }}</span>
          <template v-if="twin.league_changed">
            · rating learned in <span class="text-amber-300">{{ leagueName(twin.evidence_league) }}</span>
          </template>
          · {{ twin.total_games }} games tracked
          <template v-if="twin.state_as_of"> · state as of {{ twin.state_as_of }}</template>
          · #{{ twin.team_id }}
        </span>
        <UiTooltip v-if="twin.league_changed" :width="360" placement="bottom">
          <span class="pill pill-amber">CHANGED DIVISION</span>
          <template #content>
            <p>
              This club's rating comes from another division. Its attack and defence were learned in
              {{ leagueName(twin.evidence_league) }}, not {{ leagueName(twin.current_league) }}. A model that treats an
              unrated club as league-average prices a promoted side as mid-table — read fixtures involving this club
              with that in mind. Twins are context, not a price.
            </p>
          </template>
        </UiTooltip>
      </p>
    </template>

    <Transition name="swap" mode="out-in">
      <div v-if="loading" class="grid-12 team-grid">
        <div class="col-5"><UiSkeletonPanel :rows="8" height="100%" /></div>
        <div class="col-7"><UiSkeletonPanel :rows="12" height="100%" /></div>
      </div>

      <UiErrorState
        v-else-if="error"
        class="max-w-xl mx-auto my-16"
        title="The club failed to load."
        :error="error"
        @retry="load"
      />

      <div v-else-if="!twin" class="py-20 text-center">
        <p class="text-sm text-zinc-400">No twin for team #{{ teamId }}.</p>
        <p class="text-[11px] text-zinc-600 mt-1">
          The entity layer covers European football clubs. Run
          <code>python3 -m ml.twins.build --persist</code> if this club is new.
        </p>
        <NuxtLink to="/leagues" class="text-xs text-[var(--brand-blue)] hover:underline mt-3 inline-block">Back to Competitions</NuxtLink>
      </div>

      <div v-else class="flex-1 min-h-0 flex flex-col gap-3">
        <UiErrorState
          v-if="contextError"
          compact
          class="flex-shrink-0"
          title="Some of this club's panels failed to load — they may be incomplete."
          :error="contextError"
          @retry="load"
        />

        <!-- Ratings -->
        <div class="grid grid-cols-4 gap-3 flex-shrink-0">
          <div class="panel px-3 py-2">
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Attack</p>
            <p class="text-lg font-bold text-zinc-100 tabular-nums leading-tight">{{ num(twin.attack, 2) }}
              <span class="text-[10px] font-normal text-zinc-600">± {{ sd(twin.attack_var) }}</span></p>
          </div>
          <div class="panel px-3 py-2">
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Defence</p>
            <p class="text-lg font-bold text-zinc-100 tabular-nums leading-tight">{{ num(twin.defence, 2) }}
              <span class="text-[10px] font-normal text-zinc-600">± {{ sd(twin.defence_var) }}</span></p>
          </div>
          <div class="panel px-3 py-2">
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="Sample size behind the rating, after time decay">Effective n</p>
            <p class="text-lg font-bold tabular-nums leading-tight" :class="(twin.effective_games ?? 0) < 12 ? 'text-amber-400' : 'text-zinc-100'">
              {{ num(twin.effective_games, 1) }}
              <span class="text-[10px] font-normal text-zinc-600">of {{ twin.total_games }} played</span>
            </p>
          </div>
          <div class="panel px-3 py-2">
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Divisions</p>
            <p class="text-lg font-bold text-zinc-100 tabular-nums leading-tight">{{ Object.keys(twin.leagues_played || {}).length }}
              <span class="text-[10px] font-normal text-zinc-600">{{ Object.keys(twin.seasons_played || {}).length }} seasons</span></p>
          </div>
        </div>

        <div class="grid-12 team-grid">
          <!-- Scoring trajectory + squad -->
          <div class="col-5 flex flex-col gap-3 min-h-0">
            <TeamTrajectory class="flex-shrink-0" :history="history" :transitions="transitions" />

            <section class="panel panel-fill flex-1">
              <header class="panel-head">
                <h2 class="panel-title">Squad continuity</h2>
                <span class="panel-count">{{ players.length }}</span>
                <UiTooltip class="ml-auto" :width="340" placement="bottom">
                  <span class="panel-link">how to read</span>
                  <template #content>
                    <p>
                      Players currently at the club, by appearances tracked across every club they have played for.
                      Player twins are keyed on the FlashScore player entity id, so a fitted row is one person.
                      Ability is the fitted rating, shrunk toward the population mean — never a price.
                    </p>
                  </template>
                </UiTooltip>
              </header>
              <p v-if="!players.length" class="px-3 py-3 text-xs text-zinc-600">No player twins for this club.</p>
              <div v-else class="panel-scroll divide-y divide-edge/40">
                <div v-for="(p, i) in players" :key="p.player_id" class="px-3 py-1 flex items-center gap-2 row-in" :style="rowDelay(i)">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs text-zinc-200 truncate">{{ p.full_name || p.player_name }}</div>
                  </div>
                  <span class="text-[10px] text-zinc-600 tabular-nums">
                    {{ Object.keys(p.teams_played || {}).length }} clubs · {{ Object.keys(p.leagues_played || {}).length }} divisions
                  </span>
                  <span class="text-xs text-zinc-300 tabular-nums w-8 text-right">{{ p.appearances }}</span>
                  <span class="text-[10px] text-zinc-600 tabular-nums w-10 text-right">{{ p.ability != null ? Number(p.ability).toFixed(2) : '—' }}</span>
                </div>
              </div>
            </section>
          </div>

          <!-- Season history -->
          <section class="col-7 panel panel-fill">
            <header class="panel-head">
              <h2 class="panel-title">Season history</h2>
              <span class="panel-count">{{ history.length }}</span>
              <span class="text-[10px] text-zinc-600">league and cup seasons, oldest first — one record across every division</span>
            </header>
            <div class="panel-scroll">
              <table class="w-full text-xs">
                <thead class="sticky top-0 z-[1] bg-surface">
                  <tr class="text-zinc-500">
                    <th class="text-left font-medium px-3 py-1.5 w-24">Season</th>
                    <th class="text-left font-medium px-3 py-1.5">Competition</th>
                    <th class="text-right font-medium px-2 py-1.5 w-14">P</th>
                    <th class="text-right font-medium px-2 py-1.5 w-24">W-D-L</th>
                    <th class="text-right font-medium px-2 py-1.5 w-20">GF/GA</th>
                    <th class="text-right font-medium px-2 py-1.5 w-16" title="Points per game">PPG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(s, i) in history" :key="`${s.season}-${s.league_key}-${i}`"
                      class="border-t border-edge/40 row-in"
                      :style="rowDelay(i)"
                      :class="s.tier ? 'hover:bg-surface-light/20' : 'text-zinc-500'">
                    <td class="px-3 py-1 tabular-nums text-zinc-500">{{ s.season }}</td>
                    <td class="px-3 py-1">
                      <span :class="s.tier ? 'text-zinc-200' : 'text-zinc-500'">{{ leagueName(s.league_key) }}</span>
                      <span v-if="s.tier" class="ml-1.5 text-[10px] text-zinc-600">T{{ s.tier }}</span>
                    </td>
                    <td class="px-2 py-1 text-right tabular-nums text-zinc-400">{{ s.games }}</td>
                    <td class="px-2 py-1 text-right tabular-nums text-zinc-500">{{ s.wins }}-{{ s.draws }}-{{ s.losses }}</td>
                    <td class="px-2 py-1 text-right tabular-nums text-zinc-500">{{ s.goals_for }}/{{ s.goals_against }}</td>
                    <td class="px-2 py-1 text-right tabular-nums font-medium"
                        :class="ppgClass(s.points_per_game)">{{ num(s.points_per_game, 2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Transition>
  </UiPageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TeamTrajectory from '~/components/team/TeamTrajectory.vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const twins = useTwins()
const api = useApi()

const teamId = computed(() => Number(route.params.id))

const loading = ref(true)
const error = ref<string | null>(null)         // the twin itself failed — the page cannot render
const contextError = ref<string | null>(null)  // history / players / leagues / transitions failed
const twin = ref<any>(null)
const history = ref<any[]>([])
const players = ref<any[]>([])
const leagues = ref<any[]>([])
const transitions = ref<any[]>([])

const leagueNames = computed(() => {
  const m = new Map<string, string>()
  for (const l of leagues.value) m.set(l.key, l.name)
  return m
})

function leagueName(key: string | null) {
  if (!key) return '—'
  return leagueNames.value.get(key) || key.replace(/_/g, ' ')
}

function num(v: number | null, dp: number) {
  return v == null ? '—' : Number(v).toFixed(dp)
}

/** twin_team stores variance; a standard deviation is the readable form. */
function sd(variance: number | null) {
  return variance == null ? '—' : Math.sqrt(Number(variance)).toFixed(2)
}

function ppgClass(ppg: number | null) {
  if (ppg == null) return 'text-zinc-600'
  const n = Number(ppg)
  if (n >= 2.0) return 'text-[var(--brand-blue)]'
  if (n >= 1.3) return 'text-zinc-300'
  return 'text-negative'
}

async function load() {
  loading.value = true
  error.value = null
  contextError.value = null
  const id = teamId.value
  const results = await Promise.allSettled([
    twins.fetchTwinTeam(id),
    twins.fetchTwinTeamHistory(id),
    twins.fetchTwinPlayers(id, 40),
    api.fetchLeagues().then(d => d.leagues || []),
    twins.fetchTeamTransitions(id),
  ])
  if (id !== teamId.value) return
  const ok = (i: number, empty: any) => (results[i].status === 'fulfilled' ? results[i].value : empty)
  if (results[0].status === 'rejected') error.value = errorText(results[0].reason)
  const failed = results.slice(1).find(r => r.status === 'rejected')
  if (failed) contextError.value = errorText(failed.reason)
  twin.value = ok(0, null)
  history.value = ok(1, [])
  players.value = ok(2, [])
  leagues.value = ok(3, [])
  transitions.value = ok(4, [])
  loading.value = false
  if (twin.value) useHead({ title: `${twin.value.name} · Protero` })
}

onMounted(load)

useHead({ title: 'Club · Protero' })
</script>

<style scoped>
.team-grid {
  flex: 1 1 auto;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}
</style>
