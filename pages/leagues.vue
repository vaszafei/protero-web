<template>
  <div class="p-3 sm:p-6 max-w-[1600px] mx-auto min-h-screen pb-20 lg:pb-6">
    <!-- Header -->
    <div class="mb-4 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Competitions</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-0.5 max-w-3xl">
          Every competition we hold a fixture for, ranked by the twin's fitted
          <span class="text-zinc-400">level</span>. Open one for its digital twin.
        </p>
      </div>
      <div v-if="summary" class="flex items-center gap-5 text-xs">
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Held</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ summary.total }}</p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Bet</p>
          <p class="text-base font-bold text-emerald-400 tabular-nums">{{ summary.bet }}</p>
        </div>
        <div>
          <p class="text-[10px] text-zinc-500 uppercase tracking-wider">Games</p>
          <p class="text-base font-bold text-zinc-200 tabular-nums">{{ summary.games.toLocaleString() }}</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-1.5 flex-wrap mb-4">
      <button
        v-for="f in filters" :key="f.key"
        @click="filter = f.key"
        class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
        :class="filter === f.key
          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
          : 'bg-surface-light text-zinc-500 border-edge hover:text-zinc-300'"
      >
        {{ f.label }}
        <span class="ml-1 text-[10px] tabular-nums opacity-60">{{ f.count }}</span>
      </button>

      <input
        v-model="search"
        placeholder="Search…"
        class="ml-auto px-3 py-1.5 rounded-md bg-surface-light border border-edge text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 w-44"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <div v-else-if="!rows.length" class="py-20 text-center">
      <p class="text-sm text-zinc-500">No competition matches that filter.</p>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.key" class="mb-6 last:mb-0">
        <div class="flex items-baseline gap-2 mb-2 px-1">
          <h2 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{{ group.label }}</h2>
          <span class="text-[10px] text-zinc-600 tabular-nums">{{ group.rows.length }}</span>
          <span class="text-[10px] text-zinc-600">— {{ group.hint }}</span>
        </div>

      <div class="rounded-lg border border-edge overflow-x-auto">
        <table class="w-full text-xs min-w-[900px]">
          <thead>
            <tr class="bg-surface-light/40 text-zinc-500">
              <th class="text-left font-medium px-3 py-2">Competition</th>
              <th class="text-left font-medium px-2 py-2 w-40" title="Fitted strength of the competition — comparable within its group, not across groups">Level</th>
              <th class="text-right font-medium px-2 py-2 w-20" title="Home-advantage term, in log-goals">Home</th>
              <th class="text-right font-medium px-2 py-2 w-20" title="How far apart the competition's clubs are. Zero for cups, which pool tiers.">Spread</th>
              <th class="text-right font-medium px-2 py-2 w-20">Goals</th>
              <th class="text-right font-medium px-2 py-2 w-20">Clubs</th>
              <th class="text-right font-medium px-2 py-2 w-24">Games</th>
              <th class="text-right font-medium px-2 py-2 w-24">Upcoming</th>
              <th class="text-left font-medium px-3 py-2 w-24">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="l in group.rows" :key="l.key"
              class="border-t border-edge/40 hover:bg-surface-light/20 cursor-pointer"
              @click="$router.push(`/league/${l.key}`)"
            >
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <img
                    v-if="getLeagueLogoUrl(l.key)"
                    :src="getLeagueLogoUrl(l.key)"
                    loading="lazy"
                    width="16" height="16"
                    class="w-4 h-4 object-contain flex-shrink-0"
                    :alt="l.name"
                    @error="$event.target.style.display='none'"
                  />
                  <span class="text-zinc-200">{{ l.name }}</span>
                  <span v-if="l.is_cup" class="px-1 py-0.5 rounded text-[9px] bg-zinc-700/40 text-zinc-400">CUP</span>
                  <span v-else-if="l.tier" class="px-1 py-0.5 rounded text-[9px] bg-zinc-700/40 text-zinc-400">T{{ l.tier }}</span>
                  <span v-if="l.sport === 'basketball'" class="px-1 py-0.5 rounded text-[9px] bg-orange-500/15 text-orange-400">BB</span>
                </div>
              </td>

              <!-- Level, as a bar on a shared scale. Null is "not fitted", not zero. -->
              <td class="px-2 py-2">
                <div v-if="l.level != null" class="flex items-center gap-2">
                  <div class="h-1.5 flex-1 rounded-full bg-surface-light overflow-hidden min-w-[48px]">
                    <div class="h-full rounded-full" :class="l.is_cup ? 'bg-zinc-500' : 'bg-blue-500'"
                         :style="{ width: levelPct(l.level) + '%' }"></div>
                  </div>
                  <span class="tabular-nums text-zinc-300 w-11 text-right">{{ l.level.toFixed(3) }}</span>
                </div>
                <span v-else class="text-zinc-700">not fitted</span>
              </td>

              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(l.home_adv, 3) }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ l.is_cup ? '—' : num(l.spread, 3) }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(l.avg_goals, 2) }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ l.twin_teams || '—' }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ l.games.toLocaleString() }}</td>
              <td class="px-2 py-2 text-right tabular-nums" :class="l.upcoming ? 'text-zinc-300' : 'text-zinc-700'">
                {{ l.upcoming || '—' }}
              </td>
              <td class="px-3 py-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="roleClass(l.role)">
                  {{ roleLabel(l) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </section>

      <p class="text-[10px] text-zinc-600 leading-relaxed mt-3 max-w-4xl">
        <span class="text-zinc-500">Level</span> is the twin's fitted strength of the competition — one
        scale within each group above, which is the point of the entity layer. It is grouped rather than
        ranked as one list because a cup pools clubs from every tier, so its level sits above every
        league's without the competition being stronger. <span class="text-zinc-500">BET</span> means the ledger carries wagers on it;
        <span class="text-zinc-500">DATA</span> means we hold fixtures but bet none — the domestic cups
        exist so the twin can separate a club's rating from its division's level, and are never bet.
        Twin ratings are context, never a price.
      </p>
    </template>
  </div>
</template>

<script setup>
/**
 * Competitions, ranked by what the twin makes of them.
 *
 * This replaced a grid of league logos with a game count, which answered only
 * "does this have data". Three things changed:
 *
 *   - The list is every competition in `games`, not the `leagues` registry.
 *     The registry held 22 rows while we hold 37 competitions — all six
 *     domestic cups, LATAM and conference_league were invisible here.
 *   - `role` comes from the bets ledger, not a copy of masks.py. A mirrored
 *     registry rots; the ledger cannot.
 *   - The twin's numbers lead, because clicking through goes to the twin.
 */
import { ref, computed, onMounted } from 'vue'
import { getLeagueLogoUrl } from '~/utils/teamLogo'

definePageMeta({ layout: 'default', middleware: 'auth' })

const loading = ref(true)
const leagues = ref([])
const filter = ref('all')
const search = ref('')

const filters = computed(() => {
  const by = (fn) => leagues.value.filter(fn).length
  return [
    { key: 'all',        label: 'All',        count: leagues.value.length },
    { key: 'bet',        label: 'Bet',        count: by(l => l.role === 'bet') },
    { key: 'football',   label: 'Football',   count: by(l => l.sport === 'football') },
    { key: 'basketball', label: 'Basketball', count: by(l => l.sport === 'basketball') },
    { key: 'cup',        label: 'Cups',       count: by(l => l.is_cup) },
  ]
})

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return leagues.value
    .filter(l => {
      if (filter.value === 'bet' && l.role !== 'bet') return false
      if (filter.value === 'football' && l.sport !== 'football') return false
      if (filter.value === 'basketball' && l.sport !== 'basketball') return false
      if (filter.value === 'cup' && !l.is_cup) return false
      if (q && !l.name.toLowerCase().includes(q) && !l.key.includes(q)) return false
      return true
    })
    // Fitted competitions first, strongest down; unfitted ones by corpus size.
    .sort((a, b) => {
      if (a.level != null && b.level != null) return b.level - a.level
      if (a.level != null) return -1
      if (b.level != null) return 1
      return b.games - a.games
    })
})

