<template>
  <UModal v-model="open">
    <div class="p-5 sm:p-6 bg-surface rounded-xl">
      <div class="flex items-start gap-3 mb-4">
        <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-emerald-400" />
        </div>
        <div class="min-w-0">
          <h3 class="text-base font-bold text-zinc-100">Subscribe to wallet</h3>
          <p class="text-xs text-zinc-500 mt-0.5 truncate">{{ wallet?.meta?.longName || wallet?.name }}</p>
        </div>
      </div>

      <!-- Strategy blurb -->
      <p v-if="wallet?.meta?.blurb" class="text-[13px] text-zinc-300 leading-relaxed mb-4">{{ wallet.meta.blurb }}</p>

      <!-- Cost / balance -->
      <div class="rounded-lg bg-surface-light/40 border border-edge p-3 mb-4 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-500">Cost</span>
          <span class="font-semibold text-zinc-100 tabular-nums">{{ pricing.cost_credits }} credits</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-500">Duration</span>
          <span class="font-semibold text-zinc-100">{{ pricing.duration_days }} days</span>
        </div>
        <div class="flex items-center justify-between text-xs pt-2 border-t border-edge/40">
          <span class="text-zinc-500">Your balance</span>
          <span
            class="font-semibold tabular-nums"
            :class="balance >= pricing.cost_credits ? 'text-emerald-400' : 'text-red-400'"
          >{{ balance }} credits</span>
        </div>
      </div>

      <!-- Insufficient balance warning -->
      <div v-if="balance < pricing.cost_credits"
           class="rounded-lg bg-red-500/10 border border-red-500/30 p-3 mb-4">
        <p class="text-[11px] text-red-300">
          You need <span class="font-bold tabular-nums">{{ pricing.cost_credits - balance }}</span> more credits.
          Earn credits by completing data tasks.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          @click="open = false"
          class="flex-1 px-4 py-2 rounded-md bg-surface-light text-zinc-300 text-sm font-medium hover:text-white transition-colors"
        >Cancel</button>
        <button
          @click="$emit('confirm', wallet)"
          :disabled="busy || balance < pricing.cost_credits"
          class="flex-1 px-4 py-2 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon v-if="busy" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin inline mr-1" />
          Confirm
        </button>
      </div>
    </div>
  </UModal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  wallet:     { type: Object, default: null },   // enriched wallet w/ .meta
  pricing:    { type: Object, required: true },  // { cost_credits, duration_days }
  balance:    { type: Number, default: 0 },
  busy:       { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>
