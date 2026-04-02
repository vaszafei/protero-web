<template>
  <Teleport to="body">
    <div
      class="fixed bottom-0 inset-x-0 z-[9999] flex flex-col items-center gap-2 pb-safe pointer-events-none"
      style="padding-bottom: calc(env(safe-area-inset-bottom) + 1rem)"
    >
      <TransitionGroup name="snack" tag="div" class="flex flex-col items-center gap-2 w-full">
        <div
          v-for="toast in notifications"
          :key="toast.id"
          class="pointer-events-auto mx-4 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-sm w-full"
          :class="colorClass(toast.color)"
          @click="remove(toast.id)"
        >
          <!-- Text -->
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-tight truncate">{{ toast.title }}</p>
            <p v-if="toast.description" class="text-xs opacity-75 mt-0.5 truncate">{{ toast.description }}</p>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
const { remove } = useToast()
const notifications = useState('notifications', () => [])

// Track timer IDs so we don't double-schedule
const timers = new Map()

watch(notifications, (list) => {
  list.forEach(t => {
    if (!timers.has(t.id)) {
      const delay = typeof t.timeout === 'number' ? t.timeout : 3000
      const tid = setTimeout(() => {
        remove(t.id)
        timers.delete(t.id)
      }, delay)
      timers.set(t.id, tid)
    }
  })
}, { deep: true, immediate: true })

function colorClass(color) {
  if (color === 'green') return 'bg-emerald-900/90 text-emerald-100 border border-emerald-700/50'
  if (color === 'red')   return 'bg-red-900/90 text-red-100 border border-red-700/50'
  return 'bg-zinc-800/95 text-zinc-100 border border-zinc-700/50'
}
</script>

<style scoped>
.snack-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.snack-leave-active {
  transition: all 0.18s ease-in;
}
.snack-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.snack-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}
.snack-move {
  transition: transform 0.2s ease;
}
</style>
