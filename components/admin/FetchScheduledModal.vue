<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="bg-surface-light text-zinc-200 p-4 rounded-t-lg flex items-center justify-between">
        <div class="flex items-center gap-2">
          <CalendarPlus class="w-5 h-5" />
          <h2 class="text-lg font-semibold">Fetch Scheduled Games</h2>
        </div>
        <button @click="close" class="hover:bg-surface-hover p-1 rounded">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 bg-surface-light">
        <!-- Action Selection -->
        <div v-if="!preview && !selectedAction" class="bg-surface rounded-lg p-6 shadow-sm mb-4">
          <div class="flex items-center gap-2 mb-4">
            <Zap class="w-5 h-5 text-primary-400" />
            <h3 class="font-semibold text-zinc-100">Choose Action</h3>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="selectAction('scheduled')"
              :disabled="loading"
              class="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border-2 border-blue-200 transition-all disabled:opacity-50"
            >
              <CalendarPlus class="w-8 h-8 text-blue-400" />
              <div class="text-center">
                <div class="font-semibold text-blue-900">Fetch Scheduled</div>
                <div class="text-xs text-blue-400 mt-1">Add upcoming games</div>
              </div>
            </button>
            <button
              @click="selectAction('scores')"
              :disabled="loading"
              class="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border-2 border-green-500/30 transition-all disabled:opacity-50"
            >
              <Trophy class="w-8 h-8 text-green-400" />
              <div class="text-center">
                <div class="font-semibold text-green-900">Update Scores</div>
                <div class="text-xs text-green-400 mt-1">Sync played games</div>
              </div>
            </button>
          </div>
        </div>

        <!-- League Selection -->
        <div v-if="!preview && selectedAction" class="bg-surface rounded-lg p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <Trophy class="w-5 h-5 text-primary-400" />
            <h3 class="font-semibold text-zinc-100">Select League</h3>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <button
              v-for="league in leagues"
              :key="league.key"
              @click="fetchPreview(league.key)"
              :disabled="loading || isLeagueDisabled(league.key)"
              class="flex items-center justify-between p-4 bg-surface-light hover:bg-surface-light rounded-lg border border-edge transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="flex items-center gap-3">
                <span class="font-medium text-zinc-100">{{ league.name }}</span>
                <UBadge v-if="leagueStats[league.key]" color="gray" variant="soft" size="xs">
                  {{ leagueStats[league.key].total }} games
                </UBadge>
                <UBadge v-if="isLeagueDisabled(league.key)" color="green" variant="soft" size="xs">
                  ✓ Up to date
                </UBadge>
              </div>
              <ChevronRight class="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        <!-- API Quota Display -->
        <div v-if="apiQuota && !preview" class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <Activity class="w-5 h-5 text-amber-400" />
            <h3 class="font-semibold text-amber-900">API Usage Warning</h3>
          </div>
          <div class="text-sm text-amber-400 space-y-1">
            <p>Daily Limit: <span class="font-semibold">{{ apiQuota.requests.limit_day }} requests</span></p>
            <p class="text-xs">⚠️ {{ apiQuota.warning }}</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="bg-surface rounded-lg p-12 shadow-sm text-center">
          <RefreshCw class="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
          <p class="text-zinc-400">Fetching scheduled games...</p>
        </div>

        <!-- Preview -->
        <div v-if="preview && !loading" class="space-y-4">
          <!-- Summary Card -->
          <div class="bg-surface rounded-lg p-6 shadow-sm">
            <div class="flex items-center gap-2 mb-4">
              <Info class="w-5 h-5 text-primary-400" />
              <h3 class="font-semibold text-zinc-100">
                {{ selectedAction === 'scores' ? 'Score Updates Preview' : 'New Games Preview' }}
              </h3>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-primary-400">{{ preview.totalUpdates || preview.totalNewGames }}</div>
                <div class="text-sm text-zinc-400">{{ selectedAction === 'scores' ? 'Updates' : 'New Games' }}</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-400">{{ preview.rounds.length }}</div>
                <div class="text-sm text-zinc-400">Rounds</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-amber-400">{{ apiQuota?.requests?.limit_day || 100 }}</div>
                <div class="text-sm text-zinc-400">Daily Limit</div>
              </div>
            </div>
          </div>

          <!-- Rounds -->
          <div v-for="round in preview.rounds" :key="round.round" class="bg-surface rounded-lg shadow-sm">
            <div class="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 rounded-t-lg flex items-center gap-2">
              <Calendar class="w-4 h-4" />
              <span class="font-semibold">Round {{ round.round }}</span>
              <UBadge color="white" variant="solid" class="ml-auto">
                {{ round.games.length }} games
              </UBadge>
            </div>
            <div class="p-4 space-y-2">
              <div
                v-for="(game, idx) in round.games"
                :key="idx"
                class="flex items-center justify-between p-3 bg-surface-light rounded-lg border border-edge"
              >
                <div class="flex items-center gap-3 flex-1">
                  <div class="text-sm font-medium text-zinc-100 flex-1">{{ game.home }}</div>
                  <div v-if="selectedAction === 'scores'" class="flex items-center gap-2">
                    <span class="text-xs text-red-400 line-through">{{ game.oldScore }}</span>
                    <span class="text-xs text-zinc-500 font-semibold">→</span>
                    <span class="text-xs text-green-400 font-bold">{{ game.newScore }}</span>
                  </div>
                  <div v-else class="text-xs text-zinc-500 font-semibold">vs</div>
                  <div class="text-sm font-medium text-zinc-100 flex-1">{{ game.away }}</div>
                </div>
                <div class="text-xs text-zinc-500 ml-4">
                  {{ new Date(game.date).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-center gap-2 text-red-400">
            <AlertCircle class="w-5 h-5" />
            <span class="font-medium">{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-surface border-t border-edge p-4 rounded-b-lg flex items-center justify-between">
        <button
          v-if="preview || selectedAction"
          @click="reset"
          class="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
          Back
        </button>
        <div v-else></div>
        
        <div class="flex items-center gap-2">
          <button
            @click="close"
            class="px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            v-if="preview"
            @click="saveGames"
            :disabled="saving || (preview.totalNewGames === 0 && preview.totalUpdates === 0)"
            class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save v-if="!saving" class="w-4 h-4" />
            <RefreshCw v-else class="w-4 h-4 animate-spin" />
            {{ saving ? 'Saving...' : `${selectedAction === 'scores' ? 'Update' : 'Save'} ${preview.totalUpdates || preview.totalNewGames} Games` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { 
  X, CalendarPlus, Trophy, ChevronRight, Activity, Info, 
  Calendar, AlertCircle, ArrowLeft, Save, RefreshCw, Zap 
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const leagues = [
  { key: 'premier_league', name: 'Premier League' },
  { key: 'la_liga', name: 'La Liga' },
  { key: 'serie_a', name: 'Serie A' },
  { key: 'bundesliga', name: 'Bundesliga' },
  { key: 'ligue_1', name: 'Ligue 1' }
]

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const preview = ref<any>(null)
const apiQuota = ref<any>(null)
const selectedLeagueKey = ref('')
const selectedAction = ref<'scheduled' | 'scores' | null>(null)
const leagueStats = ref<Record<string, any>>({})

const toast = useToast()

// Load league stats when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await loadLeagueStats()
  }
})

async function loadLeagueStats() {
  try {
    const response = await $fetch('/api/admin/league-stats')
    if (response.success) {
      leagueStats.value = response.stats
    }
  } catch (err) {
    console.error('Failed to load league stats:', err)
  }
}

function selectAction(action: 'scheduled' | 'scores') {
  selectedAction.value = action
}

function isLeagueDisabled(leagueKey: string): boolean {
  const stats = leagueStats.value[leagueKey]
  if (!stats) return false
  
  if (selectedAction.value === 'scheduled') {
    return !stats.canFetchScheduled
  } else if (selectedAction.value === 'scores') {
    return !stats.canFetchScores
  }
  return false
}

async function fetchPreview(leagueKey: string) {
  loading.value = true
  error.value = ''
  selectedLeagueKey.value = leagueKey
  
  try {
    const endpoint = selectedAction.value === 'scores' 
      ? '/api/admin/fetch-scores' 
      : '/api/admin/fetch-scheduled'
    
    const response = await $fetch(endpoint, {
      method: 'POST',
      body: { action: 'preview', leagueKey }
    })

    if (response.success && response.preview) {
      preview.value = response.preview
      apiQuota.value = response.apiQuota
      
      const totalCount = response.preview.totalNewGames || response.preview.totalUpdates || 0
      if (totalCount === 0) {
        toast.add({
          title: 'No changes needed',
          description: selectedAction.value === 'scores' 
            ? 'All game scores are up to date'
            : 'All scheduled games are already in the database',
          color: 'blue'
        })
      }
    } else {
      error.value = response.message || 'Failed to fetch preview'
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to fetch data'
    toast.add({
      title: 'Error',
      description: error.value,
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

async function saveGames() {
  const totalCount = preview.value?.totalNewGames || preview.value?.totalUpdates || 0
  if (!preview.value || totalCount === 0) return
  
  saving.value = true
  error.value = ''
  
  try {
    const endpoint = selectedAction.value === 'scores' 
      ? '/api/admin/fetch-scores' 
      : '/api/admin/fetch-scheduled'
    
    const allGames = preview.value.rounds.flatMap((r: any) => r.games)
    
    const response = await $fetch(endpoint, {
      method: 'POST',
      body: {
        action: 'save',
        leagueKey: selectedLeagueKey.value,
        games: allGames
      }
    })

    if (response.success) {
      toast.add({
        title: 'Success',
        description: response.message,
        color: 'green'
      })
      emit('saved')
      close()
    } else {
      error.value = response.message || 'Failed to save changes'
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to save changes'
    toast.add({
      title: 'Error',
      description: error.value,
      color: 'red'
    })
  } finally {
    saving.value = false
  }
}

function reset() {
  preview.value = null
  error.value = ''
  selectedLeagueKey.value = ''
  if (!selectedAction.value) {
    selectedAction.value = null
  }
}

function close() {
  preview.value = null
  error.value = ''
  selectedLeagueKey.value = ''
  selectedAction.value = null
  emit('close')
}
</script>
