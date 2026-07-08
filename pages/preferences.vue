<template>
  <div class="px-3 py-3 sm:px-6 sm:py-6 max-w-2xl mx-auto space-y-3 pb-20">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-1">
      <button
        type="button"
        @click="goBack"
        aria-label="Back"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-surface-light transition-colors -ml-1"
      >
        <UIcon name="i-heroicons-chevron-left" class="w-5 h-5" />
      </button>
      <h1 class="text-base font-bold text-zinc-100">Preferences</h1>
    </div>

    <!-- Credits balance pill (sticky-ish) -->
    <div class="balance-card flex items-center justify-between rounded-xl px-4 py-3">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">Credits</p>
        <p class="text-2xl font-extrabold text-amber-300 leading-tight tabular-nums">
          {{ balance }}
        </p>
      </div>
      <NuxtLink
        to="/credits"
        class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-2.5 py-1.5 transition-colors"
      >
        <UIcon name="i-heroicons-sparkles" class="w-3 h-3" />
        Earn more
      </NuxtLink>
    </div>

    <!-- ─────────────────────────── LEAGUES ─────────────────────────── -->
    <div class="account-card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-emerald-400" />
          Leagues
          <span class="text-[10px] font-medium text-zinc-500 ml-1">
            ({{ accessibleLeagueCount }} active)
          </span>
        </h3>
        <button
          type="button"
          @click="leagueFilter = leagueFilter === 'all' ? 'active' : 'all'"
          class="text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md bg-white/5 transition-colors"
        >
          {{ leagueFilter === 'all' ? 'Show active only' : 'Show all' }}
        </button>
      </div>

      <div v-if="leaguesLoading" class="text-[11px] text-zinc-500 py-4 text-center">
        Loading leagues…
      </div>

      <div v-else-if="filteredLeaguesBySport && Object.keys(filteredLeaguesBySport).length === 0" class="text-[11px] text-zinc-500 py-4 text-center italic">
        No leagues match this filter
      </div>

      <div v-else class="space-y-3">
        <div v-for="(items, sport) in filteredLeaguesBySport" :key="sport">
          <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500 mb-1.5 px-1 flex items-center gap-1.5">
            <UIcon
              :name="sport === 'basketball' ? 'i-heroicons-basketball' : 'i-heroicons-flag'"
              class="w-3 h-3"
              :class="sport === 'basketball' ? 'text-orange-400' : 'text-emerald-400'"
            />
            {{ sport }}
          </p>
          <div class="space-y-1.5">
            <div
              v-for="lg in items"
              :key="lg.key"
              class="sub-row"
              :class="{ 'sub-row-active': lg.is_free || lg.is_unlocked }"
            >
              <div class="flex-1 min-w-0">
                <p class="text-[12px] font-semibold text-zinc-100 truncate">{{ lg.name }}</p>
                <p class="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                  <template v-if="lg.is_free">
                    <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-emerald-400" />
                    <span class="text-emerald-400 font-medium">Free league</span>
                  </template>
                  <template v-else-if="lg.is_unlocked">
                    <UIcon name="i-heroicons-check-circle-solid" class="w-3 h-3 text-blue-400" />
                    <span class="text-blue-300">Until {{ formatDate(lg.unlock_expires_at) }}</span>
                  </template>
                  <template v-else>
                    <UIcon name="i-heroicons-lock-closed" class="w-3 h-3 text-zinc-500" />
                    <span>{{ lg.credit_cost }} credits / 30 days</span>
                    <span
                      class="ml-1 px-1 rounded text-[9px] font-bold"
                      :class="lg.credit_tier === 'top' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-700/40 text-zinc-400'"
                    >{{ lg.credit_tier === 'top' ? 'TOP' : 'MID' }}</span>
                  </template>
                </p>
              </div>

              <div class="flex-shrink-0 ml-2 flex items-center gap-1">
                <template v-if="lg.is_free">
                  <span class="badge badge-emerald">FREE</span>
                  <button
                    type="button"
                    @click="openSwapPicker"
                    class="text-[10px] text-zinc-500 hover:text-emerald-300 px-1.5 py-1 rounded transition-colors"
                    aria-label="Swap free league"
                    title="Swap free league"
                  >
                    <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5" />
                  </button>
                </template>
                <span v-else-if="lg.is_unlocked" class="badge badge-blue">ACTIVE</span>
                <button
                  v-else
                  type="button"
                  @click="onUnlockLeague(lg)"
                  :disabled="unlockingLeague === lg.key || balance < lg.credit_cost"
                  class="cta-btn"
                  :class="balance >= lg.credit_cost ? 'cta-enabled' : 'cta-disabled'"
                >
                  <UIcon
                    v-if="unlockingLeague === lg.key"
                    name="i-heroicons-arrow-path"
                    class="w-3 h-3 animate-spin"
                  />
                  <template v-else>
                    <UIcon name="i-heroicons-bolt" class="w-3 h-3" />
                    {{ lg.credit_cost }}
                  </template>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─────────────────────────── WALLETS ─────────────────────────── -->
    <div class="account-card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <UIcon name="i-heroicons-wallet" class="w-4 h-4 text-indigo-400" />
          Wallets
          <span class="text-[10px] font-medium text-zinc-500 ml-1">
            ({{ activeWalletSubs.length }} active)
          </span>
        </h3>
        <span class="text-[10px] text-zinc-500">
          {{ walletPricing.cost_credits }} cr / {{ walletPricing.duration_days }}d
        </span>
      </div>

      <div v-if="walletsLoading" class="text-[11px] text-zinc-500 py-4 text-center">
        Loading wallets…
      </div>

      <div v-else-if="walletList.length === 0" class="text-[11px] text-zinc-500 py-4 text-center italic">
        No wallets available
      </div>

      <div v-else class="space-y-1.5">
        <div
          v-for="w in walletList"
          :key="w.id"
          class="sub-row"
          :class="{ 'sub-row-active': isWalletSubscribed(w.id) }"
        >
          <div class="flex-1 min-w-0">
            <p class="text-[12px] font-semibold text-zinc-100 truncate">
              {{ shortenWallet(w.name) }}
            </p>
            <p class="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span :class="(w.roi || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'" class="font-semibold">
                {{ (w.roi || 0) >= 0 ? '+' : '' }}{{ Number(w.roi || 0).toFixed(1) }}%
              </span>
              <span class="text-zinc-600">·</span>
              <span>{{ w.total_bets || 0 }} bets</span>
              <span class="text-zinc-600">·</span>
              <span>{{ Number(w.win_rate || 0).toFixed(0) }}% WR</span>
              <template v-if="isWalletSubscribed(w.id)">
                <span class="text-zinc-600">·</span>
                <span class="text-blue-300">
                  Until {{ formatDate(walletExpiry(w.id)) }}
                </span>
              </template>
            </p>
          </div>

          <div class="flex-shrink-0 ml-2 flex items-center gap-1">
            <template v-if="isWalletSubscribed(w.id)">
              <span class="badge badge-blue">ACTIVE</span>
              <button
                type="button"
                @click="onUnsubscribeWallet(w.id)"
                :disabled="walletBusy === w.id"
                class="text-[10px] text-zinc-500 hover:text-red-400 px-1.5 py-1 rounded transition-colors"
                aria-label="Unsubscribe"
              >
                <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
              </button>
            </template>
            <button
              v-else
              type="button"
              @click="onSubscribeWallet(w.id)"
              :disabled="walletBusy === w.id || balance < walletPricing.cost_credits"
              class="cta-btn"
              :class="balance >= walletPricing.cost_credits ? 'cta-enabled' : 'cta-disabled'"
            >
              <UIcon
                v-if="walletBusy === w.id"
                name="i-heroicons-arrow-path"
                class="w-3 h-3 animate-spin"
              />
              <template v-else>
                <UIcon name="i-heroicons-bolt" class="w-3 h-3" />
                {{ walletPricing.cost_credits }}
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─────────────────────────── DISPLAY ─────────────────────────── -->
    <div class="account-card rounded-xl p-4">
      <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
        <UIcon name="i-heroicons-paint-brush" class="w-4 h-4 text-violet-400" />
        Display
      </h3>
      <div class="space-y-2">
        <div class="pref-row">
          <div class="flex-1 min-w-0">
            <p class="text-[12px] font-semibold text-zinc-200">Theme</p>
            <p class="text-[10px] text-zinc-500 mt-0.5">Dark mode is the only theme right now</p>
          </div>
          <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Dark</span>
        </div>
        <div class="pref-row">
          <div class="flex-1 min-w-0">
            <p class="text-[12px] font-semibold text-zinc-200">Time zone</p>
            <p class="text-[10px] text-zinc-500 mt-0.5">All match times shown in this zone</p>
          </div>
          <span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{{ tz }}</span>
        </div>
      </div>
    </div>

    <!-- ─────────────────────────── SECURITY ─────────────────────────── -->
    <div class="account-card rounded-xl p-4">
      <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
        <UIcon name="i-heroicons-key" class="w-4 h-4 text-zinc-400" />
        Security
      </h3>
      <UButton
        color="white"
        variant="soft"
        icon="i-heroicons-arrow-path"
        block
        disabled
      >
        Change password — coming soon
      </UButton>
      <p class="text-[10px] text-zinc-600 mt-2 text-center">
        Need to reset your password now? Contact support.
      </p>
    </div>

    <!-- Status flash -->
    <Transition name="flash">
      <div
        v-if="flashMsg"
        class="flash-toast"
        :class="flashType === 'error' ? 'flash-error' : 'flash-ok'"
      >
        <UIcon
          :name="flashType === 'error' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-check-circle'"
          class="w-4 h-4"
        />
        {{ flashMsg }}
      </div>
    </Transition>

    <!-- ─── Swap free league bottom sheet ─── -->
    <Teleport to="body">
      <Transition name="swap-sheet">
        <div
          v-if="swapPickerOpen"
          class="swap-overlay"
          @click.self="closeSwapPicker"
        >
          <div class="swap-sheet">
            <div class="swap-handle" />
            <div class="flex items-center justify-between px-4 pt-1 pb-3">
              <div>
                <h3 class="text-sm font-bold text-zinc-100">Swap free league</h3>
                <p class="text-[10px] text-zinc-500 mt-0.5">
                  Pick the league you want for free. The previous one stays accessible only if it has an active paid unlock.
                </p>
              </div>
              <button
                type="button"
                @click="closeSwapPicker"
                aria-label="Close"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 -mr-1"
              >
                <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
              </button>
            </div>

            <div class="swap-list">
              <button
                v-for="lg in swapList"
                :key="lg.key"
                type="button"
                @click="onSwapFree(lg)"
                :disabled="swapBusy === lg.key || lg.is_free"
                class="swap-row"
                :class="{ 'swap-row-current': lg.is_free }"
              >
                <div class="flex-1 min-w-0 text-left">
                  <p class="text-[12px] font-semibold text-zinc-100 truncate">{{ lg.name }}</p>
                  <p class="text-[10px] text-zinc-500 mt-0.5 capitalize">{{ lg.sport }}</p>
                </div>
                <UIcon
                  v-if="swapBusy === lg.key"
                  name="i-heroicons-arrow-path"
                  class="w-4 h-4 text-zinc-400 animate-spin"
                />
                <span
                  v-else-if="lg.is_free"
                  class="badge badge-emerald"
                >CURRENT</span>
                <UIcon
                  v-else
                  name="i-heroicons-arrow-right"
                  class="w-4 h-4 text-zinc-500"
                />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const router = useRouter()
const api = useApi()
const { balance, fetchCredits } = useCredits()

useHead({ title: 'Preferences · Protero' })

const tz = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
})()

