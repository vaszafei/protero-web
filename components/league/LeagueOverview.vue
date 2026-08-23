<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- ═══ 1. What this competition IS ═══════════════════════════════════ -->
    <div v-if="pending" class="flex flex-col sm:flex-row gap-2.5">
      <div class="sm:flex-[8] min-w-0 rounded-lg border border-edge/40 bg-surface/60 p-3 animate-pulse">
        <div class="h-2 w-14 rounded bg-white/5 mb-2.5"></div>
        <div class="h-5 w-12 rounded bg-white/5"></div>
      </div>
      <div class="sm:flex-[4] min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div v-for="i in 5" :key="i" class="rounded-lg border border-edge/40 bg-surface/60 p-3 animate-pulse">
          <div class="h-2 w-14 rounded bg-white/5 mb-2.5"></div>
          <div class="h-5 w-12 rounded bg-white/5"></div>
        </div>
      </div>
    </div>

    <div v-else-if="twin" class="flex flex-col sm:flex-row gap-2.5">
      <!-- The one number that IS the league: its fitted level, flex 8. -->
      <LeagueMetricCard
        label="Level"
        hint="Fitted strength of the competition, comparable to others of the same kind"
        :value="num(twin.level, 3)"
        :foot="levelRank ? `#${levelRank.pos} of ${levelRank.total} ${twin.is_cup ? 'cups' : 'leagues'}` : 'not ranked'"
        :peer-values="peerScale.level"
        :own="twin.level"
        class="sm:flex-[8] min-w-0 flex flex-col justify-center"
      />

      <!-- The rest of the twin's key metrics, compact, in the same row. -->
      <div class="sm:flex-[4] min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <LeagueMetricCard
          label="Home adv."
          hint="Home-advantage term in log-goals"
          :value="num(twin.home_adv, 3)"
          foot="log-goals"
          :peer-values="peerScale.home_adv"
          :own="twin.home_adv"
        />
        <LeagueMetricCard
          label="Spread"
          hint="How far apart this competition's clubs are"
          :value="twin.is_cup ? '—' : num(twin.spread, 3)"
          :muted="!!twin.is_cup"
          :foot="twin.is_cup ? 'cups pool tiers' : 'club dispersion'"
          :peer-values="twin.is_cup ? [] : peerScale.spread"
          :own="twin.is_cup ? null : twin.spread"
        />
        <LeagueMetricCard
          label="Avg goals"
          :value="num(twin.avg_goals, 2)"
          foot="per game"
          :peer-values="peerScale.avg_goals"
          :own="twin.avg_goals"
        />
        <LeagueMetricCard
          label="Clubs"
          :value="String(twin.n_teams ?? '—')"
          :foot="`${clubs.length} rated now`"
        />
        <LeagueMetricCard
          label="Fitted on"
          :value="Number(twin.n_games || 0).toLocaleString()"
          :foot="twin.state_as_of ? `games · ${twin.state_as_of}` : 'games'"
        />
      </div>
    </div>

    <!-- Outside the fitted corpus. Said plainly, once, rather than as six empty cards. -->
    <div v-else-if="!pending" class="rounded-lg border border-edge/40 bg-surface/60 px-4 py-3">
      <p class="text-xs text-zinc-300 font-medium">No twin for this competition.</p>
      <p class="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-3xl">
        The entity layer is fitted on the European football corpus. Basketball, LATAM football and
        national-team fixtures sit outside it — they have games and predictions, but no fitted level,
        club ratings or transition record. Nothing is wrong; there is simply no twin to show.
      </p>
    </div>

    <!-- ═══ 2. The round in front of us ═══════════════════════════════════ -->
    <section class="panel">
      <header class="panel-head">
        <h3 class="panel-title">{{ roundHeading }}</h3>
        <span class="pill pill-blue">{{ roundGames.length }} {{ roundGames.length === 1 ? 'game' : 'games' }}</span>
        <span v-if="roundPlayed" class="pill pill-dim">{{ roundPlayed }} played</span>
        <span v-if="roundPicks" class="pill pill-amber">{{ roundPicks }} on the ledger</span>
        <span v-if="roundSpansDays" class="ml-auto text-[10px] text-zinc-600">{{ roundSpansDays }}</span>

        <span v-if="canScrollLeft || canScrollRight" class="flex items-center gap-1" :class="roundSpansDays ? 'ml-2' : 'ml-auto'">
          <button type="button" class="rail-nav" :disabled="!canScrollLeft" title="Scroll left" @click="scrollRail(-1)">‹</button>
          <button type="button" class="rail-nav" :disabled="!canScrollRight" title="Scroll right" @click="scrollRail(1)">›</button>
        </span>
      </header>

      <!-- One line, scrolled. A round is a sequence, so it reads as a strip —
           and a 40-game NBA day does not push the standings a screen down. -->
      <div v-if="roundGames.length" class="relative">
        <div ref="railEl" class="rail" @scroll.passive="syncRail">
          <LeagueFixtureCard
            v-for="g in roundGames"
            :key="g.id || `${g.home_name}-${g.away_name}`"
            :game="g"
            :show-day="!!roundSpansDays"
            class="rail-item"
          />
        </div>

        <span v-if="canScrollLeft" class="rail-fade rail-fade-l" />
        <span v-if="canScrollRight" class="rail-fade rail-fade-r" />
      </div>
      <p v-else class="px-4 py-10 text-center text-xs text-zinc-600">
        No fixtures in this {{ byDate ? 'day' : 'round' }}.
      </p>
    </section>

    <div class="grid lg:grid-cols-3 gap-3 sm:gap-4 items-start">
      <!-- ═══ 3. The table, carrying the twin's own view of each club ═════ -->
      <section v-if="twin" class="lg:col-span-2 panel overflow-hidden">
        <header class="panel-head">
          <h3 class="panel-title">Standings</h3>
          <span v-if="round" class="text-[10px] text-zinc-600 tabular-nums">as of {{ round.toLowerCase() }}</span>
          <span class="text-[10px] text-zinc-600 tabular-nums">{{ rows.length }} clubs</span>
          <span class="ml-auto text-[10px] text-zinc-600 hidden sm:inline">open a club for its twin</span>
        </header>

        <p v-if="!rows.length" class="px-4 py-10 text-center text-xs text-zinc-600">
          No table for this competition yet.
        </p>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs min-w-[760px]">
            <thead>
              <tr class="text-zinc-500">
                <th class="th w-9 text-center">#</th>
                <th class="th text-left">Club</th>
                <th class="th w-9">P</th>
                <th class="th w-9">W</th>
                <th class="th w-9">D</th>
                <th class="th w-9">L</th>
                <th class="th w-14">GF/GA</th>
                <th class="th w-10">GD</th>
                <th class="th w-12">Pts</th>
                <th class="th w-24 text-left">Form</th>
                <th class="th w-[92px] text-left" title="Twin attack rating — log-goals above the competition mean">Att</th>
                <th class="th w-[92px] text-left" title="Twin defence rating — log-goals conceded above the competition mean">Def</th>
                <th class="th w-14 text-right" title="Effective sample size behind the rating, after time decay">Eff n</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in rows"
                :key="r.key"
                class="tr"
                :class="[typeof r.pos === 'number' && r.pos % 2 === 0 ? 'bg-white/[0.015]' : '', qualClass(r.pos)]"
                @click="$router.push(`/team/${r.teamId}`)"
              >
                <td class="td text-center">
                  <span v-if="typeof r.pos === 'number'" class="posbox">{{ r.pos }}</span>
                  <span v-else class="text-zinc-700">—</span>
                </td>
                <td class="td">
                  <span class="club">
                    <img
                      v-if="r.teamKey"
                      :src="getTeamLogoUrl(r.teamKey)"
                      :alt="r.name"
                      class="club-logo"
                      loading="lazy"
                      @error="onLogoError"
                    />
                    <span v-else class="club-crest-txt" :style="{ background: crestBg(VIZ_HOME) }">{{ abbr(r.name) }}</span>
                    <span class="text-zinc-200 font-medium">{{ r.name }}</span>
                    <span v-if="r.moved" class="moved" title="Its rating was learned in another division">MOVED</span>
                  </span>
                </td>
                <td class="td text-center tabular-nums text-zinc-400">{{ r.GP }}</td>
                <td class="td text-center"><span class="wdl wdl-w">{{ r.W }}</span></td>
                <td class="td text-center"><span class="wdl wdl-d">{{ r.D }}</span></td>
                <td class="td text-center"><span class="wdl wdl-l">{{ r.L }}</span></td>
                <td class="td text-center tabular-nums text-zinc-300">{{ r.GFGA }}</td>
                <td class="td text-center tabular-nums font-bold"
                    :class="r.gdNum > 0 ? 'text-emerald-400' : r.gdNum < 0 ? 'text-red-400' : 'text-zinc-500'">{{ r.GD }}</td>
                <td class="td text-center bg-[#3987e5]/[0.08]"><span class="pts">{{ r.Pts }}</span></td>
                <td class="td">
                  <div v-if="r.form?.length" class="flex gap-0.5">
                    <span v-for="(f, i) in r.form" :key="i" class="formdot"
                      :class="f === 'W' ? 'bg-emerald-500' : f === 'D' ? 'bg-amber-500' : 'bg-red-500'">{{ f }}</span>
                  </div>
                  <span v-else class="text-zinc-700">—</span>
                </td>
                <!-- Diverging marks: a rating is signed, so it grows out of a
                     centre line rather than from the left edge. -->
                <td class="td"><RatingBar :value="r.attack" :scale="ratingScale" positive-good /></td>
                <td class="td"><RatingBar :value="r.defence" :scale="ratingScale" /></td>
                <td class="td text-right tabular-nums"
                    :class="(r.effectiveGames ?? 0) < 12 && r.attack != null ? 'text-amber-400' : 'text-zinc-500'">
                  {{ num(r.effectiveGames, 1) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="movedCount" class="px-3 py-2 border-t border-edge/40 text-[10px] text-amber-300/70 leading-relaxed">
          {{ movedCount }} club{{ movedCount === 1 ? '' : 's' }} carry a rating learned in another
          division — fixtures to distrust.
        </p>
      </section>

      <!-- Competitions with no twin keep their own table (basketball's ORtg /
           DRtg / pace columns have no equivalent here). -->
      <div v-else class="lg:col-span-2">
        <slot name="standings" />
      </div>

      <!-- ═══ 4. Right rail ═══════════════════════════════════════════════ -->
      <div class="space-y-3 sm:space-y-4">
        <!-- Latest picks -->
        <section class="panel">
          <header class="panel-head">
            <h3 class="panel-title">Latest picks</h3>
            <span class="text-[10px] text-zinc-600 tabular-nums">{{ picks.length }}</span>
            <span class="ml-auto text-[10px] text-zinc-600">this season</span>
          </header>

          <p v-if="!picks.length" class="px-4 py-6 text-center text-xs text-zinc-600">
            No wager on this competition this season.
          </p>

          <div v-else class="divide-y divide-edge/40">
            <NuxtLink
              v-for="p in picks"
              :key="p.id"
              :to="`/game/${p.gameId}`"
              class="pick"
            >
              <span class="pick-status" :class="statusClass(p.status)" />
              <div class="min-w-0 flex-1">
                <p class="text-[11px] text-zinc-200 truncate">{{ p.match }}</p>
                <p class="text-[10px] text-zinc-500 truncate mt-0.5">
                  W{{ p.walletId }} · {{ p.betType }} @ {{ p.odds }}
                  <span class="text-zinc-700">·</span> €{{ p.stake }}
                  <span v-if="p.isLeg" class="legtag" title="One leg of a parlay — not a wager on its own">LEG</span>
                </p>
              </div>
              <span class="text-[11px] font-semibold tabular-nums"
                    :class="p.profit == null ? 'text-zinc-600' : p.profit > 0 ? 'text-emerald-400' : p.profit < 0 ? 'text-red-400' : 'text-zinc-500'">
                {{ p.profit == null ? p.status : (p.profit > 0 ? '+' : '') + p.profit.toFixed(2) }}
              </span>
            </NuxtLink>
          </div>

          <!-- A list of wagers is a ledger read. An ROI over them is a
               performance claim, and this project's rule is that one never
               appears without its p-value — so it is not computed here. -->
          <p v-if="picks.length" class="px-3 py-2 border-t border-edge/40 text-[10px] text-zinc-600 leading-relaxed">
            Newest first. Rows marked LEG are parts of one parlay, not separate wagers.
            Wallet-level ROI and its p(luck) live on
            <NuxtLink to="/wallet" class="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">the wallet console</NuxtLink>.
          </p>
        </section>

        <!-- In and out -->
        <section v-if="twin" class="panel">
          <header class="panel-head">
            <h3 class="panel-title">In and out</h3>
            <span class="text-[10px] text-zinc-600 tabular-nums">{{ transitions.length }}</span>
          </header>

          <p v-if="!transitions.length" class="px-4 py-6 text-center text-xs text-zinc-600">
            No recorded move into or out of this competition.
          </p>

          <div v-else class="divide-y divide-edge/40 max-h-[420px] overflow-y-auto">
            <div
              v-for="(t, i) in transitions"
              :key="`${t.team_id}-${t.to_season}-${i}`"
              class="px-3 py-1.5 hover:bg-white/[0.03] cursor-pointer transition-colors"
              @click="$router.push(`/team/${t.team_id}`)"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] text-zinc-200 truncate">{{ t.name }}</span>
                <span class="inout" :class="t.to_league === leagueKey ? 'inout-in' : 'inout-out'">
                  {{ t.to_league === leagueKey ? 'IN' : 'OUT' }}
                </span>
              </div>
              <p class="text-[10px] text-zinc-600 truncate mt-0.5">
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
  </div>
</template>

<script setup>
/**
 * A competition's Overview — the twin and the fixtures it is fitted on, in one
 * pane.
 *
 * These were two tabs. That split asked the reader to hold the fitted level in
 * their head while they walked to the other tab to see who was playing, which is
 * the one thing the two views are for: the twin is what a competition IS, the
 * fixtures are what is happening in it.
 *
 * ⚠️ Nothing here is a price. Twins were scored against the closing line per
 * (league, market) and 55 of 56 cells came back negative — owner decision
 * 2026-08-21, do-not-do §2. They are context and a blind-spot warning, and must
 * never be rendered as an edge. The same rule governs the picks panel: it lists
 * wagers, it does not aggregate them into an ROI.
 */
import { computed, h, defineComponent, nextTick, onMounted, ref, watch } from 'vue'
import LeagueMetricCard from '~/components/league/LeagueMetricCard.vue'
import LeagueFixtureCard from '~/components/league/LeagueFixtureCard.vue'
import { VIZ_HOME, VIZ_STATUS } from '~/utils/viz'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

const props = defineProps({
  leagueKey: { type: String, required: true },
  twin: { type: Object, default: null },
  pending: { type: Boolean, default: false },
  clubs: { type: Array, default: () => [] },
  transitions: { type: Array, default: () => [] },
  /** Every fitted competition — the peer distribution behind each metric strip. */
  peers: { type: Array, default: () => [] },
  leagues: { type: Array, default: () => [] },
  /** Standings computed from fixtures, keyed by team_id. */
  standings: { type: Array, default: () => [] },
  /** The visible round's fixtures. */
  roundGames: { type: Array, default: () => [] },
  round: { type: String, default: '' },
  /** Paged by match day rather than by round — basketball, and cup football. */
  byDate: { type: Boolean, default: false },
  /** Every game of the season — the source for the picks panel. */
  allGames: { type: Array, default: () => [] },
  /**
   * The twin's club list is its roster NOW. Appending its unplayed members to
   * an archived season's table adds clubs that were never in that division —
   * on Premier League 2025/26 it rendered "23 clubs" for a 20-team league.
   */
  isCurrentSeason: { type: Boolean, default: true },
})

/* ── The round ─────────────────────────────────────────────────────────── */

const roundHeading = computed(() => {
  if (!props.byDate) return props.round || 'Round'
  const d = props.roundGames[0]?.date
  if (!d) return props.round || 'Match day'
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
})

const railEl = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function syncRail() {
  const el = railEl.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollRail(dir) {
  const el = railEl.value
  if (!el) return
  el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.8), behavior: 'smooth' })
}

