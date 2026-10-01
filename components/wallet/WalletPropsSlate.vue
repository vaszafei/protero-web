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
        <div v-else-if="tab === 'Candidates'" class="flex items-center gap-0.5">
          <button
            v-for="t in TIER_OPTIONS" :key="t.value"
            class="text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
            :class="tier === t.value ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'"
            :title="t.rule"
            @click="tier = t.value"
          >{{ t.label }}</button>
        </div>

        <span class="ml-auto text-[10px] text-zinc-500 truncate" :title="NOTES[tab]">{{ NOTES[tab] }}</span>
      </div>

      <WalletPropsSlips v-if="tab === 'Slips'" class="flex-1 min-h-0" :slips="status?.slips" :bankroll="bankroll" />
      <div v-else class="flex-1 min-h-0 overflow-y-auto">
        <!-- Board -->
        <template v-if="tab === 'Board'">
          <p v-if="!boardGroups.length" class="text-center text-[11px] text-zinc-500 py-8">
            {{ status?.board ? 'No lines for this stat in this game.' : 'No board yet — press Load props.' }}
          </p>
          <table v-else class="w-full text-[11px]">
            <thead class="sticky top-0 bg-surface z-10">
              <tr class="text-[10px] text-zinc-500 uppercase tracking-wide">
                <th class="py-1.5 pl-3 text-left font-medium">Player</th>
                <th class="py-1.5 pl-2 text-left font-medium" title="Tonight's main line and its two prices">Line</th>
                <th class="py-1.5 pl-3 text-left font-medium" title="Newest first. Green = over tonight's line, grey = under, – = did not play. Faded = played for another club.">
                  Last 10 <span class="normal-case tracking-normal"><span class="px-1 rounded bg-emerald-500/20 text-emerald-300">over</span> · under</span>
                </th>
                <th class="py-1.5 pl-3 text-left font-medium" title="His last 20 European games against tonight's line: how many went over and under, and his average">Record at line</th>
                <th class="py-1.5 pl-3 text-left font-medium" title="Our belief, built without the price: expected minutes × his per-minute rate on a twin prior">Model expects</th>
                <th class="py-1.5 pl-3 text-left font-medium" title="Chance of the OVER: the book's (Shin-devigged) and p* — the price moved by the registered blend of model, record and the over-bias">Over chance</th>
                <th class="py-1.5 pl-3 text-left font-medium" title="The side p* prefers and its EV at the price. 'in Slips' = it clears EV ≥ 3% and edge ≥ 3% as a single. A forward hypothesis, not an edge.">p* lean</th>
                <th class="py-1.5 pl-3 pr-3 text-left font-medium" title="Lines Stoiximan set him earlier, and what he scored">Earlier lines</th>
              </tr>
            </thead>
            <tbody v-for="grp in boardGroups" :key="grp.side">
              <tr class="bg-surface-light/30">
                <td colspan="8" class="py-1.5 pl-3">
                  <div class="flex items-center gap-2">
                    <TeamLogo :club="grp.club" size="w-5 h-5" />
                    <span class="text-[12px] font-semibold text-zinc-100">{{ grp.club?.name || 'Unbound club' }}</span>
                    <span class="text-[10px] text-zinc-500">{{ grp.side }} · {{ grp.rows.length }} players</span>
                  </div>
                </td>
              </tr>
              <template v-for="r in grp.rows" :key="r.player">
                <tr
                  class="border-t border-edge/20 cursor-pointer"
                  :class="[expanded === rowKey(r) ? 'bg-surface-light/40' : 'hover:bg-surface-light/30', r.n_history < 3 ? 'opacity-60' : '']"
                  title="Click for the alternative lines"
                  @click="expanded = expanded === rowKey(r) ? null : rowKey(r)"
                >
                  <td class="py-1.5 pl-3 pr-2 whitespace-nowrap">
                    <p class="text-zinc-100 font-medium leading-tight">
                      <span class="text-zinc-600 mr-1">{{ expanded === rowKey(r) ? '▾' : '▸' }}</span>{{ r.player }}
                    </p>
                    <p class="text-[10px] text-zinc-500 leading-tight pl-3">
                      {{ r.n_history }} {{ r.n_history === 1 ? 'game' : 'games' }}<template v-if="r.leagues?.length"> · {{ r.leagues.map(l => LEAGUE_SHORT[l] || l).join(', ') }}</template>
                      <span
                        v-if="newClub(r)" class="ml-1 px-1 rounded bg-amber-500/10 text-amber-300"
                        :title="`Only ${r.at_club} of these ${r.n_history} games were for ${r.club?.name}. His record and the model still carry his old role; the price knows the new one.`"
                      >new club {{ r.at_club }}/{{ r.n_history }}</span>
                    </p>
                  </td>
                  <td class="py-1.5 pl-2 pr-2 whitespace-nowrap tabular-nums">
                    <template v-if="r.main">
                      <p class="text-[13px] font-semibold text-zinc-100 leading-tight">{{ r.main.line }}</p>
                      <p class="text-[10px] leading-tight">
                        <span class="text-emerald-400/80">O</span> <span class="text-amber-300">{{ r.main.over.toFixed(2) }}</span>
                        <span class="text-sky-300/80 ml-1">U</span> <span class="text-amber-300">{{ r.main.under.toFixed(2) }}</span>
                      </p>
                    </template>
                    <span v-else class="text-zinc-500">—</span>
                  </td>
                  <td class="py-1.5 pl-3 pr-2 whitespace-nowrap tabular-nums">
                    <span
                      v-for="(g, i) in lastTen(r)" :key="i"
                      class="inline-block w-[22px] mr-px text-center rounded"
                      :class="[lastClass(g?.value, r.main?.line), g && r.club?.id && g.team_id !== r.club.id ? 'opacity-40' : '']"
                      :title="g ? `${g.date} · ${LEAGUE_SHORT[g.league] || g.league || ''} · ${g.minutes} min${r.club?.id && g.team_id !== r.club.id ? ' · another club' : ''}` : ''"
                    >{{ g ? (g.value ?? '–') : '' }}</span>
                  </td>
                  <td class="py-1.5 pl-3 pr-2 whitespace-nowrap tabular-nums">
                    <template v-if="r.main?.record.n">
                      <p class="leading-tight">
                        <span class="text-emerald-400">{{ r.main.record.over }}</span><span class="text-zinc-600"> – </span><span class="text-sky-300">{{ r.main.record.under }}</span>
                        <span class="text-[10px] text-zinc-500 ml-1.5">avg {{ r.avg ?? '—' }}</span>
                      </p>
                      <div class="mt-0.5 h-1 w-20 rounded-full overflow-hidden flex bg-zinc-800">
                        <div class="bg-emerald-500/70" :style="{ width: `${100 * r.main.record.over / r.main.record.n}%` }" />
                        <div class="bg-sky-500/70" :style="{ width: `${100 * r.main.record.under / r.main.record.n}%` }" />
                      </div>
                    </template>
                    <span v-else class="text-zinc-600">—</span>
                  </td>
                  <td class="py-1.5 pl-3 pr-2 whitespace-nowrap tabular-nums" :title="beliefTitle(r)">
                    <template v-if="r.main?.belief">
                      <p class="leading-tight">
                        <span class="text-zinc-100">{{ r.main.belief.mean.toFixed(1) }}</span>
                        <span class="text-[10px] ml-1" :class="r.main.belief.mean > r.main.line ? 'text-emerald-400' : 'text-sky-300'">
                          {{ r.main.belief.mean > r.main.line ? '+' : '' }}{{ (r.main.belief.mean - r.main.line).toFixed(1) }}
                        </span>
                      </p>
                      <p class="text-[10px] text-zinc-500 leading-tight">{{ Math.round(r.main.belief.e_minutes) }} min · usg {{ r.main.belief.usage?.season ?? '—' }}</p>
                    </template>
                    <span v-else-if="r.main" class="text-[10px] text-zinc-600" title="Fewer than 3 European games — no belief; p* is the price and the over-bias only">no history</span>
                    <span v-else class="text-zinc-600">—</span>
                  </td>
                  <td class="py-1.5 pl-3 pr-2 whitespace-nowrap tabular-nums">
                    <template v-if="r.main?.p_star != null">
                      <p class="leading-tight"><span class="text-[10px] text-zinc-500 inline-block w-7">book</span> <span class="text-zinc-300">{{ pct(r.main.p_over) }}</span></p>
                      <p class="leading-tight">
                        <span class="text-[10px] text-zinc-500 inline-block w-7">p*</span> <span class="text-zinc-100 font-semibold">{{ pct(r.main.p_star) }}</span>
                        <span
                          v-if="r.main.p_star_v2 != null" class="text-[10px] text-zinc-500 ml-1.5"
                          title="Shadow p* with the role-aware belief (recent games and his current club weighted up). A forward test, registered as el_props_blend_v2_forward — scored on Round 3+ nights, and nothing gates on it."
                        >v2 <span class="text-zinc-400">{{ pct(r.main.p_star_v2) }}</span></span>
                      </p>
                    </template>
                    <span v-else class="text-zinc-600">—</span>
                  </td>
                  <td class="py-1.5 pl-3 pr-2 whitespace-nowrap tabular-nums">
                    <template v-if="r.main && bestSide(r.main)">
                      <span
                        class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        :class="bestSide(r.main).side === 'under' ? 'bg-sky-500/10 text-sky-300' : 'bg-emerald-500/10 text-emerald-300'"
                      >{{ bestSide(r.main).side === 'under' ? 'Under' : 'Over' }} {{ signedPct(bestSide(r.main).ev) }}</span>
                      <span v-if="inSlips(r, bestSide(r.main).side)" class="ml-1 text-[10px] text-blue-300">in Slips</span>
                    </template>
                    <span v-else-if="r.main?.p_star != null" class="text-[10px] text-zinc-600" title="Neither side is positive at p*">none</span>
                    <span v-else class="text-zinc-600">—</span>
                  </td>
                  <td class="py-1.5 pl-3 pr-3 text-zinc-400 whitespace-nowrap tabular-nums">
                    <p v-for="p in r.previous_lines" :key="p.date + p.line" class="leading-tight">
                      {{ shortDate(p.date) }} · {{ p.line }} → <span :class="sideClass(p.actual, p.line)">{{ p.actual ?? 'DNP' }}</span>
                    </p>
                    <span v-if="!r.previous_lines.length" class="text-zinc-600">—</span>
                  </td>
                </tr>
                <tr v-if="expanded === rowKey(r)" class="bg-surface-light/20">
                  <td colspan="8" class="px-3 pb-2 pt-1">
                    <p class="text-[10px] text-zinc-500 mb-1">
                      Alternative lines — price, the chance it implies, and how often he cleared it in his last {{ r.main?.record.n || r.n_history }} games.
                      <span class="text-amber-300/80">Short N+ rungs (1.25–1.60) have hit 54% against 71% implied: legs go on the main line.</span>
                    </p>
                    <div v-if="r.rungs.length" class="flex flex-wrap gap-1">
                      <div
                        v-for="x in r.rungs" :key="x.line"
                        class="w-[64px] rounded bg-surface-light/50 py-1 text-center tabular-nums leading-tight"
                      >
                        <p class="text-[10px] text-zinc-400">{{ x.line + 0.5 }}+</p>
                        <p class="text-amber-300">{{ x.price.toFixed(2) }}</p>
                        <p class="text-[10px] text-zinc-500">implies {{ pct(x.implied) }}</p>
                        <p class="text-[10px]" :class="x.record.n ? 'text-zinc-100' : 'text-zinc-600'">hit {{ x.record.n ? pct(x.record.over / x.record.n) : '—' }}</p>
                      </div>
                    </div>
                    <p v-else class="text-[10px] text-zinc-600">No alternative lines offered.</p>
                  </td>
                </tr>
              </template>
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
                <td class="py-1.5 pr-2 text-zinc-100 font-medium whitespace-nowrap">
                  {{ c.player }}
                  <span v-for="f in c.flags || []" :key="f" class="ml-1 px-1 rounded bg-amber-500/10 text-amber-300 text-[10px]" :title="`${f}. His record still describes his old role; the price knows the new one.`">new club</span>
                </td>
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
  bankroll: { type: Number, default: null },
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

