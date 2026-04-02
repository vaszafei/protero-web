<template>
  <div class="min-h-screen bg-surface-base flex items-center justify-center p-4" style="padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));">
    <!-- Subtle ambient glows -->
    <div class="onboard-glow onboard-glow-red" />
    <div class="onboard-glow onboard-glow-blue" />

    <div class="relative z-10 w-full max-w-lg">
      <!-- Step indicator: numbered with labels + connectors -->
      <div class="flex items-start mb-10 w-full max-w-xs mx-auto">
        <template v-for="s in totalSteps" :key="s">
          <div class="flex flex-col items-center gap-1.5">
            <div :class="[
              'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-300',
              s === currentStep
                ? 'bg-gradient-to-br from-[#d42020] to-[#0848a8] text-white shadow-md shadow-blue-900/30'
                : s < currentStep
                  ? 'bg-zinc-600 text-zinc-300'
                  : 'bg-zinc-800/70 text-zinc-600 ring-1 ring-zinc-700/80'
            ]">
              <Check v-if="s < currentStep" :size="11" />
              <span v-else>{{ s }}</span>
            </div>
            <span :class="[
              'text-[10px] font-medium whitespace-nowrap transition-colors duration-200',
              s === currentStep ? 'text-zinc-300' : s < currentStep ? 'text-zinc-500' : 'text-zinc-700'
            ]">{{ stepLabels[s - 1] }}</span>
          </div>
          <div
            v-if="s < totalSteps"
            class="flex-1 h-[1px] mt-3.5 mx-1.5 transition-colors duration-300"
            :class="s < currentStep ? 'bg-zinc-600' : 'bg-zinc-800'"
          />
        </template>
      </div>

      <!-- Card -->
      <div class="bg-surface border border-edge rounded-xl overflow-hidden onboard-card">

        <Transition name="step" mode="out-in">
        <div :key="currentStep">

        <!-- STEP 1: SPORTS -->
        <div v-if="currentStep === 1" class="p-7 sm:p-8">
          <div class="text-center mb-7">
            <div class="w-12 h-12 rounded-xl bg-surface-light border border-edge flex items-center justify-center mx-auto mb-4">
              <Trophy :size="22" class="text-zinc-400" />
            </div>
            <h2 class="text-xl font-semibold text-zinc-100 mb-1">Pick Your Sports</h2>
            <p class="text-zinc-500 text-sm">Select the sports you follow</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <button
              v-for="sport in availableSports"
              :key="sport.key"
              @click="toggleSport(sport.key)"
              :class="[
                'relative p-4 rounded-lg border transition-all duration-200 text-left group',
                form.preferred_sports.includes(sport.key)
                  ? 'border-[#0848a8]/50 bg-[#0848a8]/8'
                  : 'border-edge bg-surface-light/40 hover:border-edge-light'
              ]"
            >
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors',
                  form.preferred_sports.includes(sport.key)
                    ? 'bg-[#0848a8]/15 text-blue-300'
                    : 'bg-surface-light text-zinc-500'
                ]">
                  <component :is="getSportIcon(sport.key)" :size="20" />
                </div>
                <div>
                  <p class="text-sm font-medium text-zinc-200">{{ sport.name }}</p>
                  <p class="text-xs text-zinc-600">
                    {{ Object.values(sport.leagues).flat().length }} leagues
                  </p>
                </div>
              </div>
              <!-- Check -->
              <div
                v-if="form.preferred_sports.includes(sport.key)"
                class="absolute top-2.5 right-2.5 w-5 h-5 bg-[#0848a8] rounded flex items-center justify-center"
              >
                <Check :size="12" class="text-white" />
              </div>
            </button>
          </div>
        </div>

        <!-- STEP 2: LEAGUES -->
        <div v-if="currentStep === 2" class="p-7 sm:p-8">
          <div class="text-center mb-7">
            <div class="w-12 h-12 rounded-xl bg-surface-light border border-edge flex items-center justify-center mx-auto mb-4">
              <Globe :size="22" class="text-zinc-400" />
            </div>
            <h2 class="text-xl font-semibold text-zinc-100 mb-1">Choose Leagues</h2>
            <p class="text-zinc-500 text-sm">Subscribe to leagues for picks and predictions</p>
          </div>

          <!-- Sport tabs -->
          <div v-if="form.preferred_sports.length > 1" class="flex gap-1.5 mb-5 justify-center">
            <button
              v-for="sk in form.preferred_sports"
              :key="sk"
              @click="activeSportTab = sk"
              :class="[
                'px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeSportTab === sk
                  ? 'bg-surface-light text-zinc-200 border border-edge-light'
                  : 'text-zinc-500 hover:text-zinc-300'
              ]"
            >
              {{ sportName(sk) }}
            </button>
          </div>

          <!-- League list -->
          <div class="space-y-5 max-w-md mx-auto max-h-[360px] overflow-y-auto pr-1 custom-scroll">
            <div v-for="(leagues, country) in filteredLeagues" :key="country">
              <h3 class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-1">
                {{ country }}
              </h3>
              <div class="space-y-1">
                <button
                  v-for="league in leagues"
                  :key="league.key"
                  @click="toggleLeague(league.key)"
                  :class="[
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all duration-150',
                    form.league_subscriptions.includes(league.key)
                      ? 'border-[#0848a8]/40 bg-[#0848a8]/8 text-zinc-200'
                      : 'border-transparent bg-surface-light/30 text-zinc-500 hover:text-zinc-300 hover:bg-surface-light/50'
                  ]"
                >
                  <span class="text-sm">{{ league.name }}</span>
                  <div
                    :class="[
                      'w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors',
                      form.league_subscriptions.includes(league.key)
                        ? 'bg-[#0848a8] border-[#0848a8]'
                        : 'border-zinc-600'
                    ]"
                  >
                    <Check v-if="form.league_subscriptions.includes(league.key)" :size="10" class="text-white" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <p class="text-center text-xs text-zinc-600 mt-4">
            {{ form.league_subscriptions.length }} league{{ form.league_subscriptions.length !== 1 ? 's' : '' }} selected
          </p>
        </div>

        <!-- STEP 3: YOU'RE IN -->
        <div v-if="currentStep === 3" class="p-7 sm:p-8">
          <div class="text-center mb-7">
            <div class="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Check :size="28" class="text-emerald-400" />
            </div>
            <h2 class="text-xl font-semibold text-zinc-100 mb-1">You're All Set!</h2>
            <p class="text-zinc-500 text-sm">You'll automatically follow our top prediction wallet</p>
          </div>

          <div class="max-w-md mx-auto space-y-5">
            <!-- Auto-followed wallet card -->
            <div class="px-4 py-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-zinc-200">NBA V4 RL Wallet</p>
                  <p class="text-xs text-zinc-500 mt-0.5">AI-powered basketball predictions</p>
                </div>
                <div class="text-right">
                  <span class="text-lg font-bold text-emerald-400">+994%</span>
                  <p class="text-[10px] text-zinc-600 uppercase tracking-wide">ROI</p>
                </div>
              </div>
              <div class="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-500/10">
                <span class="text-xs text-zinc-500">409 bets</span>
                <span class="text-xs text-zinc-500">79% win rate</span>
                <span class="text-xs text-emerald-400/70 ml-auto">Auto-followed ✓</span>
              </div>
            </div>

            <!-- Brief explanation -->
            <p class="text-xs text-zinc-600 text-center leading-relaxed">
              You'll see this wallet's picks and results on your dashboard. You can change your followed wallets anytime in Settings.
            </p>
          </div>
        </div>

        </div><!-- end keyed step -->
        </Transition>

        <!-- Footer nav -->
        <div class="px-7 sm:px-8 py-4 border-t border-edge flex items-center justify-between">
          <button
            v-if="currentStep > 1"
            @click="currentStep--"
            class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 min-h-[44px] flex items-center"
          >
            Back
          </button>
          <span v-else />

          <button
            v-if="currentStep < totalSteps"
            :disabled="!canProceed"
            @click="currentStep++"
            class="onboard-btn"
          >
            Continue
          </button>

          <button
            v-else
            :disabled="!canProceed || saving"
            @click="finishOnboarding"
            class="onboard-btn"
          >
            <span v-if="saving" class="onboard-btn-loader" />
            <span v-else>Get Started</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
        <p class="text-red-400 text-sm">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Trophy, Globe, Check, Dribbble, Volleyball } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: false
})

