<template>
    <div class="flex h-screen bg-surface-base">
    <!-- Desktop sidebar: hidden on mobile -->
    <aside class="hidden lg:block lg:relative lg:z-auto w-64">
      <Sidebar @navigate="() => {}" />
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
            <UIcon name="i-heroicons-user-circle" class="w-5 h-5" />
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
              <NuxtLink to="/account" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <UIcon name="i-heroicons-user-circle" class="w-[18px] h-[18px] shrink-0" />
                <span class="text-sm font-medium">Account</span>
              </NuxtLink>

              <NuxtLink to="/my-real-bets" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <UIcon name="i-heroicons-banknotes" class="w-[18px] h-[18px] shrink-0" />
                <span class="text-sm font-medium">My Real Bets</span>
              </NuxtLink>

              <NuxtLink v-if="isAdmin" to="/admin" class="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-surface-light transition-colors" @click="menuOpen = false">
                <UIcon name="i-heroicons-shield-check" class="w-[18px] h-[18px] shrink-0" />
                <span class="text-sm font-medium">Admin Panel</span>
              </NuxtLink>

              <div class="border-t border-edge" />

              <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-surface-light transition-colors">
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-[18px] h-[18px] shrink-0" />
                <span class="text-sm font-medium">Logout</span>
              </button>
            </div>
          </Transition>
        </div>
      </header>

      <!-- Click-away overlay to close menu -->
      <div v-if="menuOpen" class="fixed inset-0 z-40 lg:hidden" @click="menuOpen = false" />

      <main class="flex-1 overflow-auto pb-16 lg:pb-0">
        <slot />
      </main>

      <!-- Mobile bottom navigation -->
      <BottomNav />
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const menuOpen = ref(false)
const { isAdmin, logout } = useAuth()

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
