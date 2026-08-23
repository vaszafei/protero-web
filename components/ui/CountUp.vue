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
}>(), {
  decimals: 0,
  duration: MOTION.normal,
})

const animated = useCountUp(
  () => Number(props.value) || 0,
  { duration: props.duration, decimals: props.decimals }
)

const display = computed(() => animated.value.toFixed(props.decimals))
</script>
