<template>
  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-edge text-sm">
    <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" />
      <text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">C</text>
    </svg>
    <span class="font-semibold text-zinc-200 tabular-nums">{{ balance }}</span>
  </div>
</template>

<script setup>
defineProps({
  balance: { type: Number, default: 0 }
})
</script>
