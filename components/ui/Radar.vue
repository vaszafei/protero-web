<template>
  <div class="radar-wrap">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="radar"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- Grid rings. Percentile space, so the rings are quartiles and mean
           something: the 50 ring is the cohort median by definition. -->
      <polygon
        v-for="ring in RINGS"
        :key="ring"
        :points="ringPoints(ring)"
        fill="none"
        :stroke="VIZ_GRID"
        :stroke-width="ring === 50 ? 1.25 : 0.75"
        :stroke-dasharray="ring === 50 ? '3 3' : undefined"
        vector-effect="non-scaling-stroke"
        opacity="0.7"
      />

      <!-- Spokes -->
      <line
        v-for="(a, i) in axes"
        :key="`spoke-${i}`"
        :x1="CX" :y1="CY"
        :x2="pt(i, 100).x" :y2="pt(i, 100).y"
        :stroke="VIZ_GRID"
        stroke-width="0.75"
        vector-effect="non-scaling-stroke"
        opacity="0.5"
      />

      <!-- The cohort median, drawn behind as a ghost. Without it a radar is
           just a shape; with it the shape becomes "better or worse than the
           players this player is compared against". -->
      <polygon
        v-if="showCohort"
        :points="cohortPoints"
        :fill="VIZ_GRID"
        fill-opacity="0.35"
        :stroke="VIZ_GRID"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />

      <!-- The player -->
      <polygon
        :points="valuePoints"
        :fill="color"
        fill-opacity="0.22"
        :stroke="color"
        stroke-width="2"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        :class="{ 'radar-grow': animate }"
        :style="{ transformOrigin: `${CX}px ${CY}px` }"
      />

      <!-- Vertices. Each is a tooltip trigger via the overlay below; the circle
           itself is decorative so it carries no pointer events. -->
      <circle
        v-for="(a, i) in axes"
        :key="`v-${i}`"
        :cx="pt(i, pct(a)).x"
        :cy="pt(i, pct(a)).y"
        r="3.5"
        :fill="color"
        :stroke="VIZ_SURFACE"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
      />

      <!-- Axis labels -->
      <text
        v-for="(a, i) in axes"
        :key="`l-${i}`"
        :x="labelPt(i).x"
        :y="labelPt(i).y"
        class="radar-label"
        :text-anchor="labelAnchor(i)"
        dominant-baseline="middle"
      >{{ a.axis }}</text>
    </svg>

    <!--
      Tooltip hotspots, positioned in percentage space over the SVG. These are
      HTML rather than SVG so `UiTooltip` can teleport a normal panel; an SVG
      <title> gives a browser-native tooltip you cannot style or key into.
    -->
    <UiTooltip
      v-for="(a, i) in axes"
      :key="`t-${i}`"
      class="radar-hot"
      :style="hotStyle(i)"
      :width="230"
    >
      <span class="radar-hot-hit" />
      <template #content>
        <div class="tip-title">{{ a.axis }}</div>
        <div class="tip-row">
          <span class="tip-k">value</span>
          <span class="tip-v">{{ a.display ?? fmt(a.value) }}</span>
        </div>
        <div class="tip-row">
          <span class="tip-k">percentile</span>
          <span class="tip-v" :style="{ color }">{{ Math.round(pct(a)) }}<span class="tip-sub">th</span></span>
        </div>
        <div v-if="a.cohortMedian != null" class="tip-row">
          <span class="tip-k">cohort median</span>
          <span class="tip-v tip-dim">{{ a.cohortDisplay ?? fmt(a.cohortMedian) }}</span>
        </div>
        <div v-if="a.n != null" class="tip-foot">
          against n={{ a.n.toLocaleString() }} {{ cohortLabel }}
        </div>
      </template>
    </UiTooltip>
  </div>
</template>

<script setup lang="ts">
/**
 * An n-axis radar. Six axes is a hexagon, which is the shape professional
 * player pages use, but nothing here is hard-coded to six.
 *
 * THE IMPORTANT PART: the radius is a PERCENTILE, never a raw value. A radar
 * of raw numbers is meaningless — "1.9 xG" and "88% pass accuracy" cannot share
 * a radius, and normalising each axis to its own max makes the best player in
 * the sample a perfect hexagon by construction. Each axis here is the player's
 * rank within a stated cohort, so the 50 ring IS the cohort median and the
 * shape reads as "better or worse than comparable players".
 *
 * The caller does the percentile computation, because only the caller knows
 * what the honest cohort is (same position, same division, same season) and how
 * many players are in it. `n` is rendered in the tooltip so a shape built on
 * eleven players is not mistaken for one built on eleven hundred.
 */
