<template>
  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-edge text-sm">
    <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-amber-400" />
    <span class="font-semibold text-zinc-200 tabular-nums">{{ balance }}</span>
  </div>
</template>

<script setup>
defineProps({
  balance: { type: Number, default: 0 }
})
</script>
