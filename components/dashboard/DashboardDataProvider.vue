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
const loadData = async () => {
  loading.value = true
  try {
    const { from, to } = getWindow()
    
    // Build league filter for API — admin sees all, users see subscribed leagues
    const leagueFilter = (!isAdmin.value && props.userLeagueKeys && props.userLeagueKeys.length > 0)
      ? props.userLeagueKeys.join(',')
      : ''

    const cacheKey = `games:${from}:${to}:lg=${leagueFilter || 'all'}`
    const cached = _gameCache.get(cacheKey)
    const useCache = cached && Date.now() - cached.ts < CACHE_MS

    // Launch ALL requests in parallel — don't wait for games before starting admin fetches
    const gamesPromise = useCache
      ? null
      : api.fetchGames({ from, to, leagues: leagueFilter ? leagueFilter.split(',') : [], includeBets: isAdmin.value })

    // Wallet stats for all users; pass walletId or userId so the API resolves the right wallet
    const params = new URLSearchParams()
    if (props.walletId) params.set('walletId', String(props.walletId))
    else if (props.userId) params.set('userId', String(props.userId))
    const walletPromise = $fetch(`/api/wallet/stats?${params}`).catch(() => null)

    const adminPromise = isAdmin.value
      ? Promise.all([
          $fetch('/api/admin/bets').catch(() => ({ bets: [] })),
          $fetch('/api/parlays').catch(() => ({ parlays: [] })),
          $fetch('/api/predictions/accuracy').catch(() => null)
        ])
      : null

    // Resolve games
    if (useCache) {
      rawGames.value = cached!.games
    } else {
      const gamesData = await gamesPromise as any
      const games = gamesData.games || []
      _gameCache.set(cacheKey, { games, ts: Date.now() })
      rawGames.value = games
    }

    // Resolve wallet stats (available to all users)
    walletStats.value = await walletPromise

    // Resolve admin data (already running in parallel, likely done or nearly done)
    if (adminPromise) {
      const [betsData, parlaysData, accuracyData] = await adminPromise
      allBets.value = (betsData as any).bets || []
      allParlays.value = (parlaysData as any).parlays || []
      accuracy.value = accuracyData
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
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
watch(() => props.walletId, () => loadData())
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