// ─── Leagues state ───────────────────────────────────────────────
const leagues = ref<any[]>([])
const leaguesLoading = ref(true)
const leagueFilter = ref<'all' | 'active'>('all')
const unlockingLeague = ref<string | null>(null)

const accessibleLeagueCount = computed(() =>
  leagues.value.filter(l => l.is_free || l.is_unlocked).length
)

const filteredLeaguesBySport = computed(() => {
  const grouped: Record<string, any[]> = {}
  const filtered = leagues.value.filter(l => {
    if (leagueFilter.value === 'active') return l.is_free || l.is_unlocked
    return true
  })
  // Sort: free → active → locked, then by name
  filtered.sort((a, b) => {
    if (a.is_free !== b.is_free) return a.is_free ? -1 : 1
    if (a.is_unlocked !== b.is_unlocked) return a.is_unlocked ? -1 : 1
    return (a.name || '').localeCompare(b.name || '')
  })
  for (const lg of filtered) {
    const s = lg.sport || 'other'
    if (!grouped[s]) grouped[s] = []
    grouped[s].push(lg)
  }
  return grouped
})

// Swap-picker list: ALL leagues (current free league pinned to top)
const swapList = computed(() => {
  const all = [...leagues.value]
  all.sort((a, b) => {
    if (a.is_free !== b.is_free) return a.is_free ? -1 : 1
    return (a.name || '').localeCompare(b.name || '')
  })
  return all
})

