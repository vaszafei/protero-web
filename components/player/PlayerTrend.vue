<template>
  <div class="panel trend">
    <div class="panel-head">
      <span class="panel-title">Season shape</span>
      <span class="panel-link">{{ ordered.length }} apps</span>
    </div>

    <div v-if="!series.length" class="trend-empty">
      No per-appearance detail for this season.
    </div>

    <div v-for="s in series" :key="s.key" class="trend-row">
      <div class="trend-meta">
        <span class="trend-k">{{ s.label }}</span>
        <span class="trend-v">
          {{ s.lastText }}
          <span class="trend-mean">avg {{ s.meanText }}</span>
        </span>
      </div>
      <div class="trend-chart">
        <UiSparkline
          :values="s.values"
          :color="s.color"
          :baseline="s.baseline"
          :area="s.baseline == null"
          :label="s.label"
        />
      </div>
    </div>

    <p v-if="series.length" class="trend-note">
      One point per appearance, oldest left. Gaps are fixtures this stat was never scraped
      for — the line skips them rather than plotting a zero.
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Per-appearance trend for the season, from the match log already loaded.
 *
 * This exists because the football profile column was 9 columns wide holding
 * one small hexagon and two-thirds dead space. It adds no request: the same
 * `log` array the table below renders.
 */
import { computed } from 'vue'
import { VIZ_BRAND_HOME, VIZ_STATUS, VIZ_CAT } from '~/utils/viz'
import UiSparkline from '~/components/ui/Sparkline.vue'

const props = defineProps<{
  rows: any[]
  sport: 'football' | 'basketball'
}>()

/** The log arrives newest-first; a time series reads oldest-left. */
const ordered = computed(() => [...(props.rows || [])].reverse())

interface Spec { key: string; label: string; color: string; dp: number; baseline?: number | null }

const FOOTBALL: Spec[] = [
  { key: 'rating', label: 'Rating', color: VIZ_BRAND_HOME, dp: 1 },
  { key: 'xg', label: 'xG', color: VIZ_STATUS.good, dp: 2 },
  { key: 'minutes_played', label: 'Minutes', color: VIZ_CAT[2], dp: 0 },
]

const BASKETBALL: Spec[] = [
  { key: 'points', label: 'Points', color: VIZ_BRAND_HOME, dp: 0 },
  { key: 'minutes', label: 'Minutes', color: VIZ_CAT[2], dp: 0 },
  { key: 'plus_minus', label: 'Plus-minus', color: VIZ_STATUS.good, dp: 0, baseline: 0 },
]

const series = computed(() => {
  const specs = props.sport === 'basketball' ? BASKETBALL : FOOTBALL
  return specs
    .map((s) => {
      const values = ordered.value.map((r) => {
        const v = r?.[s.key]
        return v == null || v === '' ? null : Number(v)
      })
      const present = values.filter((v): v is number => v != null && !Number.isNaN(v))
      if (present.length < 2) return null
      const mean = present.reduce((a, b) => a + b, 0) / present.length
      const last = [...values].reverse().find((v) => v != null) ?? null
      return {
        ...s,
        values,
        meanText: mean.toFixed(s.dp),
        lastText: last != null ? last.toFixed(s.dp) : '—',
        baseline: s.baseline ?? null,
      }
    })
    .filter(Boolean) as any[]
})
</script>

<style scoped>
.trend { padding-bottom: 0.2rem; }

.trend-row {
  padding: 0.5rem 0.8rem;
  border-top: 1px solid var(--edge-soft);
}
.trend-row:first-of-type { border-top: none; }

.trend-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.trend-k {
  font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-faint); font-weight: 700;
}
.trend-v {
  font-size: 0.8rem; font-weight: 700; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.trend-mean {
  margin-left: 0.35rem; font-size: 0.58rem; font-weight: 600; color: var(--ink-faint);
}

.trend-chart { height: 34px; }

.trend-empty, .trend-note {
  padding: 0.7rem 0.8rem;
  font-size: 0.6rem; line-height: 1.55; color: var(--ink-faint);
}
</style>
