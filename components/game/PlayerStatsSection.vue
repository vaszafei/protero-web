<template>
  <div>
    <!-- Two Column Layout for Both Teams -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Home Team -->
      <div class="overflow-x-auto">
        <h3 class="text-lg font-bold mb-4 text-zinc-100">{{ homeName }}</h3>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b-2 border-primary-600 text-left">
              <th class="py-2 px-2 font-semibold text-zinc-300">#</th>
              <th class="py-2 px-2 font-semibold text-zinc-300">Player</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Rating</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">xG</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Shots</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Passes</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Touches</th>
            </tr>
          </thead>
          <tbody>
            <!-- Starters -->
            <tr 
              v-for="player in homeStarters" 
              :key="player.id"
              class="border-b border-edge/50 hover:bg-surface-hover transition-colors"
            >
              <td class="py-2 px-2">
                <div class="w-6 h-6 rounded-full bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {{ player.jersey_number }}
                </div>
              </td>
              <td class="py-2 px-2">
                <div class="font-medium text-zinc-100 text-sm">{{ player.player_name }}</div>
                <div class="text-[11px] text-zinc-500">{{ player.position || 'Unknown' }}</div>
              </td>
              <td class="py-2 px-2 text-center">
                <span 
                  v-if="player.rating"
                  class="inline-block px-1.5 py-0.5 rounded text-xs font-bold"
                  :class="getRatingClass(player.rating)"
                >
                  {{ player.rating }}
                </span>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center font-medium text-purple-400">
                {{ formatStat(player.xg) }}
              </td>
              <td class="py-2 px-2 text-center font-medium">
                {{ formatStat(player.shots_total) }}
              </td>
              <td class="py-2 px-2 text-center text-xs">
                <div v-if="player.passes !== null && player.passes !== undefined">
                  {{ player.passes }}
                  <span v-if="player.pass_accuracy" class="text-zinc-500">
                    ({{ player.pass_accuracy }}%)
                  </span>
                </div>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center text-xs">
                {{ formatStat(player.touches) }}
              </td>
            </tr>
            
            <!-- Substitutes Header -->
            <tr v-if="homeSubstitutes.length > 0">
              <td colspan="7" class="py-1 px-2 bg-surface-light text-[11px] font-semibold text-zinc-400 uppercase">
                Substitutes
              </td>
            </tr>
            
            <!-- Substitutes -->
            <tr 
              v-for="player in homeSubstitutes" 
              :key="player.id"
              class="border-b border-edge/50 hover:bg-surface-hover transition-colors opacity-60"
            >
              <td class="py-2 px-2">
                <div class="w-6 h-6 rounded-full bg-zinc-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {{ player.jersey_number }}
                </div>
              </td>
              <td class="py-2 px-2">
                <div class="font-medium text-zinc-100 text-sm">{{ player.player_name }}</div>
                <div class="text-[11px] text-zinc-500">{{ player.position || 'Unknown' }}</div>
              </td>
              <td class="py-2 px-2 text-center">
                <span 
                  v-if="player.rating"
                  class="inline-block px-1.5 py-0.5 rounded text-xs font-bold"
                  :class="getRatingClass(player.rating)"
                >
                  {{ player.rating }}
                </span>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center font-medium text-purple-400">
                {{ formatStat(player.xg) }}
              </td>
              <td class="py-2 px-2 text-center font-medium">
                {{ formatStat(player.shots_total) }}
              </td>
              <td class="py-2 px-2 text-center text-xs">
                <div v-if="player.passes !== null && player.passes !== undefined">
                  {{ player.passes }}
                  <span v-if="player.pass_accuracy" class="text-zinc-500">
                    ({{ player.pass_accuracy }}%)
                  </span>
                </div>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center text-xs">
                {{ formatStat(player.touches) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Away Team -->
      <div class="overflow-x-auto">
        <h3 class="text-lg font-bold mb-4 text-zinc-100">{{ awayName }}</h3>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b-2 border-primary-600 text-left">
              <th class="py-2 px-2 font-semibold text-zinc-300">#</th>
              <th class="py-2 px-2 font-semibold text-zinc-300">Player</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Rating</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">xG</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Shots</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Passes</th>
              <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Touches</th>
            </tr>
          </thead>
          <tbody>
            <!-- Starters -->
            <tr 
              v-for="player in awayStarters" 
              :key="player.id"
              class="border-b border-edge/50 hover:bg-surface-hover transition-colors"
            >
              <td class="py-2 px-2">
                <div class="w-6 h-6 rounded-full bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {{ player.jersey_number }}
                </div>
              </td>
              <td class="py-2 px-2">
                <div class="font-medium text-zinc-100 text-sm">{{ player.player_name }}</div>
                <div class="text-[11px] text-zinc-500">{{ player.position || 'Unknown' }}</div>
              </td>
              <td class="py-2 px-2 text-center">
                <span 
                  v-if="player.rating"
                  class="inline-block px-1.5 py-0.5 rounded text-xs font-bold"
                  :class="getRatingClass(player.rating)"
                >
                  {{ player.rating }}
                </span>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center font-medium text-purple-400">
                {{ formatStat(player.xg) }}
              </td>
              <td class="py-2 px-2 text-center font-medium">
                {{ formatStat(player.shots_total) }}
              </td>
              <td class="py-2 px-2 text-center text-xs">
                <div v-if="player.passes !== null && player.passes !== undefined">
                  {{ player.passes }}
                  <span v-if="player.pass_accuracy" class="text-zinc-500">
                    ({{ player.pass_accuracy }}%)
                  </span>
                </div>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center text-xs">
                {{ formatStat(player.touches) }}
              </td>
            </tr>
            
            <!-- Substitutes Header -->
            <tr v-if="awaySubstitutes.length > 0">
              <td colspan="7" class="py-1 px-2 bg-surface-light text-[11px] font-semibold text-zinc-400 uppercase">
                Substitutes
              </td>
            </tr>
            
            <!-- Substitutes -->
            <tr 
              v-for="player in awaySubstitutes" 
              :key="player.id"
              class="border-b border-edge/50 hover:bg-surface-hover transition-colors opacity-60"
            >
              <td class="py-2 px-2">
                <div class="w-6 h-6 rounded-full bg-zinc-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {{ player.jersey_number }}
                </div>
              </td>
              <td class="py-2 px-2">
                <div class="font-medium text-zinc-100 text-sm">{{ player.player_name }}</div>
                <div class="text-[11px] text-zinc-500">{{ player.position || 'Unknown' }}</div>
              </td>
              <td class="py-2 px-2 text-center">
                <span 
                  v-if="player.rating"
                  class="inline-block px-1.5 py-0.5 rounded text-xs font-bold"
                  :class="getRatingClass(player.rating)"
                >
                  {{ player.rating }}
                </span>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center font-medium text-purple-400">
                {{ formatStat(player.xg) }}
              </td>
              <td class="py-2 px-2 text-center font-medium">
                {{ formatStat(player.shots_total) }}
              </td>
              <td class="py-2 px-2 text-center text-xs">
                <div v-if="player.passes !== null && player.passes !== undefined">
                  {{ player.passes }}
                  <span v-if="player.pass_accuracy" class="text-zinc-500">
                    ({{ player.pass_accuracy }}%)
                  </span>
                </div>
                <span v-else class="text-zinc-600">-</span>
              </td>
              <td class="py-2 px-2 text-center text-xs">
                {{ formatStat(player.touches) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
  }
})

const homeStarters = computed(() => {
  return props.homeLineup.filter(p => p.starter === 1)
})

const homeSubstitutes = computed(() => {
  return props.homeLineup.filter(p => p.starter !== 1)
})

const awayStarters = computed(() => {
  return props.awayLineup.filter(p => p.starter === 1)
})

const awaySubstitutes = computed(() => {
  return props.awayLineup.filter(p => p.starter !== 1)
})

const formatStat = (value) => {
  return value !== null && value !== undefined ? value : '-'
}

const getRatingClass = (rating) => {
  const r = parseFloat(rating)
  if (r >= 8.5) return 'bg-green-500/20 text-green-400'
  if (r >= 7.5) return 'bg-blue-500/20 text-blue-400'
  if (r >= 6.5) return 'bg-zinc-700 text-zinc-300'
  return 'bg-orange-500/20 text-orange-400'
}
</script>
