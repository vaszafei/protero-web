/**
 * Credits composable — manages user's credit balance and league unlock state.
 * Provides reactive state and actions for the credits system.
 * Uses useApi() for all data access (direct Supabase, no server routes).
 */

export const useCredits = () => {
  const balance = useState('credits_balance', () => 0)
  const totalEarned = useState('credits_total_earned', () => 0)
  const totalSpent = useState('credits_total_spent', () => 0)
  const freeLeagueKey = useState('credits_free_league', () => null)
  const transactions = useState('credits_transactions', () => [])
  const activeUnlocks = useState('credits_active_unlocks', () => [])
  const creditsConfig = useState('credits_config', () => ({}))
  const loading = useState('credits_loading', () => false)

  /**
   * Fetch user's credit balance, transactions, and active unlocks
   */
  const fetchCredits = async () => {
    try {
      loading.value = true
      const api = useApi()
      const data = await api.fetchCredits()
      if (data) {
        balance.value = data.balance
        totalEarned.value = data.total_earned
        totalSpent.value = data.total_spent
        freeLeagueKey.value = data.free_league_key
        transactions.value = data.transactions
        activeUnlocks.value = data.active_unlocks
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch public credits config (tier costs, rewards, etc.)
   */
  const fetchConfig = async () => {
    try {
      const api = useApi()
      const data = await api.fetchCreditsConfig()
      if (data?.config) {
        creditsConfig.value = data.config
      }
    } catch (err) {
      console.error('Failed to fetch credits config:', err)
    }
  }

  /**
   * Check if a league is accessible to the user (free or unlocked)
   */
  const isLeagueAccessible = (leagueKey) => {
    if (freeLeagueKey.value === leagueKey) return true
    return activeUnlocks.value.some(u => u.league_key === leagueKey)
  }

  /**
   * Get unlock expiry date for a league (null if not unlocked)
   */
  const getUnlockExpiry = (leagueKey) => {
    const unlock = activeUnlocks.value.find(u => u.league_key === leagueKey)
    return unlock ? unlock.expires_at : null
  }

  /**
   * Unlock a league by spending credits
   */
  const unlockLeague = async (leagueKey) => {
    try {
      const api = useApi()
      const data = await api.unlockLeagueWithCredits(leagueKey)

      if (data?.success) {
        balance.value = data.new_balance
        // Refresh unlocks
        await fetchCredits()
        return { success: true, ...data }
      }

      return { success: false, error: 'Unknown error' }
    } catch (err) {
      return { success: false, error: err?.data?.statusMessage || err?.message || 'Failed to unlock' }
    }
  }

  return {
    balance,
    totalEarned,
    totalSpent,
    freeLeagueKey,
    transactions,
    activeUnlocks,
    creditsConfig,
    loading,
    fetchCredits,
    fetchConfig,
    isLeagueAccessible,
    getUnlockExpiry,
    unlockLeague
  }
}
