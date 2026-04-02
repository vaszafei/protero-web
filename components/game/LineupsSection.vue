<template>
  <div>
    <!-- Tab Navigation -->
    <div class="flex gap-2 mb-6 border-b border-edge">
      <button
        @click="activeTab = 'home'"
        class="px-4 py-2 font-medium text-sm transition-colors relative"
        :class="activeTab === 'home' 
          ? 'text-primary-400' 
          : 'text-zinc-400 hover:text-zinc-100'"
      >
        {{ homeName }}
        <div 
          v-if="activeTab === 'home'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
        ></div>
      </button>
      <button
        @click="activeTab = 'away'"
        class="px-4 py-2 font-medium text-sm transition-colors relative"
        :class="activeTab === 'away' 
          ? 'text-primary-400' 
          : 'text-zinc-400 hover:text-zinc-100'"
      >
        {{ awayName }}
        <div 
          v-if="activeTab === 'away'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
        ></div>
      </button>
    </div>

    <!-- Formation Display -->
    <div v-if="activeFormation" class="mb-6 p-4 bg-surface-light rounded-lg">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-zinc-400">Formation:</span>
        <span class="text-lg font-bold text-zinc-100">{{ activeFormation }}</span>
      </div>
    </div>

    <!-- Players List -->
    <div class="space-y-6">
      <!-- Starters -->
      <div>
        <h3 class="text-sm font-bold text-zinc-300 mb-3">
          Starting XI
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            v-for="player in activeStarters" 
            :key="player.id"
            class="flex items-center gap-3 p-3 bg-surface-light rounded-lg"
          >
            <!-- Jersey Number -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
              {{ player.jersey_number }}
            </div>
            
            <!-- Name & Position -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-zinc-100 truncate">{{ player.player_name }}</p>
              <p class="text-xs text-zinc-400">{{ player.position || 'Unknown' }}</p>
            </div>

            <!-- Rating -->
            <div v-if="player.rating" class="flex-shrink-0">
              <div 
                class="px-2 py-1 rounded text-xs font-bold"
                :class="getRatingClass(player.rating)"
              >
                {{ player.rating }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Substitutes -->
      <div v-if="activeSubstitutes.length > 0">
        <h3 class="text-sm font-bold text-zinc-300 mb-3">
          Substitutes
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            v-for="player in activeSubstitutes" 
            :key="player.id"
            class="flex items-center gap-3 p-3 bg-surface-light rounded-lg"
          >
            <!-- Jersey Number -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-600 text-white flex items-center justify-center font-bold text-sm">
              {{ player.jersey_number }}
            </div>
            
            <!-- Name & Position -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-zinc-100 truncate">{{ player.player_name }}</p>
              <p class="text-xs text-zinc-400">{{ player.position || 'Unknown' }}</p>
            </div>

            <!-- Rating -->
            <div v-if="player.rating" class="flex-shrink-0">
              <div 
                class="px-2 py-1 rounded text-xs font-bold"
                :class="getRatingClass(player.rating)"
              >
                {{ player.rating }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  homeLineup: {
    type: Array,
    default: () => []
  },
  awayLineup: {
    type: Array,
    default: () => []
  },
  homeName: {
    type: String,
    required: true
  },
  awayName: {
    type: String,
    required: true
  },
  homeFormation: {
    type: String,
    default: null
  },
  awayFormation: {
    type: String,
    default: null
  }
})

const activeTab = ref('home')

const activeLineup = computed(() => {
  return activeTab.value === 'home' ? props.homeLineup : props.awayLineup
})

const activeFormation = computed(() => {
  return activeTab.value === 'home' ? props.homeFormation : props.awayFormation
})

const activeStarters = computed(() => {
  return activeLineup.value.filter(p => p.starter === 1)
})

const activeSubstitutes = computed(() => {
  return activeLineup.value.filter(p => p.starter === 0)
})

const getRatingClass = (rating) => {
  const r = parseFloat(rating)
  if (r >= 8.5) return 'bg-green-500/20 text-green-400'
  if (r >= 7.5) return 'bg-blue-100 text-blue-400'
  if (r >= 6.5) return 'bg-surface-light text-zinc-300'
  return 'bg-orange-500/20 text-orange-400'
}
</script>
