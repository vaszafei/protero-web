<template>
  <div class="login-screen">
    <!-- Ambient background -->
    <div class="login-bg" />

    <div
      class="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style="padding-top: max(2rem, env(safe-area-inset-top)); padding-bottom: max(2rem, env(safe-area-inset-bottom));"
    >
      <!-- Logo + tagline -->
      <div class="mb-9 sm:mb-11 flex flex-col items-center gap-3">
        <img
          src="/proteroLogo.png"
          alt="ΠροΤερο"
          width="96"
          height="96"
          class="w-20 h-20 sm:w-24 sm:h-24 object-contain login-logo-glow"
        />
        <p class="text-[11px] text-zinc-600 tracking-[0.2em] uppercase font-medium">ML-powered sports predictions</p>
      </div>

      <!-- Card -->
      <div class="login-card w-full max-w-sm">

        <!-- Tab switcher -->
        <div class="login-tabs" role="tablist">
          <button
            role="tab"
            :aria-selected="isLoginMode"
            :class="['login-tab', isLoginMode && 'login-tab--active']"
            @click="setMode(true)"
          >
            Sign In
          </button>
          <button
            role="tab"
            :aria-selected="!isLoginMode"
            :class="['login-tab', !isLoginMode && 'login-tab--active']"
            @click="setMode(false)"
          >
            Create Account
          </button>
          <div class="login-tab-bar" :class="!isLoginMode && 'login-tab-bar--right'" />
        </div>

        <!-- Forms -->
        <div class="px-6 sm:px-7 pt-6 pb-7">

          <!-- Error banner -->
          <Transition name="slide-down">
            <div
              v-if="errorMessage"
              class="flex items-start gap-2.5 mb-5 p-3 rounded-lg bg-red-500/8 border border-red-500/20"
            >
              <div class="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-red-500/20 flex items-center justify-center">
                <span class="text-red-400 text-[10px] font-bold leading-none">!</span>
              </div>
              <p class="text-red-400 text-sm leading-relaxed">{{ errorMessage }}</p>
            </div>
          </Transition>

          <!-- ── SIGN IN ── -->
          <Transition name="form-slide" mode="out-in">
            <form v-if="isLoginMode" key="login" @submit.prevent="handleLogin" class="space-y-4">

              <div class="field">
                <label class="field-label">Email</label>
                <input
                  v-model="loginForm.email"
                  type="email"
                  autocomplete="email"
                  placeholder="your@email.com"
                  class="field-input"
                  required
                />
              </div>

              <div class="field">
                <label class="field-label">Password</label>
                <div class="relative">
                  <input
                    v-model="loginForm.password"
                    :type="showLoginPwd ? 'text' : 'password'"
                    autocomplete="current-password"
                    placeholder="Enter your password"
                    class="field-input pr-11"
                    required
                  />
                  <button
                    type="button"
                    @click="showLoginPwd = !showLoginPwd"
                    class="pwd-toggle"
                    :aria-label="showLoginPwd ? 'Hide password' : 'Show password'"
                  >
                    <EyeOff v-if="showLoginPwd" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
              </div>

              <button type="submit" :disabled="loading" class="auth-btn">
                <span v-if="loading" class="btn-spinner" />
                <span v-else>Sign In</span>
              </button>

            </form>

            <!-- ── CREATE ACCOUNT ── -->
            <form v-else key="register" @submit.prevent="handleRegister" class="space-y-4">

              <div class="field">
                <label class="field-label">Full Name</label>
                <input
                  v-model="registerForm.name"
                  type="text"
                  autocomplete="name"
                  placeholder="Your full name"
                  class="field-input"
                  required
                />
              </div>

              <div class="field">
                <label class="field-label">Email</label>
                <input
                  v-model="registerForm.email"
                  type="email"
                  autocomplete="email"
                  placeholder="your@email.com"
                  class="field-input"
                  required
                />
              </div>

              <div class="field">
                <label class="field-label">Password</label>
                <div class="relative">
                  <input
                    v-model="registerForm.password"
                    :type="showRegPwd ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Min 8 chars, uppercase, number"
                    class="field-input pr-11"
                    required
                  />
                  <button
                    type="button"
                    @click="showRegPwd = !showRegPwd"
                    class="pwd-toggle"
                    :aria-label="showRegPwd ? 'Hide password' : 'Show password'"
                  >
                    <EyeOff v-if="showRegPwd" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
                <!-- Strength meter -->
                <div v-if="registerForm.password.length > 0" class="mt-2.5 space-y-1.5">
                  <div class="flex gap-1 h-1">
                    <div
                      v-for="i in 4"
                      :key="i"
                      :class="['flex-1 rounded-full transition-all duration-300', strengthBarColor(i)]"
                    />
                  </div>
                  <p class="text-xs" :class="strengthTextColor">{{ strengthLabel }}</p>
                </div>
              </div>

              <div class="field">
                <label class="field-label">Confirm Password</label>
                <div class="relative">
                  <input
                    v-model="registerForm.confirmPassword"
                    :type="showConfirmPwd ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Repeat your password"
                    :class="['field-input pr-11', confirmMismatch && 'field-input--error']"
                    required
                  />
                  <button
                    type="button"
                    @click="showConfirmPwd = !showConfirmPwd"
                    class="pwd-toggle"
                  >
                    <EyeOff v-if="showConfirmPwd" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
                <p v-if="confirmMismatch" class="mt-1 text-xs text-red-400">Passwords do not match</p>
              </div>

              <button type="submit" :disabled="loading || confirmMismatch" class="auth-btn">
                <span v-if="loading" class="btn-spinner" />
                <span v-else>Create Account</span>
              </button>

            </form>
          </Transition>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { Eye, EyeOff } from 'lucide-vue-next'

