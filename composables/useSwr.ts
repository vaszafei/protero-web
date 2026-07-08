/**
 * SWR (stale-while-revalidate) composable backed by the layered cache util.
 *
 * Behavior:
 *   - Returns cached data immediately when present (from memory, then persistent).
 *   - Triggers a background revalidation if the cache is stale (past TTL) or absent.
 *   - Dedups concurrent calls for the same key.
 *
 * Usage:
 *   const { data, pending, error, refresh } = useSwr('games:2026-04-23',
 *     () => api.fetchGames({...}),
 *     { memoryTtl: 2*60_000, persistTtl: 0 })
 *
 * Not a Nuxt `useAsyncData` wrapper on purpose — we need client-only control
 * over cache layers and we're SPA (ssr:false), so useAsyncData's SSR hydration
 * path adds cost without benefit.
 */
import { ref, shallowRef, onBeforeUnmount } from 'vue'
import {
  getMem, setMem, getPersist, setPersist, dedupFetch, invalidate as cacheInvalidate,
} from '~/utils/cache'

export interface UseSwrOptions {
  /** Memory TTL in ms. Default 60_000 (1 min). */
  memoryTtl?: number
  /** Persistent TTL in ms. 0 disables persistent layer. Default 0. */
  persistTtl?: number
  /** If true, never touch the network; only read from cache. Default false. */
  readOnly?: boolean
  /** If true, force-bypass cache on first call. Default false. */
  force?: boolean
  /** If true, do not auto-fetch on setup; caller triggers via refresh(). */
  lazy?: boolean
}

const DEFAULT_MEM_TTL = 60_000

export function useSwr<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: UseSwrOptions = {},
) {
  const memTtl = opts.memoryTtl ?? DEFAULT_MEM_TTL
  const persistTtl = opts.persistTtl ?? 0

  const data = shallowRef<T | null>(null)
  const pending = ref(false)
  const error = shallowRef<Error | null>(null)
  const stale = ref(false)

  let disposed = false

  async function readCache(): Promise<{ data: T; stale: boolean } | null> {
    const mem = getMem<T>(key)
    if (mem) return { data: mem.data, stale: false }
    if (persistTtl > 0) {
      const persist = await getPersist<T>(key)
      if (persist) {
        // Promote to memory with its own short TTL so we don't re-hit persistent storage.
        setMem(key, persist.data, memTtl)
        return { data: persist.data, stale: false }
      }
    }
    return null
  }

  async function revalidate(): Promise<void> {
    if (disposed || opts.readOnly) return
    pending.value = true
    error.value = null
    try {
      const fresh = await dedupFetch(key, fetcher)
      if (disposed) return
      data.value = fresh
      stale.value = false
      setMem(key, fresh, memTtl)
      if (persistTtl > 0) await setPersist(key, fresh, persistTtl)
    } catch (e: any) {
      if (disposed) return
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      if (!disposed) pending.value = false
    }
  }

  async function load(): Promise<void> {
    if (opts.force) {
      await revalidate()
      return
    }
    const cached = await readCache()
    if (cached) {
      data.value = cached.data
      stale.value = cached.stale
      // Cache hit from memory — no network call. That's the hot path.
      return
    }
    // Cache miss — must fetch.
    await revalidate()
  }

  async function refresh(): Promise<void> {
    await revalidate()
  }

  async function invalidate(): Promise<void> {
    await cacheInvalidate(key)
    await revalidate()
  }

  if (!opts.lazy) {
    // Fire-and-track; do not block setup.
    load().catch(() => { /* error is already captured */ })
  }

  onBeforeUnmount(() => { disposed = true })

  return { data, pending, error, stale, refresh, invalidate, load }
}
