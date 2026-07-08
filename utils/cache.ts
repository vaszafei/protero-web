/**
 * Layered client-side cache for Protero frontend.
 *
 * Layers:
 *   1. memory    — Map<key,{data,ts}>, lost on app kill
 *   2. persistent — Capacitor Preferences (native) / localStorage (web fallback),
 *                   survives restarts. Used for small, rarely-changing payloads.
 *
 * Design goals:
 *   - Zero dependency on @capacitor/preferences at import time (loaded lazily
 *     so the util works in web builds without the native plugin installed).
 *   - Request dedup via an in-flight promise map (coalesce concurrent fetches
 *     of the same key into one network round-trip).
 *   - Explicit tag-based invalidation (e.g. invalidate('games:*') on bet place).
 *
 * API:
 *   getMem(key)            → entry | undefined
 *   setMem(key,data,ttl)   → stores with epoch expiry
 *   getPersist(key)        → Promise<entry|undefined>
 *   setPersist(key,data,ttl)
 *   invalidate(keyOrPattern) → drops matching keys from both layers
 *   dedupFetch(key,fn)     → returns in-flight promise or starts a new one
 */

type CacheEntry<T = unknown> = { data: T; expiresAt: number }

const memStore = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

const PERSIST_PREFIX = 'protero.cache.'

// ─── Capacitor Preferences (lazy) ─────────────────────────
let prefsPromise: Promise<any> | null = null
async function getPrefs() {
  if (typeof window === 'undefined') return null
  if (prefsPromise) return prefsPromise
  prefsPromise = (async () => {
    try {
      const mod = await import('@capacitor/preferences')
      return mod.Preferences
    } catch {
      return null
    }
  })()
  return prefsPromise
}

// ─── Memory layer ─────────────────────────────────────────
export function getMem<T>(key: string): CacheEntry<T> | undefined {
  const entry = memStore.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    memStore.delete(key)
    return undefined
  }
  return entry
}

export function setMem<T>(key: string, data: T, ttlMs: number): void {
  memStore.set(key, { data, expiresAt: Date.now() + ttlMs })
}

// ─── Persistent layer ─────────────────────────────────────
export async function getPersist<T>(key: string): Promise<CacheEntry<T> | undefined> {
  if (typeof window === 'undefined') return undefined
  const fullKey = PERSIST_PREFIX + key
  try {
    const prefs = await getPrefs()
    const raw = prefs
      ? (await prefs.get({ key: fullKey })).value
      : window.localStorage.getItem(fullKey)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (parsed.expiresAt < Date.now()) {
      await removePersist(key)
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

export async function setPersist<T>(key: string, data: T, ttlMs: number): Promise<void> {
  if (typeof window === 'undefined') return
  const fullKey = PERSIST_PREFIX + key
  const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs }
  const raw = JSON.stringify(entry)
  try {
    const prefs = await getPrefs()
    if (prefs) {
      await prefs.set({ key: fullKey, value: raw })
    } else {
      window.localStorage.setItem(fullKey, raw)
    }
  } catch {
    // Storage full or blocked — fail silently, memory layer still works.
  }
}

async function removePersist(key: string): Promise<void> {
  if (typeof window === 'undefined') return
  const fullKey = PERSIST_PREFIX + key
  try {
    const prefs = await getPrefs()
    if (prefs) await prefs.remove({ key: fullKey })
    else window.localStorage.removeItem(fullKey)
  } catch { /* ignore */ }
}

// ─── Invalidation ─────────────────────────────────────────
/**
 * Invalidate one key or a glob-ish prefix pattern ending in '*'.
 * Examples: invalidate('games:*'), invalidate('wallet:stats:6')
 */
export async function invalidate(keyOrPattern: string): Promise<void> {
  const isWildcard = keyOrPattern.endsWith('*')
  const prefix = isWildcard ? keyOrPattern.slice(0, -1) : null

  // Memory
  if (prefix) {
    for (const k of Array.from(memStore.keys())) {
      if (k.startsWith(prefix)) memStore.delete(k)
    }
  } else {
    memStore.delete(keyOrPattern)
  }

  // Persistent
  if (typeof window !== 'undefined') {
    try {
      const prefs = await getPrefs()
      if (prefs) {
        const { keys } = await prefs.keys()
        for (const k of (keys || [])) {
          if (!k.startsWith(PERSIST_PREFIX)) continue
          const bare = k.slice(PERSIST_PREFIX.length)
          if (prefix ? bare.startsWith(prefix) : bare === keyOrPattern) {
            await prefs.remove({ key: k })
          }
        }
      } else {
        const ls = window.localStorage
        for (let i = ls.length - 1; i >= 0; i--) {
          const k = ls.key(i)
          if (!k || !k.startsWith(PERSIST_PREFIX)) continue
          const bare = k.slice(PERSIST_PREFIX.length)
          if (prefix ? bare.startsWith(prefix) : bare === keyOrPattern) {
            ls.removeItem(k)
          }
        }
      }
    } catch { /* ignore */ }
  }
}

// ─── Request dedup ────────────────────────────────────────
/**
 * Coalesce concurrent identical fetches. If a call is already in-flight for
 * the same key, subsequent callers get the same promise.
 */
export function dedupFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// ─── Debug ─────────────────────────────────────────────────
export function __cacheSize() {
  return { memory: memStore.size, inflight: inflight.size }
}
