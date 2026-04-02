<template>
  <div class="stat-bar-row py-2.5">
    <!-- Label and Values -->
    <div class="flex items-center justify-between text-sm mb-2">
      <span class="font-semibold text-[#e8a0a0]">{{ homeValue }}{{ suffix }}</span>
      <span class="text-zinc-500 text-xs uppercase tracking-wider font-medium">{{ label }}</span>
      <span class="font-semibold text-[#a0b8e8]">{{ awayValue }}{{ suffix }}</span>
    </div>

    <!-- Progress Bars — center-out layout -->
    <div class="flex items-center gap-0">
      <!-- Home bar: grows RIGHT-TO-LEFT from center -->
      <div class="flex-1 h-[5px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
        <div 
          class="h-full rounded-l-full bar-fill"
          :class="homeBarClass"
          :style="{ width: `${homePercentage}%` }"
        />
      </div>

      <!-- Center divider -->
      <div class="w-px h-3 bg-zinc-600/60 flex-shrink-0" />

      <!-- Away bar: grows LEFT-TO-RIGHT from center -->
      <div class="flex-1 h-[5px] bg-surface-light/60 rounded-r-full overflow-hidden">
        <div 
          class="h-full rounded-r-full bar-fill"
          :class="awayBarClass"
          :style="{ width: `${awayPercentage}%` }"
        />
      </div>
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
  animation: statFadeIn 0.4s ease-out both;
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
  transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.home-bar {
  background: linear-gradient(90deg, rgba(248, 40, 40, 0.35) 0%, rgba(248, 40, 40, 0.18) 100%);
}

.away-bar {
  background: linear-gradient(270deg, rgba(8, 72, 168, 0.35) 0%, rgba(8, 72, 168, 0.18) 100%);
}
</style>