/**
 * Three groups, because `level` is only comparable WITHIN one of them.
 * A cup pools clubs from every tier, so its fitted level sits above every
 * league's without meaning the competition is stronger — ranking them in one
 * list reads as exactly the claim the entity layer does not make.
 */
const groups = computed(() => {
  const rs = rows.value
  return [
    {
      key: 'league',
      label: 'Leagues',
      hint: 'fitted on one scale — comparable to each other',
      rows: rs.filter(l => l.level != null && !l.is_cup),
    },
    {
      key: 'cup',
      label: 'Cups & continental',
      hint: 'level pools every tier — not comparable to a league\'s',
      rows: rs.filter(l => l.level != null && l.is_cup),
    },
    {
      key: 'unfitted',
      label: 'Not fitted',
      hint: 'outside the corpus the twin layer is built on',
      rows: rs.filter(l => l.level == null),
    },
  ].filter(g => g.rows.length > 0)
})

const summary = computed(() => {
  if (!leagues.value.length) return null
  return {
    total: leagues.value.length,
    bet: leagues.value.filter(l => l.role === 'bet').length,
    games: leagues.value.reduce((a, l) => a + l.games, 0),
  }
})

/** Level is unitless and roughly -0.05…0.70; map onto the bar's width. */
const LEVEL_MAX = 0.7
function levelPct(level) {
  return Math.max(2, Math.min(100, (Number(level) / LEVEL_MAX) * 100))
}

function num(v, dp) {
  return v == null ? '—' : Number(v).toFixed(dp)
}

function roleLabel(l) {
  if (l.role === 'bet') return l.bets_pending ? `BET · ${l.bets_pending}` : 'BET'
  return l.role.toUpperCase()
}

function roleClass(role) {
  return {
    bet:  'bg-emerald-500/15 text-emerald-300',
    data: 'bg-zinc-700/40 text-zinc-400',
    idle: 'bg-zinc-800/60 text-zinc-600',
  }[role] || 'bg-zinc-800/60 text-zinc-600'
}

onMounted(async () => {
  try {
    const d = await $fetch('/api/leagues/overview')
    leagues.value = d.leagues || []
  } catch (e) {
    console.error('Failed to load competitions:', e)
  } finally {
    loading.value = false
  }
})

useHead({ title: 'Competitions · Protero' })
</script>
