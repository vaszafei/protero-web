<template>
    <div class="flex h-screen bg-surface-base">
    <!-- Desktop sidebar: hidden on mobile -->
    <aside class="hidden lg:block lg:relative lg:z-auto w-64">
      <Sidebar @navigate="() => {}" class="safe-top" />
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile top bar -->
      <header class="lg:hidden flex items-center justify-between px-4 py-2 bg-surface border-b border-edge safe-top">
        <NuxtLink to="/">
          <img src="/proteroLogo.png" alt="ΠροΤερο" width="40" height="40" class="h-9 w-auto object-contain" />
        </NuxtLink>

        <!-- Menu button -->
        <div class="relative">
          <button
            @click="menuOpen = !menuOpen"
            class="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.632Z" />
            </svg>
          </button>

          <!-- Dropdown menu -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div v-if="menuOpen" class="absolute right-0 top-full mt-1 w-52 bg-surface rounded-xl border border-edge shadow-xl shadow-black/30 overflow-hidden z-50">
              <NuxtLink to="/credits" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8m-3-5.5C9 9.5 10 9 12 9s3 .5 3 1.5S14 12 12 12s-3 .5-3 1.5S10 15 12 15s3-.5 3-1.5"/></svg>
                <span class="text-sm font-medium">Credits</span>
                <CreditsBadge :balance="balance" class="ml-auto" />
              </NuxtLink>
              <NuxtLink to="/contribute" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                <span class="text-sm font-medium">Contribute</span>
              </NuxtLink>
              <NuxtLink to="/preferences" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
                <span class="text-sm font-medium">Preferences</span>
              </NuxtLink>

              <div class="border-t border-edge" />

              <NuxtLink to="/account" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.632Z" /></svg>
                <span class="text-sm font-medium">Account</span>
              </NuxtLink>

              <NuxtLink v-if="isAdmin" to="/admin" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                <span class="text-sm font-medium">Admin Panel</span>
              </NuxtLink>

              <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-surface-light transition-colors">
                <svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                <span class="text-sm font-medium">Logout</span>
              </button>
            </div>
          </Transition>
        </div>
      </header>

      <!-- Click-away overlay to close menu -->
      <div v-if="menuOpen" class="fixed inset-0 z-40 lg:hidden" @click="menuOpen = false" />

      <main class="flex-1 overflow-auto safe-left safe-right pb-16 lg:pb-0">
        <slot />
      </main>

      <!-- Mobile bottom navigation -->
      <BottomNav />
    </div>
  </div>
</template>

<script setup>
import CreditsBadge from '~/components/CreditsBadge.vue'

const route = useRoute()
const menuOpen = ref(false)
const { isAdmin, logout } = useAuth()
const { balance } = useCredits()

// Close menu on route change
watch(() => route.path, () => {
  menuOpen.value = false
})

const handleLogout = async () => {
  menuOpen.value = false
  await logout()
}
</script>

<style scoped>
.safe-top {
  padding-top: max(0.5rem, env(safe-area-inset-top));
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-left {
  padding-left: env(safe-area-inset-left);
}
.safe-right {
  padding-right: env(safe-area-inset-right);
}
</style>
