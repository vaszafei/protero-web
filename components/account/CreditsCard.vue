<template>
  <div class="account-card credits-card rounded-xl p-4 sm:p-5 relative overflow-hidden">
    <!-- Decorative blob -->
    <div class="absolute inset-0 opacity-[0.05] pointer-events-none">
      <div class="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-amber-400"></div>
    </div>

    <div class="relative">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 text-amber-400" />
          Credits
        </h3>
        <UButton
          size="xs"
          color="white"
          variant="ghost"
          to="/credits"
          trailing-icon="i-heroicons-chevron-right"
        >
          View all
        </UButton>
      </div>

      <!-- Big balance -->
      <div class="flex items-baseline gap-3 mb-3">
        <span class="text-3xl sm:text-4xl font-extrabold text-amber-300 tabular-nums">
          {{ formatNum(balance) }}
        </span>
        <span class="text-[11px] text-zinc-500 font-medium">credits</span>
      </div>

      <!-- Earned/spent -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="stat-pill">
          <p class="text-[9px] text-zinc-500 uppercase tracking-wider">Earned</p>
          <p class="text-sm font-bold text-emerald-400 tabular-nums">+{{ formatNum(totalEarned) }}</p>
        </div>
        <div class="stat-pill">
          <p class="text-[9px] text-zinc-500 uppercase tracking-wider">Spent</p>
          <p class="text-sm font-bold text-zinc-300 tabular-nums">−{{ formatNum(totalSpent) }}</p>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex gap-2 mb-3">
        <UButton
          size="xs"
          color="amber"
          variant="soft"
          icon="i-heroicons-plus-circle"
          to="/credits"
          block
        >
          Earn
        </UButton>
        <UButton
          size="xs"
          color="indigo"
          variant="soft"
          icon="i-heroicons-bookmark"
          to="/leagues"
          block
        >
          Spend
        </UButton>
      </div>

      <!-- Recent transactions -->
      <div v-if="recent.length">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Recent</p>
        <div class="space-y-1">
          <div
            v-for="tx in recent"
            :key="tx.id"
            class="flex items-center justify-between py-1 text-[11px]"
          >
            <span class="truncate text-zinc-300 flex-1 min-w-0">{{ tx.description || prettyType(tx.type) }}</span>
            <span
              class="font-bold tabular-nums flex-shrink-0 ml-2"
              :class="Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-zinc-500'"
            >
              {{ Number(tx.amount) >= 0 ? '+' : '' }}{{ tx.amount }}
            </span>
          </div>
        </div>
      </div>
      <p v-else-if="!pending" class="text-[11px] text-zinc-600 italic">No transactions yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { balance, totalEarned, totalSpent, transactions, fetchCredits, loading: pending } = useCredits()

onMounted(async () => {
  // Pull latest credit state when card mounts (cheap & idempotent)
  if (!transactions.value || transactions.value.length === 0) {
    await fetchCredits()
  }
})

const recent = computed(() => (transactions.value || []).slice(0, 5))

function formatNum(n: number) {
  return Number(n || 0).toLocaleString('en-US')
}

function prettyType(t: string) {
  return (t || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<style scoped>
.account-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.stat-pill {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}
</style>
