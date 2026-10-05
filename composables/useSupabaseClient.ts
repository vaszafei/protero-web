/**
 * Client-side Supabase client.
 *
 * Uses the project's anon key. RLS gates everything; our custom-auth JWT is
 * injected on every request via the `accessToken` callback so user-scoped
 * tables resolve `auth_user_id()` correctly.
 *
 * Singleton pattern — a single client instance is shared across the app.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export const useSupabaseClient = (): SupabaseClient => {
  if (_client) return _client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const anonKey = config.public.supabaseAnonKey as string

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in runtime config')
  }

  const { getToken } = useAuthToken()

  _client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: { schema: 'public' },
    // Called by supabase-js >=2.43 on every request. Returning a token
    // injects `Authorization: Bearer <token>`; returning null falls back
    // to the anon key (still required as the `apikey` header).
    accessToken: async () => getToken(),
  } as any)

  return _client
}

/**
 * The client for a Realtime subscription. `accessToken` above authenticates REST calls only: the websocket
 * joins with the anon key unless `realtime.setAuth` is told otherwise, and then RLS is evaluated per event
 * as `anon` — public tables (`bets`, `parlays`) still deliver, admin-only ones (`pipeline_runs`,
 * `phase_runs`) silently deliver nothing while the channel reports SUBSCRIBED (#52).
 */
export const useRealtimeClient = (): SupabaseClient => {
  const client = useSupabaseClient()
  const token = useAuthToken().getToken()
  if (token) client.realtime.setAuth(token)
  return client
}
