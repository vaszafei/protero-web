<template>
  <div class="account-card rounded-xl p-4 sm:p-5">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
        <UIcon name="i-heroicons-bookmark" class="w-4 h-4 text-indigo-400" />
        Subscriptions
      </h3>
      <UButton
        size="xs"
        color="white"
        variant="ghost"
        :to="'/preferences'"
        trailing-icon="i-heroicons-chevron-right"
      >
        Manage
      </UButton>
    </div>

    <div v-if="pending" class="text-[11px] text-zinc-500 py-2">Loading subscriptions…</div>

    <template v-else>
      <!-- League subscriptions -->
      <div class="mb-3">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Leagues ({{ leagues.length }})</p>
        <div v-if="leagues.length" class="flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="lg in leagues"
            :key="lg.league_key"
            :to="`/league/${lg.league_key}`"
            class="chip"
          >
            <span class="text-[10px]">{{ sportEmoji(lg.sport) }}</span>
            <span>{{ lg.label }}</span>
          </NuxtLink>
        </div>
        <p v-else class="text-[11px] text-zinc-600 italic">
          No leagues yet —
          <NuxtLink to="/leagues" class="text-indigo-400 hover:underline">browse</NuxtLink>
        </p>
      </div>

      <!-- Wallet subscriptions -->
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Wallets ({{ activeWallets.length }})</p>
        <div v-if="activeWallets.length" class="flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="w in activeWallets"
            :key="w.wallet_id"
            :to="`/wallet?wallet=${w.wallet_id}`"
            class="chip wallet-chip"
            :class="expiresClass(w.expires_at)"
          >
            <span>{{ w.label }}</span>
            <span v-if="w.expires_at" class="text-[9px] opacity-70">{{ daysLeft(w.expires_at) }}d</span>
          </NuxtLink>
        </div>
        <p v-else class="text-[11px] text-zinc-600 italic">
          No wallet follows —
          <NuxtLink to="/wallet" class="text-indigo-400 hover:underline">discover</NuxtLink>
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const api = useApi()

const { data: subsData, pending: subsPending } = useSwr(
  'account_subscriptions',
  () => api.fetchSubscriptions(),
  { memoryTtl: 60_000 },
)

const { data: walletSubsData, pending: walletPending } = useSwr(
  'account_wallet_subscriptions',
  () => api.fetchWalletSubscriptions(),
  { memoryTtl: 60_000 },
)

const pending = computed(() => subsPending.value || walletPending.value)

const leagues = computed<any[]>(() => {
  const subs = (subsData.value as any)?.subscriptions || []
  return subs
    .filter((s: any) => s.is_active !== false)
    .map((s: any) => ({
      league_key: s.league_key,
      label: s.league_name || prettyLeagueKey(s.league_key),
      sport: s.sport || 'football',
    }))
})

const activeWallets = computed<any[]>(() => {
  const subs = (walletSubsData.value as any)?.subscriptions || []
  const wallets = (walletSubsData.value as any)?.wallets || []
  const walletMap = new Map(wallets.map((w: any) => [w.id, w]))
  return subs.map((s: any) => {
    const w: any = walletMap.get(s.wallet_id)
    return {
      wallet_id: s.wallet_id,
      label: w?.name ? shortenWalletName(w.name) : `Wallet #${s.wallet_id}`,
      expires_at: s.expires_at,
    }
  })
})

function prettyLeagueKey(k: string) {
  return k
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function shortenWalletName(name: string) {
  return name.replace(/\s+202\d-\d{4}/g, '').trim()
}

function sportEmoji(sport: string) {
  if (sport === 'basketball') return '🏀'
  return '⚽'
}

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

function expiresClass(iso?: string | null) {
  if (!iso) return ''
  const d = daysLeft(iso)
  if (d <= 0) return 'opacity-50 line-through'
  if (d <= 3) return 'border-amber-500/40 text-amber-200'
  return ''
}
</script>

<style scoped>
.account-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: rgb(212, 212, 216);
  transition: background 120ms;
}
.chip:hover {
  background: rgba(255, 255, 255, 0.1);
}
.wallet-chip {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.2);
  color: rgb(199, 210, 254);
}
.wallet-chip:hover {
  background: rgba(99, 102, 241, 0.15);
}
</style>
