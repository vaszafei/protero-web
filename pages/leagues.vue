<template>
  <UiPageShell title="Competitions" subtitle="Every competition we hold a fixture for, with what the picker may bet and what the ledger carries.">
    <template #actions>
      <div v-if="summary" class="flex items-center gap-5 text-xs">
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Held</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ summary.total }}</p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="Competitions where the picker is allowed to bet at least one market (the mask — CD #3)">Enabled</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ summary.enabled }}</p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider" title="Competitions with at least one wager in the ledger — ours or a mirrored tipster's">Ledger</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ summary.ledger }}</p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Games</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ summary.games.toLocaleString() }}</p>
        </div>
      </div>
    </template>

    <Transition name="swap" mode="out-in">
      <UiSkeletonPanel v-if="loading" :rows="14" height="100%" />

      <UiErrorState v-else-if="error" title="Competitions failed to load." :error="error" @retry="load" />

      <section v-else class="panel panel-fill flex-1 min-h-0">
        <header class="panel-head !items-center gap-3 flex-shrink-0">
          <UiTabs v-model="tab" :tabs="tabs" size="sm" />
          <span class="text-[10px] text-zinc-600 truncate">{{ activeHint }}</span>
          <input
            v-model="search"
            placeholder="Search…"
            class="ml-auto px-2.5 py-1 rounded-md bg-surface-light border border-edge text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[var(--brand-blue-edge)] w-44"
          />
          <UiTooltip :width="420" placement="bottom">
            <span class="panel-link !ml-0">how to read</span>
            <template #content>
              <p>
                <b>Level</b> is the twin's fitted <em>scoring</em> level — log goals per team per game
                (<code>ml/twins/league.py</code>), fitted jointly with team ratings so it is the goal rate the
                environment adds once the clubs are accounted for. It is not a strength ranking: 2. Bundesliga sits
                above Bundesliga because that division scores more, not because it is better. It is grouped rather
                than ranked as one list because a cup pools clubs from every tier.
              </p>
              <p class="mt-2">
                <b>Enabled</b> is how many markets the picker may bet here — the mask (<code>masks.py</code>), 0 for
                cups and coverage leagues. <b>Ledger</b> is whose wagers the ledger carries: ours, and mirrored
                tipsters' / a real bettor's. A competition can have ledger wagers and 0 enabled cells. Twin ratings
                are context, never a price.
              </p>
            </template>
          </UiTooltip>
        </header>

        <p v-if="!rows.length" class="px-3 py-3 text-[11px] text-zinc-500">No competition matches that search.</p>

        <div v-else class="panel-scroll">
          <table class="w-full text-xs">
            <thead class="sticky top-0 z-[1] bg-surface">
              <tr class="text-zinc-500">
                <th class="text-left font-medium px-3 py-1.5">Competition</th>
                <th class="text-left font-medium px-2 py-1.5 w-44" title="Fitted SCORING level: log goals per team per game, after team ratings are absorbed. Not a strength ranking.">Level</th>
                <th class="text-right font-medium px-2 py-1.5 w-16" title="Home-advantage term, in log-goals">Home</th>
                <th class="text-right font-medium px-2 py-1.5 w-16" title="How far apart the competition's clubs are. Zero for cups, which pool tiers.">Spread</th>
                <th class="text-right font-medium px-2 py-1.5 w-16">Goals</th>
                <th class="text-right font-medium px-2 py-1.5 w-16">Clubs</th>
                <th class="text-right font-medium px-2 py-1.5 w-20">Games</th>
                <th class="text-right font-medium px-2 py-1.5 w-20">Upcoming</th>
                <th class="text-right font-medium px-2 py-1.5 w-20" title="Markets the picker may bet here (the mask). 0 for cups and coverage leagues.">Enabled</th>
                <th class="text-right font-medium px-3 py-1.5 w-44" title="Wagers in the ledger, over the last 400 days: ours · mirrored tipsters' and a real bettor's.">Ledger</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(l, i) in rows" :key="l.key"
                class="row-in border-t border-edge/40 hover:bg-surface-light/20 cursor-pointer"
                :style="rowDelay(i)"
                @click="$router.push(`/league/${l.key}`)"
              >
                <td class="px-3 py-1">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="getLeagueLogoUrl(l.key)"
                      :src="getLeagueLogoUrl(l.key)"
                      loading="lazy"
                      width="16" height="16"
                      class="w-4 h-4 object-contain flex-shrink-0"
                      :alt="l.name"
                      @error="($event.target as HTMLElement).style.display = 'none'"
                    />
                    <span class="text-zinc-200">{{ l.name }}</span>
                    <span v-if="l.is_cup" class="pill pill-dim">CUP</span>
                    <span v-else-if="l.tier" class="pill pill-dim">T{{ l.tier }}</span>
                    <span v-if="l.sport === 'basketball'" class="pill pill-dim">BB</span>
                  </div>
                </td>

                <!-- Level, as a bar on a shared scale. Null is "not fitted", not zero. -->
                <td class="px-2 py-1">
                  <div v-if="l.level != null" class="flex items-center gap-2">
                    <div class="h-1.5 flex-1 rounded-full bg-surface-light overflow-hidden min-w-[48px]">
                      <div class="h-full rounded-full" :class="l.is_cup ? 'bg-zinc-500' : 'bg-[var(--brand-blue)]'"
                           :style="{ width: levelPct(l.level) + '%' }" />
                    </div>
                    <span class="tabular-nums text-zinc-300 w-11 text-right">{{ l.level.toFixed(3) }}</span>
                  </div>
                  <span v-else class="text-zinc-700">not fitted</span>
                </td>

                <td class="px-2 py-1 text-right tabular-nums text-zinc-500">{{ num(l.home_adv, 3) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-zinc-500">{{ l.is_cup ? '—' : num(l.spread, 3) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-zinc-500">{{ num(l.avg_goals, 2) }}</td>
                <td class="px-2 py-1 text-right tabular-nums text-zinc-500" :title="l.active_clubs ? `${l.active_clubs} active this season, ${l.twin_teams} rated all-time` : ''">
                  <template v-if="l.active_clubs && l.active_clubs !== l.twin_teams">
                    {{ l.active_clubs }}<span class="text-zinc-700">/{{ l.twin_teams }}</span>
                  </template>
                  <template v-else>{{ l.twin_teams || '—' }}</template>
                </td>
                <td class="px-2 py-1 text-right tabular-nums text-zinc-400">{{ l.games.toLocaleString() }}</td>
                <td class="px-2 py-1 text-right tabular-nums" :class="l.upcoming ? 'text-zinc-300' : 'text-zinc-700'">
                  {{ l.upcoming || '—' }}
                </td>
                <td class="px-2 py-1 text-right tabular-nums" :class="l.enabled ? 'text-zinc-100 font-semibold' : 'text-zinc-700'">
                  {{ l.enabled || '—' }}
                </td>
                <td class="px-3 py-1 text-right tabular-nums text-zinc-500">
                  <template v-if="l.ledger_ours || l.ledger_mirrors">
                    <span :class="l.ledger_ours ? 'text-zinc-300' : ''">{{ l.ledger_ours }}</span>
                    <span class="text-zinc-700"> · </span>
                    <span>{{ l.ledger_mirrors }}</span>
                    <span v-if="l.bets_pending" class="ml-1.5 text-amber-400/80" title="Pending wagers">{{ l.bets_pending }} open</span>
                  </template>
                  <span v-else class="text-zinc-700">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </Transition>
  </UiPageShell>
</template>

<script setup lang="ts">
/**
 * Competitions, ranked by what the twin makes of them.
 *
 * Two columns answer two different questions that one green "BET" chip used to blur:
 * **Enabled** is what the picker may bet (the mask, CD #3) and **Ledger** is whose wagers
 * the ledger carries (ours vs mirrored tipsters'). 54 of 60 competitions carried the chip
 * because mirrors count; 9 football leagues are enabled. The twin's numbers lead, because
 * clicking through goes to the twin.
 */
import { ref, computed, onMounted } from 'vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { getLeagueLogoUrl } from '~/utils/teamLogo'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'

const apiFetch = useApiFetch()

definePageMeta({ layout: 'default', middleware: 'auth' })

const loading = ref(true)
const error = ref<string | null>(null)
const leagues = ref<any[]>([])
const tab = ref('league')
const search = ref('')

/**
 * Three groups, because `level` is only comparable WITHIN one of them. A cup pools clubs
 * from every tier, so its fitted level sits above every league's without meaning the
 * competition is stronger — ranking them in one list reads as a claim the entity layer
 * does not make.
 */
const GROUPS = [
  { key: 'league', label: 'Leagues', hint: 'fitted on one scale — comparable to each other',
    in: (l: any) => l.level != null && !l.is_cup },
  { key: 'cup', label: 'Cups', hint: "level pools every tier — not comparable to a league's",
    in: (l: any) => l.level != null && l.is_cup },
  { key: 'unfitted', label: 'Not fitted', hint: 'outside the corpus the twin layer is built on',
    in: (l: any) => l.level == null },
]

const tabs = computed(() => GROUPS.map(g => ({
  key: g.key, label: g.label, badge: leagues.value.filter(g.in).length,
})))
const activeHint = computed(() => GROUPS.find(g => g.key === tab.value)?.hint || '')

const rows = computed(() => {
  const group = GROUPS.find(g => g.key === tab.value)
  const q = search.value.trim().toLowerCase()
  return leagues.value
    .filter(l => group?.in(l))
    .filter(l => !q || l.name.toLowerCase().includes(q) || l.key.includes(q))
    // Fitted competitions highest-scoring down; unfitted ones by corpus size. NOT a
    // strength order — `level` is log goals/team/game.
    .sort((a, b) => {
      if (a.level != null && b.level != null) return b.level - a.level
      return b.games - a.games
    })
})

const summary = computed(() => {
  if (!leagues.value.length) return null
  return {
    total: leagues.value.length,
    enabled: leagues.value.filter(l => l.enabled > 0).length,
    ledger: leagues.value.filter(l => l.ledger_ours + l.ledger_mirrors > 0).length,
    games: leagues.value.reduce((a, l) => a + l.games, 0),
  }
})

/** Level is unitless and roughly -0.05…0.70; map onto the bar's width. */
const LEVEL_MAX = 0.7
function levelPct(level: number) {
  return Math.max(2, Math.min(100, (Number(level) / LEVEL_MAX) * 100))
}

function num(v: number | null, dp: number) {
  return v == null ? '—' : Number(v).toFixed(dp)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const d = await apiFetch<any>('/api/leagues/overview')
    leagues.value = d.leagues || []
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

useHead({ title: 'Competitions · Protero' })
</script>
