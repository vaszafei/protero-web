<template>
  <aside class="w-64 bg-surface border-r border-edge flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 border-b border-edge">
      <NuxtLink to="/" class="block" @click="$emit('navigate')">
        <div class="w-full flex items-center justify-center">
          <img src="/proteroLogo.png" alt="ΠροΤερο Logo" width="80" height="80" class="w-20 h-20 object-contain" />
        </div>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <div class="p-4 border-b border-edge">
      <NuxtLink 
        to="/" 
        class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <LayoutGrid :size="18" />
        <span class="text-sm font-medium">Dashboard</span>
      </NuxtLink>
      
      <NuxtLink 
        to="/leagues" 
        class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <Trophy :size="18" />
        <span class="text-sm font-medium">Leagues</span>
      </NuxtLink>

      <NuxtLink 
        to="/wallet" 
        class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <Wallet :size="18" />
        <span class="text-sm font-medium">Wallet</span>
      </NuxtLink>

      <NuxtLink 
        to="/entities" 
        class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <Network :size="18" />
        <span class="text-sm font-medium">Entities</span>
      </NuxtLink>

      <NuxtLink 
        v-if="isAdmin"
        to="/gates" 
        class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <ShieldCheck :size="18" />
        <span class="text-sm font-medium">Gates</span>
      </NuxtLink>
    </div>

    <!-- Settings (Available for all users) -->
    <div class="flex-1"></div>
    
    <div class="p-4 border-t border-edge">
      <h2 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">Settings</h2>
      
      <NuxtLink 
        to="/account" 
        class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <User :size="18" />
        <span class="text-sm font-medium">Account</span>
      </NuxtLink>
      
      <button 
        @click="handleLogout"
        class="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
      >
        <LogOut :size="18" />
        <span class="text-sm font-medium">Logout</span>
      </button>
    </div>

    <!-- Admin Panel (Only visible for admin users) -->
    <div v-if="isAdmin" class="p-4">
      <NuxtLink 
        to="/admin" 
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-light transition-colors"
        active-class="bg-surface-light text-white"
        @click="$emit('navigate')"
      >
        <Shield :size="18" />
        <span class="text-sm font-medium">Admin Panel</span>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup>
import { LayoutGrid, User, LogOut, Shield, ShieldCheck, Trophy, Wallet, Network } from 'lucide-vue-next'

defineEmits(['navigate'])

const { isAdmin, logout, user } = useAuth()

const handleLogout = async () => {
  await logout()
}
</script>
