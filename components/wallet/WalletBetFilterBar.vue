<template>
  <div class="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-edge/50 overflow-x-auto scrollbar-thin">
    <div class="flex items-center gap-1 flex-shrink-0">
      <button
        v-for="f in statusFilters" :key="f.value"
        @click="$emit('update:status', f.value)"
        class="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap"
        :class="status === f.value
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'text-zinc-500 hover:text-zinc-300'"
      >{{ f.label }}<span v-if="counts[f.value] != null" class="ml-1 text-zinc-600 tabular-nums">{{ counts[f.value] }}</span></button>
    </div>
    <span class="text-[10px] text-zinc-500 tabular-nums flex-shrink-0">{{ total }} total</span>
  </div>
</template>

<script setup>
defineProps({
  status: { type: String, default: '' },
  total:  { type: Number, default: 0 },
  counts: { type: Object, default: () => ({}) }, // { '': 100, pending: 5, won: 70, lost: 25 }
})
defineEmits(['update:status'])

const statusFilters = [
  { label: 'All',     value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won',     value: 'won' },
  { label: 'Lost',    value: 'lost' },
]
</script>