const { login, register } = useAuth()
const toast = useToast()

const isLoginMode = ref(true)
const loading = ref(false)
const errorMessage = ref('')

// Password visibility toggles
const showLoginPwd = ref(false)
const showRegPwd = ref(false)
const showConfirmPwd = ref(false)

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ name: '', email: '', password: '', confirmPassword: '' })

const setMode = (loginMode) => {
  if (isLoginMode.value === loginMode) return
  isLoginMode.value = loginMode
  errorMessage.value = ''
  showLoginPwd.value = false
  showRegPwd.value = false
  showConfirmPwd.value = false
}

// ── Password strength ──
const passwordStrength = computed(() => {
  const p = registerForm.password
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return Math.min(4, score)
})

const strengthLabel = computed(() =>
  ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength.value] || ''
)

const strengthTextColor = computed(() =>
  ['', 'text-red-400', 'text-amber-400', 'text-yellow-300', 'text-emerald-400'][passwordStrength.value]
)

const strengthBarColor = (i) => {
  if (i > passwordStrength.value) return 'bg-zinc-700'
  const colors = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-400']
  return colors[passwordStrength.value]
}

const passwordRulesOk = computed(() => {
  const p = registerForm.password
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)
})

const confirmMismatch = computed(() =>
  registerForm.confirmPassword.length > 0 &&
  registerForm.password !== registerForm.confirmPassword
)

// ── Login ──
const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await login(loginForm.email, loginForm.password)
    if (result.success) {
      toast.add({ title: 'Welcome back', description: 'Loading your dashboard', color: 'green' })
      navigateTo('/')
    } else {
      errorMessage.value = result.error || 'Login failed'
    }
  } catch {
    errorMessage.value = 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

// ── Register ──
const handleRegister = async () => {
  if (!passwordRulesOk.value) {
    errorMessage.value = 'Password must be at least 8 characters with one uppercase letter and one number'
    return
  }
  if (confirmMismatch.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await register(registerForm.email, registerForm.password, registerForm.name)
    if (result.success) {
      toast.add({ title: 'Account created', description: 'Welcome to ΠρoΤερο', color: 'green' })
      navigateTo('/')
    } else {
      errorMessage.value = result.error || 'Registration failed'
    }
  } catch {
    errorMessage.value = 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Background ── */
.login-bg {
  position: fixed;
  inset: 0;
  background: #0f1117;
  z-index: 0;
}

.login-bg::before {
  content: '';
  position: absolute;
  top: -25%;
  right: -20%;
  width: 65%;
  height: 65%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(248, 40, 40, 0.055) 0%, transparent 70%);
}

.login-bg::after {
  content: '';
  position: absolute;
  bottom: -25%;
  left: -20%;
  width: 65%;
  height: 65%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(8, 72, 168, 0.065) 0%, transparent 70%);
}

.login-logo-glow {
  filter: drop-shadow(0 0 32px rgba(248, 40, 40, 0.14)) drop-shadow(0 0 32px rgba(8, 72, 168, 0.14));
}

/* ── Card ── */
.login-card {
  background: rgba(22, 24, 31, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset;
}

/* ── Tabs ── */
.login-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.login-tab {
  padding: 0.9rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(161, 161, 170, 0.5);
  transition: color 0.18s;
  position: relative;
  z-index: 1;
  letter-spacing: 0.01em;
}

.login-tab--active {
  color: rgba(244, 244, 245, 0.95);
}

.login-tab-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50%;
  height: 2px;
  background: linear-gradient(90deg, #f82828, #0848a8);
  border-radius: 1px 1px 0 0;
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-tab-bar--right {
  transform: translateX(100%);
}

/* ── Fields ── */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(161, 161, 170, 0.8);
  letter-spacing: 0.01em;
}

.field-input {
  width: 100%;
  padding: 0.6875rem 0.875rem;
  font-size: 0.9375rem;
  color: rgb(244, 244, 245);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 0.5rem;
  outline: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  -webkit-appearance: none;
}

.field-input::placeholder {
  color: rgba(113, 113, 122, 0.6);
}

.field-input:focus {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.055);
  box-shadow: 0 0 0 3px rgba(8, 72, 168, 0.12);
}

.field-input--error {
  border-color: rgba(239, 68, 68, 0.4) !important;
}

.field-input--error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

/* ── Password visibility toggle ── */
.pwd-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(113, 113, 122, 0.6);
  transition: color 0.15s;
  padding: 0.25rem;
  min-height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pwd-toggle:hover {
  color: rgba(161, 161, 170, 0.9);
}

/* ── Submit button ── */
.auth-btn {
  width: 100%;
  margin-top: 0.375rem;
  padding: 0.7rem 1.5rem;
  min-height: 46px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  letter-spacing: 0.01em;
  background: linear-gradient(135deg, rgba(200, 30, 30, 0.82) 0%, rgba(8, 60, 168, 0.82) 100%);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.18s, transform 0.1s;
  box-shadow: 0 4px 18px rgba(8, 72, 168, 0.18), 0 1px 0 rgba(255,255,255,0.07) inset;
}

.auth-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.auth-btn:active:not(:disabled) {
  transform: translateY(0);
}

.auth-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: white;
  border-radius: 50%;
  animation: btnSpin 0.55s linear infinite;
  vertical-align: middle;
}

@keyframes btnSpin {
  to { transform: rotate(360deg); }
}

/* ── Form slide transition ── */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.form-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.form-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* ── Error slide-down ── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.2s, max-height 0.25s ease, margin-bottom 0.25s;
  overflow: hidden;
  max-height: 80px;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}
</style>
