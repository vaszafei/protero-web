<template>
  <div class="pb">
    <!-- Label + the two numbers -->
    <div class="pb-head">
      <span class="pb-name">{{ label }}</span>
      <span v-if="price" class="pb-price">{{ Number(price).toFixed(2) }}</span>
      <span class="pb-spacer" />
      <UiTooltip :width="270">
        <span class="pb-nums">
          <span class="pb-mkt">{{ pctText(market) }}</span>
          <span class="pb-vs">vs</span>
          <span class="pb-our" :style="{ color: gapColor }">{{ pctText(ours) }}</span>
        </span>
        <template #content>
          <div class="tip-title">{{ label }}</div>
          <div class="tip-row"><span class="tip-k">market</span><span class="tip-v">{{ pctText(market) }}</span></div>
          <div v-if="price" class="tip-row"><span class="tip-k">price</span><span class="tip-v">{{ Number(price).toFixed(2) }}</span></div>
          <div class="tip-row"><span class="tip-k">{{ ourLabel }}</span><span class="tip-v" :style="{ color: gapColor }">{{ pctText(ours) }}</span></div>
          <div class="tip-row">
            <span class="tip-k">difference</span>
            <span class="tip-v" :style="{ color: gapColor }">{{ signed(gapPp) }}pp</span>
          </div>
          <div class="tip-foot">{{ devigNote }}</div>
        </template>
      </UiTooltip>
    </div>

    <!-- The track. One axis, both probabilities on it — the whole point is
         that they are the same quantity and therefore directly comparable. -->
    <div class="pb-track">
      <!-- The span between the two, so the gap is a length and not arithmetic
           the reader has to do. -->
      <span
        v-if="ours != null && market != null"
        class="pb-gap"
        :style="{ left: `${Math.min(mPct, oPct)}%`, width: `${Math.abs(oPct - mPct)}%`, background: gapColor }"
      />

      <!-- Market marker: the reference. A full-height rule, deliberately
           neutral — it is the thing being compared against, not a series. -->
      <span v-if="market != null" class="pb-mkt-mark" :style="{ left: `${mPct}%` }" />

      <!-- Ours -->
      <span
        v-if="ours != null"
        class="pb-our-mark"
        :style="{ left: `${oPct}%`, background: gapColor, borderColor: gapColor }"
      />
    </div>

    <!-- Verdict line. This is where the honesty lives: an edge is only shown
         where the cell is masked-in, because a number we never bet is not an
         edge, it is a difference. -->
    <div class="pb-foot">
      <template v-if="ours == null">
        <span class="pb-muted">no model number for this market</span>
      </template>
      <template v-else-if="!enabled">
        <span class="pb-muted">{{ disabledNote }}</span>
      </template>
      <template v-else>
        <span class="pb-edge" :style="{ color: gapColor }">{{ signed(gapPp) }}pp</span>
        <span class="pb-muted">{{ gapPp >= 0 ? 'above' : 'below' }} the de-vigged price</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * One market, two probabilities, one axis.
 *
 * The unit of comparison is PROBABILITY, not price and not EV. A price carries
 * the book's margin, so comparing our probability to an implied probability
 * straight off the odds overstates every edge by roughly half the vig; the
 * `market` prop must already be de-vigged (Shin — root CD #40).
 *
 * The `enabled` flag is doing real work. Where `ml/v6/masks.py` does not enable
 * a (league, market) cell, the difference between our number and the market's
 * is still shown — it is a fact — but it is NOT called an edge, because the
 * project has no holdout evidence that the difference is real. Rendering every
 * disagreement as an edge is how a model that is redundant to the price
 * (`do-not-do.md` §6) ends up looking like a money machine.
 */
import { computed } from 'vue'
import { VIZ_BRAND_HOME, VIZ_STATUS } from '~/utils/viz'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = withDefaults(defineProps<{
  label: string
  /** The de-vigged market probability, 0–1. */
  market: number | null
  /** Our model's probability, 0–1. */
  ours: number | null
  /** Decimal odds, shown for reference. */
  price?: number | null
  /** Is this (league, market) cell enabled in masks.py? */
  enabled?: boolean
  /** What our number is — "Dixon-Coles", "GBM", "twin". */
  ourLabel?: string
  /** Note rendered when `enabled` is false. */
  disabledNote?: string
  devigNote?: string
}>(), {
  price: null,
  enabled: false,
  ourLabel: 'model',
  disabledNote: 'not bet — no holdout evidence for this cell',
  devigNote: 'Market probability is Shin-de-vigged (CD #40). Differences are not edges unless the cell passed holdout.',
})

const clampPct = (v: number | null) => (v == null ? 0 : Math.min(100, Math.max(0, v * 100)))
const mPct = computed(() => clampPct(props.market))
const oPct = computed(() => clampPct(props.ours))

/** Percentage POINTS, not a ratio — the honest unit for a probability gap. */
const gapPp = computed(() =>
  props.ours == null || props.market == null ? 0 : (props.ours - props.market) * 100
)

/**
 * A disabled cell is grey no matter which way it leans: colour here would
 * imply a direction we have no evidence for.
 */
const gapColor = computed(() => {
  if (!props.enabled || props.ours == null || props.market == null) return 'var(--ink-soft)'
  if (Math.abs(gapPp.value) < 1) return 'var(--ink-soft)'
  return gapPp.value > 0 ? VIZ_STATUS.good : VIZ_BRAND_HOME
})

const pctText = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`
</script>

<style scoped>
.pb { padding: 0.45rem 0; }

.pb-head {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}
.pb-name {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.pb-price {
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink-mute);
  padding: 0.02rem 0.28rem;
  border-radius: var(--r-sm);
  background: var(--neutral-tint);
}
.pb-spacer { flex: 1; }
.pb-nums {
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  cursor: help;
}
.pb-mkt { color: var(--ink-mute); }
.pb-vs { color: var(--ink-faint); margin: 0 0.25rem; font-size: 0.58rem; }
.pb-our { font-weight: 700; }

.pb-track {
  position: relative;
  height: 8px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge-soft);
  overflow: hidden;
}

.pb-gap {
  position: absolute;
  top: 0;
  bottom: 0;
  opacity: 0.3;
}

.pb-mkt-mark {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  margin-left: -1px;
  background: var(--ink-mute);
}

.pb-our-mark {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  border-radius: 50%;
  border: 2px solid;
  transform: translateY(-50%);
  box-shadow: 0 0 0 2px var(--surface);
}

.pb-foot {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  margin-top: 0.25rem;
  font-size: 0.6rem;
}
.pb-edge { font-weight: 700; font-variant-numeric: tabular-nums; }
.pb-muted { color: var(--ink-faint); }

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
.tip-foot {
  margin-top: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint);
  font-size: 0.58rem;
  line-height: 1.4;
}
</style>
