<template>
  <section v-if="seasons.length >= 2" class="panel overflow-hidden">
    <header class="panel-head">
      <span class="panel-title">Scoring trajectory</span>
      <span class="pill pill-dim">{{ seasons.length }} league seasons</span>
      <div class="ml-auto flex items-center gap-2.5">
        <span class="tj-key" :style="{ color: GF }"><i :style="{ background: GF }" />scored</span>
        <span class="tj-key" :style="{ color: GA }"><i :style="{ background: GA }" />conceded</span>
      </div>
    </header>

    <div class="tj-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" class="tj-svg" role="img" :aria-label="ariaLabel">
        <!-- Division band. Drawn first and behind, as a step: the point of the
             chart is that a jump in goals per game usually IS a change of
             division rather than a change in the club. -->
        <g>
          <rect
            v-for="(b, i) in tierBands"
            :key="`band${i}`"
            :x="b.x" :y="PAD_T" :width="b.w" :height="plotH"
            :fill="b.fill"
          />
          <text
            v-for="(b, i) in tierBands"
            :key="`bt${i}`"
            :x="b.x + b.w / 2" :y="PAD_T + 11"
            class="tj-band-label" text-anchor="middle"
          >{{ b.label }}</text>
        </g>

        <!-- Horizontal guide at 1 goal per game, the natural reference. -->
        <line
          :x1="PAD_L" :x2="W - PAD_R" :y1="y(1)" :y2="y(1)"
          :stroke="VIZ_GRID" stroke-width="1" stroke-dasharray="2 3"
          vector-effect="non-scaling-stroke"
        />
        <text :x="PAD_L - 5" :y="y(1) + 3" class="tj-axis" text-anchor="end">1.0</text>

        <template v-for="(seg, si) in segments" :key="`seg${si}`">
          <polyline :points="path('gf', seg)" fill="none" :stroke="GF" stroke-width="2"
                    stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <polyline :points="path('ga', seg)" fill="none" :stroke="GA" stroke-width="2"
                    stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        </template>

        <g v-for="(s, i) in seasons" :key="`p${i}`">
          <circle :cx="x(i)" :cy="y(s.gf_per_game)" r="3" :fill="GF" :stroke="VIZ_SURFACE" stroke-width="1.5" />
          <circle :cx="x(i)" :cy="y(s.ga_per_game)" r="3" :fill="GA" :stroke="VIZ_SURFACE" stroke-width="1.5" />
        </g>

        <!-- Season labels. Every season when there is room, otherwise every other. -->
        <text
          v-for="(s, i) in seasons"
          :key="`x${i}`"
          v-show="labelEvery === 1 || i % labelEvery === 0 || i === seasons.length - 1"
          :x="x(i)" :y="H - 4" class="tj-axis" text-anchor="middle"
        >{{ shortSeason(s.season) }}</text>

        <!-- One invisible hit-target per season, so the whole column is hoverable. -->
        <rect
          v-for="(s, i) in seasons"
          :key="`h${i}`"
          :x="hit(i).x" :y="PAD_T" :width="hit(i).w" :height="plotH"
          fill="transparent" class="tj-hit"
          @mouseenter="hover = i" @mouseleave="hover = null"
        />
        <line
          v-if="hover != null"
          :x1="x(hover)" :x2="x(hover)" :y1="PAD_T" :y2="PAD_T + plotH"
          :stroke="VIZ_GRID" stroke-width="1" vector-effect="non-scaling-stroke"
        />
      </svg>

      <!-- Read-out for the hovered season. Fixed height so the chart does not
           jump when the pointer enters it. -->
      <div class="tj-read">
        <template v-if="active">
          <span class="tj-read-s">{{ active.season }}</span>
          <span class="tj-read-l">{{ competitionLabel(active.league_key) }}</span>
          <span class="tj-read-v tabular-nums">
            <b :style="{ color: GF }">{{ active.gf_per_game.toFixed(2) }}</b> scored ·
            <b :style="{ color: GA }">{{ active.ga_per_game.toFixed(2) }}</b> conceded ·
            {{ active.points_per_game.toFixed(2) }} ppg over {{ active.games }}
          </span>
        </template>
        <span v-else class="tj-read-hint">Hover a season for its numbers.</span>
      </div>
    </div>

    <div v-if="transitions.length" class="tj-moves">
      <p class="tj-moves-h">Division changes</p>
      <div class="tj-move" v-for="(t, i) in transitions" :key="i">
        <span class="pill" :class="t.direction === 'promoted' ? 'pill-blue' : 'pill-red'">
          {{ t.direction }}
        </span>
        <span class="tj-move-t">
          {{ t.from_season }} {{ competitionLabel(t.from_league) }}
          → {{ t.to_season }} {{ competitionLabel(t.to_league) }}
        </span>
        <span class="tj-move-d tabular-nums">{{ Number(t.from_ppg).toFixed(2) }} ppg before</span>
      </div>
    </div>

    <p class="tj-foot">
      These are raw per-season rates, <strong>not</strong> the twin's fitted attack and defence.
      That is the point of the chart: the same club scoring 2.00 a game in one division and 0.95 in
      the one above has not changed, the opposition has. Separating those two is the whole reason
      the twin layer exists, and its ratings are league-invariant where these numbers are not.
      Cup rounds are excluded — a two-game run moves a per-game rate more than a season does.
      <template v-if="hasGap">
        The line breaks where seasons are missing: this club spent them in a division the
        corpus does not hold, so there is nothing to plot rather than nothing to report.
      </template>
    </p>
  </section>
