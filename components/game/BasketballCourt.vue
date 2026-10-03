<template>
  <section class="panel overflow-hidden" data-testid="bball-court">
    <header class="panel-head">
      <span class="panel-title">Shooting by zone</span>
      <UiTooltip class="ml-auto" :width="360" placement="bottom">
        <span class="panel-link">how to read</span>
        <template #content>
          <p>
            Zone totals for this game, not a shot chart: makes and attempts per zone, not shot locations.
            The box score carries no coordinates, so nothing here is plotted where a shot was taken.
          </p>
          <p class="mt-2">
            Each zone is shaded against the opposing team in this fixture: green above their rate there, blue
            below, grey within two points. The percentage is the team's own rate.
          </p>
        </template>
      </UiTooltip>
    </header>

    <div class="court-wrap">
      <div class="court-stage">
        <svg :viewBox="`0 0 ${W} ${H}`" class="court" role="img" :aria-label="ariaLabel">
          <rect x="0" y="0" :width="W" :height="H" :fill="VIZ_SURFACE" />

          <!-- Team tint: each half is its team's, in the colours the rest of the page uses. -->
          <rect x="0" y="0" :width="W / 2" :height="H" :fill="VIZ_HOME" fill-opacity="0.035" />
          <rect :x="W / 2" y="0" :width="W / 2" :height="H" :fill="VIZ_AWAY" fill-opacity="0.035" />

          <g v-for="half in halves" :key="half.side" :transform="half.transform" :data-side="half.side">
            <!-- 3PT is the floor minus the area inside the arc (even-odd, so washes do not compound). -->
            <path :d="`${HALF_FLOOR} ${INSIDE_ARC}`" fill-rule="evenodd" :fill="half.fill['3PT']" :fill-opacity="half.opacity['3PT']" />
            <path :d="INSIDE_ARC" :fill="half.fill['2PT']" :fill-opacity="half.opacity['2PT']" />
            <!-- Free throws happen at the line, so FT is tied to the paint's far edge. -->
            <rect x="14" y="17" width="10" height="16" rx="0.6" :fill="half.fill.FT" :fill-opacity="half.opacity.FT" />

            <g :stroke="LINE" stroke-width="0.28" stroke-opacity="0.9" fill="none" vector-effect="non-scaling-stroke">
              <rect x="0" y="17" width="19" height="16" />
              <circle cx="19" cy="25" r="6" />
              <path d="M 4,21 L 5.25,21 A 4 4 0 0 1 5.25,29 L 4,29" />
              <circle cx="5.25" cy="25" r="0.75" />
              <line x1="4" y1="22" x2="4" y2="28" stroke-width="0.4" />
              <path :d="ARC_LINE" stroke-width="0.34" />
            </g>
          </g>

          <!-- Court outline and halfway line, drawn once. -->
          <g :stroke="LINE" stroke-width="0.28" stroke-opacity="0.9" fill="none" vector-effect="non-scaling-stroke">
            <rect x="0.15" y="0.15" :width="W - 0.3" :height="H - 0.3" />
            <line :x1="W / 2" y1="0" :x2="W / 2" :y2="H" />
            <circle :cx="W / 2" :cy="H / 2" r="6" />
          </g>

          <!-- Zone callouts, in the region each describes. Home reads left to right, away mirrored. -->
          <g v-for="c in callouts" :key="c.key" :data-side="c.side" :data-zone="c.zone">
            <text :x="c.x" :y="c.y" class="z-pct" text-anchor="middle" :fill="c.color">{{ c.pct == null ? '—' : c.pct.toFixed(1) + '%' }}</text>
            <text :x="c.x" :y="c.y + 3.3" class="z-vol" text-anchor="middle">{{ c.made == null ? '—' : `${c.made}/${c.att}` }} {{ c.zone }}</text>
          </g>

          <text :x="3" y="4.6" class="z-team" :fill="VIZ_HOME">{{ homeName }}</text>
          <text :x="W - 3" y="4.6" class="z-team" text-anchor="end" :fill="VIZ_AWAY">{{ awayName }}</text>
        </svg>

        <div class="court-hots">
          <UiTooltip
            v-for="c in callouts"
            :key="`t-${c.key}`"
            class="court-hot"
            :style="{ left: `${(c.x / W) * 100}%`, top: `${((c.y + 1.6) / H) * 100}%` }"
            :width="250"
          >
            <span class="court-hit" />
            <template #content>
              <div class="tip-title">{{ c.team }} · {{ ZONE_NAMES[c.zone] }}</div>
              <template v-if="c.made != null">
                <div class="tip-row"><span class="tip-k">made / attempted</span><span class="tip-v">{{ c.made }} / {{ c.att }}</span></div>
                <div class="tip-row"><span class="tip-k">rate</span><span class="tip-v" :style="{ color: c.color }">{{ c.pct == null ? '—' : c.pct.toFixed(1) + '%' }}</span></div>
                <div v-if="c.ref != null" class="tip-row"><span class="tip-k">opponent</span><span class="tip-v tip-dim">{{ c.ref.toFixed(1) }}%</span></div>
              </template>
              <div v-else class="tip-foot">{{ c.reason }}</div>
            </template>
          </UiTooltip>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * One full court for a completed basketball game: the home team's zones on the left half, the
 * away team's on the right, each shaded against the other team in this fixture.
 *
 * It is a zone-total graphic and says so. `basketball_shots` holds no rows for any game since
 * 2026-09-01, so there are no shot coordinates; dots would be invented locations. If shot
 * locations are ever ingested, this is where they go.
 *
 * Geometry is NBA regulation in feet: 94 × 50, basket 5.25 ft off the baseline, a 16 ft paint
 * 19 ft deep, a 23.75 ft arc breaking to 22 ft corners 14 ft from the baseline. It is drawn once
 * for the left half and mirrored for the right.
 *
 * Every number comes from `utils/basketball-box`, the reader the stat bars and rails use.
 */
