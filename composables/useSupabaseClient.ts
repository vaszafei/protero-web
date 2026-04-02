/**
 * Client-side Supabase composable
 * Uses the anon key — ALL data access is protected by RLS policies
 * This replaces the server-side getSupabase() for client-side use
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

  _client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // Use localStorage for session persistence (works in Capacitor)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    db: {
      schema: 'public'
    }
  })

  return _client
}
