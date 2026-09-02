<template>
  <div>
   <div class="court-stage">
    <svg viewBox="0 0 50 47" class="court" role="img" :aria-label="ariaLabel">
      <!-- Floor -->
      <rect x="0" y="0" width="50" height="47" :fill="VIZ_SURFACE" />

      <!--
        Two regions, each filled only where it belongs. The 3PT region is the
        floor MINUS the area inside the arc, cut with an even-odd fill rule
        rather than painting the whole rect and covering part of it back up —
        overlapping translucent fills compounded into one flat wash that buried
        the court lines entirely.
      -->
      <path
        :d="`${FLOOR} ${INSIDE_ARC}`"
        fill-rule="evenodd"
        :fill="fillFor('3PT')"
        :fill-opacity="opacityFor('3PT')"
      />
      <path
        :d="INSIDE_ARC"
        :fill="fillFor('2PT')"
        :fill-opacity="opacityFor('2PT')"
      />
      <!-- Free throws happen at the line, so the FT read is tied to the paint's
           top edge rather than to a region of the floor. -->
      <rect
        x="17" y="22" width="16" height="10"
        rx="0.6"
        :fill="fillFor('FT')"
        :fill-opacity="opacityFor('FT')"
      />

      <!-- Court lines -->
      <g :stroke="LINE" stroke-width="0.28" stroke-opacity="0.9" fill="none" vector-effect="non-scaling-stroke">
        <rect x="0.15" y="0.15" width="49.7" height="46.7" />
        <!-- Paint + free-throw circle -->
        <rect x="17" y="28" width="16" height="19" />
        <circle cx="25" cy="28" r="6" />
        <!-- Restricted area + rim + backboard -->
        <path d="M 21,47 L 21,43.75 A 4 4 0 0 0 29,43.75 L 29,47" />
        <circle cx="25" cy="41.75" r="0.75" />
        <line x1="22" y1="43" x2="28" y2="43" stroke-width="0.4" />
        <!-- The three-point line -->
        <path :d="ARC_LINE" stroke-width="0.34" />
      </g>

      <!-- Zone callouts. Placed inside the region each describes. -->
      <g v-for="z in placed" :key="z.zone">
        <text :x="z.x" :y="z.y" class="z-pct" text-anchor="middle" :fill="z.color">
          {{ z.pct != null ? z.pct.toFixed(1) + '%' : '—' }}
        </text>
        <text :x="z.x" :y="z.y + 3.1" class="z-vol" text-anchor="middle">
          {{ z.made }}/{{ z.att }} {{ z.zone }}
        </text>
        <text v-if="z.percentile != null" :x="z.x" :y="z.y + 6" class="z-pctl" text-anchor="middle" :fill="z.color">
          {{ Math.round(z.percentile) }}th pctl
        </text>
      </g>
    </svg>

    <!-- Hotspots carrying the full read, laid over the court in the same
         percentage space the SVG uses. -->
    <div class="court-hots">
      <UiTooltip
        v-for="z in placed"
        :key="`t-${z.zone}`"
        class="court-hot"
        :style="{ left: `${(z.x / 50) * 100}%`, top: `${((z.y + 1.5) / 47) * 100}%` }"
        :width="250"
      >
        <span class="court-hit" />
        <template #content>
          <div class="tip-title">{{ zoneName(z.zone) }}</div>
          <div class="tip-row"><span class="tip-k">made / attempted</span><span class="tip-v">{{ z.made }} / {{ z.att }}</span></div>
          <div class="tip-row"><span class="tip-k">rate</span><span class="tip-v" :style="{ color: z.color }">{{ z.pct != null ? z.pct.toFixed(1) + '%' : '—' }}</span></div>
          <div v-if="z.cohortMedian != null" class="tip-row"><span class="tip-k">{{ refLabel }}</span><span class="tip-v tip-dim">{{ z.cohortMedian.toFixed(1) }}%</span></div>
          <div v-if="z.percentile != null" class="tip-row"><span class="tip-k">percentile</span><span class="tip-v" :style="{ color: z.color }">{{ Math.round(z.percentile) }}th</span></div>
          <div v-if="z.n" class="tip-foot">against n={{ z.n }} at this position</div>
        </template>
      </UiTooltip>
    </div>
   </div>

    <p class="court-note">
      <template v-if="note">{{ note }}</template>
      <template v-else>
        Zone totals, not a shot chart — this corpus holds attempt and make counts and
        <strong>no shot coordinates</strong>, so rim, mid-range and corner threes cannot be
        separated. Shading is efficiency against the position cohort; the number in each
        region is the player's own rate.
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * A half court, filled by shooting efficiency in the only three zones the data
 * can honestly distinguish.
 *
 * Every professional app shows a shot chart with a dot per attempt. We cannot:
 * `basketball_player_games` stores `field_goals_made/attempted`,
 * `three_pointers_made/attempted` and `free_throws_made/attempted` — counts, no
 * x/y. Scattering dots to look the part would be a fabricated visual in a
 * project whose entire discipline is not fabricating numbers, so the court is
 * drawn to scale and shaded by region instead, and says so in the caption.
 *
 * Court geometry is NBA regulation in feet, used directly as the viewBox:
 * 50 wide, 47 to half court, basket 5.25ft off the baseline, 16ft paint,
 * 23.75ft arc breaking to 22ft corners at 14ft from the baseline.
 */
import { computed } from 'vue'
import { VIZ_SURFACE, VIZ_STATUS, VIZ_BRAND_HOME } from '~/utils/viz'
import UiTooltip from '~/components/ui/Tooltip.vue'