import { computed } from 'vue'
import { VIZ_SURFACE, VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import { boxScore, type Shooting } from '~/utils/basketball-box'
import { ZONE_NAMES, zoneColor, zoneOpacity, type Zone } from '~/utils/shooting-zones'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{
  sportStats: any
  homeName: string
  awayName: string
}>()

const W = 94
const H = 50
const LINE = '#4a5262'

/** Corner lines run 14 ft out along the sidelines, then the arc (centre = the basket). */
const ARC_LINE = 'M 0,3 L 14,3 A 23.75 23.75 0 0 1 14,47 L 0,47'
const INSIDE_ARC = 'M 0,3 L 14,3 A 23.75 23.75 0 0 1 14,47 L 0,47 Z'
const HALF_FLOOR = 'M 0,0 H 47 V 50 H 0 Z'

type ZoneKey = '2PT' | '3PT' | 'FT'
const ZONES: { zone: ZoneKey; key: 'fg2' | 'fg3' | 'ft'; x: number; y: number }[] = [
  { zone: '2PT', key: 'fg2', x: 7.5, y: 24 },
  { zone: '3PT', key: 'fg3', x: 38, y: 24 },
  { zone: 'FT', key: 'ft', x: 22.5, y: 24 },
]

const box = computed(() => boxScore(props.sportStats))

const zoneOf = (key: 'fg2' | 'fg3' | 'ft', side: 'home' | 'away', zone: ZoneKey): Zone | undefined => {
  const mine: Shooting | null = box.value[side][key]
  if (!mine) return undefined
  const theirs: Shooting | null = box.value[side === 'home' ? 'away' : 'home'][key]
  return {
    zone,
    made: mine.made,
    att: mine.att,
    pct: mine.att > 0 ? (100 * mine.made) / mine.att : null,
    // The reference is the OTHER team in this game, the only comparison one fixture honestly supports.
    cohortMedian: theirs && theirs.att > 0 ? (100 * theirs.made) / theirs.att : null,
  }
}

const halves = computed(() => (['home', 'away'] as const).map((side) => {
  const fill: Record<string, string> = {}
  const opacity: Record<string, number> = {}
  for (const z of ZONES) {
    const zone = zoneOf(z.key, side, z.zone)
    fill[z.zone] = zoneColor(zone)
    opacity[z.zone] = zoneOpacity(zone)
  }
  return {
    side,
    transform: side === 'home' ? undefined : `translate(${W},0) scale(-1,1)`,
    fill,
    opacity,
  }
}))

const callouts = computed(() => (['home', 'away'] as const).flatMap((side) =>
  ZONES.map((z) => {
    const zone = zoneOf(z.key, side, z.zone)
    const reason = box.value.reason(side, z.key)
    return {
      key: `${side}-${z.zone}`,
      side,
      team: side === 'home' ? props.homeName : props.awayName,
      zone: z.zone,
      // The right half is the left one mirrored, so a callout's x flips with it.
      x: side === 'home' ? z.x : W - z.x,
      y: z.y,
      made: zone ? zone.made : null,
      att: zone ? zone.att : null,
      pct: zone ? zone.pct : null,
      ref: zone?.cohortMedian ?? null,
      color: zoneColor(zone),
      reason,
    }
  }),
))

const ariaLabel = computed(() => callouts.value
  .filter((c) => c.made != null)
  .map((c) => `${c.team} ${c.zone} ${c.made} of ${c.att}`)
  .join(', '))
</script>

<style scoped>
.court-wrap { padding: 0.6rem 0.7rem 0.7rem; }
.court-stage { position: relative; }
.court {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--r);
  border: 1px solid var(--edge);
}

.z-pct {
  font-size: 3px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 0.7px;
  stroke-linejoin: round;
}
.z-vol {
  font-size: 2.1px;
  font-weight: 600;
  fill: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}
.z-team {
  font-size: 2.3px;
  font-weight: 800;
  text-transform: uppercase;
}

.court-hots { position: absolute; inset: 0; pointer-events: none; }
.court-hot {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.court-hit { display: block; width: 64px; height: 40px; cursor: help; }

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
