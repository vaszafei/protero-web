<template>
  <section v-if="shots.length" class="panel overflow-hidden">
    <header class="panel-head">
      <span class="panel-title">Shot chart</span>
      <span class="pill pill-dim">{{ shots.length }} field goals</span>
      <span class="panel-link">{{ excludesLabel }}</span>
    </header>

    <!-- Filters sit in one row above the plot, never inside it. -->
    <div class="sc-controls">
      <div class="sc-seg" role="group" aria-label="Team">
        <button
          v-for="opt in teamOptions" :key="opt.value"
          class="sc-seg-btn" :class="{ 'is-on': team === opt.value }"
          type="button" @click="team = opt.value"
        >
          <span v-if="opt.color" class="sc-swatch" :style="{ background: opt.color }" />
          {{ opt.label }}
        </button>
      </div>
      <div class="sc-seg" role="group" aria-label="Shot type">
        <button
          v-for="opt in TYPE_OPTIONS" :key="opt.value"
          class="sc-seg-btn" :class="{ 'is-on': shotType === opt.value }"
          type="button" @click="shotType = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="sc-body">
      <!-- The court. viewBox is a half-court in normalised units scaled by 100,
           so every coordinate below reads as a percentage of the court. -->
      <svg
        :viewBox="`0 0 ${W} ${H}`" class="sc-svg" role="img" :aria-label="ariaLabel"
        preserveAspectRatio="xMidYMid meet"
        @mouseleave="hover = null"
      >
        <rect x="0" y="0" :width="W" :height="H" :fill="VIZ_SURFACE" />

        <g :stroke="VIZ_GRID" fill="none" stroke-width="1" vector-effect="non-scaling-stroke">
          <!-- Court outline: sidelines + baseline. The far edge is the crop, not
               a line on the floor, so it is left open. -->
          <path :d="`M ${x(0)} ${y(0)} L ${x(0)} 0 M ${x(1)} ${y(0)} L ${x(1)} 0 M ${x(0)} ${y(0)} L ${x(1)} ${y(0)}`" />
          <!-- Key and free-throw circle -->
          <rect :x="x(0.5) - paintW / 2" :y="paintTopY" :width="paintW" :height="paintH" />
          <circle :cx="x(0.5)" :cy="paintTopY" :r="circleR" />
          <!-- Hoop and backboard, at the coordinate origin both feeds use -->
          <line
            :x1="x(0.5) - hoopR * 2" :y1="hoopY + hoopR * 1.6"
            :x2="x(0.5) + hoopR * 2" :y2="hoopY + hoopR * 1.6"
          />
          <circle :cx="x(0.5)" :cy="hoopY" :r="hoopR" />
          <!-- Three-point line: corner segments joined by the measured arc -->
          <path :d="arcPath" />
        </g>

        <!-- Misses first, makes on top: a made shot is the rarer, more
             important mark and must never be hidden under a miss. -->
        <g>
          <circle
            v-for="(s, i) in ordered" :key="i"
            :cx="s.cx" :cy="s.cy" :r="hover === s ? R * 1.7 : R"
            :fill="s.made ? s.color : 'none'"
            :stroke="s.color"
            :stroke-width="s.made ? 0.8 : 1.2"
            :opacity="dim(s) ? 0.14 : 0.9"
            vector-effect="non-scaling-stroke"
            @mouseenter="hover = s"
          />
        </g>
      </svg>

      <!-- Tooltip, positioned off the hovered mark's own normalised location. -->
      <div
        v-if="hover" class="sc-tip"
        :style="{ left: `${(hover.cx / W) * 100}%`, top: `${(hover.cy / H) * 100}%` }"
      >
        <div class="sc-tip-name">{{ titleCase(hover.player_name) }}</div>
        <div class="sc-tip-row">
          <span class="sc-tip-dot" :style="{ background: hover.color }" />
          {{ hover.made ? 'Made' : 'Missed' }} {{ hover.shot_type }}
          <span v-if="hover.distance_m != null" class="sc-tip-dim">· {{ hover.distance_m }}m</span>
        </div>
        <div v-if="hover.action_type" class="sc-tip-dim">{{ hover.action_type }}</div>
      </div>
    </div>

    <!-- The table view: identity is never colour-alone, and these are the
         numbers a reader would otherwise try to count off the dots. -->
    <table class="sc-table">
      <thead>
        <tr><th>Team</th><th>FG</th><th>2P</th><th>3P</th><th>Pts</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in teams" :key="t.side">
          <th scope="row">
            <span class="sc-swatch" :style="{ background: colorFor(t.side) }" />
            {{ t.team_name || (t.side === 'home' ? homeName : awayName) }}
          </th>
          <td>{{ t.all.made }}/{{ t.all.attempted }}<span class="sc-pct">{{ pct(t.all) }}</span></td>
          <td>{{ t.two.made }}/{{ t.two.attempted }}<span class="sc-pct">{{ pct(t.two) }}</span></td>
          <td>{{ t.three.made }}/{{ t.three.attempted }}<span class="sc-pct">{{ pct(t.three) }}</span></td>
          <td>{{ t.all.points }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VIZ_HOME, VIZ_AWAY, VIZ_GRID, VIZ_SURFACE } from '~/utils/viz'

