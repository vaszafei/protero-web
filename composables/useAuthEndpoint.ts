/**
 * Auth endpoint resolver.
 *
 * In a Nuxt SSR / web build:
 *   - Calls go to Nitro endpoints under `/api/auth/*` (sets httpOnly cookies).
 *
 * In a Capacitor APK build (CAPACITOR_BUILD=true at build time):
 *   - Calls go directly to Supabase Edge Functions under
 *     `${SUPABASE_URL}/functions/v1/auth-*` (JWT-only, no cookies).
 *
 * Returns the URL string to fetch.
 */
export function authEndpoint(action: 'login' | 'register' | 'logout' | 'me'): string {
  const config = useRuntimeConfig()
  const isCapacitor = !!(config.public as any).capacitor
  if (!isCapacitor) {
    return `/api/auth/${action}`
  }
  const supabaseUrl = (config.public as any).supabaseUrl as string
  if (!supabaseUrl) {
    throw new Error('supabaseUrl not configured')
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/auth-${action}`
}
