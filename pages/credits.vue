<template>
  <div class="px-3 py-3 sm:px-6 sm:py-6 max-w-2xl mx-auto space-y-3">
    <!-- Back / title row -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        @click="goBack"
        aria-label="Back"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-light transition-colors -ml-1"
      >
        <UIcon name="i-heroicons-chevron-left" class="w-5 h-5" />
      </button>
      <h1 class="text-base font-bold text-zinc-100">Credits</h1>
    </div>

    <!-- Balance hero -->
    <div class="account-card credits-hero rounded-xl p-5 relative overflow-hidden">
      <div class="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-amber-400/10 pointer-events-none" />
      <div class="relative">
        <p class="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">Available balance</p>
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-extrabold text-amber-300 tabular-nums">{{ formatNum(balance) }}</span>
          <span class="text-xs text-zinc-500 font-medium">credits</span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-4">
          <div class="stat-pill">
            <p class="text-[9px] text-zinc-500 uppercase tracking-wider">Total earned</p>
            <p class="text-base font-bold text-emerald-400 tabular-nums">+{{ formatNum(totalEarned) }}</p>
          </div>
          <div class="stat-pill">
            <p class="text-[9px] text-zinc-500 uppercase tracking-wider">Total spent</p>
            <p class="text-base font-bold text-zinc-300 tabular-nums">−{{ formatNum(totalSpent) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Active unlocks -->
    <div class="account-card rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <UIcon name="i-heroicons-lock-open" class="w-4 h-4 text-indigo-400" />
          Active unlocks
        </h3>
        <UButton size="xs" color="indigo" variant="soft" to="/leagues" trailing-icon="i-heroicons-arrow-right">
          Browse leagues
        </UButton>
      </div>
      <div v-if="activeUnlocks.length" class="space-y-1.5">
        <div
          v-for="u in activeUnlocks"
          :key="u.league_key"
          class="flex items-center justify-between py-1.5 px-2 rounded bg-white/[0.02] text-[12px]"
        >
          <span class="font-semibold text-zinc-200">{{ u.league_key }}</span>
          <span class="text-[10px] text-zinc-500">expires {{ formatDate(u.expires_at) }}</span>
        </div>
      </div>
      <p v-else class="text-[11px] text-zinc-600 italic">No leagues unlocked yet.</p>
    </div>

    <!-- How to earn -->
    <div class="account-card rounded-xl p-4">
      <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-amber-400" />
        How to earn credits
      </h3>
      <ul class="space-y-2">
        <li v-for="row in earningRows" :key="row.label" class="flex items-center justify-between text-[12px]">
          <span class="text-zinc-300">{{ row.label }}</span>
          <span class="font-bold text-amber-300 tabular-nums">+{{ row.amount }}</span>
        </li>
      </ul>
    </div>

    <!-- Transaction history -->
    <div class="account-card rounded-xl p-4">
      <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
        <UIcon name="i-heroicons-clock" class="w-4 h-4 text-zinc-400" />
        History
      </h3>
      <div v-if="transactions.length" class="divide-y divide-white/[0.04]">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="flex items-center justify-between py-2 text-[12px]"
        >
          <div class="flex-1 min-w-0">
            <p class="text-zinc-200 truncate">{{ tx.description || prettyType(tx.type) }}</p>
            <p class="text-[10px] text-zinc-600">{{ formatDate(tx.created_at) }}</p>
          </div>
          <span
            class="font-bold tabular-nums flex-shrink-0 ml-2"
            :class="Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-zinc-400'"
          >
            {{ Number(tx.amount) >= 0 ? '+' : '' }}{{ tx.amount }}
          </span>
        </div>
      </div>
      <p v-else-if="!loading" class="text-[11px] text-zinc-600 italic">No transactions yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const router = useRouter()
const { balance, totalEarned, totalSpent, transactions, activeUnlocks, loading, fetchCredits } = useCredits()

useHead({ title: 'Credits · Protero' })

const earningRows = [
  { label: 'Daily login streak (3 days)', amount: 50 },
  { label: 'Daily login streak (7 days)', amount: 150 },
  { label: 'Place your first bet', amount: 100 },
  { label: 'Win 5 bets in a row', amount: 250 },
  { label: 'Refer a friend', amount: 500 },
]

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else navigateTo('/account')
}

function formatNum(n: number | undefined | null) {
  return Number(n || 0).toLocaleString('en-US')
}

function formatDate(d: string | null | undefined) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function prettyType(t: string) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

onMounted(() => {
  fetchCredits()
})
</script>

<style scoped>
.account-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.credits-hero {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(24, 27, 36, 0.55));
}
.stat-pill {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}
</style>
