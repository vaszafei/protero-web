<template>
  <div class="space-y-2.5 sm:space-y-4">
    <!-- ===== ODDS SECTION ===== -->
    <div v-if="showOdds && hasOdds" class="space-y-2.5 sm:space-y-3">
      <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Betting Odds</h4>
      
      <!-- Moneyline -->
      <div class="grid gap-1" :class="isBball ? 'grid-cols-2' : 'grid-cols-3'">
        <div class="odds-cell">
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Home</span>
          <span class="text-lg font-bold tabular-nums" :class="homeOddsFavorite ? 'text-green-400' : 'text-zinc-200'">
            {{ formatOdds(mlOdds.home) }}
          </span>
        </div>
        <div v-if="!isBball" class="odds-cell">
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Draw</span>
          <span class="text-lg font-bold text-zinc-200 tabular-nums">{{ formatOdds(mlOdds.draw) }}</span>
        </div>
        <div class="odds-cell">
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Away</span>
          <span class="text-lg font-bold tabular-nums" :class="awayOddsFavorite ? 'text-green-400' : 'text-zinc-200'">
            {{ formatOdds(mlOdds.away) }}
          </span>
        </div>
      </div>

      <!-- Basketball Extra Odds (Spread & O/U) -->
      <template v-if="isBball && bballOdds">
        <div v-if="bballOdds.handicap" class="grid grid-cols-2 gap-1">
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Spread H</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ spreadHomeSign }}{{ Math.abs(bballOdds.handicap.line) }}</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ formatOdds(bballOdds.handicap.home) }}</span>
            </div>
          </div>
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Spread A</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ spreadAwaySign }}{{ Math.abs(bballOdds.handicap.line) }}</span>
              <span class="text-[11px] text-zinc-400 tabular-nums">{{ formatOdds(bballOdds.handicap.away) }}</span>
            </div>
          </div>
        </div>

        <div v-if="bballOdds.over_under" class="grid grid-cols-2 gap-1">
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Over</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ bballOdds.over_under.line }}</span>
              <span class="text-[11px] tabular-nums text-zinc-400">{{ formatOdds(bballOdds.over_under.over) }}</span>
            </div>
          </div>
          <div class="odds-cell">
            <span class="text-[10px] text-zinc-500 font-medium uppercase">Under</span>
            <div class="flex flex-col items-center">
              <span class="text-sm font-bold text-zinc-200 tabular-nums">{{ bballOdds.over_under.line }}</span>
              <span class="text-[11px] tabular-nums text-zinc-400">{{ formatOdds(bballOdds.over_under.under) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Football O/U -->
      <div v-if="!isBball && (game.odds_over || game.odds_under)" class="grid grid-cols-2 gap-1">
        <div class="odds-cell">
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Over 2.5</span>
          <span class="text-lg font-bold tabular-nums text-zinc-200">{{ formatOdds(game.odds_over) }}</span>
        </div>
        <div class="odds-cell">
          <span class="text-[10px] text-zinc-500 font-medium uppercase">Under 2.5</span>
          <span class="text-lg font-bold tabular-nums text-zinc-200">{{ formatOdds(game.odds_under) }}</span>
        </div>
      </div>
    </div>

    <!-- No odds: one line, not a screen-wide empty state. -->
    <p v-else-if="showOdds" class="an-noodds">No odds stored for this fixture — nothing to price against yet.</p>

    <!-- One screen, four columns: each club's form, the meetings between
         them, and the match context. Correlations run underneath as a strip.
         (Desktop operator page — sized to read without scrolling.) -->
    <div class="an-grid" :class="showOdds && hasOdds ? 'border-t border-edge/50 pt-3 mt-3' : ''">
      <!-- Recent form, one card per club -->
      <section v-for="side in formSides" :key="side.key" class="an-card">
        <header class="an-card-head">
          <span class="an-card-title" :style="{ color: side.color }">{{ side.name }}</span>
          <span class="an-card-meta tabular-nums">{{ side.w }}W {{ side.d }}D {{ side.l }}L · {{ side.gf }}–{{ side.ga }}</span>
        </header>
        <p class="an-card-sub">Last {{ side.entries.length }} completed, any competition</p>
        <div v-for="e in side.entries" :key="e.game_id" class="an-form-row">
          <span class="an-form-date tabular-nums">{{ formatH2HDate(e.date) }}</span>
          <span class="an-form-venue">{{ e.home ? 'H' : 'A' }}</span>
          <span class="an-form-opp">{{ e.opponent }}</span>
          <span class="an-form-score tabular-nums">{{ e.gf }}–{{ e.ga }}</span>
          <span :class="['form-pill', e.result === 'W' ? 'form-w' : e.result === 'L' ? 'form-l' : 'form-d']">{{ e.result }}</span>
        </div>
      </section>

      <!-- Head to head -->
      <section class="an-card">
        <header class="an-card-head">
          <span class="an-card-title">Head to head</span>
          <span v-if="h2hScoring" class="an-card-meta tabular-nums">{{ h2hScoring.n }} since {{ formatH2HDate(h2hScoring.first_date) }}</span>
        </header>

        <div v-if="h2hLoading" class="an-empty">Loading…</div>

        <template v-else-if="completedH2HMatches.length > 0">
          <template v-if="completedH2HMatches.length >= 2">
            <div class="an-h2h-bar">
              <div class="h2h-home" :style="{ width: homeWinPct + '%' }"><span v-if="homeWinPct >= 15">{{ h2h.summary.homeTeamWins }}</span></div>
              <div v-if="h2h.summary.draws > 0" class="h2h-draw" :style="{ width: drawPct + '%' }"><span v-if="drawPct >= 12">{{ h2h.summary.draws }}</span></div>
              <div class="h2h-away" :style="{ width: awayWinPct + '%' }"><span v-if="awayWinPct >= 15">{{ h2h.summary.awayTeamWins }}</span></div>
            </div>
            <div class="an-kv-row">
              <span>{{ isBball ? 'Points' : 'Goals' }} / game <b class="tabular-nums">{{ h2hAvgGoals }}</b></span>
              <span :style="{ color: VIZ_HOME }">{{ shortName(game.home_name) }} <b class="tabular-nums">{{ h2hHomeGoals }}</b></span>
              <span :style="{ color: VIZ_AWAY }">{{ shortName(game.away_name) }} <b class="tabular-nums">{{ h2hAwayGoals }}</b></span>
            </div>
          </template>
          <div v-for="match in completedH2HMatches.slice(0, 7)" :key="match.id || match.date" class="an-h2h-row">
            <span class="an-form-date tabular-nums">{{ formatH2HDate(match.date) }}</span>
            <span class="an-h2h-team" :class="match.home_team?.name === game.home_name ? 'an-strong' : ''">{{ match.home_team?.name }}</span>
            <span class="an-h2h-score tabular-nums" :class="resultColor(match)">{{ match.home_goals }}–{{ match.away_goals }}</span>
            <span class="an-h2h-team an-right" :class="match.away_team?.name === game.away_name ? 'an-strong' : ''">{{ match.away_team?.name }}</span>
          </div>
        </template>

        <div v-else class="an-empty">No meetings on record</div>
      </section>

      <!-- Match context -->
      <section v-if="timeContext || trends || competition" class="an-card">
        <header class="an-card-head"><span class="an-card-title">Match context</span></header>
        <dl class="an-dl">
          <template v-if="timeContext">
            <dt>Kickoff</dt>
            <dd>{{ timeContext.kickoff.day_of_week }} {{ kickoffLocal }}</dd>
            <dt>Rest days</dt>
            <dd class="tabular-nums">
              <span :style="{ color: VIZ_HOME }">{{ formatRestDays(timeContext.rest_days.home) }}</span>
              <span class="an-sep">/</span>
              <span :style="{ color: VIZ_AWAY }">{{ formatRestDays(timeContext.rest_days.away) }}</span>
            </dd>
            <template v-if="hasCongestion">
              <dt>Games, last 10 days</dt>
              <dd class="tabular-nums">
                <span :style="{ color: VIZ_HOME }">{{ timeContext.congestion_10d.home ?? '-' }}</span>
                <span class="an-sep">/</span>
                <span :style="{ color: VIZ_AWAY }">{{ timeContext.congestion_10d.away ?? '-' }}</span>
              </dd>
            </template>
          </template>
          <template v-if="trends && trends.status === 'available'">
            <dt>League home wins</dt>
            <dd class="tabular-nums">{{ (trends.home_win_rate * 100).toFixed(1) }}% <span class="an-n">n={{ trends.n }}</span></dd>
            <dt>League {{ isBball ? 'avg total' : 'goals / game' }}</dt>
            <dd class="tabular-nums">{{ trends.avg_total_score }} <span class="an-n">n={{ trends.n }}</span></dd>
          </template>
          <template v-else-if="trends">
            <dt>League trend</dt>
            <dd class="an-n">sample too small (n={{ trends.n }})</dd>
          </template>
        </dl>
        <div v-if="competition" class="an-pills">
          <span class="competition-pill">{{ formatLabel(competition.format) }}</span>
          <span class="competition-pill">{{ competition.season_convention === 'calendar_year' ? 'Calendar-year season' : 'Cross-year season' }}</span>
          <span v-if="competition.two_legged" class="competition-pill">Two legs</span>
          <span v-if="competition.extra_time" class="competition-pill">Extra time</span>
          <span v-if="competition.penalties" class="competition-pill">Penalties</span>
          <span v-if="competition.away_goals_rule" class="competition-pill">Away goals</span>
          <span v-if="competition.periods" class="competition-pill">{{ competition.periods }} × {{ competition.period_length }}min</span>
          <span v-if="competition.ot_rules" class="competition-pill">{{ competition.ot_rules }}</span>
        </div>
      </section>

      <!-- Same-game correlations — a strip, not a wall -->
      <section v-if="correlations && correlations.status === 'available'" class="an-card an-span-all">
        <header class="an-card-head">
          <span class="an-card-title">Same-game correlations</span>
          <span class="an-card-meta">Monte-Carlo sim of this fixture, not a price</span>
        </header>
        <div class="an-chips">
          <span v-for="(p, leg) in correlations.marginals" :key="leg" class="an-chip">
            <span class="an-chip-k">{{ leg }}</span>
            <b class="tabular-nums">{{ p == null ? '-' : (p * 100).toFixed(1) + '%' }}</b>
          </span>
        </div>
        <div class="an-chips mt-1.5">
          <span v-for="j in correlations.joints" :key="j.legs.join('+')" class="an-chip an-chip-joint">
            <span class="an-chip-k">{{ j.legs.join(' + ') }}</span>
            <b class="tabular-nums">{{ j.joint_p == null ? '-' : (j.joint_p * 100).toFixed(1) + '%' }}</b>
          </span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import { displayTeamName as shortName } from '~/utils/team-name'

const props = defineProps({
  game: { type: Object, required: true },
  sport: { type: String, default: 'football' },
  // The unified per-fixture analysis record (`/api/game/[id]/analysis`) — h2h,
  // predicted score and pace/trend all come from here now, server-computed by
  // team_id, instead of a browser-side by-name Supabase query. See
  // `docs/plans/unified-analysis-layer.md` §4 (Track C).
  analysis: { type: Object, default: null },
  analysisLoading: { type: Boolean, default: false },
  // Football's odds now live in the dedicated Market tab (OddsLadder), so the
  // odds section here renders only for basketball.
  showOdds: { type: Boolean, default: true }
})

const isBball = computed(() => props.sport === 'basketball')
const h2hLoading = computed(() => props.analysisLoading)

// Adapter onto the server's `analysis.h2h` shape — keeps every computed below
// (and the template's bare `h2h.summary.*` bindings) unchanged.
const h2h = computed(() => {
  const a = props.analysis?.h2h
  if (!a) return null
  return {
    summary: {
      totalMatches: a.summary.total_matches,
      homeTeamWins: a.summary.home_wins,
      awayTeamWins: a.summary.away_wins,
      draws: a.summary.draws,
    },
    matches: a.matches,
  }
})

// ─── Odds ────────────────────────────────────────────────
const bballOdds = computed(() => props.game.sport_stats?.odds || null)

const spreadHomeSign = computed(() => {
  const line = bballOdds.value?.handicap?.line
  if (!line || line === 0) return ''
  return line < 0 ? '-' : '+'
})
const spreadAwaySign = computed(() => {
  const line = bballOdds.value?.handicap?.line
  if (!line || line === 0) return ''
  return line < 0 ? '+' : '-'
})

const mlOdds = computed(() => {
  if (isBball.value && bballOdds.value?.moneyline) {
    return {
      home: bballOdds.value.moneyline.home,
      away: bballOdds.value.moneyline.away,
      draw: null
    }
  }
  return {
    home: props.game.odds_home,
    draw: props.game.odds_draw,
    away: props.game.odds_away
  }
})

const hasOdds = computed(() => mlOdds.value.home || mlOdds.value.away)

const homeOddsFavorite = computed(() => {
  if (!mlOdds.value.home || !mlOdds.value.away) return false
  return mlOdds.value.home < mlOdds.value.away
})

const awayOddsFavorite = computed(() => {
  if (!mlOdds.value.home || !mlOdds.value.away) return false
  return mlOdds.value.away < mlOdds.value.home
})

function formatOdds(v) {
  if (!v) return '-'
  return Number(v).toFixed(2)
}

// ─── H2H ─────────────────────────────────────────────────
const homeWinPct = computed(() => {
  if (!h2h.value?.summary?.totalMatches) return 0
  return Math.round((h2h.value.summary.homeTeamWins / h2h.value.summary.totalMatches) * 100)
})

const awayWinPct = computed(() => {
  if (!h2h.value?.summary?.totalMatches) return 0
  return Math.round((h2h.value.summary.awayTeamWins / h2h.value.summary.totalMatches) * 100)
})

const drawPct = computed(() => {
  if (!h2h.value?.summary?.totalMatches) return 0
  return 100 - homeWinPct.value - awayWinPct.value
})

const completedH2HMatches = computed(() => {
  // The server already filters to completed meetings (`not home_goals is null`).
  return h2h.value?.matches || []
})

const h2hAvgGoals = computed(() => {
  const m = completedH2HMatches.value
  if (!m.length) return '-'
  const total = m.reduce((s: number, g: any) => s + Number(g.home_goals) + Number(g.away_goals), 0)
  return (total / m.length).toFixed(1)
})

const h2hHomeGoals = computed(() => {
  const m = completedH2HMatches.value
  if (!m.length) return '-'
  const total = m.reduce((s: number, g: any) => {
    const isHome = g.home_team?.name === props.game.home_name
    return s + (isHome ? Number(g.home_goals) : Number(g.away_goals))
  }, 0)
  return (total / m.length).toFixed(1)
})

const h2hAwayGoals = computed(() => {
  const m = completedH2HMatches.value
  if (!m.length) return '-'
  const total = m.reduce((s: number, g: any) => {
    const isHome = g.home_team?.name === props.game.home_name
    return s + (isHome ? Number(g.away_goals) : Number(g.home_goals))
  }, 0)
  return (total / m.length).toFixed(1)
})

function formatH2HDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function resultColor(match: any) {
  if (!props.game) return 'text-zinc-300'
  const isHome = match.home_team?.name === props.game.home_name
  const homeGoals = isHome ? match.home_goals : match.away_goals
  const awayGoals = isHome ? match.away_goals : match.home_goals
  if (homeGoals > awayGoals) return 'text-green-400'
  if (homeGoals < awayGoals) return 'text-red-400'
  return 'text-zinc-400'
}

// ─── Recent form / H2H scoring ──────────────────────────────
// `analysis.form` is built server-side by team_id (server/utils/team-form.ts).
// The old "Model Outlook · Predicted score" here was a head-to-head average
// tilted by a win probability — never a model output. The market's own
// expectation is on the Prediction tab.
const h2hScoring = computed(() => props.analysis?.derived?.h2h_scoring || null)

const formN = computed(() => Math.max(
  props.analysis?.form?.home?.entries?.length || 0,
  props.analysis?.form?.away?.entries?.length || 0,
))

const formSides = computed(() => {
  const f = props.analysis?.form
  if (!f || f.status === 'not_applicable') return []
  return (['home', 'away'] as const)
    .map((k) => {
      const entries = f[k]?.entries || []
      const sum = (fn: (e: any) => number) => entries.reduce((a: number, e: any) => a + fn(e), 0)
      return {
        key: k,
        name: k === 'home' ? props.game.home_name : props.game.away_name,
        color: k === 'home' ? VIZ_HOME : VIZ_AWAY,
        entries,
        w: entries.filter((e: any) => e.result === 'W').length,
        d: entries.filter((e: any) => e.result === 'D').length,
        l: entries.filter((e: any) => e.result === 'L').length,
        gf: sum((e) => Number(e.gf)),
        ga: sum((e) => Number(e.ga)),
      }
    })
    .filter((s) => s.entries.length)
})

// The header shows kickoff in local time; this tab used to show UTC beside it.
const kickoffLocal = computed(() => {
  if (!props.game?.date) return '-'
  return new Date(props.game.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
})

// ─── Schedule Context / League Trends ─────────────────────
// Both blocks are computed server-side in `analysis.time_context` /
// `analysis.trends` (Track C) — this just renders them.
const timeContext = computed(() => {
  const tc = props.analysis?.time_context
  return tc && tc.status === 'available' ? tc : null
})

const trends = computed(() => props.analysis?.trends || null)

const hasCongestion = computed(() => {
  const c = timeContext.value?.congestion_10d
  return !!c && (c.home != null || c.away != null)
})

function formatRestDays(d: number | null) {
  return d == null ? '-' : `${d}d`
}


// ─── Competition Format ────────────────────────────────────
// `analysis.competition` (Track B's `competition_rules` registry, read-only).
const competition = computed(() => {
  const c = props.analysis?.competition
  return c && c.status === 'available' ? c : null
})

const FORMAT_LABELS: Record<string, string> = {
  league: 'League',
  knockout: 'Knockout',
  group_knockout: 'Group + Knockout',
  playoff: 'Playoff',
}

function formatLabel(format: string) {
  return FORMAT_LABELS[format] || format
}

// ─── Same-Game Correlations ─────────────────────────────────
// `analysis.correlations` (Track C, ml/slips/slip_sim.py Monte-Carlo sim,
// computed live per request — football only). Descriptive only (C2):
// never a price, never feeds a mask or a stake.
const correlations = computed(() => props.analysis?.correlations || null)
</script>

<style scoped>
.odds-cell {
  @apply bg-surface-light rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5;
}


.h2h-home {
  background: var(--viz-home);
}
.h2h-draw {
  background: #404654;
}
.h2h-away {
  background: var(--viz-away);
}

/* Form pills */
.form-pill {
  @apply inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold;
}
.form-w {
  background: rgba(52, 211, 153, 0.25);
  color: #34d399;
}
.form-l {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
}
.form-d {
  background: rgba(161, 161, 170, 0.25);
  color: #d4d4d8;
}

/* ── Grid of cards ── */
.an-grid { display: grid; gap: 0.65rem; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
@media (min-width: 1280px) { .an-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.an-span-all { grid-column: 1 / -1; }
.an-card {
  min-width: 0;
  border-radius: var(--r); border: 1px solid var(--edge-soft); background: rgba(255, 255, 255, 0.02);
  padding: 0.55rem 0.75rem 0.6rem;
}
.an-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.2rem; }
.an-card-title {
  font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.an-card-meta { font-size: 0.72rem; color: var(--ink-mute); white-space: nowrap; }
.an-card-sub { font-size: 0.68rem; color: var(--ink-faint); margin-bottom: 0.2rem; }
.an-empty { font-size: 0.75rem; color: var(--ink-mute); padding: 1.2rem 0; text-align: center; }

.an-form-row {
  display: grid; grid-template-columns: 4.1rem 1rem minmax(0, 1fr) auto 1.25rem;
  align-items: center; gap: 0.4rem;
  padding: 0.28rem 0; border-top: 1px solid var(--edge-soft);
  font-size: 0.78rem;
}
.an-form-date { color: var(--ink-faint); font-size: 0.72rem; }
.an-form-venue { color: var(--ink-mute); font-size: 0.7rem; font-weight: 700; text-align: center; }
.an-form-opp { color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-form-score { color: var(--ink-strong); font-weight: 700; text-align: right; white-space: nowrap; }
.an-noodds { font-size: 0.75rem; color: var(--ink-mute); margin-bottom: 0.6rem; }

.an-h2h-bar {
  display: flex; height: 18px; gap: 2px; border-radius: var(--r-sm); overflow: hidden; margin: 0.35rem 0;
  font-size: 0.66rem; font-weight: 800; color: #fff;
}
.an-h2h-bar > div { display: flex; align-items: center; justify-content: center; }
.an-kv-row { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.72rem; color: var(--ink-mute); margin-bottom: 0.3rem; }
.an-kv-row > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.an-kv-row b { color: var(--ink-strong); margin-left: 0.2rem; }
.an-h2h-row {
  display: grid; grid-template-columns: 4.1rem minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center; gap: 0.4rem;
  padding: 0.26rem 0; border-top: 1px solid var(--edge-soft); font-size: 0.76rem;
}
.an-h2h-team { color: var(--ink-mute); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-h2h-score { text-align: center; font-weight: 800; white-space: nowrap; }
.an-right { text-align: right; }
.an-strong { color: var(--ink); }

.an-dl { display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 0.75rem; margin: 0.35rem 0 0.5rem; font-size: 0.78rem; }
.an-dl dt { color: var(--ink-mute); }
.an-dl dd { color: var(--ink-strong); font-weight: 700; text-align: right; }
.an-sep { color: var(--ink-faint); margin: 0 0.3rem; font-weight: 400; }
.an-n { color: var(--ink-faint); font-weight: 500; font-size: 0.7rem; margin-left: 0.25rem; }
.an-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; padding-top: 0.45rem; border-top: 1px solid var(--edge-soft); }

.an-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.3rem; }
.an-chip {
  display: inline-flex; align-items: baseline; gap: 0.45rem;
  padding: 0.25rem 0.55rem; border-radius: var(--r-pill);
  border: 1px solid var(--edge); background: rgba(255, 255, 255, 0.02); font-size: 0.74rem;
}
.an-chip-k { color: var(--ink-mute); }
.an-chip b { color: var(--ink-strong); }
.an-chip-joint { border-color: var(--brand-blue-edge); background: var(--brand-blue-tint); }

/* Competition format pills */
.competition-pill {
  @apply bg-surface-light rounded-full px-2 py-0.5 text-[11px] font-medium text-zinc-300;
}
</style>