</template>

<script setup lang="ts">
/**
 * A club's goals-for and goals-against per game across its league seasons, with
 * the division drawn behind as a step.
 *
 * `twin_team_season` holds no fitted ratings — attack and defence exist only as
 * a single current value on `twin_team`, so a "rating trajectory" is not a thing
 * this database can draw. What it can draw is the raw rate against the division,
 * which happens to make the tier confound visible, and that is more useful than
 * a rating line would have been: you can watch a promoted club's scoring halve
 * without its ability changing at all.
 *
 * Both series share one y-scale because both are goals per game — two
 * independently normalised sparklines would put "scored 2.0" and "conceded 1.0"
 * at the same height.
 */
import { computed, ref } from 'vue'
import { VIZ_GRID, VIZ_SURFACE, VIZ_BRAND_HOME, VIZ_BRAND_AWAY } from '~/utils/viz'

const props = defineProps<{
  /** `twin_team_history` rows for one club, any order. */
  history: any[]
  /** `twin_league_transitions` rows for the same club. */
  transitions?: any[]
}>()

const GF = VIZ_BRAND_HOME
const GA = VIZ_BRAND_AWAY

const W = 960
const H = 190
const PAD_L = 26
const PAD_R = 8
const PAD_T = 6
const PAD_B = 16

const plotH = H - PAD_T - PAD_B

const toNum = (v: any): number | null => {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * League seasons only, oldest first. A cup row carries no tier and often three
 * games — including it would let a single tie swing a per-game rate further
 * than a 46-game season can.
 */
const seasons = computed(() => {
  const rows = (props.history || [])
    .filter((r) => r.tier != null && toNum(r.gf_per_game) != null && toNum(r.ga_per_game) != null)
    .map((r) => ({
      season: String(r.season),
      league_key: r.league_key,
      tier: Number(r.tier),
      games: Number(r.games) || 0,
      gf_per_game: Number(r.gf_per_game),
      ga_per_game: Number(r.ga_per_game),
      points_per_game: Number(r.points_per_game) || 0,
    }))
  rows.sort((a, b) => a.season.localeCompare(b.season))
  return rows
})

const transitions = computed(() => props.transitions || [])

const bounds = computed(() => {
  const vs = seasons.value.flatMap((s) => [s.gf_per_game, s.ga_per_game])
  if (!vs.length) return { lo: 0, hi: 3 }
  const lo = Math.min(...vs, 0.5)
  const hi = Math.max(...vs, 1.5)
  const pad = (hi - lo) * 0.15 || 0.2
  return { lo: Math.max(0, lo - pad), hi: hi + pad }
})

const x = (i: number) => {
  const n = seasons.value.length
  if (n <= 1) return PAD_L + (W - PAD_L - PAD_R) / 2
  return PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R)
}
const y = (v: number) => {
  const { lo, hi } = bounds.value
  const t = (v - lo) / (hi - lo || 1)
  return PAD_T + plotH - t * plotH
}

const colW = computed(() => {
  const n = seasons.value.length
  return n > 1 ? (W - PAD_L - PAD_R) / (n - 1) : W - PAD_L - PAD_R
})

/** Start year of "2015-2016". */
const startYear = (s: string) => Number(s.slice(0, 4))

/**
 * Runs of CONSECUTIVE seasons. A club can vanish from the corpus for years —
 * Ipswich has nothing between 2018-19 and 2023-24 because League One is not
 * ingested — and joining across that gap draws a line through seasons we never
 * saw. Each run is its own polyline, so the gap is visible as a gap.
 */
const segments = computed(() => {
  const ss = seasons.value
  const runs: number[][] = []
  let cur: number[] = []
  for (let i = 0; i < ss.length; i++) {
    if (i > 0 && startYear(ss[i].season) !== startYear(ss[i - 1].season) + 1) {
      if (cur.length) runs.push(cur)
      cur = []
    }
    cur.push(i)
  }
  if (cur.length) runs.push(cur)
  return runs
})

const hasGap = computed(() => segments.value.length > 1)

