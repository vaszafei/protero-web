<template>
  <span class="tabular-nums">{{ display }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCountUp } from '~/composables/useCountUp'
import { MOTION } from '~/utils/motion'

const props = withDefaults(defineProps<{
  value: number
  decimals?: number
  duration?: number
  /** Render each frame through this (e.g. `formatMoney`); defaults to `toFixed(decimals)`. */
  format?: (n: number) => string
}>(), {
  decimals: 0,
  duration: MOTION.normal,
  format: undefined,
})

const animated = useCountUp(
  () => Number(props.value) || 0,
  { duration: props.duration, decimals: props.decimals }
)

const display = computed(() => props.format ? props.format(animated.value) : animated.value.toFixed(props.decimals))
</script>
