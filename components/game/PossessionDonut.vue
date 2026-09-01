<template>
  <div class="donut-wrap" ref="el">
    <div class="donut-ring">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
        <circle
          :cx="center" :cy="center" :r="radius"
          fill="none" stroke="#2a2f3a" :stroke-width="stroke"
        />
        <circle
          :cx="center" :cy="center" :r="radius"
          fill="none" :stroke="VIZ_HOME" :stroke-width="stroke"
          stroke-linecap="round"
          :stroke-dasharray="`${visible ? homeArc : 0} ${circumference - (visible ? homeArc : 0)}`"
          :stroke-dashoffset="0"
          :transform="`rotate(-90 ${center} ${center})`"
          class="donut-arc"
        />
        <circle
          v-if="awayArc > 0.5"
          :cx="center" :cy="center" :r="radius"
          fill="none" :stroke="VIZ_AWAY" :stroke-width="stroke"
          stroke-linecap="round"
          :stroke-dasharray="`${visible ? awayArc : 0} ${circumference - (visible ? awayArc : 0)}`"
          :stroke-dashoffset="visible ? -homeArc : 0"
          :transform="`rotate(-90 ${center} ${center})`"
          class="donut-arc"
        />
        <text
          :x="center" :y="center" text-anchor="middle" dominant-baseline="central"
          class="donut-value tabular-nums"
        >{{ homePct }}%</text>
      </svg>
    </div>

    <div class="donut-legend">
      <span class="donut-legend-row">
        <span class="legend-swatch" :style="{ background: VIZ_HOME }" />
        <span class="donut-label">{{ homeLabel }}</span>
        <span class="donut-pct tabular-nums">{{ homePct }}%</span>
      </span>
      <span class="donut-legend-row">
        <span class="legend-swatch" :style="{ background: VIZ_AWAY }" />
        <span class="donut-label">{{ awayLabel }}</span>
        <span class="donut-pct tabular-nums">{{ awayPct }}%</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps<{
  home: number
  away: number
  homeLabel: string
  awayLabel: string
}>()

const el = ref<HTMLElement | null>(null)
const visible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !el.value) {
    visible.value = true
    return
  }
  // Re-fires the sweep every time the donut re-enters view, matching the
  // momentum chart's draw-in — motion doesn't stop after the first paint.
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) visible.value = entry.isIntersecting
  }, { threshold: 0.3 })
  observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())

const size = 120
const stroke = 12
const center = size / 2
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

const total = computed(() => Number(props.home) + Number(props.away))
const homePct = computed(() => {
  if (!total.value) return 50
  return Math.round((Number(props.home) / total.value) * 100)
})
const awayPct = computed(() => 100 - homePct.value)

const homeArc = computed(() => circumference * (homePct.value / 100))
const awayArc = computed(() => circumference * (awayPct.value / 100))
</script>

<style scoped>
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.donut-arc {
  transition: stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.donut-value {
  fill: rgb(244, 244, 245);
  font-size: 1.1rem;
  font-weight: 700;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.donut-legend-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.donut-label {
  color: rgb(161, 161, 170);
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut-pct {
  color: rgb(212, 212, 216);
  font-weight: 600;
  margin-left: auto;
}

.legend-swatch {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  display: inline-block;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .donut-arc {
    transition: none;
  }
}
</style>
