<template>
  <div class="momentum">
    <div class="momentum-head">
      <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Pressure</span>
      <span class="text-[10px] text-zinc-600">cumulative shots / SOT / corners by minute</span>
    </div>

    <svg
      v-if="homeLine || awayLine"
      :viewBox="`0 0 ${W} ${H}`"
      class="momentum-svg"
      preserveAspectRatio="none"
    >
      <!-- gridlines -->
      <line
        v-for="y in gridY"
        :key="`y${y}`"
        :x1="PAD_L" :y1="y" :x2="W - PAD_R" :y2="y"
        class="momentum-grid"
      />
      <line :x1="PAD_L" :y1="H - PAD_B" :x2="W - PAD_R" :y2="H - PAD_B" class="momentum-axis" />

      <!-- area fills -->
      <path
        v-if="homeArea"
        :d="homeArea"
        class="momentum-area momentum-area-home"
        :class="{ 'momentum-fade': draw }"
      />
      <path
        v-if="awayArea"
        :d="awayArea"
        class="momentum-area momentum-area-away"
        :class="{ 'momentum-fade': draw }"
      />

      <!-- lines -->
      <path
        v-if="homeLine"
        :d="homeLine"
        class="momentum-line momentum-line-home"
        :path-length="1"
        :class="{ 'momentum-draw': draw }"
      />
      <path
        v-if="awayLine"
        :d="awayLine"
        class="momentum-line momentum-line-away"
        :path-length="1"
        :class="{ 'momentum-draw': draw }"
      />

      <!-- end dots -->
      <circle
        v-if="lastHome"
        :cx="lastHome.x" :cy="lastHome.y" r="3"
        class="momentum-dot momentum-dot-home"
      />
      <circle
        v-if="lastAway"
        :cx="lastAway.x" :cy="lastAway.y" r="3"
        class="momentum-dot momentum-dot-away"
      />
    </svg>

    <div v-else class="momentum-empty">
      No event-level data to chart. Showing the final stat split below.
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-center gap-4 mt-1.5">
      <span class="flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span class="legend-swatch" :style="{ background: VIZ_HOME }" />
        {{ homeLabel }}
      </span>
      <span class="flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span class="legend-swatch" :style="{ background: VIZ_AWAY }" />
        {{ awayLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps<{
  events: Array<Record<string, any>>
  homeLabel: string
  awayLabel: string
}>()

const W = 600
const H = 160
const PAD_L = 8
const PAD_R = 8
const PAD_B = 8
const PAD_T = 10

// The honest momentum line is cumulative attacking events by minute, from
// match_events — goals, shots-on-target events, corners. No per-minute xG is
// invented (match_events carries none).
const ATTACK_TYPES = ['goal', 'own-goal', 'penalty_goal', 'shot', 'shot-on-target', 'corner', 'penalty-missed']

const draw = ref(false)
onMounted(() => {
  // Trigger the stroke-dashoffset draw on next frame.
  requestAnimationFrame(() => { draw.value = true })
})

interface Pt { x: number; y: number }

const series = computed(() => {
  const events = [...(props.events || [])].sort((a, b) => minute(a) - minute(b))
  const home: Pt[] = [{ x: 0, y: 0 }]
  const away: Pt[] = [{ x: 0, y: 0 }]
  let h = 0
  let a = 0
  for (const e of events) {
    if (!ATTACK_TYPES.includes(String(e.type || ''))) continue
    // match_events carries `isHome` (parsed from JSONB); accept `team` as a fallback.
    const isAway = e.isHome === false || e.isHome === 'false' || e.team === 'away'
    const m = Math.max(0, minute(e))
    if (isAway) {
      a += 1
      away.push({ x: m, y: a })
    } else {
      h += 1
      home.push({ x: m, y: h })
    }
  }
  return { home, away, max: Math.max(h, a, 1) }
})

function minute(e: Record<string, any>): number {
  const m = e?.minute
  if (typeof m === 'string') {
    const n = parseInt(m.replace(/['+]/g, ''), 10)
    return isNaN(n) ? 0 : n
  }
  const n = parseInt(m, 10)
  return isNaN(n) ? 0 : n
}

const maxMinute = computed(() => {
  const m = Math.max(...(props.events || []).map(minute), 0)
  return Math.max(m, 90)
})

function scale(pts: Pt[]): Pt[] {
  const mx = maxMinute.value
  const my = series.value.max
  return pts.map(p => ({
    x: PAD_L + (p.x / mx) * (W - PAD_L - PAD_R),
    y: H - PAD_B - (p.y / my) * (H - PAD_B - PAD_T),
  }))
}

const homePts = computed(() => scale(series.value.home))
const awayPts = computed(() => scale(series.value.away))

const gridY = computed(() => {
  const my = series.value.max
  const ys: number[] = []
  const steps = Math.min(4, my)
  for (let i = 1; i <= steps; i++) {
    ys.push(H - PAD_B - (i / my) * (H - PAD_B - PAD_T))
  }
  return ys
})

function toLine(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

function toArea(pts: Pt[]): string {
  if (pts.length < 2) return ''
  const line = toLine(pts)
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${H - PAD_B} L ${pts[0].x.toFixed(1)} ${H - PAD_B} Z`
}

const homeLine = computed(() => (homePts.value.length >= 2 ? toLine(homePts.value) : ''))
const awayLine = computed(() => (awayPts.value.length >= 2 ? toLine(awayPts.value) : ''))
const homeArea = computed(() => (homePts.value.length >= 2 ? toArea(homePts.value) : ''))
const awayArea = computed(() => (awayPts.value.length >= 2 ? toArea(awayPts.value) : ''))

const lastHome = computed(() => homePts.value[homePts.value.length - 1] || null)
const lastAway = computed(() => awayPts.value[awayPts.value.length - 1] || null)
</script>

<style scoped>
.momentum-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.momentum-svg {
  width: 100%;
  height: 160px;
  display: block;
}

.momentum-grid {
  stroke: #343a47;
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

.momentum-axis {
  stroke: #343a47;
  stroke-width: 1;
}

.momentum-line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.momentum-area {
  opacity: 0;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.momentum-line-home { stroke: #3987e5; }
.momentum-line-away { stroke: #d95926; }
.momentum-area-home { fill: #3987e5; stroke: #3987e5; stroke-width: 0; }
.momentum-area-away { fill: #d95926; stroke: #d95926; stroke-width: 0; }

.momentum-draw {
  animation: momentumDraw 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.momentum-fade {
  animation: momentumFade 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes momentumDraw {
  to { stroke-dashoffset: 0; }
}

@keyframes momentumFade {
  to { opacity: 0.12; }
}

.momentum-dot { fill: #1c1f27; stroke-width: 2; }
.momentum-dot-home { stroke: #3987e5; }
.momentum-dot-away { stroke: #d95926; }

.legend-swatch {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  display: inline-block;
}

.momentum-empty {
  padding: 2rem 0;
  text-align: center;
  color: rgb(113, 113, 122);
  .momentum-fade {
    animation: none;
    opacity: 0.12;
  }
  font-size: 0.75rem;
}

@media (prefers-reduced-motion: reduce) {
  .momentum-draw {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
