<template>
  <aside class="sidebar w-64 bg-surface border-r border-edge flex flex-col h-full">
    <!-- Header -->
    <div class="sb-brand p-4 border-b border-edge">
      <NuxtLink to="/" class="block" @click="$emit('navigate')">
        <div class="w-full flex items-center justify-center">
          <img src="/proteroLogo.png" alt="ΠροΤερο Logo" width="80" height="80" class="w-20 h-20 object-contain" />
        </div>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="p-4 border-b border-edge space-y-1">
      <!-- `/` prefix-matches every route, so Dashboard needs the EXACT class;
           the rest keep the prefix match so /wallet/26 still lights Wallet. -->
      <NuxtLink
        v-for="item in visibleNav"
        :key="item.to"
        :to="item.to"
        class="sb-item"
        :active-class="item.exact ? '' : 'sb-item-active'"
        exact-active-class="sb-item-active"
        @click="$emit('navigate')"
      >
        <component :is="item.icon" :size="18" />
        <span class="text-sm font-medium">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="flex-1"></div>

    <div class="p-4 border-t border-edge">
      <h2 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">Settings</h2>

      <NuxtLink
        to="/account"
        class="sb-item"
        active-class="sb-item-active"
        @click="$emit('navigate')"
      >
        <User :size="18" />
        <span class="text-sm font-medium">Account</span>
      </NuxtLink>

      <button @click="handleLogout" class="sb-item w-full mt-1">
        <LogOut :size="18" />
        <span class="text-sm font-medium">Logout</span>
      </button>
    </div>

    <!-- Admin Panel (Only visible for admin users) -->
    <div v-if="isAdmin" class="p-4">
      <NuxtLink
        to="/admin"
        class="sb-item"
        active-class="sb-item-active"
        @click="$emit('navigate')"
      >
        <Shield :size="18" />
        <span class="text-sm font-medium">Admin Panel</span>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup>
import { LayoutGrid, CalendarDays, User, LogOut, Shield, ShieldCheck, Trophy, Wallet, Sparkles } from 'lucide-vue-next'

defineEmits(['navigate'])

const { isAdmin, logout } = useAuth()

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, exact: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/leagues', label: 'Leagues', icon: Trophy },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/fantasy', label: 'Fantasy', icon: Sparkles, admin: true },
  { to: '/gates', label: 'Gates', icon: ShieldCheck, admin: true },
]
const visibleNav = computed(() => NAV.filter((i) => !i.admin || isAdmin.value))

const handleLogout = async () => {
  await logout()
}
</script>

<style scoped>
/* The wordmark sits on a faint wash of its own two inks. */
.sb-brand {
  background:
    radial-gradient(120% 90% at 20% 0%, var(--brand-blue-tint), transparent 60%),
    radial-gradient(120% 90% at 85% 100%, var(--brand-red-tint), transparent 60%);
}

.sb-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  border-radius: var(--r);
  color: var(--ink-soft);
  transition: color var(--dur-fast) ease, background var(--dur-fast) ease;
}
.sb-item:hover {
  color: var(--ink-strong);
  background: var(--surface-hover);
}

/* Active: the logo's own blue→red, as a rail on the left edge. Two inks
   together read as the brand; a single red would read as "loss". */
.sb-item-active {
  color: var(--ink-strong);
  background: linear-gradient(90deg, var(--brand-blue-tint), rgba(77, 143, 255, 0.03));
}
.sb-item-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45rem;
  bottom: 0.45rem;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--brand-blue), var(--brand-red));
}
.sb-item-active :deep(svg) { color: var(--brand-blue-hi); }
</style>
