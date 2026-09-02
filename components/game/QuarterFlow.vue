<template>
  <section v-if="periods.length" class="panel overflow-hidden">
    <header class="panel-head">
      <span class="panel-title">Scoring flow</span>
      <span class="pill pill-dim">{{ periods.length }} periods</span>
      <span class="panel-link">running margin</span>
    </header>

    <div class="qf">
      <!-- The margin as an area: above the axis the home team leads, below it
           the away team does. One mark answers "who was ahead, and when". -->
      <svg :viewBox="`0 0 ${W} ${H}`" class="qf-svg" preserveAspectRatio="none" role="img" :aria-label="ariaLabel">
        <defs>
          <linearGradient :id="`qf-h-${uid}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="homeColor" stop-opacity="0.42" />
            <stop offset="100%" :stop-color="homeColor" stop-opacity="0.02" />
          </linearGradient>
          <linearGradient :id="`qf-a-${uid}`" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" :stop-color="awayColor" stop-opacity="0.42" />
            <stop offset="100%" :stop-color="awayColor" stop-opacity="0.02" />
          </linearGradient>
          <clipPath :id="`qf-top-${uid}`"><rect x="0" y="0" :width="W" :height="zeroY" /></clipPath>
          <clipPath :id="`qf-bot-${uid}`"><rect x="0" :y="zeroY" :width="W" :height="H - zeroY" /></clipPath>
        </defs>

        <polygon :points="areaPoints" :fill="`url(#qf-h-${uid})`" :clip-path="`url(#qf-top-${uid})`" />
        <polygon :points="areaPoints" :fill="`url(#qf-a-${uid})`" :clip-path="`url(#qf-bot-${uid})`" />

        <line x1="0" :y1="zeroY" :x2="W" :y2="zeroY" :stroke="VIZ_GRID" stroke-width="1" vector-effect="non-scaling-stroke" />
        <polyline
          :points="linePoints"
          fill="none"
          :stroke="finalMargin >= 0 ? homeColor : awayColor"
          stroke-width="2"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <circle
          v-for="(p, i) in pts" :key="i"
          :cx="p.x" :cy="p.y" r="3"
          :fill="p.margin >= 0 ? homeColor : awayColor"
          :stroke="VIZ_SURFACE" stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <!-- Period columns: each period's own score, with the winner marked. -->
      <div class="qf-cols" :style="{ gridTemplateColumns: `4.6rem repeat(${periods.length}, minmax(0, 1fr)) 3.2rem` }">
        <span class="qf-corner" />
        <UiTooltip v-for="p in periods" :key="`h-${p.i}`" :width="230">
          <span class="qf-hdr">{{ p.label }}</span>
          <template #content>
            <div class="tip-title">{{ p.label }}</div>
            <div class="tip-row"><span class="tip-k">{{ homeName }}</span><span class="tip-v" :style="{ color: homeColor }">{{ p.home }}</span></div>
            <div class="tip-row"><span class="tip-k">{{ awayName }}</span><span class="tip-v" :style="{ color: awayColor }">{{ p.away }}</span></div>
            <div class="tip-row"><span class="tip-k">running</span><span class="tip-v">{{ p.cumHome }}–{{ p.cumAway }}</span></div>
            <div class="tip-foot">
              {{ p.margin === 0 ? 'Level' : `${p.margin > 0 ? homeName : awayName} by ${Math.abs(p.margin)}` }} after this period
            </div>
          </template>
        </UiTooltip>
        <span class="qf-hdr qf-total">T</span>

        <span class="qf-team" :style="{ color: homeColor }">{{ shortHome }}</span>
        <span
          v-for="p in periods" :key="`hs-${p.i}`"
          class="qf-cell"
          :class="{ 'qf-win': p.home > p.away }"
        >{{ p.home }}</span>
        <span class="qf-cell qf-total">{{ totalHome }}</span>

        <span class="qf-team" :style="{ color: awayColor }">{{ shortAway }}</span>
        <span
          v-for="p in periods" :key="`as-${p.i}`"
          class="qf-cell"
          :class="{ 'qf-win': p.away > p.home }"
        >{{ p.away }}</span>
        <span class="qf-cell qf-total">{{ totalAway }}</span>
      </div>

      <p class="qf-note">
        The band is the running margin — above the line {{ homeName }} leads, below it
        {{ awayName }} does. A bold period score won that period.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Period-by-period scoring, as a running margin.
 *
 * A quarter table alone ("22 27 26 32") makes the reader do the arithmetic to
 * answer the only interesting question — who was ahead and when the game
 * turned. The area does that directly, and the table stays underneath for the
 * exact numbers.
 *
 * `sport_stats.quarters` exists on 1,942 of 23,703 completed basketball
 * fixtures, so this renders when present and is absent otherwise rather than
 * fabricating a flat line.
 */
