<script setup lang="ts">
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

/** Full reload: games + wallet stats + admin extras */
const loadData = async () => {
  loading.value = true
  try {
    const { from, to } = getWindow()
    
    // Build league filter for API — admin sees all, users see subscribed leagues
    const leagueFilter = (!isAdmin.value && props.userLeagueKeys && props.userLeagueKeys.length > 0)
      ? props.userLeagueKeys.join(',')
      : ''

    // Cache key includes wallet so changing wallet gets fresh bets
    const cacheKey = `games:${from}:${to}:lg=${leagueFilter || 'all'}:w=${props.walletId || 'all'}`
    const cached = _gameCache.get(cacheKey)
    const useCache = cached && Date.now() - cached.ts < CACHE_MS

    // Fetch games (with wallet-scoped bets) — include bets whenever a
    // wallet is selected so the dashboard chip reflects what THAT wallet
    // actually placed. Admins additionally get bets when no wallet picked
    // (used by the admin overview).
    const wantBets = !!props.walletId || isAdmin.value
    const gamesPromise = useCache
      ? null
      : api.fetchGames({
          from, to,
          leagues: leagueFilter ? leagueFilter.split(',') : [],
          includeBets: wantBets,
          walletId: props.walletId || undefined
        })

    // Wallet stats
    const walletPromise = props.walletId
      ? api.fetchWalletStats(props.walletId).catch(() => null)
      : null

    // Wallet-scoped parlays — fetch for ANY user with a selected wallet so
    // the dashboard "Parlays" toggle shows their picks. Window the fetch by
    // created_at so we don't pull all-time history (wallet 19 has 1000+).
    const parlayFromIso = new Date(Date.now() - 30 * 86400_000).toISOString()
    const parlaysPromise = props.walletId
      ? api.fetchWalletParlays(props.walletId, { from: parlayFromIso, limit: 200 }).catch(() => ({ parlays: [] }))
      : null

    // Accuracy (admin only, wallet-independent)
    const adminPromise = isAdmin.value
      ? api.fetchPredictionsAccuracy().catch(() => null)
      : null

    // Resolve games
    if (useCache) {
      rawGames.value = cached!.games
    } else {
      const gamesData = await gamesPromise as any
      const games = gamesData?.games || []
      _gameCache.set(cacheKey, { games, ts: Date.now() })
      rawGames.value = games
    }

    // Resolve wallet stats
    walletStats.value = await walletPromise

    // Resolve parlays
    if (parlaysPromise) {
      const parlaysData = await parlaysPromise as any
      allParlays.value = parlaysData?.parlays || []
    } else {
      allParlays.value = []
    }

    // Resolve admin data
    if (adminPromise) {
      accuracy.value = await adminPromise
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    loading.value = false
  }
}

/** Wallet-only reload: just re-fetch games with new wallet filter + wallet stats */
const loadWalletData = async () => {
  if (!props.walletId) return
  loading.value = true
  try {
    const { from, to } = getWindow()
    const leagueFilter = (!isAdmin.value && props.userLeagueKeys && props.userLeagueKeys.length > 0)
      ? props.userLeagueKeys.join(',')
      : ''

    const cacheKey = `games:${from}:${to}:lg=${leagueFilter || 'all'}:w=${props.walletId}`
    const cached = _gameCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      rawGames.value = cached.games
      walletStats.value = await api.fetchWalletStats(props.walletId).catch(() => null)
      loading.value = false
      return
    }

    const [gamesData, wsData] = await Promise.all([
      api.fetchGames({
        from, to,
        leagues: leagueFilter ? leagueFilter.split(',') : [],
        includeBets: true,
        walletId: props.walletId
      }),
      api.fetchWalletStats(props.walletId).catch(() => null)
    ])

    const games = (gamesData as any)?.games || []
    _gameCache.set(cacheKey, { games, ts: Date.now() })
    rawGames.value = games
    walletStats.value = wsData
  } catch (error) {
    console.error('Error loading wallet data:', error)
  } finally {
    loading.value = false
  }
}

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
    :has-league-games="hasLeagueGames"
  />
</template>
