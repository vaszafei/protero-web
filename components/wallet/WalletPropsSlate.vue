<template>
  <!-- Slate on a player-props wallet: tonight's games, and for the chosen game
       every Stoiximan line beside each player's own games (Board), or the legs the
       selection script kept (Candidates). Clubs are OURS — the board binds each
       Stoiximan event to our fixture. Read-only; "Load props" builds it. -->
  <div class="flex-1 min-h-0 grid gap-3 grid-cols-[300px_minmax(0,1fr)]">
    <!-- ── Tonight ── -->
    <div class="rounded-xl bg-surface border border-edge flex flex-col min-h-0 overflow-hidden">
      <div class="px-3 py-2 border-b border-edge/50 flex items-center gap-2 flex-shrink-0">
        <h3 class="text-[12px] font-semibold text-zinc-100">Tonight</h3>
        <span class="text-[11px] text-zinc-500 tabular-nums">{{ date }}</span>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 text-[11px]">
        <p v-if="!games.length" class="text-zinc-500 px-1 py-2">Nothing loaded for this date — press Load props.</p>
        <div class="space-y-1">
          <button
            v-for="g in games" :key="g.eventId"
            class="w-full px-2.5 py-1.5 rounded text-left transition-colors border"
            :class="g.eventId === selectedEvent ? 'bg-blue-500/10 border-blue-500/30' : 'border-transparent hover:bg-surface-light/40'"
            :disabled="!g.rows"
            @click="selectedEvent = g.eventId"
          >
            <div class="flex items-center justify-between mb-0.5">
              <span class="tabular-nums text-zinc-400">{{ athensTime(g.start) }}</span>
              <span class="tabular-nums" :class="g.rows ? 'text-zinc-500' : 'text-amber-400/80'">
                {{ g.rows ? `${g.players} players · ${g.rows} lines` : 'no props yet' }}
              </span>
            </div>
            <template v-if="g.home">
              <div v-for="c in [g.home, g.away]" :key="c.id" class="flex items-center gap-1.5">
                <TeamLogo :club="c" />
                <span class="truncate" :class="g.rows ? 'text-zinc-100' : 'text-zinc-500'">{{ c.name }}</span>
              </div>
            </template>
            <p v-else class="truncate text-zinc-500" title="Not bound to one of our fixtures">{{ g.event }}</p>
          </button>
        </div>

        <div class="px-1 space-y-1 text-zinc-500">
          <p v-if="status?.capture">Props captured {{ clock(status.capture.capturedAt) }} · {{ status.capture.rows }} lines</p>
          <p v-if="status?.hasInjuries">
            Injuries <template v-if="status.injuries">{{ status.injuries.day }} · {{ status.injuries.out }} out</template><template v-else>— no snapshot</template>
          </p>
          <p v-else-if="status">No injury source for this competition</p>
        </div>

        <div v-if="status?.job && status.job.state !== 'ok'" class="px-1">
          <p class="text-[10px] uppercase tracking-wide mb-1" :class="status.job.state === 'failed' ? 'text-red-400' : 'text-amber-300'">
            {{ status.job.state === 'failed' ? 'Load failed' : 'Loading…' }}
          </p>
          <pre class="text-[10px] leading-4 text-zinc-400 bg-surface-light/40 rounded p-2 whitespace-pre-wrap break-all">{{ status.job.log.join('\n') || '…' }}</pre>
        </div>
        <p v-if="error" class="px-1 text-red-400">{{ error }}</p>
      </div>
    </div>

    <!-- ── Board / Candidates ── -->
    <div class="rounded-xl bg-surface border border-edge flex flex-col min-h-0 overflow-hidden">
      <div class="px-3 py-2 border-b border-edge/50 flex items-center gap-3 flex-shrink-0">
        <div class="flex items-center gap-0.5">
          <button
            v-for="t in TABS" :key="t"
            class="text-[11px] px-2.5 py-1 rounded font-semibold transition-colors"
            :class="tab === t ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'"
            @click="tab = t"
          >{{ t }}</button>
        </div>

        <div v-if="tab === 'Board'" class="flex items-center gap-0.5">
          <button
            v-for="s in statsInGame" :key="s"
            class="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
            :class="stat === s ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'"
            @click="stat = s"
          >{{ STAT_LABEL[s] || s }}</button>
        </div>
        <div v-else class="flex items-center gap-0.5">
          <button
            v-for="t in TIER_OPTIONS" :key="t.value"
            class="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
            :class="tier === t.value ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'"
            :title="t.rule"
            @click="tier = t.value"
          >{{ t.label }}</button>
        </div>

        <span class="ml-auto text-[10px] text-zinc-500 truncate" :title="tab === 'Board' ? BOARD_NOTE : CANDIDATES_NOTE">
          {{ tab === 'Board' ? BOARD_NOTE : CANDIDATES_NOTE }}
        </span>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <!-- Board -->
        <template v-if="tab === 'Board'">
          <p v-if="!boardGroups.length" class="text-center text-[11px] text-zinc-500 py-8">
            {{ status?.board ? 'No lines for this stat in this game.' : 'No board yet — press Load props.' }}
          </p>
          <table v-else class="w-full text-[11px]">
            <thead class="sticky top-0 bg-surface z-10">
              <tr class="text-[10px] text-zinc-500 uppercase tracking-wide">
                <th class="py-1.5 pl-3 text-left font-medium">Player</th>
                <th class="py-1.5 pl-2 text-left font-medium">Line</th>
                <th class="py-1.5 pl-3 text-left font-medium" title="His games over – under tonight's main line, and the book's Shin-devigged chance of the over">Record</th>
                <th class="py-1.5 pl-3 text-right font-medium">Avg</th>
                <th class="py-1.5 pl-4 text-left font-medium" title="Newest first; bright = over tonight's main line">Last 10</th>
                <th class="py-1.5 pl-4 text-left font-medium" title="Each rung: price, then how often he cleared it (hover for the price's implied chance)">Alternatives · his hit rate</th>
                <th class="py-1.5 pl-3 pr-3 text-left font-medium" title="Lines Stoiximan set him earlier, and what he scored">Earlier lines</th>
              </tr>
            </thead>
            <tbody v-for="grp in boardGroups" :key="grp.side">
              <tr class="bg-surface-light/30">
                <td colspan="7" class="py-1.5 pl-3">
                  <div class="flex items-center gap-2">
                    <TeamLogo :club="grp.club" size="w-5 h-5" />
                    <span class="text-[12px] font-semibold text-zinc-100">{{ grp.club?.name || 'Unbound club' }}</span>
                    <span class="text-[10px] text-zinc-500">{{ grp.side }} · {{ grp.rows.length }} players</span>
                  </div>
                </td>
              </tr>
              <tr v-for="r in grp.rows" :key="r.player" class="border-t border-edge/20 hover:bg-surface-light/30">
                <td class="py-2 pl-3 pr-2 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <TeamLogo :club="r.club" />
                    <div>
                      <p class="text-zinc-100 font-medium leading-tight">{{ r.player }}</p>
                      <p class="text-[10px] text-zinc-500 leading-tight">
                        {{ r.n_history }} {{ r.n_history === 1 ? 'game' : 'games' }}<template v-if="r.leagues?.length"> · {{ r.leagues.map(l => LEAGUE_SHORT[l] || l).join(', ') }}</template>
                      </p>
                    </div>
                  </div>
                </td>
                <td class="py-2 pl-2 pr-2 whitespace-nowrap tabular-nums">
                  <template v-if="r.main">
                    <p class="text-[12px] font-semibold text-zinc-100 leading-tight">{{ r.main.line }}</p>
                    <p class="text-[10px] leading-tight">
                      <span class="text-zinc-500">O</span> <span class="text-amber-300">{{ r.main.over.toFixed(2) }}</span>
                      <span class="text-zinc-500 ml-1">U</span> <span class="text-amber-300">{{ r.main.under.toFixed(2) }}</span>
                    </p>
                  </template>
                  <span v-else class="text-zinc-500">—</span>
                </td>
                <td class="py-2 pl-3 whitespace-nowrap tabular-nums">
                  <template v-if="r.main">
                    <p class="text-zinc-200 leading-tight">{{ r.main.record.n ? `${r.main.record.over}–${r.main.record.under}` : '—' }}</p>
                    <p class="text-[10px] text-zinc-500 leading-tight">book {{ pct(r.main.p_over) }}</p>
                  </template>
                </td>
                <td class="py-2 pl-3 text-right tabular-nums text-zinc-300">{{ r.avg ?? '—' }}</td>
                <td class="py-2 pl-4 pr-2 whitespace-nowrap tabular-nums">
                  <span
                    v-for="(g, i) in lastTen(r)" :key="i"
                    class="inline-block w-[22px] text-center"
                    :class="valueClass(g?.value, r.main?.line)"
                    :title="g ? `${g.date} · ${LEAGUE_SHORT[g.league] || g.league || ''} · ${g.minutes} min` : ''"
                  >{{ g ? (g.value ?? '–') : '' }}</span>
                </td>
                <td class="py-2 pl-4 pr-2">
                  <div class="flex gap-1">
                    <div
                      v-for="x in r.rungs" :key="x.line"
                      class="w-[46px] flex-shrink-0 rounded bg-surface-light/40 py-0.5 text-center tabular-nums leading-tight"
                      :title="`${x.line + 0.5}+ at ${x.price}: the price implies ${pct(x.implied)}; he cleared it ${x.record.over} of ${x.record.n}`"
                    >
                      <p class="text-[10px] text-zinc-400">{{ x.line + 0.5 }}+</p>
                      <p class="text-amber-300">{{ x.price.toFixed(2) }}</p>
                      <p class="text-[10px]" :class="x.record.n ? 'text-zinc-100' : 'text-zinc-600'">
                        {{ x.record.n ? pct(x.record.over / x.record.n) : '—' }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="py-2 pl-3 pr-3 text-zinc-400 whitespace-nowrap tabular-nums">
                  <p v-for="p in r.previous_lines" :key="p.date + p.line" class="leading-tight">
                    {{ shortDate(p.date) }} · {{ p.line }} → <span :class="valueClass(p.actual, p.line)">{{ p.actual ?? 'DNP' }}</span>
                  </p>
                  <span v-if="!r.previous_lines.length" class="text-zinc-600">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- Candidates -->
        <template v-else>
          <p v-if="!built" class="text-center text-[11px] text-zinc-500 py-8">No {{ tier }} candidates yet — press Load props.</p>
          <table v-else class="w-full text-[11px]">
            <thead class="sticky top-0 bg-surface z-10">
              <tr class="text-[10px] text-zinc-500 uppercase tracking-wide">
                <th class="py-1.5 pl-3 text-left font-medium w-10"></th>
                <th class="py-1.5 text-left font-medium">Player</th>
                <th class="py-1.5 text-left font-medium">Selection</th>
                <th class="py-1.5 text-right font-medium">Odds</th>
                <th class="py-1.5 text-right font-medium">Book</th>
                <th class="py-1.5 text-right font-medium">Record</th>
                <th class="py-1.5 text-right font-medium">Last 10</th>
                <th class="py-1.5 text-right font-medium">Avg</th>
                <th class="py-1.5 text-right font-medium" title="Minutes in the club's latest game this season">Last min</th>
                <th class="py-1.5 text-left font-medium pl-3">Injury</th>
                <th class="py-1.5 pr-3 text-right font-medium">Est</th>
              </tr>
            </thead>
            <tbody v-for="g in built.slate" :key="g.eventId">
              <tr class="bg-surface-light/30">
                <td colspan="11" class="py-1.5 pl-3 pr-3">
                  <span class="text-zinc-100 font-semibold">{{ g.fixture }}</span>
                  <span class="text-zinc-500 tabular-nums ml-2">{{ athensTime(g.start) }}</span>
                  <span class="text-zinc-400 ml-2">{{ g.candidates.length }} qualifying</span>
                  <span v-if="droppedText(g)" class="text-zinc-500 ml-2" :title="droppedText(g)">· dropped {{ droppedText(g) }}</span>
                </td>
              </tr>
              <tr v-if="!g.candidates.length">
                <td colspan="11" class="py-1.5 pl-3 text-zinc-500">No leg qualifies at this tier.</td>
              </tr>
              <tr v-for="c in g.candidates" :key="`${c.player}-${c.stat}-${c.side}-${c.line}`" class="border-t border-edge/20 hover:bg-surface-light/30">
                <td class="py-1.5 pl-3 text-[10px] font-semibold text-emerald-400">{{ isPick(g, c) ? 'pick' : '' }}</td>
                <td class="py-1.5 pr-2 text-zinc-100 font-medium whitespace-nowrap">{{ c.player }}</td>
                <td class="py-1.5 pr-2 whitespace-nowrap" :class="c.side === 'under' ? 'text-sky-300' : 'text-emerald-400/90'">
                  {{ c.side === 'under' ? 'Under' : 'Over' }} {{ c.line }} {{ CANDIDATE_STAT[c.stat] || c.stat }}
                </td>
                <td class="py-1.5 text-right tabular-nums text-amber-300">{{ Number(c.odds).toFixed(2) }}</td>
                <td class="py-1.5 text-right tabular-nums text-zinc-400">{{ pct(c.p_book) }}</td>
                <td class="py-1.5 text-right tabular-nums text-zinc-300">{{ c.hits }}/{{ c.n }}</td>
                <td class="py-1.5 text-right tabular-nums text-zinc-300">{{ c.h10 }}/10</td>
                <td class="py-1.5 text-right tabular-nums text-zinc-400">{{ c.avg }}</td>
                <td class="py-1.5 text-right tabular-nums text-zinc-400">{{ c.last_minutes ?? c.r1_minutes ?? '—' }}</td>
                <td class="py-1.5 pl-3 text-zinc-400">{{ c.injury || '—' }}</td>
                <td class="py-1.5 pr-3 text-right tabular-nums text-zinc-200">{{ pct(c.p_est) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, h } from 'vue'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

const props = defineProps({
  date: { type: String, required: true },
  status: { type: Object, default: null },
  error: { type: String, default: null },
})

/** Our club's logo; its abbreviation when the file is missing or the club is unbound. */
const TeamLogo = {
  props: { club: { type: Object, default: null }, size: { type: String, default: 'w-4 h-4' } },
  setup(p) {
    const broken = ref(false)
    return () => {
      const url = getTeamLogoUrl(p.club?.key)
      if (url && !broken.value) {
        return h('img', { src: url, alt: p.club.name, loading: 'lazy', class: `${p.size} object-contain flex-shrink-0`, onError: () => { broken.value = true } })
      }
      return h('span', { class: `${p.size} flex-shrink-0 rounded-full bg-surface-light text-[8px] text-zinc-400 flex items-center justify-center` },
        teamAbbreviation(p.club?.name).slice(0, 2))
    }
  },
}

const TABS = ['Board', 'Candidates']
const LEAGUE_SHORT = { euroleague: 'EL', eurocup: 'EC', acb: 'ACB', greek_basket_league: 'GBL', bcl: 'BCL' }
const STAT_ORDER = ['pts', 'reb', 'ast', 'pra', 'fg3m', 'fg2m', 'ftm', 'tov']
const STAT_LABEL = { pts: 'PTS', reb: 'REB', ast: 'AST', pra: 'PRA', fg3m: '3PM', fg2m: '2PM', ftm: 'FTM', tov: 'TOV' }
const CANDIDATE_STAT = { points: 'pts', rebounds: 'reb', assists: 'ast', pra: 'PRA' }
const TIER_OPTIONS = [
  { value: 'strict', label: 'Strict', rule: 'record ≥ 65% at the line and ≥ 7 of the last 10' },
  { value: 'relaxed', label: 'Relaxed', rule: 'record ≥ 58% at the line and ≥ 6 of the last 10' },
]
const BOARD_NOTE = 'His own games (every European competition we hold, this season and last) beside the price — descriptive, not a value ranking. Short N+ rungs have hit well below their price.'
const CANDIDATES_NOTE = 'Main lines only. est = own record at club shrunk toward the Shin price — a safety ranking, not an edge.'

const tab = ref('Board')
const tier = ref('strict')
const stat = ref('pts')
const selectedEvent = ref(null)

const built = computed(() => props.status?.candidates?.[tier.value] || null)
const games = computed(() => props.status?.capture?.games || [])

// Open on the first game that has props; keep the operator's pick while it exists.
watch(games, (gs) => {
  if (!gs.some(g => g.eventId === selectedEvent.value && g.rows)) {
    selectedEvent.value = gs.find(g => g.rows)?.eventId || null
  }
}, { immediate: true })

const boardGame = computed(() => (props.status?.board?.games || []).find(g => g.eventId === selectedEvent.value) || null)

const statsInGame = computed(() => {
  const have = new Set((boardGame.value?.rows || []).map(r => r.stat))
  return STAT_ORDER.filter(s => have.has(s))
})
watch(statsInGame, (ss) => { if (ss.length && !ss.includes(stat.value)) stat.value = ss[0] })

/** Home club first, then away; within a club the biggest main line first. */
const boardGroups = computed(() => {
  const rows = (boardGame.value?.rows || []).filter(r => r.stat === stat.value)
  return ['home', 'away']
    .map(side => ({
      side,
      club: boardGame.value?.[side] || null,
      rows: rows.filter(r => r.side === side).sort((a, b) => (b.main?.line ?? 0) - (a.main?.line ?? 0)),
    }))
    .filter(g => g.rows.length)
})

/** Always ten cells, so the columns line up across players. */
const lastTen = r => Array.from({ length: 10 }, (_, i) => r.last[i] || null)

function valueClass(value, line) {
  if (value == null || line == null) return 'text-zinc-600'
  return value > line ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
}

function isPick(g, c) {
  return g.picks.some(p => p.player === c.player && p.stat === c.stat && p.side === c.side && p.line === c.line)
}

function droppedText(g) {
  return Object.entries(g.dropped || {}).map(([why, n]) => `${why} ${n}`).join(', ')
}

const pct = p => (p == null ? '—' : `${(Number(p) * 100).toFixed(0)}%`)

function athensTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' })
}

function shortDate(d) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function clock(t) {
  if (!t) return '—'
  return new Date(t).toLocaleString('en-GB', { timeZone: 'Europe/Athens', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>