const TABS = ['Board', 'Candidates', 'Slips']
const LEAGUE_SHORT = { euroleague: 'EL', eurocup: 'EC', acb: 'ACB', greek_basket_league: 'GBL', bcl: 'BCL' }
const STAT_ORDER = ['pts', 'reb', 'ast', 'pra', 'fg3m', 'fg2m', 'ftm', 'tov']
const STAT_LABEL = { pts: 'PTS', reb: 'REB', ast: 'AST', pra: 'PRA', fg3m: '3PM', fg2m: '2PM', ftm: 'FTM', tov: 'TOV' }
const CANDIDATE_STAT = { points: 'pts', rebounds: 'reb', assists: 'ast', pra: 'PRA' }
const TIER_OPTIONS = [
  { value: 'strict', label: 'Strict', rule: 'record ≥ 65% at the line and ≥ 7 of the last 10' },
  { value: 'relaxed', label: 'Relaxed', rule: 'record ≥ 58% at the line and ≥ 6 of the last 10' },
]
const BOARD_NOTE = 'Every line tonight beside his own last 20 European games — descriptive, not a value ranking. Click a player for his alternative lines.'
const CANDIDATES_NOTE = 'Main lines only. est = his last 20 European games at any club (this season at tonight\'s club counts double) shrunk toward the Shin price — a safety ranking, not an edge. New clubs are flagged, not dropped.'
const SLIPS_NOTE = 'Legs that clear EV ≥ 3% and edge ≥ 3% as singles at p*. p* beat the price out of sample on Brier; its betting value is a forward hypothesis.'
const NOTES = { Board: BOARD_NOTE, Candidates: CANDIDATES_NOTE, Slips: SLIPS_NOTE }

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

