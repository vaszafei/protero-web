<template>
  <div class="p-3 sm:p-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-zinc-100">Contribute</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Submit match data to earn credits</p>
        </div>
        <CreditsBadge :balance="creditsBalance" />
      </div>

      <!-- How it works -->
      <div class="bg-surface border border-edge rounded-lg p-4">
        <h3 class="font-semibold text-zinc-200 text-sm mb-3">How it works</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div class="p-3 rounded-lg bg-surface-base">
            <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-600/15 flex items-center justify-center">
              <span class="text-blue-400 font-bold text-sm">1</span>
            </div>
            <p class="text-xs text-zinc-400">Pick an open task from a completed match</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-base">
            <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-600/15 flex items-center justify-center">
              <span class="text-blue-400 font-bold text-sm">2</span>
            </div>
            <p class="text-xs text-zinc-400">Submit the match data (scores, stats)</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-base">
            <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-amber-600/15 flex items-center justify-center">
              <span class="text-amber-400 font-bold text-sm">3</span>
            </div>
            <p class="text-xs text-zinc-400">Earn credits — first contributor gets a bonus!</p>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-12 text-zinc-500 text-sm">
        <svg class="w-6 h-6 mx-auto mb-2 animate-spin text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading tasks...
      </div>

      <!-- Empty state -->
      <div v-else-if="tasks.length === 0" class="bg-surface border border-edge rounded-lg p-8 text-center">
        <svg class="w-10 h-10 mx-auto text-zinc-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
        <p class="text-zinc-400 font-medium">No tasks available right now</p>
        <p class="text-xs text-zinc-600 mt-1">Check back after matches are completed</p>
      </div>

      <!-- Task list -->
      <div v-else class="space-y-3">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="bg-surface border border-edge rounded-lg p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <!-- Game info -->
              <div v-if="task.game" class="flex items-center gap-2 mb-1.5">
                <span class="text-xs px-1.5 py-0.5 rounded bg-surface-light text-zinc-400">
                  {{ task.league_key }}
                </span>
                <span class="text-xs text-zinc-600">{{ formatDate(task.game.date) }}</span>
              </div>
              <p class="text-sm font-medium text-zinc-200">
                {{ task.game ? `${task.game.home_team} vs ${task.game.away_team}` : `Task #${task.id}` }}
              </p>
              <p class="text-xs text-zinc-500 mt-0.5">
                {{ task.task_type === 'post_match_stats' ? 'Post-match statistics' : 'Pre-match data' }}
              </p>

              <!-- Progress -->
              <div class="flex items-center gap-2 mt-2">
                <div class="flex-1 h-1 rounded-full bg-surface-base overflow-hidden max-w-[100px]">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="task.current_contributors === 0 ? 'bg-amber-400' : 'bg-blue-500'"
                    :style="{ width: `${(task.current_contributors / task.max_contributors) * 100}%` }"
                  />
                </div>
                <span class="text-xs text-zinc-600 tabular-nums">
                  {{ task.current_contributors }}/{{ task.max_contributors }}
                </span>
              </div>
            </div>

            <!-- Reward + action -->
            <div class="text-right flex-shrink-0">
              <div class="flex items-center gap-1 justify-end mb-2">
                <span class="text-sm font-bold tabular-nums" :class="task.is_first ? 'text-amber-400' : 'text-emerald-400'">
                  +{{ task.is_first ? task.base_reward + task.first_bonus : task.base_reward }}
                </span>
                <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" />
                  <text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">C</text>
                </svg>
              </div>
              <span v-if="task.is_first" class="text-[11px] text-amber-400/80 block mb-2">First bonus!</span>

              <button
                v-if="!expandedTask || expandedTask !== task.id"
                @click="expandedTask = task.id"
                class="px-4 py-2 min-h-[44px] text-xs rounded-md font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
              >
                Contribute
              </button>
            </div>
          </div>

          <!-- Expanded contribution form -->
          <div v-if="expandedTask === task.id" class="mt-4 pt-4 border-t border-edge">
            <div class="space-y-3">
              <!-- Post-match stats form -->
              <template v-if="task.task_type === 'post_match_stats'">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-zinc-400 block mb-1">Home Score</label>
                    <input
                      v-model.number="formData.home_score"
                      type="number"
                      min="0"
                      class="w-full bg-surface-base border border-edge rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-zinc-400 block mb-1">Away Score</label>
                    <input
                      v-model.number="formData.away_score"
                      type="number"
                      min="0"
                      class="w-full bg-surface-base border border-edge rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <!-- Optional stats -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-zinc-400 block mb-1">Home Possession %</label>
                    <input
                      v-model.number="formData.home_possession"
                      type="number"
                      min="0"
                      max="100"
                      class="w-full bg-surface-base border border-edge rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-zinc-400 block mb-1">Away Possession %</label>
                    <input
                      v-model.number="formData.away_possession"
                      type="number"
                      min="0"
                      max="100"
                      class="w-full bg-surface-base border border-edge rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </template>

              <!-- Pre-match data form -->
              <template v-else>
                <div>
                  <label class="text-xs text-zinc-400 block mb-1">Notes / Context</label>
                  <textarea
                    v-model="formData.notes"
                    rows="3"
                    class="w-full bg-surface-base border border-edge rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Add any relevant pre-match info (injuries, lineups, etc.)"
                  />
                </div>
              </template>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="expandedTask = null"
                  class="px-3 py-1.5 text-xs rounded-md text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="submitContribution(task)"
                  :disabled="submitting"
                  class="px-4 py-1.5 text-xs rounded-md font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors disabled:opacity-40"
                >
                  <span v-if="submitting" class="flex items-center gap-1">
                    <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Submitting...
                  </span>
                  <span v-else>Submit & Earn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import CreditsBadge from '~/components/CreditsBadge.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { balance: creditsBalance, fetchCredits } = useCredits()
const api = useApi()
const toast = useToast()

const tasks = ref([])
const loading = ref(true)
const expandedTask = ref(null)
const submitting = ref(false)
const formData = ref({
  home_score: null,
  away_score: null,
  home_possession: null,
  away_possession: null,
  notes: ''
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const submitContribution = async (task) => {
  submitting.value = true

  const data = task.task_type === 'post_match_stats'
    ? {
        home_score: formData.value.home_score,
        away_score: formData.value.away_score,
        home_possession: formData.value.home_possession,
        away_possession: formData.value.away_possession
      }
    : { notes: formData.value.notes }

  try {
    const result = await api.submitContribution(task.id, data)

    if (result?.success) {
      toast.add({
        title: `+${result.credits_awarded} credits earned!`,
        description: result.is_first ? 'First contributor bonus included!' : 'Thank you for your contribution',
        color: 'green',
        timeout: 4000
      })

      // Remove task from list
      tasks.value = tasks.value.filter(t => t.id !== task.id)
      expandedTask.value = null

      // Refresh credits
      fetchCredits()
    }
  } catch (err) {
    toast.add({
      title: 'Submission failed',
      description: err?.data?.statusMessage || 'Please try again',
      color: 'red',
      timeout: 4000
    })
  } finally {
    submitting.value = false
    formData.value = { home_score: null, away_score: null, home_possession: null, away_possession: null, notes: '' }
  }
}

onMounted(async () => {
  try {
    const [tasksData] = await Promise.all([
      api.fetchCreditsTasks(),
      fetchCredits()
    ])
    if (tasksData?.tasks) {
      tasks.value = tasksData.tasks
    }
  } catch (err) {
    console.error('Failed to load tasks:', err)
  } finally {
    loading.value = false
  }
})
</script>