const { user, completeOnboarding } = useAuth()
const api = useApi()
const toast = useToast()

const currentStep = ref(1)
const totalSteps = 3
const saving = ref(false)
const error = ref('')
const activeSportTab = ref('football')
const stepLabels = ['Sports', 'Leagues', 'Ready']

// Redirect if already onboarded
if (user.value?.onboarding_completed) {
  navigateTo('/')
}

const form = reactive({
  display_name: user.value?.display_name || user.value?.name || '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Athens',
  preferred_sports: [],
  league_subscriptions: [],
  preferred_wallet_id: 4,
  notification_prefs: { picks: true, results: true, news: false }
})

// Sport icon mapping (lucide icons instead of emojis)
const getSportIcon = (key) => {
  const map = { football: Dribbble, basketball: Volleyball }
  return map[key] || Trophy
}

// Fetch sports & leagues data from API
const availableSports = ref([])

const fetchSportsData = async () => {
  try {
    const data = await api.fetchSports()
    availableSports.value = data.sports || []
    if (form.preferred_sports.length > 0) {
      activeSportTab.value = form.preferred_sports[0]
    }
  } catch (err) {
    console.error('Failed to fetch sports:', err)
  }
}

onMounted(fetchSportsData)

const sportName = (key) => {
  const s = availableSports.value.find(sp => sp.key === key)
  return s?.name || key
}

