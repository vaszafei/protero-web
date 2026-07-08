<template>
  <div v-if="leaguePatterns" class="mb-6">
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
      <div class="flex items-center gap-3 mb-3">
        <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-blue-400" />
        <h3 class="text-lg font-bold text-blue-900">LEAGUE TRENDS & PATTERNS</h3>
        <span class="text-xs text-blue-400 bg-blue-100 px-2 py-1 rounded">Season {{ season }}</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-surface/70 rounded p-2">
          <div class="text-2xl font-bold text-blue-400">{{ leaguePatterns.avgGoalsPerGame }}</div>
          <div class="text-xs text-zinc-400">Avg Goals/Game</div>
        </div>
        <div class="bg-surface/70 rounded p-2">
          <div class="text-2xl font-bold text-green-400">{{ leaguePatterns.over25Percentage }}%</div>
          <div class="text-xs text-zinc-400">Over 2.5 Rate</div>
        </div>
        <div class="bg-surface/70 rounded p-2">
          <div class="text-2xl font-bold text-purple-400">{{ leaguePatterns.bttsPercentage }}%</div>
          <div class="text-xs text-zinc-400">BTTS Rate</div>
        </div>
        <div class="bg-surface/70 rounded p-2">
          <div class="text-2xl font-bold text-orange-400">{{ leaguePatterns.homeWinPercentage }}%</div>
          <div class="text-xs text-zinc-400">Home Win Rate</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  leaguePatterns: {
    type: Object,
    default: null
  },
  season: {
    type: [String, Number],
    default: 2025
  }
})
</script>
