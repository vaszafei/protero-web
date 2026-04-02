<template>
  <div class="bg-surface border-b border-edge sticky top-0 z-10 shadow-sm">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Title & Description -->
        <div>
          <h1 class="text-lg font-semibold text-white">Admin Panel</h1>
          <p class="text-sm text-zinc-500 mt-0.5">Manage match scores and standings</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
          <button
            @click="$emit('fetch-scheduled')"
            class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CalendarPlus :size="16" />
            Fetch Games
          </button>
          
          <button
            @click="$emit('fix-statuses')"
            class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle :size="16" />
            Fix Statuses
          </button>
          
          <button
            @click="$emit('refresh')"
            class="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface-hover text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw :size="16" />
            Refresh
          </button>
          
          <button
            @click="$emit('logout')"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut :size="16" />
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RefreshCw, LogOut, CheckCircle, CalendarPlus } from 'lucide-vue-next'

defineEmits(['logout', 'refresh', 'fix-statuses', 'fetch-scheduled'])
</script>
