<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition ease-in duration-200"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-end"
        @click.self="close"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-gray-900/50" @click="close"></div>
        
        <!-- Slide-over panel -->
        <div class="relative w-[45vw] h-screen bg-surface shadow-xl flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 bg-surface border-b border-edge">
            <div>
              <h3 class="text-xl font-bold text-white">
                {{ match.home_name }} vs {{ match.away_name }}
              </h3>
              <p class="text-sm text-zinc-500 mt-1">
                Round {{ match.round }} • {{ formatDate(match.date) }}
              </p>
            </div>
            <button
              @click="close"
              class="p-2 text-zinc-500 hover:text-white hover:bg-surface-light rounded-lg transition-colors"
            >
              <X :size="20" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 bg-surface-light">


            <!-- Match Score -->
            <div class="mb-4 bg-surface rounded-lg p-4 border border-edge shadow-sm">
              <p class="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <Target :size="18" class="text-zinc-400" />
                Match Score
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-zinc-300 w-24 truncate">{{ match.home_name }}</span>
                  <input
                    v-model.number="stats.home_goals"
                    type="number"
                    class="flex-1 px-3 py-1.5 text-sm border border-edge rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-zinc-300 w-24 truncate">{{ match.away_name }}</span>
                  <input
                    v-model.number="stats.away_goals"
                    type="number"
                    class="flex-1 px-3 py-1.5 text-sm border border-edge rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <!-- Statistics by Team -->
            <div class="grid grid-cols-2 gap-2 mb-3">
              <!-- Home Team Stats -->
              <div class="bg-green-500/20 rounded p-2">
                <p class="text-xs font-bold text-gray-800 mb-2">{{ match.home_name }}</p>
                <div class="space-y-1.5">
                  <div>
                    <label class="text-xs text-gray-600">Shots</label>
                    <UInput v-model.number="stats.home_shots" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">On Target</label>
                    <UInput v-model.number="stats.home_shots_on_target" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Possession %</label>
                    <UInput v-model.number="stats.home_possession_pct" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Corners</label>
                    <UInput v-model.number="stats.home_corners" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Fouls</label>
                    <UInput v-model.number="stats.home_fouls" type="number" size="xs" />
                  </div>
                  <div class="grid grid-cols-2 gap-1">
                    <div>
                      <label class="text-xs text-gray-600">Yellow</label>
                      <UInput v-model.number="stats.home_yellow_cards" type="number" size="xs" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-600">Red</label>
                      <UInput v-model.number="stats.home_red_cards" type="number" size="xs" />
                    </div>
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Offsides</label>
                    <UInput v-model.number="stats.home_offsides" type="number" size="xs" />
                  </div>
                </div>
              </div>

              <!-- Away Team Stats -->
              <div class="bg-orange-500/20 rounded p-2">
                <p class="text-xs font-bold text-gray-800 mb-2">{{ match.away_name }}</p>
                <div class="space-y-1.5">
                  <div>
                    <label class="text-xs text-gray-600">Shots</label>
                    <UInput v-model.number="stats.away_shots" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">On Target</label>
                    <UInput v-model.number="stats.away_shots_on_target" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Possession %</label>
                    <UInput v-model.number="stats.away_possession_pct" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Corners</label>
                    <UInput v-model.number="stats.away_corners" type="number" size="xs" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Fouls</label>
                    <UInput v-model.number="stats.away_fouls" type="number" size="xs" />
                  </div>
                  <div class="grid grid-cols-2 gap-1">
                    <div>
                      <label class="text-xs text-gray-600">Yellow</label>
                      <UInput v-model.number="stats.away_yellow_cards" type="number" size="xs" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-600">Red</label>
                      <UInput v-model.number="stats.away_red_cards" type="number" size="xs" />
                    </div>
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">Offsides</label>
                    <UInput v-model.number="stats.away_offsides" type="number" size="xs" />
                  </div>
                </div>
              </div>
            </div>


          </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-edge bg-surface">
        <button
          @click="close"
          class="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-surface-light rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          @click="saveStats"
          :disabled="saving"
          class="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Save :size="16" v-if="!saving" />
          <RefreshCw :size="16" v-else class="animate-spin" />
          {{ saving ? 'Saving...' : 'Save Statistics' }}
        </button>
      </div>
    </div>
  </div>
