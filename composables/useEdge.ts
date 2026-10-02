import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * Calls a Supabase Edge Function (`supabase-local/supabase/functions/<name>`) — the read/compute
 * layer behind the page bundles. Login, ledger writes and the jobs that spawn host processes stay on
 * Nitro (`useApiFetch`).
 *
 * The Bearer token rides on the Supabase client's `accessToken` callback, so the function reads under
 * the caller's own RLS. A 401 means the token is dead: clear it and go to /login rather than render an
 * empty page — the same contract as `useApiFetch`. Any other failure throws an Error carrying the
 * function's own message, so a panel renders it instead of an empty list.
 */
export const useEdge = () => {
  const supabase = useSupabaseClient()
  const { setToken } = useAuthToken()
  const user = useState<unknown>('user')

  return async function edge<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await supabase.functions.invoke(name, { body })
    if (!error) return data as T

    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response
      if (res.status === 401) {
        setToken(null)
        user.value = null
        navigateTo('/login')
      }
      const payload = await res.json().catch(() => null)
      throw Object.assign(new Error(payload?.error || `${name} failed (${res.status})`), { status: res.status })
    }
    throw error
  }
}
