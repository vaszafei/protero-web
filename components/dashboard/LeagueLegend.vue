<template>
  <div class="bg-surface border border-edge rounded-lg p-4">
    <h3 class="text-sm font-semibold text-zinc-100 mb-3">Leagues</h3>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      <div
        v-for="league in leagues"
        :key="league.key"
        class="flex items-center gap-2 text-xs"
      >
        <span class="text-lg">{{ league.flag }}</span>
        <span class="text-zinc-300 truncate">{{ league.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  leagues: any[]
}>()
</script>