export interface Zone {
  zone: string
  made: number
  att: number
  pct: number | null
  /** Rank within a cohort, when there is one (the player page). */
  percentile?: number | null
  /** The reference rate this zone is judged against. */
  cohortMedian?: number | null
  n?: number | null
}

const props = withDefaults(defineProps<{
  zones: Zone[]
  /** What `cohortMedian` is, in words — it is the opponent on a game page. */
  refLabel?: string
  /** Caption. The game page's reference is the opponent, not a cohort. */
  note?: string
}>(), {
  refLabel: 'cohort median',
  note: '',
})

/** One step brighter than the recessive grid ink: the court outline has to
 *  survive a translucent zone wash laid over it. */
const LINE = '#4a5262'

/**
 * y grows downward, so the baseline is y=47 and half court is y=0.
 * Corner lines run from the baseline to y=33 (14ft up), then the arc.
 * Check: |(3,33) → (25,41.75)| = √(22² + 8.75²) = 23.68 ≈ the 23.75ft radius.
 */
const ARC_LINE = 'M 3,47 L 3,33 A 23.75 23.75 0 0 1 47,33 L 47,47'
const INSIDE_ARC = 'M 3,47 L 3,33 A 23.75 23.75 0 0 1 47,33 L 47,47 Z'
const FLOOR = 'M 0,0 H 50 V 47 H 0 Z'

const byZone = computed(() =>
  Object.fromEntries(props.zones.map((z) => [z.zone, z]))
)

/**
 * How far above or below the reference this zone is, on a −1…+1 scale.
 *
 * Two reference kinds. A percentile (the player page's position cohort) maps
 * straight off 50. A raw reference rate (the game page's opposing team) is
 * scaled by 10 percentage points, which is a large edge for a single game.
 * Returns null when there is nothing to compare against, and the zone then
 * renders neutral rather than picking a colour it has not earned.
 */
function deviation(zone: string): number | null {
  const z = byZone.value[zone]
  if (!z || !z.att) return null
  if (z.percentile != null) return (z.percentile - 50) / 50
  if (z.cohortMedian != null && z.pct != null) {
    return Math.max(-1, Math.min(1, (z.pct - z.cohortMedian) / 10))
  }
  return null
}

/**
 * Green above the reference, blue below. Blue rather than red for "below" on
 * purpose — a cold shooting zone is not an error, and red is reserved in this
 * app for the away side and for losses.
 */
function colorFor(zone: string): string {
  const d = deviation(zone)
  if (d == null) return 'var(--ink-soft)'
  if (d >= 0.2) return VIZ_STATUS.good
  if (d <= -0.2) return VIZ_BRAND_HOME
  return 'var(--ink-soft)'
}
const fillFor = (zone: string) => colorFor(zone)

/**
 * Intensity carries distance from the reference. Kept deliberately low — the
 * court lines and the numbers are the content; the wash is a background cue,
 * and above ~0.2 it swallows both.
 */
function opacityFor(zone: string): number {
  const d = deviation(zone)
  if (d == null) return 0.035
  return 0.05 + Math.abs(d) * 0.13
}

const POS: Record<string, { x: number; y: number }> = {
  '2PT': { x: 25, y: 40 },   // in the paint, below the FT block
  '3PT': { x: 25, y: 11 },   // above the arc
  FT: { x: 25, y: 26 },      // on the free-throw line
}

const placed = computed(() =>
  props.zones
    .filter((z) => POS[z.zone])
    .map((z) => ({ ...z, ...POS[z.zone], color: colorFor(z.zone) }))
)

const zoneName = (z: string) =>
  ({ '2PT': 'Two-point field goals', '3PT': 'Three-point field goals', FT: 'Free throws' }[z] || z)

const ariaLabel = computed(() =>
  props.zones.map((z) => `${z.zone} ${z.made} of ${z.att}`).join(', ')
)
</script>

<style scoped>
/* Capped: the court is a reference figure in a side rail, not the page's
   subject. Unbounded it rendered ~400px tall and dwarfed everything. */
.court-stage {
  max-width: 250px;
  margin-inline: auto;
}
.court {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--r);
  border: 1px solid var(--edge);
}

.z-pct {
  font-size: 3.1px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 0.7px;
  stroke-linejoin: round;
}
.z-vol {
  font-size: 1.9px;
  font-weight: 600;
  fill: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.z-pctl {
  font-size: 1.75px;
  font-weight: 700;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}

/* The stage establishes the coordinate space; hotspots sit over the court in
   the same percentage geometry the SVG viewBox uses. */
.court-stage { position: relative; }
.court-hots {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.court-hot {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.court-hit {
  display: block;
  width: 78px;
  height: 44px;
  cursor: help;
}

.court-note {
  margin-top: 0.5rem;
  font-size: 0.6rem;
  line-height: 1.55;
  color: var(--ink-faint);
}
.court-note strong { color: var(--ink-mute); font-weight: 600; }

.tip-title {
  font-weight: 700;
  color: var(--ink-strong);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-size: 0.6rem;
  letter-spacing: 0.05em;
}
.tip-row { display: flex; justify-content: space-between; gap: 1rem; }
.tip-k { color: var(--ink-mute); }
.tip-v { font-weight: 700; font-variant-numeric: tabular-nums; }
.tip-dim { color: var(--ink-soft); }
.tip-foot {
  margin-top: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint);
  font-size: 0.6rem;
}
</style>
