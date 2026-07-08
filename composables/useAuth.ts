/**
 * Authentication composable — server-side sessions with httpOnly cookies.
 * Auth flow: $fetch('/api/auth/...') → server sets cookie → checkAuth via /api/auth/me
 */

import { computed } from 'vue'

interface UserData {
  id: number
  email: string
  name: string
  display_name?: string
  role: string
  onboarding_completed: boolean
  preferred_sports: string[]
  preferred_wallet_id?: number | null
  timezone?: string
  notification_prefs?: Record<string, boolean>
  avatar_url?: string
  created_at?: string
}

export const useAuth = () => {
  const user = useState<UserData | null>('user', () => null)
  const { getToken, setToken } = useAuthToken()
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const needsOnboarding = computed(() => !!user.value && !user.value.onboarding_completed && user.value.role !== 'admin')

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    try {
      const data = await $fetch<{ user: UserData; access_token?: string }>(authEndpoint('login'), {
        method: 'POST',
        body: { email, password }
      })
      user.value = data.user
      if (data.access_token) setToken(data.access_token)
      return { success: true }
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.data?.error || err?.message || 'Login failed'
      return { success: false, error: msg }
    }
  }

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      await $fetch(authEndpoint('logout'), { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    }
    user.value = null
    setToken(null)
    navigateTo('/login')
  }

  /**
   * Register new user — server handles bcrypt, session, wallet, credits
   */
  const register = async (email: string, password: string, name: string) => {
    try {
      const data = await $fetch<{ user: UserData; access_token?: string }>(authEndpoint('register'), {
        method: 'POST',
        body: { email, password, name }
      })
      user.value = data.user
      if (data.access_token) setToken(data.access_token)
      return { success: true }
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.data?.error || err?.message || 'Registration failed'
      return { success: false, error: msg }
    }
  }

  /**
   * Check if user session is valid (called on app init)
   */
  const checkAuth = async () => {
    try {
      const token = getToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const data = await $fetch<{ user: UserData; access_token?: string }>(authEndpoint('me'), { headers })
      user.value = data.user
      if (data.access_token) setToken(data.access_token)
      return true
    } catch {
      user.value = null
      setToken(null)
      return false
    }
  }

  /**
   * Complete onboarding via server endpoint
   */
  const completeOnboarding = async (onboardingData: {
    display_name: string
    preferred_sports: string[]
    league_subscriptions: string[]
    preferred_wallet_id?: number | null
    timezone?: string
    notification_prefs?: Record<string, boolean>
  }) => {
    try {
      if (!user.value) return { success: false, error: 'Not authenticated' }

      const data = await $fetch<{ user: UserData }>('/api/user/onboarding', {
        method: 'POST',
        body: onboardingData
      })
      if (data.user) user.value = data.user
      return { success: true }
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.message || 'Failed to save preferences'
      return { success: false, error: msg }
    }
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    needsOnboarding,
    login,
    logout,
    register,
    checkAuth,
    completeOnboarding
  }
}