type Tally = { attempted: number; made: number; points: number; pct: number | null }
type Shot = {
  nx: number; ny: number; made: boolean; shot_type: string
  player_name: string; team_name: string | null; side: 'home' | 'away'
  period: number | null; distance_m: number | null; action_type: string | null
}
type TeamRow = { side: 'home' | 'away'; team_name: string | null; all: Tally; two: Tally; three: Tally }

const props = defineProps<{
  shots: Shot[]
  teams: TeamRow[]
  coordSystem: string
  court: { hoop_x: number; hoop_y: number; arc_r_x: number; arc_r_y: number; max_y: number } | null
  homeName: string
  awayName: string
  excludes?: string | null
}>()

/**
 * The plot is a half-court in a square-ish viewBox. Every marking below is
 * derived from `court`, which the API emits in the SAME normalised space as
 * the shots — the first cut hard-coded a nominal FIBA court here while the
 * projection used a different one, and the result drew three-pointers inside
 * the arc. There is now one source of geometry and the renderer only scales it.
 *
 * The view crops to the part of the court the shots actually reach (plus a
 * margin), because a full half-court leaves a third of the panel empty: a
 * EuroLeague game's shots stop around 65% of the way to the half-way line.
 */
const W = 100

/** Court fraction of the full half-court length that the view shows. */
const crop = computed(() => Math.min(1, (props.court?.max_y ?? 0.7) + 0.08))

/**
 * Panel height. The court is 15m x 14m (FIBA), so a full half-court is very
 * nearly square; cropping the far end shortens it proportionally. Deriving H
 * this way keeps one unit the same length on both axes, which is what lets a
 * shot dot be a circle and the three-point arc be circular.
 */
const courtAspect = 14 / 15
const H = computed(() => W * courtAspect * crop.value)

/**
 * Normalised court coords → viewBox coords.
 *
 * `y` is INVERTED: the feeds measure away from the baseline, but a shot chart
 * is read with the basket at the bottom and the shooter looking up the page.
 * Flipping here rather than in the API keeps the stored data in the source's
 * own orientation.
 */
const x = (nx: number) => nx * W
const y = (ny: number) => H.value - (ny / crop.value) * H.value

const R = 0.95                                  // shot dot radius
// Key: 4.9m wide and 5.8m deep from the baseline, on a 15m x 14m half-court.
// Expressed as court fractions and put through the same y() as the shots, so
// the markings crop and scale with them.
const paintW = computed(() => (4.9 / 15) * W)
const paintTopY = computed(() => y(5.8 / 14))
const paintH = computed(() => Math.max(0, y(0) - paintTopY.value))
const circleR = computed(() => (1.8 / 15) * W)
const hoopY = computed(() => y(props.court?.hoop_y ?? 0.11))
const hoopR = 0.9

/**
 * Three-point line: two straight corner segments joined by the arc, both taken
 * from the measured radius. The corner segment runs from the baseline to the
 * point where the arc meets it, so the two never disagree.
 */
const arcPath = computed(() => {
  const c = props.court
  if (!c) return ''
  const cx = x(0.5)
  const cy = hoopY.value
  const rx = c.arc_r_x * W
  const ry = (c.arc_r_y / crop.value) * H.value
  // The arc is cut off by the sidelines; find where, in view units.
  const inset = Math.max(0, cx - rx)
  const dx = cx - inset
  // Corner segments start at the baseline and meet the arc at this height.
  const frac = Math.min(1, dx / rx)
  const dy = ry * Math.sqrt(Math.max(1 - frac * frac, 0))
  const yJoin = cy - dy
  return [
    `M ${inset} ${y(0)}`, `L ${inset} ${yJoin}`,
    `A ${rx} ${ry} 0 0 1 ${W - inset} ${yJoin}`,
    `L ${W - inset} ${y(0)}`,
  ].join(' ')
})