</Transition>
</Teleport>
</template>

<script setup>
const props = defineProps({
  match: {
    type: Object,
    required: true
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)

const stats = ref({
  // Score
  home_goals: props.match.home_goals ?? null,
  away_goals: props.match.away_goals ?? null,
  
  // Tier 1: Essential
  home_shots: props.match.home_shots ?? 0,
  away_shots: props.match.away_shots ?? 0,
  home_shots_on_target: props.match.home_shots_on_target ?? 0,
  away_shots_on_target: props.match.away_shots_on_target ?? 0,
  home_possession_pct: props.match.home_possession_pct ?? 50,
  away_possession_pct: props.match.away_possession_pct ?? 50,
  home_corners: props.match.home_corners ?? 0,
  away_corners: props.match.away_corners ?? 0,
  home_fouls: props.match.home_fouls ?? 0,
  away_fouls: props.match.away_fouls ?? 0,
  home_yellow_cards: props.match.home_yellow_cards ?? 0,
  away_yellow_cards: props.match.away_yellow_cards ?? 0,
  home_red_cards: props.match.home_red_cards ?? 0,
  away_red_cards: props.match.away_red_cards ?? 0,
  home_days_rest: props.match.home_days_rest ?? 7,
  away_days_rest: props.match.away_days_rest ?? 7,
  
  // Tier 2: Advanced
  home_xg: props.match.home_xg ?? 0.0,
  away_xg: props.match.away_xg ?? 0.0,
  home_passes_completed: props.match.home_passes_completed ?? 0,
  home_passes_attempted: props.match.home_passes_attempted ?? 0,
  away_passes_completed: props.match.away_passes_completed ?? 0,
  away_passes_attempted: props.match.away_passes_attempted ?? 0,
  home_offsides: props.match.home_offsides ?? 0,
  away_offsides: props.match.away_offsides ?? 0,
  
  // Tier 3: Expert
  home_saves: props.match.home_saves ?? 0,
  away_saves: props.match.away_saves ?? 0,
  home_aerials_won: props.match.home_aerials_won ?? 0,
  home_aerials_total: props.match.home_aerials_total ?? 0,
  away_aerials_won: props.match.away_aerials_won ?? 0,
  away_aerials_total: props.match.away_aerials_total ?? 0,
  home_big_chances: props.match.home_big_chances ?? 0,
  away_big_chances: props.match.away_big_chances ?? 0
})

const close = () => {
  isOpen.value = false
}

const resetToDefaults = () => {
  // Reset all stats to defaults
  Object.keys(stats.value).forEach(key => {
    if (key.includes('_pct')) {
      stats.value[key] = 50
    } else if (key.includes('days_rest')) {
      stats.value[key] = 7
    } else if (key.includes('xg')) {
      stats.value[key] = 0.0
    } else if (key.includes('goals')) {
      stats.value[key] = null
    } else {
      stats.value[key] = 0
    }
  })
}

const calculatePossession = () => {
  // Auto-calculate away possession to sum to 100%
  if (stats.value.home_possession_pct) {
    stats.value.away_possession_pct = 100 - stats.value.home_possession_pct
  }
}

const saveStats = async () => {
  saving.value = true
  try {
    const dataToSave = {
      ...stats.value
    }
    
    await $fetch(`/api/admin/games/${props.match.id}`, {
      method: 'PATCH',
      body: dataToSave
    })
    
    emit('saved', stats.value)
    isOpen.value = false
    
    useToast().add({
      title: 'Success!',
      description: 'Match statistics updated successfully',
      color: 'green'
    })
  } catch (error) {
    console.error('Error saving statistics:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to update statistics: ' + error.message,
      color: 'red'
    })
  } finally {
    saving.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Date TBD'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  })
}

// Import icons
import { RefreshCw, X, Target, Save } from 'lucide-vue-next'

</script>
