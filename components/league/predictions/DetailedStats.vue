<template>
  <div class="border-t border-edge pt-3 mt-3">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-bold text-zinc-300">DETAILED STATS</span>
      
      <!-- Filter Buttons -->
      <div class="flex gap-1">
        <button
          @click="currentFilter = 'all'"
          :class="[
            'px-2 py-0.5 text-xs font-semibold rounded',
            currentFilter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-surface-light text-zinc-400 hover:bg-edge'
          ]"
        >
          All
        </button>
        <button
          @click="currentFilter = 'home'"
          :class="[
            'px-2 py-0.5 text-xs font-semibold rounded',
            currentFilter === 'home' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-surface-light text-zinc-400 hover:bg-edge'
          ]"
        >
          Home
        </button>
        <button
          @click="currentFilter = 'away'"
          :class="[
            'px-2 py-0.5 text-xs font-semibold rounded',
            currentFilter === 'away' 
              ? 'bg-purple-600 text-white' 
              : 'bg-surface-light text-zinc-400 hover:bg-edge'
          ]"
        >
          Away
        </button>
      </div>
    </div>
    
    <!-- Stats Grid - Compact Table Style -->
    <div v-if="currentFilter === 'all'" class="bg-surface-light rounded-lg p-2 border border-edge">
      <div class="grid grid-cols-4 gap-2 text-center">
        <!-- Possession -->
        <div>
          <div class="text-[11px] font-semibold text-blue-400 mb-1">POSS</div>
          <div class="text-sm font-bold text-zinc-100">{{ homeStats.possession || '0' }}% <span class="text-zinc-500">-</span> {{ awayStats.possession || '0' }}%</div>
        </div>

        <!-- Shots -->
        <div>
          <div class="text-[11px] font-semibold text-green-400 mb-1">SHOTS</div>
          <div class="text-sm font-bold text-zinc-100">{{ homeStats.shots || '0' }} <span class="text-zinc-500">-</span> {{ awayStats.shots || '0' }}</div>
        </div>

        <!-- Corners -->
        <div>
          <div class="text-[11px] font-semibold text-purple-600 mb-1">CORN</div>
          <div class="text-sm font-bold text-zinc-100">{{ homeStats.corners || '0' }} <span class="text-zinc-500">-</span> {{ awayStats.corners || '0' }}</div>
        </div>

        <!-- Cards -->
        <div>
          <div class="text-[11px] font-semibold text-amber-400 mb-1">CARDS</div>
          <div class="text-sm font-bold text-zinc-100">{{ homeStats.yellowCards || '0' }} <span class="text-zinc-500">-</span> {{ awayStats.yellowCards || '0' }}</div>
        </div>
      </div>
    </div>
    
    <!-- Single Team Stats -->
    <div v-else class="bg-surface-light rounded-lg p-2 border border-edge">
      <div class="grid grid-cols-4 gap-2 text-center">
        <!-- Possession -->
        <div>
          <div class="text-[11px] font-semibold text-blue-400 mb-1">POSS</div>
          <div class="text-sm font-bold text-zinc-100">{{ stats.possession }}%</div>
        </div>

        <!-- Shots -->
        <div>
          <div class="text-[11px] font-semibold text-green-400 mb-1">SHOTS</div>
          <div class="text-sm font-bold text-zinc-100">{{ stats.shots }}</div>
        </div>

        <!-- Corners -->
        <div>
          <div class="text-[11px] font-semibold text-purple-600 mb-1">CORN</div>
          <div class="text-sm font-bold text-zinc-100">{{ stats.corners }}</div>
        </div>

        <!-- Cards -->
        <div>
          <div class="text-[11px] font-semibold text-amber-400 mb-1">CARDS</div>
          <div class="text-sm font-bold text-zinc-100">{{ stats.cards }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  homeStats: {
    type: Object,
    required: true
  },
  awayStats: {
    type: Object,
    required: true
  }
})

const currentFilter = ref('all')

const stats = computed(() => {
  if (currentFilter.value === 'home') {
    return {
      possession: props.homeStats.possession || '0',
      shots: props.homeStats.shots || '0',
      corners: props.homeStats.corners || '0',
      cards: props.homeStats.yellowCards || '0'
    }
  } else if (currentFilter.value === 'away') {
    return {
      possession: props.awayStats.possession || '0',
      shots: props.awayStats.shots || '0',
      corners: props.awayStats.corners || '0',
      cards: props.awayStats.yellowCards || '0'
    }
  } else {
    // Average of both teams
    const homePoss = parseFloat(props.homeStats.possession) || 0
    const awayPoss = parseFloat(props.awayStats.possession) || 0
    const homeShots = parseFloat(props.homeStats.shots) || 0
    const awayShots = parseFloat(props.awayStats.shots) || 0
    const homeCorners = parseFloat(props.homeStats.corners) || 0
    const awayCorners = parseFloat(props.awayStats.corners) || 0
    const homeCards = parseFloat(props.homeStats.yellowCards) || 0
    const awayCards = parseFloat(props.awayStats.yellowCards) || 0
    
    return {
      possession: ((homePoss + awayPoss) / 2).toFixed(1),
      shots: ((homeShots + awayShots) / 2).toFixed(1),
      corners: ((homeCorners + awayCorners) / 2).toFixed(1),
      cards: ((homeCards + awayCards) / 2).toFixed(1)
    }
  }
})
</script>
