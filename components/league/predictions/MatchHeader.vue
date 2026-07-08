<template>
  <div class="bg-surface border border-edge rounded-lg p-3">
    <!-- Team Names with Modern Styling -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-blue-400 text-xs font-bold">{{ homeName.substring(0, 2).toUpperCase() }}</span>
          </div>
          <span class="text-base font-bold text-zinc-100">{{ homeName }}</span>
        </div>
        
        <div class="bg-surface-light px-2 py-1 rounded-full">
          <span class="text-zinc-400 text-xs font-semibold">vs</span>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-zinc-100">{{ awayName }}</span>
          <div class="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <span class="text-red-400 text-xs font-bold">{{ awayName.substring(0, 2).toUpperCase() }}</span>
          </div>
        </div>
      </div>
      
      <!-- Match Details -->
      <div class="flex items-center gap-2">
        <div class="bg-surface-light px-2 py-1 rounded-full flex items-center gap-1.5">
          <UIcon name="i-heroicons-calendar" class="w-3 h-3 text-zinc-400" />
          <span class="text-xs text-zinc-300 font-medium">{{ formattedDate }}</span>
        </div>
        
        <div class="bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 bg-green-500/200 rounded-full"></div>
          <span class="text-xs font-semibold">Round {{ round }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  homeName: {
    type: String,
    required: true
  },
  awayName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  round: {
    type: Number,
    required: true
  }
})

const formattedDate = computed(() => {
  return new Date(props.date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
})
</script>