/**
 * The hover column for season `i`, clamped to the plot. Half a column either
 * side of the first and last points falls outside the SVG otherwise — the
 * leading rect was landing at x = -16 and could not be pointed at.
 */
function hit(i: number) {
  const half = colW.value / 2
  const left = Math.max(PAD_L, x(i) - half)
  const right = Math.min(W - PAD_R, x(i) + half)
  return { x: left, w: Math.max(1, right - left) }
}

const path = (key: 'gf' | 'ga', idxs: number[]) =>
  idxs
    .map((i) => {
      const s = seasons.value[i]
      return `${x(i)},${y(key === 'gf' ? s.gf_per_game : s.ga_per_game)}`
    })
    .join(' ')

/** Contiguous runs of the same tier, as bands behind the lines. */
const TIER_FILL: Record<number, string> = {
  1: 'rgba(255,255,255,0.045)',
  2: 'rgba(255,255,255,0.022)',
  3: 'rgba(255,255,255,0.010)',
}
const tierBands = computed(() => {
  const out: { x: number; w: number; fill: string; label: string }[] = []
  const ss = seasons.value
  let start = 0
  for (let i = 1; i <= ss.length; i++) {
    if (i === ss.length || ss[i].tier !== ss[start].tier) {
      const x0 = start === 0 ? PAD_L : (x(start - 1) + x(start)) / 2
      const x1 = i === ss.length ? W - PAD_R : (x(i - 1) + x(i)) / 2
      out.push({
        x: x0,
        w: Math.max(0, x1 - x0),
        fill: TIER_FILL[ss[start].tier] || 'rgba(255,255,255,0.01)',
        label: `Tier ${ss[start].tier}`,
      })
      start = i
    }
  }
  return out
})

/** Season labels overlap past ~9 columns on a narrow panel. */
const labelEvery = computed(() => (seasons.value.length > 9 ? 2 : 1))

const hover = ref<number | null>(null)
const active = computed(() => (hover.value == null ? null : seasons.value[hover.value]))

const shortSeason = (s: string) => {
  const m = /^(\d{4})-(\d{2})(\d{2})$/.exec(s)
  return m ? `${m[1].slice(2)}/${m[3]}` : s
}

const ACRONYMS = new Set(['efl', 'fa', 'dfb', 'acb', 'bcl', 'nba', 'gbl', 'ec'])
const competitionLabel = (key: string | null | undefined) =>
  key
    ? key
        .split('_')
        .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ')
    : 'Unknown'

const ariaLabel = computed(() => {
  const ss = seasons.value
  if (!ss.length) return 'No league seasons'
  const f = ss[0]
  const l = ss[ss.length - 1]
  return `Goals per game across ${ss.length} league seasons, ${f.season} to ${l.season}. ` +
    `Scored ${f.gf_per_game.toFixed(2)} to ${l.gf_per_game.toFixed(2)}, ` +
    `conceded ${f.ga_per_game.toFixed(2)} to ${l.ga_per_game.toFixed(2)}.`
})
</script>

<style scoped>
.tj-wrap { padding: 0.75rem 0.75rem 0.25rem; }
@media (min-width: 640px) { .tj-wrap { padding: 1rem 1rem 0.25rem; } }

.tj-svg { width: 100%; height: auto; display: block; overflow: visible; }
.tj-axis { fill: var(--ink-faint); font-size: 8px; }
.tj-band-label { fill: var(--ink-faint); font-size: 8px; letter-spacing: 0.04em; }
.tj-hit { cursor: crosshair; }

.tj-key { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.62rem; }
.tj-key i { width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; }

.tj-read {
  min-height: 1.6rem; display: flex; align-items: center; gap: 0.5rem;
  flex-wrap: wrap; font-size: 0.7rem; padding-top: 0.35rem;
}
.tj-read-s { font-weight: 700; color: var(--ink-strong); }
.tj-read-l { color: var(--ink-soft); }
.tj-read-v { color: var(--ink-mute); }
.tj-read-hint { color: var(--ink-faint); font-size: 0.66rem; }

.tj-moves { padding: 0 0.75rem 0.5rem; display: grid; gap: 0.3rem; }
@media (min-width: 640px) { .tj-moves { padding: 0 1rem 0.5rem; } }
.tj-moves-h {
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-mute); font-weight: 600;
}
.tj-move { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; flex-wrap: wrap; }
.tj-move-t { color: var(--ink-soft); }
.tj-move-d { color: var(--ink-faint); margin-left: auto; font-size: 0.65rem; }

.tj-foot {
  font-size: 0.66rem; color: var(--ink-mute); line-height: 1.55;
  padding: 0.5rem 0.75rem 0.85rem; border-top: 1px solid var(--edge-soft);
}
@media (min-width: 640px) { .tj-foot { padding: 0.6rem 1rem 0.9rem; } }
</style>
