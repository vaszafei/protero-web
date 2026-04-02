<template>
  <div class="bg-surface border border-edge rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-zinc-100">League Access</h3>
      <CreditsBadge :balance="balance" />
    </div>

    <div v-if="loading" class="text-center py-6 text-zinc-500 text-sm">Loading leagues...</div>

    <div v-else class="space-y-4">
      <div v-for="(sportLeagues, sport) in leaguesBySport" :key="sport">
        <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2.5 capitalize">{{ sport }}</h4>
        <div class="space-y-2">
          <div
            v-for="league in sportLeagues"
            :key="league.key"
            class="flex items-center justify-between p-2.5 rounded-lg"
            :class="league.is_unlocked ? 'bg-surface-light/50' : 'bg-surface-base'"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-zinc-200 truncate">{{ league.name }}</p>
              <p class="text-xs text-zinc-500">
                <span v-if="league.is_free" class="text-emerald-400">Free forever</span>
                <span v-else-if="league.is_unlocked">
                  Unlocked until {{ formatDate(league.unlock_expires_at) }}
                </span>
                <span v-else>
                  {{ league.credit_cost }} credits/month
                  <span class="ml-1 text-zinc-600">·</span>
                  <span class="ml-1" :class="league.credit_tier === 'top' ? 'text-amber-400' : 'text-zinc-500'">
                    {{ league.credit_tier === 'top' ? 'Top tier' : 'Mid tier' }}
                  </span>
                </span>
              </p>
            </div>

            <div class="flex-shrink-0 ml-2">
              <!-- Free league badge -->
              <span v-if="league.is_free" class="text-xs font-medium text-emerald-400">
                Free
              </span>

              <!-- Unlocked badge -->
              <span v-else-if="league.is_unlocked" class="text-xs font-medium text-blue-400">
                Active
              </span>

              <!-- Locked — unlock button -->
              <button
                v-else
                @click="handleUnlock(league)"
                :disabled="unlocking === league.key || balance < league.credit_cost"
                class="px-2.5 py-1 text-xs rounded-md font-medium transition-colors"
                :class="balance >= league.credit_cost
                  ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'"
              >
                <span v-if="unlocking === league.key">Unlocking...</span>
                <span v-else>{{ league.credit_cost }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="!loading && Object.keys(leaguesBySport).length === 0" class="text-center py-4 text-zinc-500 text-sm">
      No leagues available
    </p>
  </div>
</template>

<script setup>
import CreditsBadge from '~/components/CreditsBadge.vue'

const { balance, unlockLeague, fetchCredits } = useCredits()
const api = useApi()

const leagues = ref([])
const loading = ref(true)
const unlocking = ref(null)

const sortedLeagues = computed(() => {
  const grouped = {}
  const sorted = [...leagues.value].sort((a, b) => {
    // Free first, then unlocked, then locked
    if (a.is_free && !b.is_free) return -1
    if (!a.is_free && b.is_free) return 1
    if (a.is_unlocked && !b.is_unlocked) return -1
    if (!a.is_unlocked && b.is_unlocked) return 1
    return a.name.localeCompare(b.name)
  })
  
  sorted.forEach(league => {
    const sport = league.sport || 'other'
    if (!grouped[sport]) {
      grouped[sport] = []
    }
    grouped[sport].push(league)
  })
  
  return grouped
})

const leaguesBySport = computed(() => sortedLeagues.value)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const handleUnlock = async (league) => {
  unlocking.value = league.key
  const result = await unlockLeague(league.key)
  if (result.success) {
    // Update local state
    const idx = leagues.value.findIndex(l => l.key === league.key)
    if (idx !== -1) {
      leagues.value[idx].is_unlocked = true
      leagues.value[idx].unlock_expires_at = result.expires_at
    }
  }
  unlocking.value = null
}

onMounted(async () => {
  try {
    const data = await api.fetchCreditsLeagues()
    if (data?.leagues) {
      leagues.value = data.leagues
    }
  } catch (err) {
    console.error('Failed to load leagues:', err)
  } finally {
    loading.value = false
  }
})
</script>
