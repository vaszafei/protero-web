<template>
  <div class="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border-2 border-blue-200 p-6">
    <label class="block text-sm font-bold text-blue-900 mb-3">
      Select League
    </label>
    
    <USelectMenu
      v-model="selectedLeague"
      :options="leagueOptions"
      value-attribute="value"
      option-attribute="label"
      placeholder="Choose a league..."
      size="lg"
      color="primary"
      class="w-full"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template #leading>
        <UIcon name="i-heroicons-trophy" class="text-emerald-600" />
      </template>
    </USelectMenu>

    <div v-if="loading" class="mt-4 text-center">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-blue-400" />
      <span class="text-sm text-blue-400 ml-2 font-medium">Loading matches...</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  leagues: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedLeague = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const leagueOptions = computed(() => {
  return props.leagues.map(league => ({
    label: league.name,
    value: league.key
  }))
})
</script>
