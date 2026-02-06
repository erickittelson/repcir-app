/**
 * AI Response Caching Service - January 2026
 *
 * Multi-tier caching for AI responses:
 * 1. In-memory LRU cache (fastest, per-instance)
 * 2. Vercel KV (shared across instances, persistent)
 * 3. PostgreSQL (long-term, queryable)
 *
 * Features:
 * - Semantic cache keys based on context hashing
 * - TTL-based expiration
 * - Hit rate tracking
 * - Cost savings calculation
 */

import { db, dbRead } from "@/lib/db";
import { aiResponseCache } from "@/lib/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import crypto from "crypto";
import { CACHE_TTL, MEMORY_CACHE_SIZE, MODEL_PRICING, getModelPricing } from "./config";

// =============================================================================
// TYPES
// =============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  modelUsed: string;
  reasoningLevel?: string;
  inputTokens?: number;
  outputTokens?: number;
  generationTimeMs?: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  estimatedCostSaved: number;
  avgRetrievalTimeMs: number;
}

export type CacheType =
  | "workout_plan"
  | "workout_generation"
  | "exercise_recommendations"
  | "coaching_response"
  | "milestone_generation"
  | "context_analysis";

// =============================================================================
// IN-MEMORY LRU CACHE
// =============================================================================

class LRUCache<T> {
  private cache: Map<string, { value: T; expiresAt: number }>;
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// =============================================================================
// CACHE INSTANCE
// =============================================================================

const memoryCache = new LRUCache<CacheEntry>(MEMORY_CACHE_SIZE);

// Stats tracking
let cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  estimatedCostSaved: 0,
  avgRetrievalTimeMs: 0,
};

const retrievalTimes: number[] = [];

// Track saved costs per hit
let totalSavedCost = 0;

// =============================================================================
// HASHING
// =============================================================================

/**
 * Create a deterministic hash for cache key generation
 */
