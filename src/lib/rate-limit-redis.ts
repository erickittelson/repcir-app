/**
 * Distributed Rate Limiting - Redis-based (Upstash)
 *
 * Scalable rate limiting that works across multiple instances.
 * Falls back to in-memory rate limiting if Redis is unavailable.
 *
 * Setup:
 * 1. Add Upstash Redis to your project: npm install @upstash/ratelimit @upstash/redis
 * 2. Add environment variables:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 */

import { checkRateLimit as checkInMemoryRateLimit, type RateLimitConfig, type RateLimitResult } from "./rate-limit";

// Types for dynamic imports (to avoid build errors when packages not installed)
type RatelimitType = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    remaining: number;
    reset: number;
  }>;
};

type RatelimitConstructor = {
  new (config: {
    redis: unknown;
    limiter: unknown;
    analytics?: boolean;
    prefix?: string;
  }): RatelimitType;
  slidingWindow: (limit: number, window: string) => unknown;
};

type RedisType = {
  set: (key: string, value: string, options?: { ex?: number }) => Promise<unknown>;
  get: (key: string) => Promise<unknown>;
};

type RedisConstructor = {
  new (config: { url: string; token: string }): RedisType;
  fromEnv: () => RedisType;
};

// Initialize Redis client (lazy - only when env vars are present and packages installed)
let redis: RedisType | null = null;
let rateLimiters: Map<string, RatelimitType> = new Map();
let RatelimitClass: RatelimitConstructor | null = null;
let RedisClass: RedisConstructor | null = null;
let packagesLoaded = false;
let packagesAvailable = false;

/**
 * Dynamically load Upstash packages (to avoid build errors when not installed)
 */
async function loadUpstashPackages(): Promise<boolean> {
  if (packagesLoaded) return packagesAvailable;
  packagesLoaded = true;

  try {
    // Use eval to prevent TypeScript from trying to resolve these at compile time
    const importFn = new Function('moduleName', 'return import(moduleName)');
    const [ratelimitModule, redisModule] = await Promise.all([
      importFn("@upstash/ratelimit").catch(() => null),
      importFn("@upstash/redis").catch(() => null),
    ]);

    if (ratelimitModule && redisModule) {
      RatelimitClass = ratelimitModule.Ratelimit as unknown as RatelimitConstructor;
      RedisClass = redisModule.Redis as unknown as RedisConstructor;
      packagesAvailable = true;
      return true;
    }
  } catch {
    // Packages not installed
  }

  console.warn("[RateLimit] Upstash packages not installed, using in-memory rate limiting");
  return false;
}

async function getRedis(): Promise<RedisType | null> {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const loaded = await loadUpstashPackages();
  if (!loaded || !RedisClass) return null;

  try {
    redis = new RedisClass({ url, token });
    return redis;
  } catch (error) {
    console.error("[RateLimit] Failed to initialize Redis:", error);
    return null;
  }
}

/**
 * Get or create a rate limiter for a specific configuration
 */
async function getRateLimiter(config: RateLimitConfig): Promise<RatelimitType | null> {
  const redisClient = await getRedis();
  if (!redisClient || !RatelimitClass) return null;

  const key = `${config.limit}:${config.windowSeconds}`;

  if (!rateLimiters.has(key)) {
    const limiter = new RatelimitClass({
      redis: redisClient,
      limiter: RatelimitClass.slidingWindow(config.limit, `${config.windowSeconds}s`),
      analytics: true,
      prefix: "ratelimit",
    });
    rateLimiters.set(key, limiter);
  }

  return rateLimiters.get(key)!;
}

/**
 * Check rate limit using Redis (with fallback to in-memory)
 */
export async function checkRateLimitDistributed(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = await getRateLimiter(config);

  // Fallback to in-memory if Redis unavailable
  if (!limiter) {
    return checkInMemoryRateLimit(identifier, config);
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      resetIn: Math.ceil((result.reset - Date.now()) / 1000),
      limit: config.limit,
    };
  } catch (error) {
    console.error("[RateLimit] Redis error, falling back to in-memory:", error);
    return checkInMemoryRateLimit(identifier, config);
  }
}

/**
 * Apply distributed rate limiting in API routes
 *
 * Usage:
 * ```typescript
 * const result = await applyDistributedRateLimit(session.user.id, RATE_LIMITS.aiGeneration);
 * if (!result.success) {
 *   return createRateLimitResponse(result);
 * }
 * ```
 */
export async function applyDistributedRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return checkRateLimitDistributed(identifier, config);
}

/**
 * Block an identifier temporarily (e.g., after suspicious activity)
 */
export async function blockIdentifier(
  identifier: string,
  durationSeconds: number
): Promise<boolean> {
  const redisClient = await getRedis();
  if (!redisClient) return false;

  try {
    await redisClient.set(`blocked:${identifier}`, "1", { ex: durationSeconds });
    return true;
  } catch (error) {
    console.error("[RateLimit] Failed to block identifier:", error);
    return false;
  }
}

/**
 * Check if an identifier is blocked
 */
export async function isBlocked(identifier: string): Promise<boolean> {
  const redisClient = await getRedis();
  if (!redisClient) return false;

  try {
    const blocked = await redisClient.get(`blocked:${identifier}`);
    return blocked === "1";
  } catch (error) {
    console.error("[RateLimit] Failed to check block status:", error);
    return false;
  }
}

/**
 * Get rate limit analytics (requires Upstash analytics enabled)
 */
export async function getRateLimitAnalytics(): Promise<{
  enabled: boolean;
  message: string;
}> {
  const redisClient = await getRedis();
  if (!redisClient) {
    return {
      enabled: false,
      message: "Redis not configured - using in-memory rate limiting",
    };
  }

  return {
    enabled: true,
    message: "Redis-based distributed rate limiting active",
  };
}

// Re-export types and constants from the base module
export { RATE_LIMITS, createRateLimitResponse, addRateLimitHeaders } from "./rate-limit";
export type { RateLimitConfig, RateLimitResult };
