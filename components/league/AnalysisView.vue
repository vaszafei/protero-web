<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- LOADING -->
    <div v-if="pending && !data" class="panel p-6 flex items-center justify-center text-zinc-500 text-sm">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin mr-2" />
      Loading league analysis…
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="panel p-4 text-sm text-red-400">
      Failed to load analysis: {{ error.message || error }}
    </div>

    <!-- EMPTY -->
    <div v-else-if="!hasGames" class="panel px-4 py-10 text-center">
      <p class="text-sm text-zinc-300 font-medium">Nothing has been played yet.</p>
      <p class="text-xs text-zinc-500 mt-1">Every figure on this tab is computed from completed fixtures.</p>
    </div>

    <template v-else>
      <!-- Small-sample banner. A rate over four matches is not a league
           tendency, and this page will happily render "100% home win" off one
           game unless it says otherwise. -->
      <div v-if="thin" class="thin-note">
        <span class="thin-dot" />
        <p>
          <span class="font-semibold text-amber-200">{{ km.games }} completed
            {{ Number(km.games) === 1 ? 'game' : 'games' }}</span>
          — every percentage below is one or two matches wide. Read them as counts, not as rates.
        </p>
      </div>

      <!-- ═══ 1. Key metrics ══════════════════════════════════════════════ -->
      <section class="panel">
        <header class="panel-head">
          <h3 class="panel-title">Key metrics</h3>
          <span class="text-[10px] text-zinc-600 tabular-nums">{{ km.games }} completed</span>
        </header>
        <div class="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div v-for="m in metrics" :key="m.label" class="tile">
            <span class="tile-label">{{ m.label }}</span>
            <span class="tile-value" :class="thin ? 'text-zinc-400' : 'text-zinc-50'">{{ m.value }}</span>
            <!-- A rate gets a meter; a raw count does not (there is no whole
                 for it to be a part of). -->
            <span v-if="m.pct != null" class="tile-meter">
              <span class="tile-meter-fill" :style="{ width: m.pct + '%', background: m.color }" />
            </span>
            <span v-else class="tile-foot">{{ m.foot }}</span>
          </div>
        </div>
      </section>

      <div class="grid gap-3 sm:gap-4 items-start lg:grid-cols-12">
        <!-- ═══ 2. Distribution ═══════════════════════════════════════════ -->
        <section v-if="dist.length" class="panel lg:col-span-3">
          <header class="panel-head">
            <h3 class="panel-title">{{ isBball ? 'Score distribution' : 'Goals distribution' }}</h3>
            <span class="text-[10px] text-zinc-600">{{ isBball ? 'games by total points' : 'matches by total goals' }}</span>
          </header>
          <div class="p-3">
            <div class="hist">
              <div v-for="bar in dist" :key="bar.label" class="hist-col" :title="`${bar.label}: ${bar.count} (${bar.pct}%)`">
                <span class="hist-cap" :class="bar.count === maxCount ? 'text-zinc-300' : 'text-transparent'">{{ bar.count }}</span>
                <span class="hist-bar" :style="{ height: barHeight(bar.count) + 'px', background: barColor(bar.count) }" />
                <span class="hist-tick">{{ bar.label }}</span>
              </div>
            </div>
            <p class="mt-2 text-[10px] text-zinc-600">
              Tallest bar labelled; hover any column for its count and share.
            </p>
          </div>
        </section>

        <!-- ═══ 3. Home vs away ═══════════════════════════════════════════
             Brand blue/red (the wordmark's own two colours), not the general
             chart categorical pair — this is explicitly "the two sides of
             this app", where the other charts on the page are magnitude/
             identity encodings with no inherent tie to the brand. -->
        <section v-if="ha" class="panel lg:col-span-3">
          <header class="panel-head">
            <h3 class="panel-title">Home vs away</h3>
            <!-- Two series, so a legend is always present — identity never
                 rests on colour alone. -->
            <span class="ml-auto flex items-center gap-3">
              <span class="lg"><span class="lg-key" :style="{ background: VIZ_BRAND_HOME }" />Home</span>
              <span class="lg"><span class="lg-key" :style="{ background: VIZ_BRAND_AWAY }" />Away</span>
            </span>
          </header>
          <div class="p-3 space-y-3">
            <div v-for="row in haRows" :key="row.label">
              <div class="flex items-baseline justify-between mb-1">
                <span class="text-[11px] font-medium text-zinc-300">{{ row.label }}</span>
                <span class="text-[10px] text-zinc-500 tabular-nums">{{ row.home }} · {{ row.away }}</span>
              </div>
              <div class="split">
                <span class="split-seg" :style="{ width: row.homePct + '%', background: VIZ_BRAND_HOME }">
                  <span v-if="row.homePct >= 18" class="split-val">{{ row.home }}</span>
                </span>
                <span class="split-seg split-seg-r" :style="{ width: (100 - row.homePct) + '%', background: VIZ_BRAND_AWAY }">
                  <span v-if="row.homePct <= 82" class="split-val">{{ row.away }}</span>
                </span>
              </div>
            </div>
            <p v-if="!isBball && ha.draws" class="text-[10px] text-zinc-600 pt-1">
              {{ ha.draws.count }} draws ({{ ha.draws.pct }}%) — not in the split above.
            </p>
          </div>
        </section>

        <!-- ═══ 4. Scoring trend ═════════════════════════════════════════
             One 12-column grid across the whole tab: Goals distribution 3,
             Home vs away 3, Scoring trend 6 — one row. Market calibration 6,
             Top scorers 3, Form 3 — the next. Columns align vertically
             because every card shares one grid. -->
        <section v-if="trends.length" class="panel lg:col-span-6">
          <header class="panel-head">
            <h3 class="panel-title">Scoring trend</h3>
            <span class="text-[10px] text-zinc-600">{{ isBball ? 'avg points by game day' : 'avg goals by round' }}</span>
          </header>
          <div v-if="!isBball" class="px-3 pt-2 flex items-center gap-3">
            <span class="lg"><span class="lg-key" :style="{ background: VIZ_HOME }" />Avg goals</span>
            <span class="lg"><span class="lg-key" :style="{ background: VIZ_AWAY }" />Over 2.5%</span>
            <span class="lg"><span class="lg-key" :style="{ background: VIZ_CAT2 }" />BTTS%</span>
            <span v-if="trendDirection !== 'flat'" class="ml-auto text-[10px] font-semibold"
                  :class="trendDirection === 'up' ? 'text-emerald-400' : 'text-red-400'">
              trending {{ trendDirection }}
            </span>
          </div>
          <div class="p-3">
            <div class="relative" style="height: 150px">
              <svg viewBox="0 0 600 150" preserveAspectRatio="none" class="w-full h-full overflow-visible">
                <!-- Recessive baseline at the mean: hairline, solid, one step off surface. -->
                <line v-if="trendPoints.length > 1" x1="0" :y1="trendBaseY" x2="600" :y2="trendBaseY" :stroke="VIZ_GRID" stroke-width="1" vector-effect="non-scaling-stroke" />

                <!-- Secondary rate series (football only) — thinner, dimmer, own 0-100% scale. -->
                <template v-if="!isBball">
                  <polyline :points="over25Polyline" fill="none" :stroke="VIZ_AWAY" stroke-width="1.25" stroke-opacity="0.55"
                            stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                  <polyline :points="bttsPolyline" fill="none" :stroke="VIZ_CAT2" stroke-width="1.25" stroke-opacity="0.55"
                            stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                </template>

                <polyline :points="trendPolyline" fill="none" :stroke="VIZ_HOME" stroke-width="2"
                          stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                <!-- End marker with a 2px surface ring so it survives the line. -->
                <circle v-if="trendPoints.length" :cx="trendPoints[trendPoints.length - 1].x"
                        :cy="trendPoints[trendPoints.length - 1].y"
                        :r="trendPoints.length === 1 ? 6 : 4.5"
                        :fill="VIZ_HOME" :stroke="VIZ_SURFACE" stroke-width="2" vector-effect="non-scaling-stroke" />
                <!-- A single round has no line to draw — label its value so the
                     chart doesn't read as an empty frame. -->
                <text v-if="trendPoints.length === 1" :x="trendPoints[0].x" :y="trendPoints[0].y - 16"
                      text-anchor="middle" fill="#e4e7ec" font-size="15" font-weight="700"
                      style="font-variant-numeric: tabular-nums">{{ Number(trends[0].avg_total).toFixed(1) }}</text>
              </svg>
            </div>
            <div class="flex justify-between mt-1.5 text-[10px] text-zinc-600 tabular-nums">
              <span>{{ trends[0].label }}</span>
              <span class="text-zinc-400">mean {{ trendAvg }} goals</span>
              <span>{{ trends[trends.length - 1].label }} · {{ Number(trends[trends.length - 1].avg_total).toFixed(1) }}</span>
            </div>
          </div>
        </section>

        <!-- ═══ 8. Market calibration ══════════════════════════════════════
             Is the closing price honest for THIS competition? A reliability
             diagram: bucket games by the market's own implied home-win
             probability, plot the realised home-win rate per bucket. Points on
             the diagonal = well-calibrated. This is a read on the CLOSE, never
             a model claim — no EV, no ROI, no bet selection (do-not-do §1). -->
        <section v-if="calibration" class="panel lg:col-span-6">
          <header class="panel-head">
            <h3 class="panel-title">Market calibration</h3>
            <span class="text-[10px] text-zinc-600">closing 1X2 · implied vs realised</span>
            <span class="ml-auto text-[10px] text-zinc-500 tabular-nums" title="Mean squared error of the market's own implied probability against the outcome. 0 = perfect, 0.25 = a coin-flip guess every time.">
              Brier {{ calibration.brier }}
            </span>
          </header>
          <div class="p-3">
            <div class="relative" style="height: 150px">
              <svg viewBox="0 0 190 190" class="w-full h-full overflow-visible">
                <!-- The perfect-calibration diagonal — a market whose price always matched reality. -->
                <line x1="10" y1="180" x2="180" y2="10" :stroke="VIZ_GRID" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
                <!-- Axis frame -->
                <line x1="10" y1="10" x2="10" y2="180" :stroke="VIZ_GRID" stroke-width="1" vector-effect="non-scaling-stroke" />
                <line x1="10" y1="180" x2="180" y2="180" :stroke="VIZ_GRID" stroke-width="1" vector-effect="non-scaling-stroke" />

                <polyline :points="calibPolyline" fill="none" :stroke="VIZ_HOME" stroke-width="2"
                          stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                <circle v-for="p in calibPoints" :key="p.bucket" :cx="p.x" :cy="p.y" :r="p.r"
                        :fill="VIZ_HOME" :stroke="VIZ_SURFACE" stroke-width="1.5" vector-effect="non-scaling-stroke">
                  <title>{{ (p.implied * 100).toFixed(0) }}% implied → {{ (p.actual * 100).toFixed(0) }}% actual, n={{ p.n }}</title>
                </circle>
              </svg>
            </div>
            <div class="flex justify-between mt-1 text-[10px] text-zinc-600">
              <span>lower implied home-win %</span>
              <span>higher implied home-win %</span>
            </div>
            <p class="mt-2 text-[10px] text-zinc-600 leading-relaxed">
              {{ calibration.matched }} of {{ calibration.total }} games matched to a closing price.
              Dot size is bucket n; dashed line is perfect calibration. Above the line = market
              underpriced home wins in that band; below = overpriced. Describes the CLOSE, not a
              model — carries no EV of its own.
            </p>
          </div>
        </section>

        <!-- ═══ 6. Top scorers ════════════════════════════════════════════ -->
        <section v-if="scorers.length" class="panel lg:col-span-3">
          <header class="panel-head">
            <h3 class="panel-title">Top scorers</h3>
            <span class="text-[10px] text-zinc-600">by goals</span>
          </header>
          <div class="p-2 space-y-0.5">
            <div v-for="(pl, idx) in scorers" :key="pl.name + idx" class="rowline">
              <span class="rowline-idx">{{ idx + 1 }}</span>
              <span class="rowline-crest rowline-crest-static">
                <img v-if="pl.team_key" :src="getTeamLogoUrl(pl.team_key)" :alt="pl.team" loading="lazy" @error="onCrestError" />
                <span v-else class="rowline-crest-fallback">{{ teamAbbreviation(pl.team) }}</span>
              </span>
              <span class="rowline-name">{{ pl.name }}</span>
              <span class="text-[10px] text-zinc-600 truncate max-w-[90px]">{{ pl.team }}</span>
              <span class="scorer-bar">
                <span class="scorer-fill" :style="{ width: (pl.goals / topScorerGoals * 100) + '%' }" />
              </span>
              <span class="rowline-val">{{ pl.goals }}</span>
            </div>
          </div>
        </section>

        <!-- ═══ 5. Form table ═════════════════════════════════════════════
             Each dot is now a real fixture, not a bare letter: `recent[i]`
             lines up 1:1 with `form[i]` (the RPC emits both newest-first), so
             hovering a dot opens a small card with the actual opponent/score/
             date and a link into that game — added 2026-08-25 once the RPC
             started returning per-game detail instead of just the string. -->
        <section v-if="form.length" class="panel lg:col-span-3">
          <header class="panel-head">
            <h3 class="panel-title">Form</h3>
            <span class="text-[10px] text-zinc-600">last 5 · top {{ form.length }}</span>
          </header>
          <div class="p-2 space-y-0.5">
            <div v-for="(team, idx) in form" :key="team.team_id" class="rowline">
              <span class="rowline-idx">{{ idx + 1 }}</span>
              <NuxtLink :to="`/team/${team.team_id}`" class="rowline-crest">
                <img v-if="team.team_key" :src="getTeamLogoUrl(team.team_key)" :alt="team.name" loading="lazy" @error="onCrestError" />
                <span v-else class="rowline-crest-fallback">{{ teamAbbreviation(team.name) }}</span>
              </NuxtLink>
              <span class="rowline-name">{{ team.name }}</span>
              <span class="flex gap-0.5">
                <span
                  v-for="(r, i) in (team.form || '').split('')"
                  :key="i"
                  class="formdot-wrap"
                  @mouseenter="openFormTip(`${team.team_id}-${i}`)"
                  @mouseleave="closeFormTip(`${team.team_id}-${i}`)"
                >
                  <button type="button" class="formdot" :class="formColor(r)">{{ r }}</button>
                  <div v-if="formTip === `${team.team_id}-${i}` && team.recent?.[i]" class="formdot-tip">
                    <p class="formdot-tip-line">
                      <span class="text-zinc-500">{{ team.recent[i].is_home ? 'vs' : '@' }}</span>
                      {{ team.recent[i].opponent }}
                    </p>
                    <p class="formdot-tip-score">{{ team.recent[i].gf }}–{{ team.recent[i].ga }}</p>
                    <p class="formdot-tip-date">{{ fmtShortDate(team.recent[i].date) }}</p>
                    <NuxtLink :to="`/game/${team.recent[i].game_id}`" class="formdot-tip-btn">Go to game →</NuxtLink>
                  </div>
                </span>
              </span>
              <span class="rowline-val">{{ team.points }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- ═══ 7. Referee impact ═══════════════════════════════════════════ -->
      <section v-if="refs.length" class="panel">
        <header class="panel-head">
          <h3 class="panel-title">Referee impact</h3>
          <span class="text-[10px] text-zinc-600">avg goals &amp; cards per match · min 3 games</span>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full text-[11px] min-w-[420px]">
            <thead>
              <tr class="text-zinc-500 bg-white/[0.02]">
                <th class="th text-left">Referee</th>
                <th class="th w-10">G</th>
                <th class="th w-28 text-left">Avg goals</th>
                <th class="th w-12">YC</th>
                <th class="th w-12">RC</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in refs" :key="r.name" class="border-t border-white/[0.035]">
                <td class="td font-medium text-zinc-200 truncate max-w-[160px]" :title="r.name">{{ r.name }}</td>
                <td class="td text-center text-zinc-500 tabular-nums">{{ r.matches }}</td>
                <td class="td">
                  <span class="refbar">
                    <span class="refbar-fill" :style="{ width: (r.avg_total / refMax * 100) + '%', background: barColorForGoals(r.avg_total) }" />
                    <span class="refbar-val">{{ Number(r.avg_total).toFixed(2) }}</span>
                  </span>
                </td>
                <td class="td text-center text-amber-400 tabular-nums">{{ r.avg_yellow }}</td>
                <td class="td text-center text-red-400 tabular-nums">{{ r.avg_red }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * What actually happened in this competition this season.
 *
 * Two rules govern this tab:
 *
 *  1. **Every rate carries its n.** The old version rendered "HOME WIN 100% ·
 *     OVER 2.5 100% · BTTS 0%" off a single played fixture, with nothing on
 *     screen saying so. A rate over one game is a count wearing a percent sign.
 *  2. **Colour does one job per chart.** Magnitude → one blue hue, more-is-
 *     darker. Identity (home vs away) → two hues with a legend. The old chart
 *     painted home and away in two steps of the same blue, which is a
 *     sequential encoding used for an identity job.
 */
import { VIZ_HOME, VIZ_AWAY, VIZ_CAT, VIZ_BRAND_HOME, VIZ_BRAND_AWAY, VIZ_GRID, VIZ_SURFACE, VIZ_STATUS, seqStep } from '~/utils/viz'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

/** Third categorical slot (green) — BTTS% in the scoring-trend overlay. */
const VIZ_CAT2 = VIZ_CAT[2]

const props = defineProps<{
  leagueKey: string
  season?: string
}>()

const api = useApi()

const { data, pending, error } = useSwr(
  computed(() => `league_analysis:${props.leagueKey}:${props.season || currentSeason(props.leagueKey)}`),
  () => api.fetchLeagueAnalysis(props.leagueKey, props.season || currentSeason(props.leagueKey)),
  { memoryTtl: 5 * 60_000 },
)

const isBball = computed(() => data.value?.sport === 'basketball')
const km = computed<any>(() => data.value?.key_metrics || {})
const dist = computed<any[]>(() => data.value?.score_distribution || [])
const ha = computed<any>(() => data.value?.home_vs_away)
const trends = computed<any[]>(() => data.value?.scoring_trends || [])
const form = computed<any[]>(() => data.value?.form_table || [])
const scorers = computed<any[]>(() => data.value?.top_scorers || [])
const refs = computed<any[]>(() => data.value?.referee_impact || [])
const calibration = computed<any>(() => data.value?.market_calibration || null)
const hasGames = computed(() => Number(km.value?.games || 0) > 0)

/** Below this, a percentage is a count and must be labelled as one. */
const THIN_SAMPLE = 6
const thin = computed(() => Number(km.value?.games || 0) < THIN_SAMPLE)

/* ── Key metrics ────────────────────────────────────────────────────────── */

const metrics = computed(() => {
  const k = km.value
  const rows: any[] = [
    { label: 'Games', value: String(k.games ?? 0), foot: 'completed' },
    { label: isBball.value ? 'Avg PPG' : 'Avg goals', value: String(k.avg_total ?? '—'), foot: 'per game' },
    { label: 'Home win', value: `${k.home_win_pct ?? 0}%`, pct: Number(k.home_win_pct ?? 0), color: VIZ_HOME },
  ]
  if (isBball.value) {
    rows.push({ label: 'Avg margin', value: String(k.avg_margin ?? '—'), foot: 'points' })
  } else {
    rows.push({ label: 'Draw', value: `${k.draw_pct ?? 0}%`, pct: Number(k.draw_pct ?? 0), color: VIZ_STATUS.warning })
    rows.push({ label: 'Over 2.5', value: `${k.over25_pct ?? 0}%`, pct: Number(k.over25_pct ?? 0), color: VIZ_AWAY })
    rows.push({ label: 'BTTS', value: `${k.btts_pct ?? 0}%`, pct: Number(k.btts_pct ?? 0), color: seqStep(0.55) })
  }
  return rows
})

/* ── Distribution ───────────────────────────────────────────────────────── */

const maxCount = computed(() => Math.max(1, ...dist.value.map(d => d.count)))
function barHeight(count: number) {
  return Math.max(3, Math.round((count / maxCount.value) * 108))
}
/** Magnitude → sequential step. A taller column is darker, not louder. */
function barColor(count: number) {
  return seqStep(count / maxCount.value)
}

/* ── Home vs away ───────────────────────────────────────────────────────── */

const haRows = computed(() => {
  const h = ha.value
  if (!h) return []
  const mk = (label: string, home: number, away: number) => {
    const total = Math.max(home + away, 0.0001)
    return { label, home, away, homePct: Math.round((home / total) * 100) }
  }
  return [
    mk(isBball.value ? 'Total points' : 'Total goals', Number(h.home.goals), Number(h.away.goals)),
    mk('Wins', Number(h.home.wins), Number(h.away.wins)),
    mk(isBball.value ? 'Avg PPG' : 'Avg goals', Number(h.home.avg_goals), Number(h.away.avg_goals)),
  ]
})

/* ── Trend ──────────────────────────────────────────────────────────────── */

const trendVals = computed(() => trends.value.map(t => Number(t.avg_total)))
const trendMin = computed(() => Math.min(...trendVals.value, 0))
const trendMax = computed(() => Math.max(...trendVals.value, 1))
const trendAvg = computed(() => {
  if (!trendVals.value.length) return 0
  const a = trendVals.value.reduce((s, v) => s + v, 0) / trendVals.value.length
  return Math.round(a * 10) / 10
})
const trendDirection = computed<'up' | 'down' | 'flat'>(() => {
  if (trendVals.value.length < 4) return 'flat'
  const half = Math.floor(trendVals.value.length / 2)
  const first = trendVals.value.slice(0, half).reduce((a, b) => a + b, 0) / half
  const last = trendVals.value.slice(half).reduce((a, b) => a + b, 0) / (trendVals.value.length - half)
  const diff = last - first
  if (Math.abs(diff) < 0.15) return 'flat'
  return diff > 0 ? 'up' : 'down'
})
const trendBaseY = computed(() => {
  const range = trendMax.value - trendMin.value || 1
  return 138 - ((trendAvg.value - trendMin.value) / range) * 124
})
const trendPoints = computed(() => {
  if (!trendVals.value.length) return []
  // A single round has no left-to-right spread and no range to scale against
  // (the 0..1 fallback range would pin the point to the top edge) — centre
  // its one point so the chart reads as "one data point so far".
  if (trendVals.value.length === 1) return [{ x: 300, y: 75 }]
  const range = trendMax.value - trendMin.value || 1
  const stepX = 600 / (trendVals.value.length - 1)
  return trendVals.value.map((v, i) => ({ x: i * stepX, y: 138 - ((v - trendMin.value) / range) * 124 }))
})
const trendPolyline = computed(() => trendPoints.value.map(p => `${p.x},${p.y}`).join(' '))

/**
 * Over2.5% and BTTS% share the same x-positions as the goals line (one point
 * per round) but their own 0-100% y-scale — a rate has nothing to do with the
 * goals axis's min/max. Football only; the RPC never fills these for basketball.
 */
function ratePolyline(key: 'over25_pct' | 'btts_pct') {
  const stepX = trends.value.length > 1 ? 600 / (trends.value.length - 1) : 0
  const offsetX = trends.value.length === 1 ? 300 : 0
  return trends.value
    .map((t, i) => {
      const v = Number(t[key])
      if (!Number.isFinite(v)) return null
      const y = 138 - (v / 100) * 124
      return `${offsetX + i * stepX},${y}`
    })
    .filter((p): p is string => p != null)
    .join(' ')
}
const over25Polyline = computed(() => ratePolyline('over25_pct'))
const bttsPolyline = computed(() => ratePolyline('btts_pct'))

/* ── Market calibration ────────────────────────────────────────────────── */

/**
 * Reliability-diagram points: x = implied home-win probability, y = realised
 * rate, both 0-1 mapped onto the same 10..180 square the diagonal is drawn on.
 * Dot radius carries bucket n (sqrt-scaled so area, not radius, tracks count).
 */
const calibPoints = computed(() => {
  const buckets: any[] = calibration.value?.buckets || []
  if (!buckets.length) return []
  const maxN = Math.max(1, ...buckets.map((b) => Number(b.n)))
  return buckets.map((b) => ({
    bucket: b.bucket,
    n: b.n,
    implied: Number(b.implied),
    actual: Number(b.actual),
    x: 10 + Number(b.implied) * 170,
    y: 180 - Number(b.actual) * 170,
    r: 2.5 + Math.sqrt(Number(b.n) / maxN) * 5.5,
  }))
})
const calibPolyline = computed(() =>
  [...calibPoints.value].sort((a, b) => a.implied - b.implied).map((p) => `${p.x},${p.y}`).join(' ')
)

/* ── Lists ──────────────────────────────────────────────────────────────── */

const topScorerGoals = computed(() => Math.max(1, ...scorers.value.map(s => Number(s.goals) || 0)))
const refMax = computed(() => Math.max(1, ...refs.value.map(r => Number(r.avg_total) || 0)))

function formColor(r: string) {
  if (r === 'W') return 'bg-emerald-500'
  if (r === 'L') return 'bg-red-500'
  return 'bg-amber-500'
}

/** One hue, more-is-darker — a referee's average is a magnitude, not a state. */
function barColorForGoals(v: number) {
  return seqStep(Number(v) / refMax.value)
}

/** A crest whose file 404s falls back to the initials block, same pattern as LeagueFixtureCard. */
function onCrestError(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.display = 'none'
}

/** Which form dot's tooltip is open — `${team_id}-${index}`, one at a time. */
const formTip = ref<string | null>(null)
let formTipTimer: ReturnType<typeof setTimeout> | null = null
function openFormTip(key: string) {
  if (formTipTimer) clearTimeout(formTipTimer)
  formTip.value = key
}
function closeFormTip(key: string) {
  // Small delay so moving from the dot onto the popover itself doesn't close it.
  formTipTimer = setTimeout(() => {
    if (formTip.value === key) formTip.value = null
  }, 120)
}

function fmtShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
.panel {
  border-radius: 0.7rem;
  background: linear-gradient(180deg, rgba(37, 40, 48, 0.4), rgba(28, 31, 39, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.panel-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.panel-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgb(212, 212, 216);
}

.thin-note {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.7rem;
  background: rgba(250, 178, 25, 0.07);
  border: 1px solid rgba(250, 178, 25, 0.22);
  font-size: 0.7rem;
  line-height: 1.5;
  color: rgb(190, 176, 150);
}
.thin-dot {
  width: 0.45rem;
  height: 0.45rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: #fab219;
  flex-shrink: 0;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.6rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.025);
}
.tile-label {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(113, 113, 122);
}
.tile-value { font-size: 1.15rem; font-weight: 700; line-height: 1.15; }
.tile-foot { font-size: 0.58rem; color: rgb(101, 103, 112); }
.tile-meter {
  display: block;
  height: 0.25rem;
  margin-top: 0.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.tile-meter-fill { display: block; height: 100%; border-radius: 999px; transition: width 380ms ease; }

.hist { display: flex; align-items: flex-end; gap: 2px; height: 140px; }
.hist-col { flex: 1 1 0%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 0; }
.hist-cap { font-size: 0.58rem; font-weight: 700; font-variant-numeric: tabular-nums; margin-bottom: 0.15rem; }
.hist-bar {
  width: 100%;
  max-width: 24px;
  border-radius: 4px 4px 0 0; /* rounded data-end, square at the baseline */
  transition: height 380ms cubic-bezier(0.22, 1, 0.36, 1);
}
.hist-tick {
  margin-top: 0.25rem;
  font-size: 0.55rem;
  color: rgb(101, 103, 112);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.lg { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.62rem; color: rgb(140, 143, 152); }
.lg-key { width: 0.55rem; height: 0.55rem; border-radius: 2px; display: inline-block; }

.split { display: flex; gap: 2px; height: 1.4rem; }
.split-seg {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 0.4rem;
  border-radius: 4px 0 0 4px;
  transition: width 380ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: visible;
}
.split-seg-r { justify-content: flex-end; padding-left: 0; padding-right: 0.4rem; border-radius: 0 4px 4px 0; }
.split-val { font-size: 0.62rem; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }

.rowline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.28rem 0.4rem;
  border-radius: 0.35rem;
  transition: background 140ms ease;
}
.rowline:hover { background: rgba(255, 255, 255, 0.025); }
.rowline-idx { width: 1rem; text-align: right; font-size: 0.6rem; font-weight: 700; color: rgb(90, 92, 100); font-variant-numeric: tabular-nums; }
.rowline-name { flex: 1 1 auto; min-width: 0; font-size: 0.7rem; font-weight: 500; color: rgb(212, 212, 216); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rowline-val { width: 1.6rem; text-align: right; font-size: 0.7rem; font-weight: 700; color: rgb(228, 231, 236); font-variant-numeric: tabular-nums; }

.rowline-crest {
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 0.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.rowline-crest-static { cursor: default; }
.rowline-crest img { width: 100%; height: 100%; object-fit: contain; }
.rowline-crest-fallback {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.48rem;
  font-weight: 800;
  color: rgb(180, 183, 191);
}

.formdot-wrap { position: relative; }
.formdot {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.52rem;
  font-weight: 700;
  color: #fff;
  transition: transform 120ms ease;
}
.formdot-wrap:hover .formdot { transform: scale(1.15); }

/* Popover card — a fixture, not a bare letter. Sits above the dot; pointer
   events stay on so a mouse can travel from the dot onto the "Go to game" link. */
.formdot-tip {
  position: absolute;
  z-index: 20;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 9.5rem;
  padding: 0.5rem 0.55rem;
  border-radius: 0.5rem;
  background: linear-gradient(165deg, rgba(41, 45, 54, 0.98), rgba(24, 27, 34, 1));
  border: 1px solid #333a48;
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.6);
  text-align: left;
}
.formdot-tip-line { font-size: 0.66rem; font-weight: 600; color: rgb(228, 231, 236); }
.formdot-tip-score { font-size: 0.78rem; font-weight: 800; color: #fff; margin-top: 0.15rem; font-variant-numeric: tabular-nums; }
.formdot-tip-date { font-size: 0.58rem; color: rgb(140, 143, 152); margin-top: 0.1rem; }
.formdot-tip-btn {
  display: block;
  margin-top: 0.4rem;
  padding: 0.25rem 0;
  border-radius: 0.3rem;
  text-align: center;
  font-size: 0.62rem;
  font-weight: 700;
  background: rgba(57, 135, 229, 0.18);
  color: #8fbdf5;
  transition: background 140ms ease;
}
.formdot-tip-btn:hover { background: rgba(57, 135, 229, 0.3); }

.scorer-bar { position: relative; width: 3.5rem; height: 0.3rem; border-radius: 999px; background: rgba(255, 255, 255, 0.06); overflow: hidden; flex-shrink: 0; }
.scorer-fill { position: absolute; inset: 0 auto 0 0; background: #3987e5; border-radius: 999px; }

.th { padding: 0.4rem 0.5rem; font-weight: 600; font-size: 0.6rem; letter-spacing: 0.03em; text-transform: uppercase; text-align: center; }
.td { padding: 0.32rem 0.5rem; }

.refbar { position: relative; display: flex; align-items: center; gap: 0.4rem; }
.refbar-fill { display: block; height: 0.4rem; border-radius: 0 4px 4px 0; min-width: 2px; }
.refbar-val { font-size: 0.62rem; color: rgb(161, 161, 170); font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .tile-meter-fill, .hist-bar, .split-seg { transition: none; }
}
</style>