onMounted(syncRail)
// A round change swaps the whole strip; the arrows must re-evaluate against the
// new width, after the DOM has it.
watch(() => props.roundGames, async () => {
  if (railEl.value) railEl.value.scrollLeft = 0
  await nextTick()
  syncRail()
})

const roundPlayed = computed(() => props.roundGames.filter(g => g.home_goals != null).length)
const roundPicks = computed(() => props.roundGames.filter(g => g.bets?.length).length)

/** Only worth showing the weekday per card when the round is not one day long. */
const roundSpansDays = computed(() => {
  const days = new Set(props.roundGames.map(g => (g.date || '').slice(0, 10)).filter(Boolean))
  if (days.size < 2) return ''
  const sorted = [...days].sort()
  const f = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${f(sorted[0])} – ${f(sorted[sorted.length - 1])}`
})

/* ── Standings merged with the twin ────────────────────────────────────── */

const twinById = computed(() => {
  const m = new Map()
  for (const c of props.clubs) m.set(c.team_id, c)
  return m
})

const rows = computed(() => {
  const seen = new Set()
  const out = []

  props.standings.forEach((s, i) => {
    const t = twinById.value.get(s.team_id)
    seen.add(s.team_id)
    out.push({
      key: s.team_id,
      teamId: s.team_id,
      pos: i + 1,
      name: s.name,
      teamKey: s.team_key || null,
      GP: s.GP ?? 0,
      W: s.W ?? 0,
      D: s.D ?? 0,
      L: s.L ?? 0,
      GFGA: `${s.GF ?? 0}/${s.GA ?? 0}`,
      GD: s.GD > 0 ? `+${s.GD}` : `${s.GD ?? 0}`,
      gdNum: Number(s.GD ?? 0),
      Pts: s.Pts ?? 0,
      form: s.form || [],
      attack: t?.attack ?? null,
      defence: t?.defence ?? null,
      effectiveGames: t?.effective_games ?? null,
      moved: !!t?.league_changed,
    })
  })

  // Rated clubs with no played fixture in this cut — promoted sides before a
  // ball is kicked. They belong on the page; they do not belong in the table's
  // ordering, so they are appended unranked. Only for the live season: in an
  // archive they are clubs from a roster that season never had.
  for (const c of props.isCurrentSeason ? props.clubs : []) {
    if (seen.has(c.team_id)) continue
    out.push({
      key: c.team_id,
      teamId: c.team_id,
      pos: '—',
      name: c.name,
      teamKey: null,
      GP: 0, W: 0, D: 0, L: 0,
      GFGA: '0/0', GD: '0', gdNum: 0, Pts: 0,
      form: [],
      attack: c.attack ?? null,
      defence: c.defence ?? null,
      effectiveGames: c.effective_games ?? null,
      moved: !!c.league_changed,
    })
  }

  return out
})

/** Symmetric scale so an attack bar and a defence bar are directly comparable. */
const ratingScale = computed(() => {
  const vals = rows.value
    .flatMap(r => [r.attack, r.defence])
    .filter(v => v != null)
    .map(v => Math.abs(Number(v)))
  const max = vals.length ? Math.max(...vals) : 1
  return max > 0 ? max : 1
})

const movedCount = computed(() => props.clubs.filter(c => c.league_changed).length)

/* ── Peer distributions ────────────────────────────────────────────────── */

/** Peers of the same kind only — a cup's level is not a league's level. */
const samePeers = computed(() =>
  props.peers.filter(p => !!p.is_cup === !!props.twin?.is_cup)
)

const peerScale = computed(() => ({
  level: samePeers.value.map(p => p.level),
  home_adv: samePeers.value.map(p => p.home_adv),
  spread: samePeers.value.map(p => p.spread),
  avg_goals: samePeers.value.map(p => p.avg_goals),
}))

const levelRank = computed(() => {
  if (!props.twin || props.twin.level == null) return null
  const ranked = samePeers.value
    .filter(p => p.level != null)
    .sort((a, b) => b.level - a.level)
  const pos = ranked.findIndex(p => p.league_key === props.leagueKey)
  return pos < 0 ? null : { pos: pos + 1, total: ranked.length }
})

/* ── Picks ─────────────────────────────────────────────────────────────── */

const picks = computed(() => {
  const out = []
  for (const g of props.allGames) {
    for (const b of g.bets || []) {
      out.push({
        id: b.id,
        gameId: g.id,
        match: `${g.home_name} v ${g.away_name}`,
        walletId: b.wallet_id,
        betType: b.bet_type,
        odds: Number(b.odds).toFixed(2),
        stake: Number(b.stake).toFixed(2),
        status: b.status,
        profit: b.profit == null ? null : Number(b.profit),
        date: g.date || '',
        // A `bets` row that belongs to a parlay is one LEG, not a wager, and
        // its profit is not money that moved on its own. Labelled here, never
        // silently summed — counting legs as wagers is what once reported W21
        // at -2.1% where its true figure is -76.8%.
        //
        // The test is membership of `parlay_legs`, not the wallet's archetype:
        // every legacy wallet (W12/19/20/21/25 included) has archetype NULL,
        // and wallet-meta.ts's static id map stops at 20 — so both of those
        // routes call W21's 364 legs "singles".
        isLeg: Array.isArray(b.parlay_legs) && b.parlay_legs.length > 0,
      })
    }
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10)
})

function statusClass(s) {
  if (s === 'won') return 'bg-emerald-500'
  if (s === 'lost') return 'bg-red-500'
  if (s === 'void') return 'bg-zinc-600'
  return 'bg-amber-500'
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

const leagueNames = computed(() => {
  const m = new Map()
  for (const l of props.leagues) m.set(l.key, l.name)
  return m
})

function leagueName(key) {
  if (!key) return '—'
  return leagueNames.value.get(key) || key.replace(/_/g, ' ')
}

function abbr(name) { return teamAbbreviation(name) }
function crestBg(hex) { return `${hex}26` }
function onLogoError(e) { e.target.style.display = 'none' }

/**
 * Qualification-zone left border: Champions League, Europa, Conference.
 * A knockout cup has no qualification places, so it gets no stripes — the
 * table there is a summary of runs, not a ladder anyone finishes on.
 */
function qualClass(pos) {
  if (props.twin?.is_cup) return ''
  if (typeof pos !== 'number') return ''
  if (pos <= 4) return 'qual-ucl'
  if (pos <= 6) return 'qual-uel'
  if (pos <= 8) return 'qual-uecl'
  return ''
}

function num(v, dp) {
  if (v == null) return '—'
  const n = Number(v)
  if (Object.is(n, -0)) return (0).toFixed(dp)
  return n.toFixed(dp)
}

/**
 * A signed rating, drawn as a diverging bar out of a centre line. Sequential
 * bars from the left edge would say "bigger is more", which is wrong for a
 * quantity whose sign is the point.
 *
 * Styled inline, not with a class: `<style scoped>` stamps its data attribute
 * onto elements in THIS component's template, and a render function declared
 * beside it is a different component — its nodes never get the attribute, so
 * every scoped rule silently misses. The first cut of this rendered bare
 * numbers with no bar at all.
 */
const RatingBar = defineComponent({
  props: {
    value: { type: [Number, String, null], default: null },
    scale: { type: Number, required: true },
    positiveGood: { type: Boolean, default: false },
  },
  setup(p) {
    return () => {
      if (p.value == null) {
        return h('span', { style: { fontSize: '0.7rem', color: 'rgb(90,92,100)' } }, '—')
      }
      const v = Number(p.value)
      const w = Math.min(50, (Math.abs(v) / p.scale) * 50)
      const good = p.positiveGood ? v > 0 : v < 0
      const color = good ? VIZ_STATUS.good : VIZ_HOME

      return h('span', {
        style: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
        title: v.toFixed(3),
      }, [
        h('span', {
          style: {
            position: 'relative',
            flex: '1 1 auto',
            minWidth: '2.4rem',
            height: '0.4rem',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.05)',
          },
        }, [
          // Centre line — the baseline the sign is measured from.
          h('span', {
            style: {
              position: 'absolute',
              left: '50%',
              top: '-1px',
              bottom: '-1px',
              width: '1px',
              background: 'rgba(255,255,255,0.16)',
            },
          }),
          h('span', {
            style: {
              position: 'absolute',
              top: 0,
              bottom: 0,
              borderRadius: '2px',
              background: color,
              width: `${w}%`,
              left: v >= 0 ? '50%' : `${50 - w}%`,
            },
          }),
        ]),
        h('span', {
          style: {
            fontSize: '0.62rem',
            color: 'rgb(140,143,152)',
            fontVariantNumeric: 'tabular-nums',
            width: '2.1rem',
            textAlign: 'right',
            flexShrink: 0,
          },
        }, v.toFixed(2)),
      ])
    }
  },
})
</script>

<style scoped>
.panel {
  border-radius: 0.5rem;
  background: #1c1f27;
  border: 1px solid #2a2f3a;
}
.panel-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid #2a2f3a;
  background: rgba(37, 40, 48, 0.3);
}
.panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgb(212, 212, 216);
}

.pill {
  padding: 0.06rem 0.4rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.pill-blue { background: rgba(57, 135, 229, 0.18); color: #8fbdf5; }
.pill-amber { background: rgba(250, 178, 25, 0.16); color: #f0c469; }
.pill-dim { background: rgba(255, 255, 255, 0.06); color: rgb(140, 143, 152); }

.rail {
  display: flex;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}
.rail::-webkit-scrollbar { display: none; }
.rail-item {
  flex: 0 0 auto;
  width: 158px;
  scroll-snap-align: start;
}

.rail-nav {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.35rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgb(180, 183, 191);
  font-size: 0.8rem;
  line-height: 1;
  transition: background 140ms ease, color 140ms ease;
}
.rail-nav:hover:not(:disabled) { background: rgba(57, 135, 229, 0.3); color: #fff; }
.rail-nav:disabled { opacity: 0.25; cursor: not-allowed; }

/* The fade says "there is more" without adding a control. */
.rail-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2.5rem;
  pointer-events: none;
}
.rail-fade-l { left: 0; background: linear-gradient(90deg, rgba(28, 31, 39, 0.95), rgba(28, 31, 39, 0)); }
.rail-fade-r { right: 0; background: linear-gradient(270deg, rgba(28, 31, 39, 0.95), rgba(28, 31, 39, 0)); }

.th {
  padding: 0.4rem 0.5rem;
  font-weight: 600;
  font-size: 0.62rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-align: center;
}
.td { padding: 0.35rem 0.5rem; }
.tr {
  border-bottom: 1px solid rgba(42, 47, 58, 0.4);
  cursor: pointer;
  transition: background 140ms ease;
}
.tr:hover { background: rgba(57, 135, 229, 0.08); }

.qual-ucl { box-shadow: inset 2px 0 0 rgba(12, 163, 12, 0.8); }
.qual-uel { box-shadow: inset 2px 0 0 rgba(57, 135, 229, 0.7); }
.qual-uecl { box-shadow: inset 2px 0 0 rgba(250, 178, 25, 0.6); }

.posbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.65rem;
  font-weight: 700;
  color: rgb(228, 231, 236);
  font-variant-numeric: tabular-nums;
}
.club { display: inline-flex; align-items: center; gap: 0.45rem; }
.club-logo {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
  flex-shrink: 0;
}
.club-crest-txt {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.28rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  font-weight: 800;
  color: rgb(200, 203, 210);
  flex-shrink: 0;
}
.moved {
  padding: 0.05rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.55rem;
  font-weight: 700;
  background: rgba(250, 178, 25, 0.15);
  color: #f0c469;
}
.wdl {
  display: inline-block;
  min-width: 1.3rem;
  padding: 0.05rem 0.3rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.wdl-w { color: #6fd36f; background: rgba(12, 163, 12, 0.16); }
.wdl-d { color: #f0c469; background: rgba(250, 178, 25, 0.14); }
.wdl-l { color: #e88b8b; background: rgba(208, 59, 59, 0.16); }
.pts {
  display: inline-block;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: rgba(57, 135, 229, 0.2);
  color: #a9cdf8;
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.formdot {
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-weight: 700;
  color: #fff;
}


.pick {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.8rem;
  transition: background 140ms ease;
}
.pick:hover { background: rgba(255, 255, 255, 0.03); }
.pick-status {
  width: 0.35rem;
  height: 1.6rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.inout {
  padding: 0.03rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.55rem;
  font-weight: 700;
  flex-shrink: 0;
}
.legtag {
  margin-left: 0.25rem;
  padding: 0 0.2rem;
  border-radius: 0.2rem;
  font-size: 0.5rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.07);
  color: rgb(140, 143, 152);
}

.inout-in { background: rgba(12, 163, 12, 0.16); color: #6fd36f; }
.inout-out { background: rgba(255, 255, 255, 0.06); color: rgb(140, 143, 152); }

@media (prefers-reduced-motion: reduce) {
  }
</style>
