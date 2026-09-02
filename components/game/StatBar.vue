<template>
  <div class="stat-bar-row py-0.5">
    <!-- Centered label -->
    <div class="text-center text-[9px] uppercase tracking-wider text-zinc-500 font-medium mb-0.5">
      {{ label }}
    </div>

    <!-- One-line: [home_val] [bar] [away_val] -->
    <div class="grid grid-cols-[40px_1fr_40px] items-center gap-2">
      <span class="text-right text-[12px] font-semibold text-brand-blue tabular-nums">{{ homeValue }}{{ suffix }}</span>

      <div class="flex items-center gap-0">
        <!-- Home bar: grows RIGHT-TO-LEFT from center -->
        <div class="flex-1 h-[3px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
          <div
            class="h-full rounded-l-full bar-fill"
            :class="homeBarClass"
            :style="{ width: `${homePercentage}%` }"
          />
        </div>
        <div class="w-px h-2.5 bg-zinc-600/60 flex-shrink-0" />
        <!-- Away bar: grows LEFT-TO-RIGHT from center -->
        <div class="flex-1 h-[3px] bg-surface-light/60 rounded-r-full overflow-hidden">
          <div
            class="h-full rounded-r-full bar-fill"
            :class="awayBarClass"
            :style="{ width: `${awayPercentage}%` }"
          />
        </div>
      </div>

      <span class="text-left text-[12px] font-semibold text-brand-red tabular-nums">{{ awayValue }}{{ suffix }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  homeValue: {
    type: Number,
    required: false,
    default: 0
  },
  awayValue: {
    type: Number,
    required: false,
    default: 0
  },
  suffix: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'blue', 'yellow', 'red'].includes(value)
  }
})

const total = computed(() => props.homeValue + props.awayValue)
const homePercentage = computed(() => {
  if (total.value === 0) return 50
  return (props.homeValue / total.value) * 100
})
const awayPercentage = computed(() => {
  if (total.value === 0) return 50
  return (props.awayValue / total.value) * 100
})

const homeBarClass = computed(() => {
  switch (props.color) {
    case 'yellow': return 'bg-amber-500/50'
    case 'red': return 'bg-red-500/40'
    default: return 'home-bar'
  }
})

const awayBarClass = computed(() => {
  switch (props.color) {
    case 'yellow': return 'bg-amber-500/50'
    case 'red': return 'bg-red-500/40'
    default: return 'away-bar'
  }
})
</script>

<style scoped>
.stat-bar-row {
  animation: statFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.stat-bar-row:nth-child(1) { animation-delay: 0s; }
.stat-bar-row:nth-child(2) { animation-delay: 0.05s; }
.stat-bar-row:nth-child(3) { animation-delay: 0.1s; }
.stat-bar-row:nth-child(4) { animation-delay: 0.15s; }
.stat-bar-row:nth-child(5) { animation-delay: 0.2s; }
.stat-bar-row:nth-child(6) { animation-delay: 0.25s; }
.stat-bar-row:nth-child(7) { animation-delay: 0.3s; }
.stat-bar-row:nth-child(8) { animation-delay: 0.35s; }
.stat-bar-row:nth-child(9) { animation-delay: 0.4s; }
.stat-bar-row:nth-child(10) { animation-delay: 0.45s; }

@keyframes statFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bar-fill {
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--bar-delay, 0ms);
}

.home-bar {
  background: var(--brand-blue);
}

.away-bar {
  background: var(--brand-red);
}

@media (prefers-reduced-motion: reduce) {
  .bar-fill {
    transition: none;
  }
}
</style>
