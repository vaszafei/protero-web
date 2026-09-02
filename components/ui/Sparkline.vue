<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="spark"
    preserveAspectRatio="none"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Zero / reference line, when the series crosses it. -->
    <line
      v-if="showBaseline"
      x1="0" :y1="baselineY" :x2="W" :y2="baselineY"
      :stroke="VIZ_GRID" stroke-width="1" stroke-dasharray="2 3"
      vector-effect="non-scaling-stroke"
    />

    <!-- ±1SD band, when the caller supplies one. -->
    <polygon
      v-if="bandPoints"
      :points="bandPoints"
      :fill="color"
      fill-opacity="0.12"
    />

    <!-- Area under the line — omitted when a baseline is shown, because a
         filled area across a zero line reads as magnitude on both sides. -->
    <polygon
      v-if="area && !showBaseline"
      :points="areaPoints"
      :fill="color"
      fill-opacity="0.1"
    />

    <polyline
      :points="linePoints"
      fill="none"
      :stroke="color"
      :stroke-width="width"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
      :class="{ 'draw-in': animate }"
      :style="animate ? { strokeDasharray: LEN, strokeDashoffset: LEN } : undefined"
    />

    <!-- Last point, so the series has a clear "now". -->
    <circle
      v-if="dot && pts.length"
      :cx="pts[pts.length - 1].x"
      :cy="pts[pts.length - 1].y"
      :r="width + 1.2"
      :fill="color"
      :stroke="VIZ_SURFACE"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<script setup lang="ts">
/**
 * A minimal series mark. No axes, no labels — those belong to the panel around
 * it. `preserveAspectRatio="none"` plus `vector-effect="non-scaling-stroke"`
 * lets it stretch to any container without the stroke deforming.
 *
 * `null` in `values` is a genuine gap (a player who did not play, a round with
 * no fixture) and is skipped rather than drawn as zero.
 */
import { computed } from 'vue'
import { VIZ_GRID, VIZ_SURFACE, VIZ_BRAND_HOME } from '~/utils/viz'

const props = withDefaults(defineProps<{
  values: (number | null)[]
  /** Optional ±band, same length as `values`. */
  band?: { lo: number; hi: number }[] | null
  color?: string
  /** Force the y-domain instead of using the series min/max. */
  min?: number | null
  max?: number | null
  /** Draw a dashed reference line at this y-value (usually 0). */
  baseline?: number | null
  area?: boolean
  dot?: boolean
  width?: number
  animate?: boolean
  label?: string
}>(), {
  band: null,
  color: VIZ_BRAND_HOME,
  min: null,
  max: null,
  baseline: null,
  area: true,
  dot: true,
  width: 1.75,
  animate: true,
  label: '',
})

const W = 100
const H = 32
/** Overestimate of the path length — only needs to exceed it for the draw-in. */
const LEN = 260

const clean = computed(() =>
  props.values.map((v, i) => ({ i, v: v == null || Number.isNaN(Number(v)) ? null : Number(v) }))
)

const domain = computed(() => {
  const nums = clean.value.map((d) => d.v).filter((v): v is number => v != null)
  const extra = props.band ? props.band.flatMap((b) => [b.lo, b.hi]) : []
  const all = [...nums, ...extra]
  if (props.baseline != null) all.push(props.baseline)
  if (!all.length) return { lo: 0, hi: 1 }
  let lo = props.min ?? Math.min(...all)
  let hi = props.max ?? Math.max(...all)
  if (hi === lo) { hi = lo + 1; lo -= 1 }
  // 6% headroom so the line and the dot never touch the edge.
  const pad = (hi - lo) * 0.06
  return { lo: lo - pad, hi: hi + pad }
})

const x = (i: number) => (props.values.length <= 1 ? W / 2 : (i / (props.values.length - 1)) * W)
const y = (v: number) => {
  const { lo, hi } = domain.value
  return H - ((v - lo) / (hi - lo)) * H
}

const pts = computed(() =>
  clean.value.filter((d) => d.v != null).map((d) => ({ x: x(d.i), y: y(d.v as number) }))
)

const linePoints = computed(() => pts.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))

const areaPoints = computed(() => {
  if (!pts.value.length) return ''
  const first = pts.value[0]
  const last = pts.value[pts.value.length - 1]
  return `${first.x.toFixed(1)},${H} ${linePoints.value} ${last.x.toFixed(1)},${H}`
})

const bandPoints = computed(() => {
  if (!props.band?.length) return null
  const top = props.band.map((b, i) => `${x(i).toFixed(1)},${y(b.hi).toFixed(1)}`)
  const bottom = props.band.map((b, i) => `${x(i).toFixed(1)},${y(b.lo).toFixed(1)}`).reverse()
  return [...top, ...bottom].join(' ')
})

const showBaseline = computed(() => {
  if (props.baseline == null) return false
  const { lo, hi } = domain.value
  return props.baseline > lo && props.baseline < hi
})
const baselineY = computed(() => y(props.baseline ?? 0))

const ariaLabel = computed(() => {
  const nums = clean.value.map((d) => d.v).filter((v): v is number => v != null)
  if (!nums.length) return props.label || 'no data'
  return `${props.label || 'series'}: ${nums.length} points, ${Math.min(...nums)} to ${Math.max(...nums)}`
})
</script>

<style scoped>
.spark {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