const team = ref<'both' | 'home' | 'away'>('both')
const shotType = ref<'all' | '2P' | '3P'>('all')
const hover = ref<(Shot & { cx: number; cy: number; color: string }) | null>(null)

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '2P', label: '2P' },
  { value: '3P', label: '3P' },
] as const

const colorFor = (side: 'home' | 'away') => (side === 'home' ? VIZ_HOME : VIZ_AWAY)

const teamOptions = computed(() => [
  { value: 'both' as const, label: 'Both', color: null as string | null },
  { value: 'home' as const, label: shortName(props.homeName), color: VIZ_HOME },
  { value: 'away' as const, label: shortName(props.awayName), color: VIZ_AWAY },
])

/** Screen-space shots, with the court transform applied once. */
const placed = computed(() =>
  props.shots.map((s) => ({
    ...s,
    cx: x(s.nx),
    cy: y(s.ny),
    color: colorFor(s.side),
  })),
)

/** A filtered-out shot is dimmed, never removed — the shape of the whole
 *  game stays visible while a subset is being read. */
const dim = (s: Shot) =>
  (team.value !== 'both' && s.side !== team.value) ||
  (shotType.value !== 'all' && s.shot_type !== shotType.value)

const ordered = computed(() => {
  const rows = placed.value
  // Dimmed, then misses, then makes — painter's order, so the marks that
  // matter most end up on top.
  return [
    ...rows.filter((s) => dim(s)),
    ...rows.filter((s) => !dim(s) && !s.made),
    ...rows.filter((s) => !dim(s) && s.made),
  ]
})

const pct = (t: Tally) => (t.pct == null ? '' : ` ${t.pct}%`)

const excludesLabel = computed(() =>
  props.excludes ? `excludes ${props.excludes}` : 'field goals',
)

const ariaLabel = computed(() => {
  const parts = props.teams.map(
    (t) => `${t.team_name || t.side}: ${t.all.made} of ${t.all.attempted} field goals`,
  )
  return `Shot locations. ${parts.join('; ')}.`
})

function shortName(name: string) {
  const n = (name || '').trim()
  return n.length > 14 ? `${n.slice(0, 14)}…` : n
}

/** The EuroLeague feed shouts its player names ("SORKIN, ROMAN"). */
function titleCase(name: string) {
  const n = (name || '').trim()
  if (n !== n.toUpperCase()) return n
  return n
    .toLowerCase()
    .replace(/(^|[\s,.'-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase())
}
</script>

<style scoped>
.sc-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem 0;
}
.sc-seg {
  display: inline-flex;
  border: 1px solid #343a47;
  border-radius: 0.375rem;
  overflow: hidden;
}
.sc-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(161, 161, 170);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.sc-seg-btn + .sc-seg-btn { border-left: 1px solid #343a47; }
.sc-seg-btn:hover { color: rgb(212, 212, 216); }
.sc-seg-btn.is-on {
  background: rgba(255, 255, 255, 0.06);
  color: rgb(244, 244, 245);
}
.sc-swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}

.sc-body {
  position: relative;
  padding: 0.6rem 0.85rem 0.2rem;
}
.sc-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 420px;
  border-radius: 0.375rem;
}

.sc-tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 10px));
  pointer-events: none;
  background: rgba(18, 20, 26, 0.96);
  border: 1px solid #343a47;
  border-radius: 0.375rem;
  padding: 0.35rem 0.5rem;
  white-space: nowrap;
  z-index: 2;
}
.sc-tip-name {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgb(244, 244, 245);
}
.sc-tip-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.65rem;
  color: rgb(212, 212, 216);
}
.sc-tip-dot { width: 7px; height: 7px; border-radius: 50%; }
.sc-tip-dim { font-size: 0.62rem; color: rgb(161, 161, 170); }

.sc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
}
.sc-table th, .sc-table td {
  padding: 0.3rem 0.5rem;
  text-align: right;
  color: rgb(212, 212, 216);
  font-variant-numeric: tabular-nums;
}
.sc-table thead th {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(161, 161, 170);
  border-bottom: 1px solid #343a47;
}
.sc-table tbody th {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-align: left;
  font-weight: 600;
}
.sc-table thead th:first-child { text-align: left; }
.sc-pct { color: rgb(161, 161, 170); }
</style>
