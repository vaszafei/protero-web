<template>
  <div class="panel hex">
    <div class="panel-head">
      <span class="panel-title">Profile</span>
      <span class="panel-link">{{ season }}</span>
    </div>

    <!-- Below the minutes floor the rates are one or two matches of football
         divided by a small number. Say so instead of drawing a confident
         shape — a hexagon built on 40 minutes looks exactly like one built on
         a season, which is the whole problem with radars. -->
    <div v-if="!qualifies" class="hex-gate">
      <p class="hex-gate-t">Not enough minutes to profile</p>
      <p class="hex-gate-b">
        The cohort needs {{ cohort.min_minutes }} minutes for a per-{{ per }} rate to be
        worth plotting; this player has
        <strong>{{ minutes != null ? Math.round(minutes) : 0 }}</strong> this season.
        The match log below is unaffected.
      </p>
    </div>

    <template v-else-if="axes.length">
      <UiRadar
        :axes="radarAxes"
        :color="color"
        :cohort-label="cohort.label"
        class="hex-chart"
      />

      <!-- The same six numbers as a list. The radar shows shape; a reader
           chasing one value should not have to hover to read it. -->
      <ul class="hex-list">
        <li v-for="a in axes" :key="a.axis" class="hex-item">
          <span class="hex-k">{{ a.axis }}</span>
          <span class="hex-v">{{ fmtValue(a) }}</span>
          <span class="hex-bar">
            <span
              class="hex-fill grow-x"
              :style="{ width: `${clamp(a.percentile)}%`, background: rank(a.percentile) }"
            />
            <span class="hex-median" />
          </span>
          <span class="hex-p" :style="{ color: rank(a.percentile) }">
            {{ Math.round(clamp(a.percentile)) }}
          </span>
        </li>
      </ul>

      <p class="hex-note">
        Each axis is a <strong>percentile</strong> within {{ cohort.n }}
        {{ cohort.label }} who played at least {{ cohort.min_minutes }} minutes this season —
        not a raw value. The dashed ring and the notch on each bar are the cohort median,
        so the 50th is average by construction. Hover any point for the underlying number.
      </p>
    </template>

    <p v-else class="hex-note">No rated appearances this season.</p>
  </div>
</template>

<script setup lang="ts">
/**
 * The player radar — six axes, each a cohort percentile.
 *
 * The gate matters more than the chart. A radar drawn from a small denominator
 * is indistinguishable from one drawn from a full season, so this refuses to
 * draw below the cohort's own minutes floor and says why.
 */
import { computed } from 'vue'
import { VIZ_STATUS, VIZ_BRAND_HOME } from '~/utils/viz'
import UiRadar from '~/components/ui/Radar.vue'

const props = defineProps<{
  axes: any[]
  cohort: { position?: string | null; n: number; min_minutes: number; label: string; subject_qualifies: boolean }
  season: string
  sport: 'football' | 'basketball'
  minutes?: number | null
  color?: string
}>()

const color = computed(() => props.color || VIZ_BRAND_HOME)
const per = computed(() => (props.sport === 'basketball' ? '36' : '90'))
const qualifies = computed(() => props.cohort?.subject_qualifies !== false)

const clamp = (v: any) => Math.min(100, Math.max(0, Number(v) || 0))

/** Green above the cohort median, blue below. Never red — a below-median
 *  percentile is not an error, and red is reserved here for losses. */
function rank(p: any): string {
  const v = clamp(p)
  if (v >= 60) return VIZ_STATUS.good
  if (v <= 40) return VIZ_BRAND_HOME
  return 'var(--ink-soft)'
}

function fmtValue(a: any): string {
  const v = a?.value
  if (v == null) return '—'
  const n = Number(v)
  const dp = a.unit === '%' ? 1 : Math.abs(n) >= 10 ? 1 : 2
  return `${n.toFixed(dp)}${a.unit === '%' ? '%' : ''}`
}

const radarAxes = computed(() =>
  props.axes.map((a) => ({
    axis: a.axis,
    value: Number(a.value),
    percentile: clamp(a.percentile),
    cohortMedian: a.cohortMedian != null ? Number(a.cohortMedian) : null,
    n: a.n ?? null,
    display: fmtValue(a),
    cohortDisplay: a.cohortMedian != null
      ? fmtValue({ value: a.cohortMedian, unit: a.unit })
      : undefined,
  }))
)
</script>

<style scoped>
.hex { padding-bottom: 0.7rem; }
.hex-chart { margin: 0.6rem 0 0.2rem; }

.hex-gate {
  padding: 1.4rem 0.9rem;
  text-align: center;
}
.hex-gate-t {
  font-size: 0.76rem; font-weight: 700; color: var(--ink-soft);
}
.hex-gate-b {
  margin-top: 0.3rem; font-size: 0.63rem; line-height: 1.6;
  color: var(--ink-faint); max-width: 34ch; margin-inline: auto;
}
.hex-gate-b strong { color: var(--ink-soft); }

.hex-list { padding: 0.3rem 0.8rem 0; }
.hex-item {
  display: grid;
  grid-template-columns: 5.6rem 3.2rem 1fr 1.6rem;
  align-items: center;
  gap: 0.45rem;
  padding: 0.2rem 0;
}
.hex-k {
  font-size: 0.6rem; color: var(--ink-mute);
  text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hex-v {
  font-size: 0.68rem; font-weight: 700; color: var(--ink);
  font-variant-numeric: tabular-nums; text-align: right;
}
.hex-bar {
  position: relative;
  height: 5px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.hex-fill {
  display: block; height: 100%; border-radius: var(--r-pill);
}
/* The cohort median, at the 50th by construction. */
.hex-median {
  position: absolute;
  left: 50%; top: -1px; bottom: -1px;
  width: 1px;
  background: var(--ink-faint);
  opacity: 0.7;
}
.hex-p {
  font-size: 0.62rem; font-weight: 700;
  font-variant-numeric: tabular-nums; text-align: right;
}

.hex-note {
  padding: 0.6rem 0.8rem 0;
  font-size: 0.58rem; line-height: 1.6; color: var(--ink-faint);
}
.hex-note strong { color: var(--ink-mute); font-weight: 600; }
</style>