export function hashContext(context: Record<string, unknown>): string {
  const normalized = JSON.stringify(context, Object.keys(context).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Create a cache key from type and context
 */
export function createCacheKey(
  type: CacheType,
  memberId: string,
  context: Record<string, unknown>
): string {
  const contextHash = hashContext(context);
  return `ai:${type}:${memberId}:${contextHash}`;
}

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Get cached AI response
 * Checks memory cache first, then database
 */
export async function getCachedResponse<T>(
  cacheKey: string
): Promise<CacheEntry<T> | null> {
  const start = performance.now();

  // Check memory cache first
  const memoryHit = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (memoryHit) {
    recordHit(performance.now() - start, memoryHit);
    return memoryHit;
  }

  // Check database
  try {
    const dbHit = await dbRead
      .select()
      .from(aiResponseCache)
      .where(
        and(
          eq(aiResponseCache.cacheKey, cacheKey),
          gt(aiResponseCache.expiresAt, new Date())
        )
      )
      .limit(1);

    if (dbHit.length > 0) {
      const entry: CacheEntry<T> = {
        data: dbHit[0].response as T,
        modelUsed: dbHit[0].modelUsed || "unknown",
        reasoningLevel: dbHit[0].reasoningLevel || undefined,
        inputTokens: dbHit[0].inputTokens || undefined,
        outputTokens: dbHit[0].outputTokens || undefined,
        generationTimeMs: dbHit[0].generationTimeMs || undefined,
        createdAt: dbHit[0].createdAt!,
        expiresAt: dbHit[0].expiresAt,
      };

      // Warm memory cache
      const ttl = Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        memoryCache.set(cacheKey, entry, ttl);
      }

      // Update hit count in background (log errors but don't block)
      db.update(aiResponseCache)
        .set({
          hitCount: sql`${aiResponseCache.hitCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(aiResponseCache.cacheKey, cacheKey))
        .execute()
        .catch((error) => {
          console.warn("Failed to update cache hit count:", error instanceof Error ? error.message : "Unknown error");
        });

      recordHit(performance.now() - start, entry);
      return entry;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorCode = (error as { code?: string })?.code;
    console.error(`Cache read error [${errorCode || "UNKNOWN"}]: ${errorMessage}`, {
      cacheKey,
      errorType: error?.constructor?.name,
    });
  }

  recordMiss();
  return null;
}

/**
 * Store AI response in cache
 */
export async function setCachedResponse<T>(
  cacheKey: string,
  cacheType: CacheType,
  data: T,
  options: {
    modelUsed: string;
    reasoningLevel?: string;
    inputTokens?: number;
    outputTokens?: number;
    generationTimeMs?: number;
    ttlSeconds?: number;
  }
): Promise<void> {
  const ttl = options.ttlSeconds || getDefaultTTL(cacheType);
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const entry: CacheEntry<T> = {
    data,
    modelUsed: options.modelUsed,
    reasoningLevel: options.reasoningLevel,
    inputTokens: options.inputTokens,
    outputTokens: options.outputTokens,
    generationTimeMs: options.generationTimeMs,
    createdAt: new Date(),
    expiresAt,
  };

  // Store in memory cache
  memoryCache.set(cacheKey, entry, ttl);

  // Store in database (async, don't block)
  const contextHash = cacheKey.split(":").pop() || "";

  db.insert(aiResponseCache)
    .values({
      cacheKey,
      cacheType,
      contextHash,
      response: data as unknown as Record<string, unknown>,
      responseText: typeof data === "string" ? data : undefined,
      modelUsed: options.modelUsed,
      reasoningLevel: options.reasoningLevel,
      inputTokens: options.inputTokens,
      outputTokens: options.outputTokens,
      totalCost: calculateCost(options.inputTokens, options.outputTokens, options.modelUsed),
      generationTimeMs: options.generationTimeMs,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: aiResponseCache.cacheKey,
      set: {
        response: data as unknown as Record<string, unknown>,
        expiresAt,
        hitCount: 0,
      },
    })
    .execute()
    .catch((error) => console.error("Cache write error:", error));
}

/**
 * Invalidate cache entries
 */
export async function invalidateCache(pattern: string): Promise<void> {
  // Clear memory cache entries matching pattern
  // Note: LRU doesn't support pattern matching, so we just clear all
  memoryCache.clear();

  // Delete from database
  await db
    .delete(aiResponseCache)
    .where(sql`${aiResponseCache.cacheKey} LIKE ${pattern + "%"}`);
}

/**
 * Invalidate all cache for a member
 */
export async function invalidateMemberCache(memberId: string): Promise<void> {
  await invalidateCache(`ai:*:${memberId}:`);
}

// =============================================================================
// TTL CONFIGURATION
// =============================================================================

function getDefaultTTL(cacheType: CacheType): number {
  // Use centralized config for TTL values
  return CACHE_TTL[cacheType] || CACHE_TTL.context_analysis;
}

// =============================================================================
// COST CALCULATION
// =============================================================================

function calculateCost(
  inputTokens?: number,
  outputTokens?: number,
  model?: string
): string | undefined {
  if (!inputTokens && !outputTokens) return undefined;

  // Use centralized pricing config
  const pricing = getModelPricing(model || "gpt-5.2");
  const inputCost = ((inputTokens || 0) / 1_000_000) * pricing.inputPer1M;
  const outputCost = ((outputTokens || 0) / 1_000_000) * pricing.outputPer1M;

  return (inputCost + outputCost).toFixed(6);
}

// =============================================================================
// STATS TRACKING
// =============================================================================

function recordHit(retrievalTimeMs: number, entry?: CacheEntry): void {
  cacheStats.hits++;

  // Calculate estimated cost saved from this hit
  if (entry?.inputTokens || entry?.outputTokens) {
    const costStr = calculateCost(entry.inputTokens, entry.outputTokens, entry.modelUsed);
    if (costStr) {
      totalSavedCost += parseFloat(costStr);
      cacheStats.estimatedCostSaved = totalSavedCost;
    }
  }

  updateStats(retrievalTimeMs);
}

function recordMiss(): void {
  cacheStats.misses++;
  updateStats(0);
}

function updateStats(retrievalTimeMs: number): void {
  const total = cacheStats.hits + cacheStats.misses;
  cacheStats.hitRate = total > 0 ? cacheStats.hits / total : 0;

  if (retrievalTimeMs > 0) {
    retrievalTimes.push(retrievalTimeMs);
    if (retrievalTimes.length > 1000) retrievalTimes.shift();
    cacheStats.avgRetrievalTimeMs =
      retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;
  }
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    estimatedCostSaved: 0,
    avgRetrievalTimeMs: 0,
  };
  retrievalTimes.length = 0;
  totalSavedCost = 0;
}

// =============================================================================
// CACHE WARMING
// =============================================================================

/**
 * Pre-warm cache for frequently accessed patterns
 * Call this on app startup or periodically
 */
export async function warmCache(): Promise<void> {
  // Cache warming started

  // Load recent cache entries into memory
  const recentEntries = await dbRead
    .select()
    .from(aiResponseCache)
    .where(gt(aiResponseCache.expiresAt, new Date()))
    .orderBy(sql`${aiResponseCache.hitCount} DESC`)
    .limit(100);

  for (const entry of recentEntries) {
    const ttl = Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      memoryCache.set(entry.cacheKey, {
        data: entry.response,
        modelUsed: entry.modelUsed || "unknown",
        createdAt: entry.createdAt!,
        expiresAt: entry.expiresAt,
      }, ttl);
    }
  }

  // Warmed cache entries: recentEntries.length
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up expired cache entries from database
 * Run this periodically (e.g., daily cron)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const result = await db
    .delete(aiResponseCache)
    .where(sql`${aiResponseCache.expiresAt} < NOW()`)
    .returning({ id: aiResponseCache.id });

  return result.length;
}

/**
 * Clear expired entries from memory cache
 */
export function clearExpiredCache(): void {
  // The LRU cache automatically handles expiration on access
  // This is a no-op but can be extended if needed
  // Memory cache cleared of expired entries
}

/**
 * Clear all cache (memory + mark for database cleanup)
 */
export function clearAllCache(): void {
  memoryCache.clear();
  resetCacheStats();
  // All memory cache cleared
}

/**
 * Generate a cache key from type and context
 */
export function generateCacheKey(
  type: string,
  context: Record<string, unknown>
): string {
  const contextHash = hashContext(context);
  return `ai:${type}:${contextHash}`;
}

/**
 * Get extended cache stats including memory size
 */
export function getCacheStats(): CacheStats & { memoryEntries: number } {
  return {
    ...cacheStats,
    memoryEntries: memoryCache.size(),
  };
}