const toggleSport = (key) => {
  const idx = form.preferred_sports.indexOf(key)
  if (idx >= 0) {
    form.preferred_sports.splice(idx, 1)
    const sportLeagues = availableSports.value.find(s => s.key === key)
    if (sportLeagues) {
      const lkeys = Object.values(sportLeagues.leagues).flat().map(l => l.key)
      form.league_subscriptions = form.league_subscriptions.filter(lk => !lkeys.includes(lk))
    }
  } else {
    form.preferred_sports.push(key)
  }
  if (form.preferred_sports.length > 0 && !form.preferred_sports.includes(activeSportTab.value)) {
    activeSportTab.value = form.preferred_sports[0]
  }
}

const toggleLeague = (key) => {
  const idx = form.league_subscriptions.indexOf(key)
  if (idx >= 0) {
    form.league_subscriptions.splice(idx, 1)
  } else {
    form.league_subscriptions.push(key)
  }
}

const filteredLeagues = computed(() => {
  const sport = availableSports.value.find(s => s.key === activeSportTab.value)
  return sport?.leagues || {}
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return form.preferred_sports.length > 0
    case 2: return form.league_subscriptions.length > 0
    case 3: return true
    default: return false
  }
})

const finishOnboarding = async () => {
  saving.value = true
  error.value = ''

  const result = await completeOnboarding({
    display_name: form.display_name.trim(),
    preferred_sports: form.preferred_sports,
    league_subscriptions: form.league_subscriptions,
    preferred_wallet_id: form.preferred_wallet_id,
    timezone: form.timezone,
    notification_prefs: form.notification_prefs
  })

  saving.value = false

  if (result.success) {
    toast.add({
      title: 'All set',
      description: 'Your profile is ready',
      color: 'green'
    })
    navigateTo('/')
  } else {
    error.value = result.error || 'Something went wrong. Please try again.'
  }
}
</script>

<style scoped>
/* Ambient glows */
.onboard-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.onboard-glow-red {
  top: -30%;
  right: -20%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, rgba(248, 40, 40, 0.04) 0%, transparent 70%);
}

.onboard-glow-blue {
  bottom: -30%;
  left: -20%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, rgba(8, 72, 168, 0.04) 0%, transparent 70%);
}

/* Primary action button */
.onboard-btn {
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, rgba(248, 40, 40, 0.7) 0%, rgba(8, 72, 168, 0.7) 100%);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.onboard-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.onboard-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.onboard-btn-loader {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Custom scrollbar */
.custom-scroll::-webkit-scrollbar {
  width: 4px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}

/* Card elevation */
.onboard-card {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}

/* Step slide animation */
.step-enter-active,
.step-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateX(18px);
}

.step-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}
</style>
