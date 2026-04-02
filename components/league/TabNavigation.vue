<template>
  <div class="league-tabs-card rounded-lg overflow-hidden mb-3 sm:mb-6">
    <div class="flex border-b border-edge/50">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="$emit('update:activeTab', tab.key)"
        class="flex-1 min-w-0 px-3 sm:px-5 py-3 sm:py-3.5 min-h-[44px] text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap relative"
        :class="activeTab === tab.key
          ? 'text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-300'"
      >
        <div class="flex items-center justify-center gap-1.5">
          <component :is="tab.icon" :size="15" />
          <span class="hidden sm:inline">{{ tab.label }}</span>
          <span class="sm:hidden">{{ tab.shortLabel || tab.label }}</span>
        </div>
        <div 
          v-if="activeTab === tab.key"
          class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full tab-indicator"
        ></div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { LayoutDashboard, BarChart3, Lightbulb } from 'lucide-vue-next'

defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

defineEmits(['update:activeTab'])

const tabs = [
  { key: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { key: 'analysis', label: 'Analysis', shortLabel: 'Analysis', icon: BarChart3 },
  { key: 'predictions', label: 'Predictions', shortLabel: 'Preds', icon: Lightbulb }
]
</script>

<style scoped>
.league-tabs-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.tab-indicator {
  background: linear-gradient(90deg, #f82828, #0848a8);
  opacity: 0.5;
}
</style>
