<template>
  <div class="p-3 sm:p-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-zinc-100">Credits</h1>
        <p class="text-xs text-zinc-500 mt-0.5">Earn credits by contributing data, spend them to unlock leagues</p>
      </div>

      <!-- Balance card -->
      <div class="bg-surface border border-edge rounded-lg p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wider text-zinc-500 mb-1">Your Balance</p>
            <p class="text-3xl font-bold text-zinc-100 tabular-nums">{{ balance }}</p>
            <p class="text-xs text-zinc-500 mt-1">
              {{ totalEarned }} earned · {{ totalSpent }} spent
            </p>
          </div>
          <div class="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg class="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" />
              <text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">C</text>
            </svg>
          </div>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-surface border border-edge rounded-lg p-3 text-center">
          <p class="text-lg font-bold text-zinc-200 tabular-nums">{{ freeLeagueKey || '—' }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Free League</p>
        </div>
        <div class="bg-surface border border-edge rounded-lg p-3 text-center">
          <p class="text-lg font-bold text-zinc-200 tabular-nums">{{ activeUnlocks.length }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Active Unlocks</p>
        </div>
        <div class="bg-surface border border-edge rounded-lg p-3 text-center">
          <p class="text-lg font-bold text-zinc-200 tabular-nums">{{ transactions.length }}</p>
          <p class="text-xs text-zinc-500 mt-0.5">Transactions</p>
        </div>
      </div>

      <!-- League access -->
      <LeagueCreditsCard />

      <!-- Earn credits CTA -->
      <div class="bg-surface border border-edge rounded-lg p-5 text-center">
        <svg class="w-8 h-8 mx-auto text-blue-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v20M2 12h20" />
        </svg>
        <h3 class="font-semibold text-zinc-200 mb-1">Earn More Credits</h3>
        <p class="text-xs text-zinc-500 mb-3">
          Contribute match data to earn credits. First contributors get a bonus!
        </p>
        <NuxtLink
          to="/contribute"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          View Available Tasks
        </NuxtLink>
      </div>

      <!-- Transaction history -->
      <div v-if="transactions.length > 0" class="bg-surface border border-edge rounded-lg">
        <div class="px-4 py-3 border-b border-edge">
          <h3 class="font-semibold text-zinc-200 text-sm">Recent Transactions</h3>
        </div>
        <div class="divide-y divide-edge">
          <div
            v-for="tx in transactions"
            :key="tx.id"
            class="px-4 py-3 flex items-center justify-between"
          >
            <div class="min-w-0">
              <p class="text-sm text-zinc-300 truncate">{{ tx.description || tx.type }}</p>
              <p class="text-xs text-zinc-600 mt-0.5">{{ formatDateTime(tx.created_at) }}</p>
            </div>
            <span
              class="font-semibold text-sm tabular-nums flex-shrink-0 ml-3"
              :class="tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import LeagueCreditsCard from '~/components/LeagueCreditsCard.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { balance, totalEarned, totalSpent, freeLeagueKey, transactions, activeUnlocks, fetchCredits } = useCredits()

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  fetchCredits()
})
</script>
