<script setup lang="ts">
import { errorText } from '~/utils/error-text'

const props = defineProps<{
  leagues: any[]
  userLeagueKeys?: string[]
  walletId?: number | null
  userId?: number | null
}>()

const { isAdmin } = useAuth()
const api = useApi()

// ── Client-side module-level cache ──────────────────────────────────────────
// Keeps data alive across navigation so re-visiting the page is instant
const _gameCache = new Map<string, { games: any[], ts: number }>()
const CACHE_MS = 3 * 60 * 1000 // 3 minutes

// ── State ───────────────────────────────────────────────────────────────────
const rawGames = ref<any[]>([])
const allBets = ref<any[]>([])
const allParlays = ref<any[]>([])
const accuracy = ref<any>(null)
const walletStats = ref<any>(null)
const loading = ref(true)

// ── Helpers ─────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getWindow() {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 14)
  const to = new Date(today)
  to.setDate(today.getDate() + 60)
  return { from: toDateStr(from), to: toDateStr(to) }
}

// ── Computed ─────────────────────────────────────────────────────────────────
// No more client-side filtering — the API already filters by league
const allGames = computed(() => rawGames.value)

const hasLeagueGames = computed(() => rawGames.value.length > 0)

const allPredictions = computed(() => {
  return allGames.value
    .filter(g => g.predictions && g.predictions.length > 0)
    .map(g => ({
      ...g.predictions[0],
      game_id: g.id
    }))
})

const statsData = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const todayMatches = allGames.value.filter(g => {
    const d = new Date(g.date)
    return d >= today && d < tomorrow
  }).length

  const todayPredictions = allGames.value.filter(g => {
    const d = new Date(g.date)
    return d >= today && d < tomorrow && allPredictions.value.some(p => p.game_id === g.id)
  }).length

  const weekMatches = allGames.value.filter(g => {
    const d = new Date(g.date)
    return d >= today && d < weekEnd
  }).length

  const validatedCount = allPredictions.value.filter(p => p.result_correct !== null).length

  return {
    leagueCount: props.leagues.length,
    matchCount: allGames.value.length,
    teamCount: props.leagues.length * 20,
    todayMatches,
    todayPredictions,
    weekMatches,
    accuracy: accuracy.value,
    validatedCount
  }
})

// ── Data loading ──────────────────────────────────────────────────────────────

/**
 * One error per source. A failed read is REPORTED through the slot; it must
 * never collapse into an empty list, because "No matches found" and "the games
 * query failed" are different facts (the old catch-all `console.error` rendered
 * the second as the first).
 */
const errors = ref<{ games: string | null; walletStats: string | null; parlays: string | null; accuracy: string | null }>(
  { games: null, walletStats: null, parlays: null, accuracy: null },
)

let loadSeq = 0

/**
 * Games + wallet stats + parlays (+ admin accuracy on a full reload). Wallet
 * change re-runs this too: parlays are wallet-scoped, so leaving them from the
 * previous wallet showed another wallet's slips. A response for a wallet the
 * operator has already moved off is dropped (`seq`).
 */
const load = async (opts: { admin: boolean }) => {
  const seq = ++loadSeq
  loading.value = true
  const walletId = props.walletId
  try {
    const { from, to } = getWindow()

    // Build league filter for API — admin sees all, users see subscribed leagues
    const leagueFilter = (!isAdmin.value && props.userLeagueKeys && props.userLeagueKeys.length > 0)
      ? props.userLeagueKeys.join(',')
      : ''

    // Cache key includes wallet so changing wallet gets fresh bets
    const cacheKey = `games:${from}:${to}:lg=${leagueFilter || 'all'}:w=${walletId || 'all'}`
    const cached = _gameCache.get(cacheKey)
    const useCache = cached && Date.now() - cached.ts < CACHE_MS

    // Include bets whenever a wallet is selected so the dashboard chip reflects
    // what THAT wallet actually placed. Admins additionally get bets when no
    // wallet is picked (used by the admin overview).
    const wantBets = !!walletId || isAdmin.value
    // Parlays are windowed by created_at so we don't pull all-time history.
    const parlayFromIso = new Date(Date.now() - 30 * 86400_000).toISOString()

    const [gamesR, statsR, parlaysR, accuracyR] = await Promise.allSettled([
      useCache
        ? Promise.resolve({ games: cached!.games })
        : api.fetchGames({
            from, to,
            leagues: leagueFilter ? leagueFilter.split(',') : [],
            includeBets: wantBets,
            walletId: walletId || undefined,
          }),
      walletId ? api.fetchWalletStats(walletId) : Promise.resolve(null),
      walletId ? api.fetchWalletParlays(walletId, { from: parlayFromIso, limit: 200 }) : Promise.resolve({ parlays: [] }),
      opts.admin && isAdmin.value ? api.fetchPredictionsAccuracy() : Promise.resolve(accuracy.value),
    ])
    if (seq !== loadSeq) return

    errors.value = {
      games: gamesR.status === 'rejected' ? errorText(gamesR.reason) : null,
      walletStats: statsR.status === 'rejected' ? errorText(statsR.reason) : null,
      parlays: parlaysR.status === 'rejected' ? errorText(parlaysR.reason) : null,
      accuracy: accuracyR.status === 'rejected' ? errorText(accuracyR.reason) : null,
    }

    if (gamesR.status === 'fulfilled') {
      const games = (gamesR.value as any)?.games || []
      if (!useCache) _gameCache.set(cacheKey, { games, ts: Date.now() })
      rawGames.value = games
    } else {
      rawGames.value = []
    }
    walletStats.value = statsR.status === 'fulfilled' ? statsR.value : null
    allParlays.value = parlaysR.status === 'fulfilled' ? ((parlaysR.value as any)?.parlays || []) : []
    if (opts.admin && accuracyR.status === 'fulfilled') accuracy.value = accuracyR.value
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

const loadData = () => load({ admin: true })
/** Wallet-only reload: re-fetch with the new wallet filter, stats and slips. */
const loadWalletData = () => (props.walletId ? load({ admin: false }) : undefined)

// Expose so parent can force a full refresh (clears cache)
const refresh = () => {
  _gameCache.clear()
  loadData()
}

onMounted(() => loadData())
// On wallet change, only refetch wallet-scoped data (bets + stats), not the entire game list
watch(() => props.walletId, (newId, oldId) => {
  if (newId !== oldId) loadWalletData()
})
</script>

<template>
  <slot
    :stats="statsData"
    :games="allGames"
    :predictions="allPredictions"
    :bets="allBets"
    :parlays="allParlays"
    :wallet-stats="walletStats"
    :loading="loading"
    :refresh="refresh"
    :errors="errors"
    :has-league-games="hasLeagueGames"
  />
</template>