/** Over tonight's line reads green, under reads blue — the colours every tab uses for the sides. */
function sideClass(value, line) {
  if (value == null || line == null) return 'text-zinc-600'
  return value > line ? 'text-emerald-400' : 'text-sky-300'
}

/** Last-10 cells: an over is a green chip, an under stays grey, so the overs count at a glance. */
function lastClass(value, line) {
  if (value == null || line == null) return 'text-zinc-600'
  return value > line ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-zinc-500'
}

const expanded = ref(null)
const rowKey = r => `${r.player}|${r.stat}`

/** Fewer than half of his games were for tonight's club — the slip builder's `new club` flag. */
const newClub = r => r.at_club != null && r.n_history > 0 && r.at_club < r.n_history / 2

const SLIP_STAT = { pts: 'points', reb: 'rebounds', ast: 'assists', pra: 'pra' }
/** This side is one of the slip builder's legs — it cleared the single-bet gate at p*. */
function inSlips(r, side) {
  return (props.status?.slips?.legs || []).some(l =>
    l.player === r.player && l.market === SLIP_STAT[r.stat] && l.line === r.main.line && l.side === side)
}

function isPick(g, c) {
  return g.picks.some(p => p.player === c.player && p.stat === c.stat && p.side === c.side && p.line === c.line)
}

function droppedText(g) {
  return Object.entries(g.dropped || {}).map(([why, n]) => `${why} ${n}`).join(', ')
}

const pct = p => (p == null ? '—' : `${(Number(p) * 100).toFixed(0)}%`)
const signedPct = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}%`

/** The side whose EV at p* is higher — shown only when it is positive. */
function bestSide(m) {
  const s = m.ev_over >= m.ev_under ? { side: 'over', ev: m.ev_over } : { side: 'under', ev: m.ev_under }
  return s.ev > 0 ? s : null
}

function beliefTitle(r) {
  const b = r.main?.belief
  if (!b) return ''
  const twin = b.twin ? `twin ${b.twin.name}, ${b.twin.games} games` : 'no twin match — league prior'
  return `${b.e_minutes} min × ${b.rate36}/36 = ${b.mean} expected (own ${b.own36}/36 over ${b.n_played} games; prior ${b.prior36}/36, ${twin}). Belief P(over) ${pct(r.main.p_belief)} · book ${pct(r.main.p_over)} · p* ${pct(r.main.p_star)}. Usage season ${b.usage?.season ?? '—'} · last 5 ${b.usage?.last5 ?? '—'} · last season ${b.usage?.prior_season ?? '—'}.`
}

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
