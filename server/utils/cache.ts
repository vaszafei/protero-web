/**
 * Simple in-memory cache utility for API responses
 * Provides TTL-based caching with pattern-based invalidation
 */

interface CacheEntry<T> {
  data: T
  expiry: number
}

const cache = new Map<string, CacheEntry<any>>()

/**
 * Get cached data by key
 * @param key - Cache key
 * @returns Cached data or null if expired/not found
 */
export function getCached<T>(key: string): T | null {
  const item = cache.get(key)
  
  if (!item) {
    return null
  }
  
  // Check if expired
  if (Date.now() > item.expiry) {
    cache.delete(key)
    return null
  }
  
  return item.data as T
}

/**
 * Set cache data with TTL
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 */
export function setCache<T>(key: string, data: T, ttlSeconds: number = 300): void {
  cache.set(key, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  })
}

/**
 * Invalidate cache entries matching a pattern
 * @param pattern - String pattern to match keys (supports partial match)
 * @returns Number of entries invalidated
 */
export function invalidateCache(pattern: string): number {
  let count = 0
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
      count++
    }
  }
  
  return count
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now()
  let validEntries = 0
  let expiredEntries = 0
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      expiredEntries++
    } else {
      validEntries++
    }
  }
  
  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    keys: Array.from(cache.keys())
  }
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupExpiredCache(): number {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key)
      cleaned++
    }
  }
  
  return cleaned
}

// Auto-cleanup every 5 minutes (server-side only)
// Using typeof check for compatibility
if (typeof process !== 'undefined' && process.env) {
  setInterval(() => {
    const cleaned = cleanupExpiredCache()
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`)
    }
  }, 5 * 60 * 1000)
}
