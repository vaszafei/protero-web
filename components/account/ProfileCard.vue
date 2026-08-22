<template>
  <div class="profile-card rounded-xl p-4 sm:p-5 relative overflow-hidden">
    <!-- Subtle blob -->
    <div class="absolute inset-0 opacity-[0.04] pointer-events-none">
      <div class="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-indigo-500"></div>
    </div>

    <div class="relative flex items-center gap-3">
      <!-- Avatar (initials circle) -->
      <div
        class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-lg"
        :style="{ background: avatarGradient }"
      >
        {{ initials }}
      </div>

      <!-- Identity -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 min-w-0">
          <h2 class="text-base font-bold text-zinc-100 truncate">
            {{ user?.display_name || user?.name || 'Player' }}
          </h2>
          <span
            v-if="user?.role === 'admin'"
            class="text-[9px] font-bold text-red-300 uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 flex-shrink-0"
          >Admin</span>
        </div>
        <p class="text-[11px] text-zinc-500 truncate mt-0.5">{{ user?.email || '—' }}</p>
        <p v-if="user?.created_at" class="text-[10px] text-zinc-600 mt-0.5">
          Member since {{ formatJoinDate(user.created_at) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  user: any | null
}>()

const initials = computed(() => {
  const src = (props.user?.display_name || props.user?.name || props.user?.email || '?').toString()
  const parts = src.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
})

// Stable gradient per user (deterministic from email/id hash)
const avatarGradient = computed(() => {
  const seed = String(props.user?.id || props.user?.email || 'guest')
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const palettes = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #ec4899, #d946ef)',
    'linear-gradient(135deg, #14b8a6, #0ea5e9)',
  ]
  return palettes[Math.abs(h) % palettes.length]
})

function formatJoinDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.profile-card {
  background: rgba(24, 27, 36, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