import { computed } from 'vue'
import { VIZ_GRID, VIZ_SURFACE, VIZ_BRAND_HOME } from '~/utils/viz'
import UiTooltip from '~/components/ui/Tooltip.vue'

export interface RadarAxis {
  /** Short label, ~10 chars — it is rendered outside the polygon. */
  axis: string
  /** The raw quantity, for the tooltip. */
  value: number
  /** 0–100. The radius. */
  percentile: number
  /** The cohort's median raw value, for the tooltip and the ghost polygon. */
  cohortMedian?: number | null
  /** Cohort size. Rendered so a small-n shape is legible as such. */
  n?: number | null
  /** Pre-formatted overrides when the raw number needs a unit ("88%", "1.9"). */
  display?: string
  cohortDisplay?: string
}

const props = withDefaults(defineProps<{
  axes: RadarAxis[]
  color?: string
  /** Draw the cohort-median ghost at the 50th percentile ring. */
  showCohort?: boolean
  /** Named in the tooltip: "against n=412 central midfielders". */
  cohortLabel?: string
  animate?: boolean
}>(), {
  color: VIZ_BRAND_HOME,
  showCohort: true,
  cohortLabel: 'in cohort',
  animate: true,
})

/**
 * The box is WIDER than it is tall because the axis labels sit outside the
 * outer ring and the horizontal ones are the long ones ("BOX TOUCH/90"). At a
 * square viewBox those labels rendered outside the panel entirely.
 * Worst case: 150 + R(74) + offset(16) = 240, plus ~50px of text = 290 < 300.
 */
const W = 300
const H = 250
const CX = W / 2
const CY = 118
const R = 74
const RINGS = [25, 50, 75, 100]

/** Clamp to the plot so a 0 or a 101 cannot escape the outer ring. */
const pct = (a: RadarAxis) => Math.min(100, Math.max(0, Number(a.percentile) || 0))

/** Axis i, at radius `value`% — first axis at 12 o'clock, then clockwise. */
function pt(i: number, value: number) {
  const angle = (Math.PI * 2 * i) / props.axes.length - Math.PI / 2
  const r = (value / 100) * R
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

const poly = (fn: (i: number) => number) =>
  props.axes.map((_, i) => { const p = pt(i, fn(i)); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')

const ringPoints = (ring: number) => poly(() => ring)
const valuePoints = computed(() => poly((i) => pct(props.axes[i])))
/** The ghost sits on the 50 ring: in percentile space the median IS the 50th. */
const cohortPoints = computed(() => poly(() => 50))

function labelPt(i: number) {
  const p = pt(i, 100)
  const angle = (Math.PI * 2 * i) / props.axes.length - Math.PI / 2
  return { x: p.x + Math.cos(angle) * 16, y: p.y + Math.sin(angle) * 13 }
}

/** Anchor by which half of the circle the label sits in, so nothing overlaps. */
function labelAnchor(i: number) {
  const x = pt(i, 100).x
  if (Math.abs(x - CX) < 6) return 'middle'
  return x > CX ? 'start' : 'end'
}

/** Percentage-space position for the HTML tooltip hotspot over each vertex. */
function hotStyle(i: number) {
  const p = pt(i, pct(props.axes[i]))
  return { left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }
}

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)

const ariaLabel = computed(() =>
  props.axes.map((a) => `${a.axis} ${Math.round(pct(a))}th percentile`).join(', ')
)
</script>

<style scoped>
.radar-wrap {
  position: relative;
  width: 100%;
  max-width: 340px;
  margin-inline: auto;
}

.radar {
  display: block;
  width: 100%;
  height: auto;
}

.radar-label {
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  fill: var(--ink-mute);
  text-transform: uppercase;
}

.radar-grow {
  animation: radar-grow 720ms var(--ease-rise) backwards;
}
@keyframes radar-grow {
  from { transform: scale(0.2); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Tooltip hotspot — a 22px target centred on the vertex. */
.radar-hot {
  position: absolute;
  transform: translate(-50%, -50%);
}
.radar-hot-hit {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: help;
}

.tip-title {
  font-weight: 700;
  color: var(--ink-strong);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-size: 0.6rem;
  letter-spacing: 0.05em;
}
.tip-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.tip-k { color: var(--ink-mute); }
.tip-v { font-weight: 700; font-variant-numeric: tabular-nums; }
.tip-sub { font-size: 0.55rem; font-weight: 500; opacity: 0.7; }
.tip-dim { color: var(--ink-soft); }
.tip-foot {
  margin-top: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint);
  font-size: 0.6rem;
}

@media (prefers-reduced-motion: reduce) {
  .radar-grow { animation: none; }
}
</style>
