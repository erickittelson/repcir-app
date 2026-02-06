/**
 * General-Purpose Caching with Upstash Redis
 *
 * Provides caching for API responses, user data, and computed values.
 * Falls back to in-memory LRU cache if Redis is unavailable.
 *
 * Usage:
 * ```typescript
 * const data = await cache.get("user:123", async () => {
 *   return await db.query.users.findFirst({ where: eq(users.id, "123") });
 * }, { ttl: 300 }); // 5 minute cache
 * ```
 */

// In-memory LRU cache for fallback
const memoryCache = new Map<string, { value: string; expiresAt: number }>();
const MAX_MEMORY_CACHE_SIZE = 1000;

// Types for dynamic imports
type RedisType = {
  set: (key: string, value: string, options?: { ex?: number }) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  del: (key: string | string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
};

type RedisConstructor = {
  new (config: { url: string; token: string }): RedisType;
};

// Lazy initialization
let redis: RedisType | null = null;
let RedisClass: RedisConstructor | null = null;
let initialized = false;
let redisAvailable = false;

/**
 * Initialize Redis connection
 */
async function initRedis(): Promise<RedisType | null> {
  if (initialized) return redis;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[Cache] Redis not configured, using in-memory cache");
    return null;
  }

  try {
    const importFn = new Function("moduleName", "return import(moduleName)");
    const redisModule = await importFn("@upstash/redis").catch(() => null);

    if (redisModule) {
      RedisClass = redisModule.Redis as unknown as RedisConstructor;
      redis = new RedisClass({ url, token });
      redisAvailable = true;
      console.log("[Cache] Redis initialized successfully");
      return redis;
    }
  } catch (error) {
    console.warn("[Cache] Failed to initialize Redis:", error);
  }

  return null;
}

/**
 * Get Redis client (lazy initialization)
 */
async function getRedis(): Promise<RedisType | null> {
  if (!initialized) {
    return initRedis();
  }
  return redis;
}

/**
 * Clean old entries from memory cache
 */
function cleanMemoryCache() {
  if (memoryCache.size < MAX_MEMORY_CACHE_SIZE) return;

  const now = Date.now();
  const entries = Array.from(memoryCache.entries());

  // Remove expired entries first
  for (const [key, data] of entries) {
    if (data.expiresAt < now) {
      memoryCache.delete(key);
    }
  }

  // If still too large, remove oldest entries
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const sortedEntries = entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = sortedEntries.slice(0, Math.floor(MAX_MEMORY_CACHE_SIZE / 4));
    for (const [key] of toRemove) {
      memoryCache.delete(key);
    }
  }
}

export interface CacheOptions {
  /** Time to live in seconds (default: 300 = 5 minutes) */
  ttl?: number;
  /** Cache key prefix for namespacing */
  prefix?: string;
  /** Skip cache and always fetch fresh */
  skipCache?: boolean;
}

/**
 * Get a value from cache, or compute and cache it
 */
export async function cacheGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, prefix = "cache", skipCache = false } = options;
  const fullKey = `${prefix}:${key}`;

  if (skipCache) {
    return fetcher();
  }

  const redisClient = await getRedis();

  // Try Redis first
  if (redisClient) {
    try {
      const cached = await redisClient.get(fullKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.warn("[Cache] Redis get error:", error);
    }
  }

  // Try memory cache
  const memoryCached = memoryCache.get(fullKey);
  if (memoryCached && memoryCached.expiresAt > Date.now()) {
    return JSON.parse(memoryCached.value) as T;
  }

  // Fetch fresh data
  const value = await fetcher();
  const serialized = JSON.stringify(value);

  // Store in Redis
  if (redisClient) {
    try {
      await redisClient.set(fullKey, serialized, { ex: ttl });
    } catch (error) {
      console.warn("[Cache] Redis set error:", error);
    }
  }

  // Store in memory cache as fallback
  cleanMemoryCache();
  memoryCache.set(fullKey, {
    value: serialized,
    expiresAt: Date.now() + ttl * 1000,
  });

  return value;
}

/**
 * Invalidate a cache key
 */
export async function cacheInvalidate(
  key: string,
  options: { prefix?: string } = {}
): Promise<void> {
  const { prefix = "cache" } = options;
  const fullKey = `${prefix}:${key}`;

  // Remove from memory cache
  memoryCache.delete(fullKey);

  // Remove from Redis
  const redisClient = await getRedis();
  if (redisClient) {
    try {
      await redisClient.del(fullKey);
    } catch (error) {
      console.warn("[Cache] Redis delete error:", error);
    }
  }
}

/**
 * Invalidate all cache keys matching a pattern
 */
export async function cacheInvalidatePattern(
  pattern: string,
  options: { prefix?: string } = {}
): Promise<void> {
  const { prefix = "cache" } = options;
  const fullPattern = `${prefix}:${pattern}`;

  // Clear matching memory cache entries
  for (const key of memoryCache.keys()) {
    if (key.startsWith(fullPattern.replace("*", ""))) {
      memoryCache.delete(key);
    }
  }

  // Clear matching Redis entries
  const redisClient = await getRedis();
  if (redisClient) {
    try {
      const keys = await redisClient.keys(fullPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.warn("[Cache] Redis pattern delete error:", error);
    }
  }
}

/**
 * Pre-defined cache configurations for common use cases
 */
export const CACHE_CONFIG = {
  // Short-lived cache for frequently changing data
  short: { ttl: 60 } as CacheOptions,

  // Medium cache for semi-static data
  medium: { ttl: 300 } as CacheOptions,

  // Long cache for rarely changing data
  long: { ttl: 3600 } as CacheOptions,

  // Extra long cache for static reference data
  extraLong: { ttl: 86400 } as CacheOptions,
} as const;

/**
 * Cache wrapper for user-specific data
 */
export async function cacheUserData<T>(
  userId: string,
  dataType: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return cacheGet(`user:${userId}:${dataType}`, fetcher, {
    prefix: "userData",
    ...options,
  });
}

/**
 * Invalidate all cache for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cacheInvalidatePattern(`user:${userId}:*`, { prefix: "userData" });
}

/**
 * Cache wrapper for circle-specific data
 */
export async function cacheCircleData<T>(
  circleId: string,
  dataType: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return cacheGet(`circle:${circleId}:${dataType}`, fetcher, {
    prefix: "circleData",
    ...options,
  });
}

/**
 * Invalidate all cache for a circle
 */
export async function invalidateCircleCache(circleId: string): Promise<void> {
  await cacheInvalidatePattern(`circle:${circleId}:*`, { prefix: "circleData" });
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): {
  memorySize: number;
  redisAvailable: boolean;
} {
  return {
    memorySize: memoryCache.size,
    redisAvailable,
  };
}
