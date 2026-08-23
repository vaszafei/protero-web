import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { MOTION } from '~/utils/motion'

/**
 * rAF-based eased count-up. Returns a ref that animates from 0 to `target`
 * whenever `target` changes. Respects `prefers-reduced-motion`: in that case
 * the value jumps straight to the target on the next frame.
 */
export function useCountUp(
  target: () => number,
  { duration = MOTION.normal, decimals = 0 } = {}
) {
  const value = ref(0)
  let raf = 0

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  function animate(to: number) {
    cancelAnimationFrame(raf)

    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce || !isFinite(to)) {
      value.value = isFinite(to) ? to : 0
      return
    }

    const from = value.value
    const delta = to - from
    if (delta === 0) return

    const start = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(t)
      const next = from + delta * eased
      value.value = Number(next.toFixed(decimals))
      if (t < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
  }

  onMounted(() => {
    const t = target()
    if (isFinite(t)) animate(t)
  })

  watch(target, (t) => {
    if (isFinite(t)) animate(t)
  })

  onBeforeUnmount(() => cancelAnimationFrame(raf))

  return value
}
