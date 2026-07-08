<template>
  <div class="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20 p-3 mt-3">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-blue-400" />
        <span class="text-sm font-bold text-zinc-100">AI Predictions</span>
      </div>
      <div :class="[
        'px-2 py-1 rounded text-xs font-bold',
        confidence >= 70 ? 'bg-green-600 text-white' : 
        confidence >= 50 ? 'bg-blue-600 text-white' : 
        'bg-amber-600 text-white'
      ]">
        {{ confidence }}%
      </div>
    </div>

    <!-- Compact 3-Column Grid (2-column for basketball) -->
    <div :class="sport === 'football' ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-2 gap-3'">
      <!-- Main Bets -->
      <div class="bg-surface rounded-lg p-2 border border-blue-500/20">
        <div class="text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1">
          <UIcon name="i-heroicons-check-circle" class="w-3 h-3 text-blue-400" />
          Main Bets
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Result:</span>
            <span class="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ outcomeProbability }}%</span>
          </div>
          <div class="text-xs font-bold text-zinc-100">{{ predictedOutcome }}</div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Score:</span>
            <span class="text-xs font-bold text-indigo-400">{{ expectedScore }}</span>
          </div>
        </div>
      </div>

      <!-- Goals/Points Markets -->
      <div class="bg-surface rounded-lg p-2 border border-green-500/20">
        <div class="text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1">
          <UIcon name="i-heroicons-plus-circle" class="w-3 h-3 text-green-400" />
          {{ sport === 'basketball' ? 'Points' : 'Goals' }}
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">O1.5:</span>
            <span class="bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ over15Probability }}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">O2.5:</span>
            <span class="bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ over25Probability }}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">O3.5:</span>
            <span class="bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ over35Probability }}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">BTTS:</span>
            <span class="bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ bttsProbability }}%</span>
          </div>
        </div>
      </div>

      <!-- Special Markets (football only) -->
      <div v-if="sport === 'football'" class="bg-surface rounded-lg p-2 border border-amber-500/20">
        <div class="text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1">
          <UIcon name="i-heroicons-star" class="w-3 h-3 text-amber-400" />
          Specials
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Corn O8.5:</span>
            <span class="bg-amber-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ cornersOver85 }}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Corn O10.5:</span>
            <span class="bg-amber-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ cornersOver105 }}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Cards O3.5:</span>
            <span class="bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ cardsOver35 }}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Shots:</span>
            <span class="bg-zinc-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{{ shotsRange }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  confidence: {
    type: Number,
    required: true
  },
  predictedOutcome: {
    type: String,
    required: true
  },
  outcomeProbability: {
    type: Number,
    required: true
  },
  expectedScore: {
    type: String,
    required: true
  },
  over15Probability: {
    type: Number,
    default: 0
  },
  over25Probability: {
    type: Number,
    default: 0
  },
  over35Probability: {
    type: Number,
    default: 0
  },
  bttsProbability: {
    type: Number,
    default: 0
  },
  cornersOver85: {
    type: Number,
    default: 0
  },
  cornersOver105: {
    type: Number,
    default: 0
  },
  cardsOver35: {
    type: Number,
    default: 0
  },
  cardsOver45: {
    type: Number,
    default: 0
  },
  shotsRange: {
    type: String,
    default: 'N/A'
  },
  sport: {
    type: String,
    default: 'football'
  }
})
</script>
