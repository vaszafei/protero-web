<template>
  <div 
    class="bg-surface border border-edge rounded-lg hover:border-primary-500/50 transition-colors"
    :class="size === 'sm' ? 'p-3' : 'p-4'"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p 
          class="text-zinc-400 font-medium mb-1"
          :class="size === 'sm' ? 'text-xs' : 'text-sm'"
        >
          {{ label }}
        </p>
        <p 
          class="font-semibold text-zinc-100"
          :class="size === 'sm' ? 'text-xl' : 'text-2xl'"
        >
          {{ value }}
        </p>
        <p v-if="subtitle" class="text-xs text-zinc-500 mt-1">{{ subtitle }}</p>
      </div>
      <div v-if="icon" class="flex-shrink-0" :class="size === 'sm' ? 'ml-2' : 'ml-3'">
        <div 
          class="rounded-lg bg-primary-500/15 flex items-center justify-center"
          :class="size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'"
        >
          <component :is="icon" :size="size === 'sm' ? 16 : 20" class="text-primary-400" />
        </div>
      </div>
    </div>
    <div v-if="trend" class="mt-3 flex items-center text-xs">
      <span 
        class="font-medium"
        :class="trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400'"
      >
        {{ trend > 0 ? '+' : '' }}{{ trend }}%
      </span>
      <span class="text-zinc-500 ml-1">vs last period</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  subtitle?: string
  icon?: any
  trend?: number
  size?: 'sm' | 'md'
}>()
</script>