async function loadLeagues() {
  leaguesLoading.value = true
  try {
    const data = await api.fetchCreditsLeagues()
    leagues.value = data?.leagues || []
  } catch (err) {
    console.error('Failed to load leagues:', err)
  } finally {
    leaguesLoading.value = false
  }
}

async function onUnlockLeague(lg: any) {
  if (lg.is_free || lg.is_unlocked) return
  if (balance.value < lg.credit_cost) {
    flash('Not enough credits', 'error')
    return
  }
  unlockingLeague.value = lg.key
  try {
    const res = await api.unlockLeagueWithCredits(lg.key)
    if (res?.success) {
      const idx = leagues.value.findIndex(l => l.key === lg.key)
      if (idx !== -1) {
        leagues.value[idx] = {
          ...leagues.value[idx],
          is_unlocked: true,
          unlock_expires_at: res.expires_at,
        }
      }
      await fetchCredits()
      flash(`${lg.name} unlocked`, 'ok')
    } else {
      flash('Unlock failed', 'error')
    }
  } catch (err: any) {
    const msg = err?.message === 'insufficient_credits' ? 'Not enough credits'
      : err?.message === 'already_free' ? 'Already free'
      : err?.message || 'Unlock failed'
    flash(msg, 'error')
  } finally {
    unlockingLeague.value = null
  }
}

