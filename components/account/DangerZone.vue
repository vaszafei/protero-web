<template>
  <div class="account-card rounded-xl p-4 sm:p-5">
    <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
      <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-zinc-400" />
      Account
    </h3>

    <div class="flex flex-col gap-2">
      <UButton
        color="white"
        variant="soft"
        icon="i-heroicons-key"
        to="/preferences"
        block
      >
        Change password
      </UButton>

      <UButton
        color="red"
        variant="outline"
        icon="i-heroicons-arrow-right-on-rectangle"
        :loading="loggingOut"
        block
        @click="onLogout"
      >
        Logout
      </UButton>

      <button
        type="button"
        class="text-[11px] text-zinc-600 hover:text-red-400 mt-2 self-start transition-colors"
        @click="confirmDelete"
      >
        Delete account
      </button>
    </div>

    <p class="text-[10px] text-zinc-700 mt-4 text-center">
      Protero v{{ appVersion }}
    </p>
  </div>
</template>

<script setup lang="ts">
const { logout } = useAuth()
const loggingOut = ref(false)
const appVersion = '1.0.0'

async function onLogout() {
  loggingOut.value = true
  try {
    await logout()
  } finally {
    loggingOut.value = false
  }
}

function confirmDelete() {
  // Account deletion is a backend feature — gate via a simple confirm for now.
  // When the backend endpoint exists, wire `api.deleteAccount()` here.
  if (typeof window === 'undefined') return
  const ok = window.confirm(
    'Account deletion is irreversible. Contact support to permanently delete your account.\n\nOpen support email?',
  )
  if (ok) window.location.href = 'mailto:support@protero.app?subject=Delete%20my%20account'
}
</script>

<style scoped>
.account-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
