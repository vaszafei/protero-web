<template>
  <div class="space-y-5">
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Sport tabs -->
      <div v-if="sports.length > 1" class="flex gap-1.5">
        <button
          v-for="sport in sports"
          :key="sport.key"
          @click="activeSport = sport.key"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            activeSport === sport.key
              ? 'bg-[#0848a8] text-white'
              : 'bg-surface-light text-zinc-400 hover:text-zinc-200'
          ]"
        >
          {{ sport.name }}
        </button>
      </div>

      <!-- League cards grouped by country -->
      <div
        v-for="(leagues, country) in currentLeagues"
        :key="country"
        class="space-y-2"
      >
        <h3 class="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest px-0.5 flex items-center gap-2">
          <span>{{ country }}</span>
          <span class="flex-1 h-px bg-zinc-800" />
        </h3>
        <div class="space-y-1.5">
          <button
            v-for="league in leagues"
            :key="league.key"
            @click="toggleLeague(league.key, currentSport?.key || 'football')"
            :disabled="toggling === league.key"
            :class="[
              'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.98]',
              subscribedKeys.has(league.key)
                ? 'border-[#0848a8]/50 bg-[#0848a8]/10'
                : 'border-zinc-800/80 bg-surface-light/30 hover:border-zinc-700 hover:bg-surface-light/60'
            ]"
          >
            <!-- Name -->
            <span
              :class="[
                'flex-1 text-sm font-medium',
                subscribedKeys.has(league.key) ? 'text-zinc-100' : 'text-zinc-400'
              ]"
            >{{ league.name }}</span>

            <!-- Spinner / checkmark -->
            <div class="flex-shrink-0">
              <div
                v-if="toggling === league.key"
                class="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"
              />
              <div
                v-else
                :class="[
                  'w-5 h-5 rounded-full flex items-center justify-center transition-all',
                  subscribedKeys.has(league.key)
                    ? 'bg-[#0848a8] scale-100'
                    : 'border border-zinc-700 scale-90'
                ]"
              >
                <svg
                  v-if="subscribedKeys.has(league.key)"
                  class="w-3 h-3 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Summary -->
      <p class="text-xs text-zinc-600 pt-1">
        {{ subscribedKeys.size }} league{{ subscribedKeys.size !== 1 ? 's' : '' }} subscribed
      </p>
    </template>
  </div>
</template>

<script setup>
const emit = defineEmits(['saved'])

const api = useApi()
const loading = ref(true)
const sports = ref([])
const activeSport = ref('')
const subscribedKeys = ref(new Set())
const toggling = ref(null)

const currentSport = computed(() =>
  sports.value.find(s => s.key === activeSport.value)
)

const currentLeagues = computed(() =>
  currentSport.value?.leagues || {}
)

// Load sports + current subscriptions
onMounted(async () => {
  try {
    const [sportsData, subsData] = await Promise.all([
      api.fetchSports().catch(() => ({ sports: [] })),
      api.fetchSubscriptions().catch(() => ({ subscriptions: [] }))
    ])

    sports.value = sportsData.sports || []
    if (sports.value.length > 0) {
      activeSport.value = sports.value[0].key
    }

    const activeKeys = (subsData.subscriptions || [])
      .filter(s => s.is_active)
      .map(s => s.league_key)
    subscribedKeys.value = new Set(activeKeys)
  } catch (err) {
    console.error('Failed to load preferences:', err)
  } finally {
    loading.value = false
  }
})

const toggleLeague = async (leagueKey, sport) => {
  toggling.value = leagueKey
  const isSubscribed = subscribedKeys.value.has(leagueKey)

  try {
    await api.toggleSubscription(leagueKey, sport, isSubscribed ? 'unsubscribe' : 'subscribe')

    if (isSubscribed) {
      subscribedKeys.value.delete(leagueKey)
    } else {
      subscribedKeys.value.add(leagueKey)
    }
    // Trigger reactivity
    subscribedKeys.value = new Set(subscribedKeys.value)

    emit('saved')
  } catch (err) {
    console.error('Failed to toggle subscription:', err)
  } finally {
    toggling.value = null
  }
}
</script>
