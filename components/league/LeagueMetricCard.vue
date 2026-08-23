<template>
  <div class="mc">
    <p class="mc-label" :title="hint || undefined">{{ label }}</p>
    <p class="mc-value" :class="muted ? 'text-zinc-600' : 'text-zinc-50'">{{ value }}</p>

    <!-- Where this competition sits among the others we fit. Every peer is a
         tick; this one is the filled marker. A number like "level 0.205" means
         nothing on its own — the distribution is the unit. -->
    <div v-if="strip.length > 1 && position != null" class="mc-strip" :title="stripTitle">
      <span
        v-for="(p, i) in strip"
        :key="i"
        class="mc-tick"
        :style="{ left: p + '%' }"
      />
      <span class="mc-marker" :style="{ left: position + '%' }" />
    </div>

    <p class="mc-foot">{{ foot }}</p>
  </div>
</template>

<script setup>
/**
 * One fitted quantity of a competition, with its peer distribution.
 *
 * The strip is a one-dimensional scatter of every fitted competition on the same
 * measure, normalised to the observed min/max. It is a single-series plot, so it
 * carries no legend — the label above says what is plotted.
 */
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  foot: { type: String, default: '' },
  hint: { type: String, default: '' },
  muted: { type: Boolean, default: false },
  /** Raw peer values on this measure, this competition's included. */
  peerValues: { type: Array, default: () => [] },
  /** This competition's value on the measure — null hides the strip. */
  own: { type: Number, default: null },
})

const bounds = computed(() => {
  const vals = props.peerValues.filter(v => v != null && Number.isFinite(Number(v))).map(Number)
  if (vals.length < 2) return null
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return max > min ? { min, max, vals } : null
})

function pct(v) {
  const b = bounds.value
  return b ? ((Number(v) - b.min) / (b.max - b.min)) * 100 : null
}

const strip = computed(() => (bounds.value ? bounds.value.vals.map(pct) : []))
const position = computed(() => (bounds.value && props.own != null ? pct(props.own) : null))
const stripTitle = computed(() => {
  const b = bounds.value
  return b ? `${b.vals.length} fitted competitions span ${b.min.toFixed(3)} to ${b.max.toFixed(3)}` : ''
})
</script>

<style scoped>
.mc {
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  background: #1c1f27;
  border: 1px solid #2a2f3a;
}
.mc-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgb(113, 113, 122);
}
.mc-value {
  margin-top: 0.15rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  /* Proportional figures: this is a standalone display number, not a column. */
}
.mc-strip {
  position: relative;
  height: 0.9rem;
  margin-top: 0.4rem;
}
.mc-strip::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(255, 255, 255, 0.09);
}
.mc-tick {
  position: absolute;
  top: 50%;
  width: 1px;
  height: 0.4rem;
  margin-top: -0.2rem;
  background: rgba(255, 255, 255, 0.22);
}
.mc-marker {
  position: absolute;
  top: 50%;
  width: 0.45rem;
  height: 0.45rem;
  margin: -0.225rem 0 0 -0.225rem;
  border-radius: 999px;
  background: #3987e5;
  /* 2px surface ring so the marker stays readable where it crosses a tick. */
  box-shadow: 0 0 0 2px #1c1f27, 0 0 10px 0 rgba(57, 135, 229, 0.75);
}
.mc-foot {
  margin-top: 0.2rem;
  font-size: 0.6rem;
  color: rgb(101, 103, 112);
}
</style>
