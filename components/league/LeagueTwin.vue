<template>
  <div>
    <!-- ═══ Competition ratings ══════════════════════════════════ -->
    <div v-if="twin" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <div class="rounded-lg border border-edge bg-surface p-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="Fitted strength of the competition, comparable to other competitions of the same kind">Level</p>
        <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ num(twin.level, 3) }}</p>
        <p class="text-[10px] text-zinc-600">
          <template v-if="levelRank">#{{ levelRank.pos }} of {{ levelRank.total }} {{ twin.is_cup ? 'cups' : 'leagues' }}</template>
          <template v-else>not ranked</template>
        </p>
      </div>
      <div class="rounded-lg border border-edge bg-surface p-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="Home-advantage term in log-goals">Home adv.</p>
        <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ num(twin.home_adv, 3) }}</p>
        <p class="text-[10px] text-zinc-600">log-goals</p>
      </div>
      <div class="rounded-lg border border-edge bg-surface p-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="How far apart this competition's clubs are">Spread</p>
        <p class="text-lg font-bold tabular-nums" :class="twin.is_cup ? 'text-zinc-600' : 'text-zinc-100'">
          {{ twin.is_cup ? '—' : num(twin.spread, 3) }}
        </p>
        <p class="text-[10px] text-zinc-600">{{ twin.is_cup ? 'cups pool tiers' : 'club dispersion' }}</p>
      </div>
      <div class="rounded-lg border border-edge bg-surface p-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Avg goals</p>
        <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ num(twin.avg_goals, 2) }}</p>
        <p class="text-[10px] text-zinc-600">per game</p>
      </div>
      <div class="rounded-lg border border-edge bg-surface p-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Clubs</p>
        <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ twin.n_teams }}</p>
        <p class="text-[10px] text-zinc-600">{{ clubs.length }} rated now</p>
      </div>
      <div class="rounded-lg border border-edge bg-surface p-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Fitted on</p>
        <p class="text-lg font-bold text-zinc-100 tabular-nums">{{ twin.n_games.toLocaleString() }}</p>
        <p class="text-[10px] text-zinc-600">games<template v-if="twin.state_as_of"> · {{ twin.state_as_of }}</template></p>
      </div>
    </div>

    <!-- Not fitted -->
    <div v-else class="rounded-lg border border-edge bg-surface px-4 py-3 mb-5">
      <p class="text-xs text-zinc-300 font-medium">No twin for this competition.</p>
      <p class="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-3xl">
        The entity layer is fitted on the European football corpus. Basketball, LATAM football and
        national-team fixtures sit outside it — they have games and predictions, but no fitted level,
        club ratings or transition record. Nothing is wrong; there is simply no twin to show.
      </p>
    </div>

    <div v-if="twin" class="grid lg:grid-cols-5 gap-6">
      <!-- ═══ Club ratings ═══════════════════════════════════════ -->
      <section class="lg:col-span-3">
        <div class="flex items-baseline gap-2 mb-2">
          <h3 class="text-sm font-bold text-zinc-100">Club ratings</h3>
          <span class="text-[10px] text-zinc-600 tabular-nums">{{ clubs.length }}</span>
          <span class="ml-auto text-[10px] text-zinc-600">open a club for its twin</span>
        </div>
        <p class="text-[11px] text-zinc-500 mb-2 leading-relaxed">
          <span class="text-zinc-400">Attack</span> is scoring rate and
          <span class="text-zinc-400">defence</span> is conceding rate, both in log-goals — for defence,
          lower is better. <span class="text-zinc-400">Eff. n</span> is the sample behind the rating
          after time decay, which is the number that says how much to trust it.
        </p>

        <div v-if="!clubs.length" class="text-xs text-zinc-600 py-8 text-center rounded-lg border border-edge">
          No rated club currently assigned to this competition.
        </div>

        <div v-else class="rounded-lg border border-edge overflow-x-auto">
          <table class="w-full text-xs min-w-[560px]">
            <thead>
              <tr class="bg-surface-light/40 text-zinc-500">
                <th class="text-left font-medium px-3 py-2">Club</th>
                <th class="text-right font-medium px-2 py-2 w-20">Attack</th>
                <th class="text-right font-medium px-2 py-2 w-20">Defence</th>
                <th class="text-right font-medium px-2 py-2 w-20" title="Effective sample size after time decay">Eff. n</th>
                <th class="text-right font-medium px-2 py-2 w-16">Games</th>
                <th class="text-left font-medium px-3 py-2 w-28">Rating from</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in clubs" :key="c.team_id"
                class="border-t border-edge/40 hover:bg-surface-light/20 cursor-pointer"
                @click="$router.push(`/team/${c.team_id}`)"
              >
                <td class="px-3 py-2">
                  <span class="text-zinc-200">{{ c.name }}</span>
                  <span v-if="c.league_changed"
                        class="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300"
                        title="Its rating was learned in another division">MOVED</span>
                </td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-300">{{ num(c.attack, 2) }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-300">{{ num(c.defence, 2) }}</td>
                <td class="px-2 py-2 text-right tabular-nums"
                    :class="(c.effective_games ?? 0) < 12 ? 'text-amber-400' : 'text-zinc-500'">
                  {{ num(c.effective_games, 1) }}
                </td>
                <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ c.total_games }}</td>
                <td class="px-3 py-2 text-[11px]"
                    :class="c.league_changed ? 'text-amber-300/80' : 'text-zinc-600'">
                  {{ c.league_changed ? leagueName(c.evidence_league) : 'here' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="movedCount" class="text-[10px] text-amber-300/70 mt-2 leading-relaxed">
          {{ movedCount }} club{{ movedCount === 1 ? '' : 's' }} here carry a rating learned in another
          division. A model that treats an unrated club as league-average prices a promoted side as
          mid-table — these are the fixtures to distrust.
        </p>
      </section>

      <!-- ═══ Transitions ════════════════════════════════════════ -->
      <section class="lg:col-span-2">
        <div class="flex items-baseline gap-2 mb-2">
          <h3 class="text-sm font-bold text-zinc-100">In and out</h3>
          <span class="text-[10px] text-zinc-600 tabular-nums">{{ transitions.length }}</span>
        </div>
        <p class="text-[11px] text-zinc-500 mb-2 leading-relaxed">
          Clubs that moved into or out of this competition, with the form they carried. The twin exists
          so this record survives the move instead of resetting to league-average.
        </p>

        <div v-if="!transitions.length" class="text-xs text-zinc-600 py-8 text-center rounded-lg border border-edge">
          No recorded move into or out of this competition.
        </div>

        <div v-else class="rounded-lg border border-edge divide-y divide-edge/40 max-h-[420px] overflow-y-auto">
          <div
            v-for="(t, i) in transitions" :key="`${t.team_id}-${t.to_season}-${i}`"
            class="px-3 py-2 hover:bg-surface-light/20 cursor-pointer"
            @click="$router.push(`/team/${t.team_id}`)"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-200 truncate flex-1">{{ t.name }}</span>
              <span class="px-1 py-0.5 rounded text-[9px] font-semibold flex-shrink-0"
                    :class="t.to_league === leagueKey ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/40 text-zinc-400'">
                {{ t.to_league === leagueKey ? 'IN' : 'OUT' }}
              </span>
            </div>
            <p class="text-[10px] text-zinc-600 truncate">
              {{ leagueName(t.from_league) }} {{ t.from_season }}
              <span class="text-zinc-700">→</span>
              {{ leagueName(t.to_league) }} {{ t.to_season }}
              <span v-if="t.from_ppg != null" class="text-zinc-500"> · {{ Number(t.from_ppg).toFixed(2) }} ppg</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
/**
 * A competition's digital twin.
 *
 * This is the primary view of a league now: the fitted level, home advantage
 * and spread, then every rated club with its attack/defence, then who moved in
 * and out. Clubs click through to their own twin.
 *
 * ⚠️ Nothing here is a price. Twins were scored against the closing line per
 * (league, market) and 55 of 56 cells came back negative — owner decision
 * 2026-08-21, do-not-do §2. They are context and a blind-spot warning, and
 * must never be rendered as an edge.
 */
import { computed } from 'vue'

const props = defineProps({
  leagueKey: { type: String, required: true },
  twin: { type: Object, default: null },
  clubs: { type: Array, default: () => [] },
  transitions: { type: Array, default: () => [] },
  /** Every fitted competition, for the level ranking. */
  peers: { type: Array, default: () => [] },
  leagues: { type: Array, default: () => [] },
})

const leagueNames = computed(() => {
  const m = new Map()
  for (const l of props.leagues) m.set(l.key, l.name)
  return m
})

/**
 * Where this competition sits among its OWN kind. A cup's level is not
 * comparable to a league's — cups pool every tier — so they rank separately.
 */
const levelRank = computed(() => {
  if (!props.twin || props.twin.level == null) return null
  const peers = props.peers
    .filter(p => p.level != null && !!p.is_cup === !!props.twin.is_cup)
    .sort((a, b) => b.level - a.level)
  const pos = peers.findIndex(p => p.league_key === props.leagueKey)
  return pos < 0 ? null : { pos: pos + 1, total: peers.length }
})

const movedCount = computed(() => props.clubs.filter(c => c.league_changed).length)

function leagueName(key) {
  if (!key) return '—'
  return leagueNames.value.get(key) || key.replace(/_/g, ' ')
}

function num(v, dp) {
  return v == null ? '—' : Number(v).toFixed(dp)
}
</script>
