<template>
  <div class="account-card rounded-xl p-4 sm:p-5">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
        <UIcon name="i-heroicons-bell" class="w-4 h-4 text-pink-400" />
        Notifications
      </h3>
      <span v-if="saving" class="text-[10px] text-zinc-500 italic flex items-center gap-1">
        <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
        Saving…
      </span>
      <span v-else-if="savedFlash" class="text-[10px] text-emerald-400 italic">Saved</span>
    </div>

    <div class="space-y-2.5">
      <NotifToggle
        v-for="t in toggles"
        :key="t.key"
        :label="t.label"
        :description="t.description"
        :model-value="!!prefs[t.key]"
        :disabled="saving"
        @update:model-value="(v) => onToggle(t.key, v)"
      />
    </div>

    <p v-if="error" class="text-[11px] text-red-400 mt-3">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'

const { user } = useAuth()
const api = useApi()

const toggles = [
  { key: 'picks', label: 'Daily picks digest', description: 'Get a summary of new predictions every morning' },
  { key: 'results', label: 'Bet settled alerts', description: 'Notify me when my followed wallets settle bets' },
  { key: 'subscription_expiry', label: 'Subscription expiry', description: 'Warn me 3 days before a wallet sub expires' },
  { key: 'news', label: 'Product news', description: 'New leagues, features, and announcements' },
] as const

const prefs = ref<Record<string, boolean>>({
  picks: true,
  results: true,
  subscription_expiry: true,
  news: false,
  ...(user.value?.notification_prefs || {}),
})

const saving = ref(false)
const savedFlash = ref(false)
const error = ref<string | null>(null)
let savedTimer: any = null

async function onToggle(key: string, value: boolean) {
  prefs.value = { ...prefs.value, [key]: value }
  saving.value = true
  error.value = null
  try {
    const next = await api.updateNotificationPrefs({ [key]: value })
    if (next && typeof next === 'object') {
      prefs.value = { ...prefs.value, ...next }
      // Mirror onto the cached user state so other surfaces see the change
      if (user.value) user.value.notification_prefs = { ...prefs.value }
    }
    savedFlash.value = true
    if (savedTimer) clearTimeout(savedTimer)
    savedTimer = setTimeout(() => (savedFlash.value = false), 1500)
  } catch (err: any) {
    // Roll back optimistic update
    prefs.value = { ...prefs.value, [key]: !value }
    error.value = err?.message || 'Failed to save preference'
  } finally {
    saving.value = false
  }
}

// Inline switch row to keep the template flat
const NotifToggle = defineComponent({
  props: {
    label: { type: String, required: true },
    description: { type: String, required: true },
    modelValue: { type: Boolean, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () =>
      h('label', {
        class: ['notif-row', p.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'],
      }, [
        h('div', { class: 'flex-1 min-w-0' }, [
          h('div', { class: 'text-[12px] font-semibold text-zinc-200' }, p.label),
          h('div', { class: 'text-[10px] text-zinc-500 mt-0.5' }, p.description),
        ]),
        h('input', {
          type: 'checkbox',
          checked: p.modelValue,
          disabled: p.disabled,
          class: 'notif-switch',
          onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).checked),
        }),
      ])
  },
})
</script>

<style scoped>
.account-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.notif-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  transition: background 120ms;
}
.notif-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

/* Native switch — sized + recolored for our theme */
.notif-switch {
  appearance: none;
  -webkit-appearance: none;
  width: 36px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: background 160ms;
  flex-shrink: 0;
  margin-top: 2px;
}
.notif-switch:checked {
  background: #ec4899;
}
.notif-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 999px;
  transition: transform 160ms;
}
.notif-switch:checked::after {
  transform: translateX(16px);
}
</style>