// ─── Swap free league ────────────────────────────────────────────
const swapPickerOpen = ref(false)
const swapBusy = ref<string | null>(null)
function openSwapPicker() {
  swapPickerOpen.value = true
}
function closeSwapPicker() {
  swapPickerOpen.value = false
}
async function onSwapFree(lg: any) {
  if (lg.is_free) {
    closeSwapPicker()
    return
  }
  swapBusy.value = lg.key
  try {
    const res = await api.swapFreeLeague(lg.key)
    if (res?.success) {
      // Update is_free locally (only one league can be free at a time)
      leagues.value = leagues.value.map(l => ({
        ...l,
        is_free: l.key === lg.key,
      }))
      flash(`${lg.name} is now your free league`, 'ok')
      closeSwapPicker()
    } else {
      flash(res?.error || 'Swap failed', 'error')
    }
  } catch (err: any) {
    flash(err?.message || 'Swap failed', 'error')
  } finally {
    swapBusy.value = null
  }
}

// ─── Wallets state ────────────────────────────────────────────────
const walletList = ref<any[]>([])
const walletSubs = ref<any[]>([])
const walletPricing = ref<{ cost_credits: number; duration_days: number }>({
  cost_credits: 500,
  duration_days: 30,
})
const walletsLoading = ref(true)
const walletBusy = ref<number | null>(null)

const activeWalletSubs = computed(() =>
  walletSubs.value.filter(s => s.is_active !== false)
)

function isWalletSubscribed(walletId: number) {
  return activeWalletSubs.value.some(s => s.wallet_id === walletId)
}
function walletExpiry(walletId: number) {
  return activeWalletSubs.value.find(s => s.wallet_id === walletId)?.expires_at || null
}

async function loadWallets() {
  walletsLoading.value = true
  try {
    const data = await api.fetchWalletSubscriptions()
    walletList.value = data?.wallets || []
    walletSubs.value = data?.subscriptions || []
    if (data?.pricing) walletPricing.value = data.pricing
  } catch (err) {
    console.error('Failed to load wallets:', err)
  } finally {
    walletsLoading.value = false
  }
}

