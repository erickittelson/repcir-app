/**
 * Rate Limiting Utility - January 2026
 *
 * Simple in-memory rate limiter for API routes.
 * For production, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (consider Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Store interval reference for cleanup
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup interval (called on first use)
 */
function ensureCleanupInterval() {
  if (cleanupIntervalId !== null) return;

  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Prevent interval from keeping the process alive
  if (cleanupIntervalId.unref) {
    cleanupIntervalId.unref();
  }
}

/**
 * Stop the cleanup interval and clear the store
 * Call this during graceful shutdown
 */
export function stopRateLimitCleanup() {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  rateLimitStore.clear();
}

export interface RateLimitConfig {
  // Maximum number of requests allowed
  limit: number;
  // Time window in seconds
  windowSeconds: number;
  // Optional custom key generator
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
  limit: number;
}

/**
 * Check rate limit for an identifier (usually user ID or IP)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // Lazily start cleanup interval on first use
  ensureCleanupInterval();

  const key = config.keyGenerator
    ? config.keyGenerator(identifier)
    : identifier;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowSeconds,
      limit: config.limit,
    };
  }

  // Increment count
  entry.count++;
  const remaining = Math.max(0, config.limit - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);

  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn,
      limit: config.limit,
    };
  }

  return {
    success: true,
    remaining,
    resetIn,
    limit: config.limit,
  };
}

/**
 * Rate limit configurations for different route types
 */
export const RATE_LIMITS = {
  // AI generation routes - expensive, limit heavily
  aiGeneration: {
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
  },
  // AI chat - moderate limit
  aiChat: {
    limit: 30,
    windowSeconds: 60, // 30 messages per minute
  },
  // Standard API routes
  api: {
    limit: 100,
    windowSeconds: 60, // 100 requests per minute
  },
  // Auth routes - strict limit to prevent brute force
  auth: {
    limit: 10,
    windowSeconds: 300, // 10 attempts per 5 minutes
  },
} as const;

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      retryAfter: result.resetIn,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetIn.toString(),
        "Retry-After": result.resetIn.toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.resetIn.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Helper to apply rate limiting in API routes
 *
 * Usage:
 * ```typescript
 * const rateLimitResult = await applyRateLimit(request, session.user.id, RATE_LIMITS.aiGeneration);
 * if (!rateLimitResult.success) {
 *   return createRateLimitResponse(rateLimitResult);
 * }
 * ```
 */
export function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimit(identifier, config);
}
