/**
 * Token storage for the custom-auth JWT.
 *
 * Stored in `localStorage` so it survives reloads and can later be swapped
 * for `@capacitor/preferences` in the APK build. A reactive `useState`
 * mirror keeps the Supabase client's `accessToken` callback in sync without
 * requiring a re-render.
 */

const STORAGE_KEY = 'protero.access_token'

export const useAuthToken = () => {
  const token = useState<string | null>('access_token', () => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setToken = (value: string | null) => {
    token.value = value
    if (typeof window === 'undefined') return
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, value)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage disabled */
    }
  }

  const getToken = (): string | null => {
    if (token.value) return token.value
    if (typeof window === 'undefined') return null
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) token.value = stored
      return stored
    } catch {
      return null
    }
  }

  return { token, setToken, getToken }
}