async function onSubscribeWallet(walletId: number) {
  if (balance.value < walletPricing.value.cost_credits) {
    flash('Not enough credits', 'error')
    return
  }
  walletBusy.value = walletId
  try {
    const res = await api.subscribeToWallet(walletId)
    if (res?.success) {
      await Promise.all([loadWallets(), fetchCredits()])
      flash('Wallet subscribed', 'ok')
    } else {
      flash(res?.error || 'Subscribe failed', 'error')
    }
  } catch (err: any) {
    flash(err?.message || 'Subscribe failed', 'error')
  } finally {
    walletBusy.value = null
  }
}

async function onUnsubscribeWallet(walletId: number) {
  walletBusy.value = walletId
  try {
    const res = await api.unsubscribeFromWallet(walletId)
    if (res?.success) {
      await loadWallets()
      flash('Wallet unsubscribed', 'ok')
    } else {
      flash(res?.error || 'Unsubscribe failed', 'error')
    }
  } catch (err: any) {
    flash(err?.message || 'Unsubscribe failed', 'error')
  } finally {
    walletBusy.value = null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatDate(s: string | null) {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

function shortenWallet(name: string) {
  if (!name) return 'Wallet'
  return name.replace(/\s+202\d-\d{4}/g, '').trim()
}

// ─── Flash toasts ─────────────────────────────────────────────────
const flashMsg = ref('')
const flashType = ref<'ok' | 'error'>('ok')
let flashTimer: any = null
function flash(msg: string, type: 'ok' | 'error' = 'ok') {
  flashMsg.value = msg
  flashType.value = type
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashMsg.value = ''), 2400)
}

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else navigateTo('/account')
}

onMounted(() => {
  fetchCredits()
  loadLeagues()
  loadWallets()
})
</script>

<style scoped>
.account-card {
  background: rgba(24, 27, 36, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.balance-card {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10) 0%, rgba(24, 27, 36, 0.6) 60%);
  border: 1px solid rgba(245, 158, 11, 0.20);
}
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
}
.sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 9px;
  transition: background 120ms, border-color 120ms;
}
.sub-row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.sub-row-active {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.18);
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 7px;
  border-radius: 5px;
  text-transform: uppercase;
}
.badge-emerald {
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.badge-blue {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 6px;
  transition: all 120ms;
  min-width: 48px;
  justify-content: center;
}
.cta-enabled {
  color: #fcd34d;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.32);
}
.cta-enabled:hover {
  background: rgba(245, 158, 11, 0.22);
}
.cta-disabled {
  color: rgb(82, 82, 91);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: not-allowed;
}

/* Flash toast */
.flash-toast {
  position: fixed;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 999px;
  z-index: 90;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.4);
}
.flash-ok {
  color: #34d399;
  background: rgba(6, 78, 59, 0.85);
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.flash-error {
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.85);
  border: 1px solid rgba(239, 68, 68, 0.4);
}
.flash-enter-active,
.flash-leave-active {
  transition: opacity 200ms, transform 200ms;
}
.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* ─── Swap free league bottom sheet ─── */
.swap-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.swap-sheet {
  width: 100%;
  max-width: 28rem;
  background: linear-gradient(180deg, rgba(24, 24, 27, 0.98), rgba(15, 15, 17, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: none;
  border-radius: 1rem 1rem 0 0;
  padding: 0.5rem 0 max(1rem, env(safe-area-inset-bottom));
  max-height: 75vh;
  display: flex;
  flex-direction: column;
}
.swap-handle {
  width: 36px;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0.5rem auto 0;
}
.swap-list {
  overflow-y: auto;
  padding: 0 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.swap-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 120ms, border-color 120ms;
  cursor: pointer;
}
.swap-row:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.25);
}
.swap-row:disabled {
  cursor: default;
  opacity: 0.85;
}
.swap-row-current {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
}
.swap-sheet-enter-active,
.swap-sheet-leave-active {
  transition: opacity 200ms;
}
.swap-sheet-enter-active .swap-sheet,
.swap-sheet-leave-active .swap-sheet {
  transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1);
}
.swap-sheet-enter-from,
.swap-sheet-leave-to {
  opacity: 0;
}
.swap-sheet-enter-from .swap-sheet,
.swap-sheet-leave-to .swap-sheet {
  transform: translateY(100%);
}
</style>