import { computed, useId } from 'vue'
import { VIZ_GRID, VIZ_SURFACE, VIZ_BRAND_HOME, VIZ_BRAND_AWAY } from '~/utils/viz'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{
  quarters: { home?: number[]; away?: number[] } | null | undefined
  homeName: string
  awayName: string
}>()

const uid = useId()
const W = 100
const H = 46
const homeColor = VIZ_BRAND_HOME
const awayColor = VIZ_BRAND_AWAY

const periods = computed(() => {
  const h = props.quarters?.home
  const a = props.quarters?.away
  if (!Array.isArray(h) || !Array.isArray(a) || !h.length) return []
  const n = Math.min(h.length, a.length)
  const out: any[] = []
  let cumHome = 0
  let cumAway = 0
  for (let i = 0; i < n; i++) {
    cumHome += Number(h[i]) || 0
    cumAway += Number(a[i]) || 0
    out.push({
      i,
      // Anything past the fourth is overtime, and should say so.
      label: i < 4 ? `Q${i + 1}` : `OT${i - 3}`,
      home: Number(h[i]) || 0,
      away: Number(a[i]) || 0,
      cumHome,
      cumAway,
      margin: cumHome - cumAway,
    })
  }
  return out
})

const totalHome = computed(() => periods.value.at(-1)?.cumHome ?? 0)
const totalAway = computed(() => periods.value.at(-1)?.cumAway ?? 0)
const finalMargin = computed(() => periods.value.at(-1)?.margin ?? 0)

/** Symmetric domain so "level" is always the middle of the box. */
const bound = computed(() => {
  const m = Math.max(4, ...periods.value.map((p) => Math.abs(p.margin)))
  return m * 1.15
})
const zeroY = computed(() => H / 2)

const pts = computed(() => {
  const n = periods.value.length
  // Start at 0-0 before the first period so the line begins level.
  const all = [{ margin: 0 }, ...periods.value]
  return all.map((p, i) => ({
    x: n > 0 ? (i / n) * W : 0,
    y: zeroY.value - (p.margin / bound.value) * (H / 2 - 3),
    margin: p.margin,
  }))
})

const linePoints = computed(() => pts.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const areaPoints = computed(() => {
  if (!pts.value.length) return ''
  const first = pts.value[0]
  const last = pts.value[pts.value.length - 1]
  return `${first.x},${zeroY.value} ${linePoints.value} ${last.x},${zeroY.value}`
})

const short = (s: string) => {
  const w = (s || '').split(/\s+/).filter(Boolean)
  return (w.length > 1 ? w[w.length - 1] : s || '').slice(0, 8)
}
const shortHome = computed(() => short(props.homeName))
const shortAway = computed(() => short(props.awayName))

const ariaLabel = computed(() =>
  `Running margin by period: ${periods.value.map((p) => `${p.label} ${p.cumHome}-${p.cumAway}`).join(', ')}`
)
</script>

<style scoped>
.qf { padding: 0.6rem 0.7rem 0.5rem; }

.qf-svg {
  display: block;
  width: 100%;
  height: 74px;
}

.qf-cols {
  display: grid;
  gap: 0.1rem 0.2rem;
  margin-top: 0.4rem;
  align-items: center;
}

.qf-hdr {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-faint);
  text-align: center;
  cursor: help;
  display: block;
}
.qf-corner { display: block; }

.qf-team {
  font-size: 0.6rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qf-cell {
  font-size: 0.72rem;
  color: var(--ink-mute);
  text-align: center;
  font-variant-numeric: tabular-nums;
  padding: 0.1rem 0;
}
.qf-win {
  color: var(--ink-strong);
  font-weight: 700;
}
.qf-total {
  color: var(--ink);
  font-weight: 700;
  border-left: 1px solid var(--edge-soft);
}

.qf-note {
  margin-top: 0.45rem;
  font-size: 0.57rem;
  line-height: 1.5;
  color: var(--ink-faint);
}

.tip-title { font-weight: 700; color: var(--ink-strong); margin-bottom: 0.25rem; }
.tip-row { display: flex; justify-content: space-between; gap: 1rem; }
.tip-k { color: var(--ink-mute); }
.tip-v { font-weight: 700; font-variant-numeric: tabular-nums; }
.tip-foot {
  margin-top: 0.3rem; padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint); font-size: 0.58rem;
}
</style>
