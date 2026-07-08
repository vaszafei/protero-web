<template>
  <UModal :model-value="isOpen" @update:model-value="$emit('close')" :ui="{ width: 'sm:max-w-2xl', background: 'bg-surface' }">
    <div class="p-6 bg-surface rounded-xl">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-zinc-100">Edit Match</h3>
        <button @click="$emit('close')" class="text-zinc-500 hover:text-zinc-400">
          <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
        </button>
      </div>
      
      <div v-if="match" class="space-y-6">
        <!-- Teams and Score -->
        <div class="bg-gradient-to-br from-surface-light to-surface rounded-lg p-4 border border-edge">
          <div class="grid grid-cols-3 gap-4 items-center">
            <div class="text-center">
              <div class="font-bold text-lg text-zinc-100 mb-2">{{ match.home }}</div>
              <input
                v-model.number="match.home_goals"
                type="number"
                min="0"
                class="w-20 px-3 py-2 bg-surface border border-edge rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-"
              />
            </div>
            <div class="text-center text-zinc-500 font-bold text-xl">VS</div>
            <div class="text-center">
              <div class="font-bold text-lg text-zinc-100 mb-2">{{ match.away }}</div>
              <input
                v-model.number="match.away_goals"
                type="number"
                min="0"
                class="w-20 px-3 py-2 bg-surface border border-edge rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-"
              />
            </div>
          </div>
          
          <div class="mt-4">
            <label class="block text-sm font-medium text-zinc-300 mb-2">Date</label>
            <input
              v-model="match.date"
              type="date"
              class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <!-- Odds -->
        <div class="bg-gradient-to-br from-surface-light to-surface rounded-lg p-4 border border-edge">
          <h4 class="font-bold text-zinc-100 mb-3">Match Odds</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-zinc-300 mb-1">1 (Home)</label>
              <input
                v-model.number="match.odds.home"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-300 mb-1">X (Draw)</label>
              <input
                v-model.number="match.odds.draw"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-300 mb-1">2 (Away)</label>
              <input
                v-model.number="match.odds.away"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        <!-- Over/Under Odds -->
        <div class="bg-gradient-to-br from-surface-light to-surface rounded-lg p-4 border border-edge">
          <h4 class="font-bold text-zinc-100 mb-3">Over/Under Odds</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-zinc-300 mb-1">Threshold</label>
              <select
                v-model.number="match.odds.threshold"
                class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option :value="2.5">2.5</option>
                <option :value="3.5">3.5</option>
                <option :value="1.5">1.5</option>
                <option :value="4.5">4.5</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-300 mb-1">Over</label>
              <input
                v-model.number="match.odds.over"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-300 mb-1">Under</label>
              <input
                v-model.number="match.odds.under"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 bg-surface border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4">
          <button
            @click="$emit('save')"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Save Changes
          </button>
          <button
            @click="$emit('close')"
            class="px-6 py-3 border-2 border-edge text-zinc-300 font-semibold rounded-lg hover:bg-surface-light transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </UModal>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  match: {
    type: Object,
    default: null
  }
})

defineEmits(['close', 'save'])
</script>
