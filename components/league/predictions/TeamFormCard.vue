<template>
  <div class="bg-surface border border-edge rounded-lg p-3 hover:border-blue-400 transition-all hover:shadow-sm">
    <div class="flex gap-2">
      <!-- Left Column: Team Name + Form Badges -->
      <div class="flex flex-col gap-1">
        <div class="text-xs font-bold text-zinc-100 truncate">{{ teamName }}</div>
        <div class="flex gap-0.5">
          <span
            v-for="(game, idx) in recentForm.slice(0, 5)"
            :key="idx"
            :class="[
              'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold',
              game.result === 'W' ? 'bg-emerald-500/200 text-white' : 
              game.result === 'D' ? 'bg-amber-400 text-white' : 
              'bg-red-500/200 text-white'
            ]"
            :title="`${game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'} vs ${game.opponent} (${game.score})`"
          >
            {{ game.result }}
          </span>
        </div>
      </div>
      
      <!-- Right Column: Stats -->
      <div class="flex flex-col justify-center gap-0.5 ml-auto">
        <div class="text-[11px] text-zinc-400 whitespace-nowrap">
          <span class="text-zinc-500">Form:</span>
          <span class="font-bold text-blue-400 ml-1">{{ formPoints }}pts</span>
        </div>
        <div class="text-[11px] text-zinc-400 whitespace-nowrap">
          <span class="text-zinc-500">Goals:</span>
          <span class="font-bold text-emerald-400 ml-1">{{ avgGoalsFor }}</span>
          <span class="text-zinc-500 mx-1">/</span>
          <span class="font-bold text-red-400">{{ avgGoalsAgainst }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  teamName: {
    type: String,
    required: true
  },
  recentForm: {
    type: Array,
    required: true
  },
  formPoints: {
    type: Number,
    required: true
  },
  avgGoalsFor: {
    type: [Number, String],
    required: true
  },
  avgGoalsAgainst: {
    type: [Number, String],
    required: true
  }
})
</script>
