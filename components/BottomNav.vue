<template>
  <nav class="fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-edge lg:hidden safe-bottom-nav">
    <div class="flex items-center justify-around h-14 max-w-lg mx-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-lg transition-colors relative',
          isActive(item.to) ? 'text-primary-400' : 'text-zinc-500 active:text-zinc-300'
        ]"
      >
        <!-- Active indicator pill -->
        <span
          v-if="isActive(item.to)"
          class="absolute -top-1 w-8 h-[3px] rounded-full bg-primary-500"
        />
        <component :is="item.icon" :size="22" :stroke-width="isActive(item.to) ? 2.5 : 1.8" />
        <span :class="['text-[10px] font-medium leading-none', isActive(item.to) ? 'font-semibold' : '']">
          {{ item.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
import { LayoutGrid, Trophy, Wallet, ClipboardList } from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { to: '/', label: 'Home', icon: LayoutGrid },
  { to: '/leagues', label: 'Leagues', icon: Trophy },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/my-real-bets', label: 'Bets', icon: ClipboardList },
]

const isActive = (to) => {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<style scoped>
.safe-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
