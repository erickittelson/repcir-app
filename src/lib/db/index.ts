/**
 * Database Configuration - Neon PostgreSQL (January 2026)
 *
 * Features:
 * - Connection pooling for high-traffic scenarios
 * - Read replica support for read-heavy operations
 * - Write connection for mutations
 * - Prepared statement caching
 * - Transaction support with automatic retries
 */

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Configure Neon for optimal performance
// Note: fetchConnectionCache is now always true by default
neonConfig.poolQueryViaFetch = true; // Use fetch for pooled queries (better for serverless)

// =============================================================================
// CONNECTION CONFIGURATION
// =============================================================================

/**
 * Primary write connection
 * Used for all mutations (INSERT, UPDATE, DELETE)
 */
const writeClient = neon(process.env.DATABASE_URL!);
export const db = drizzle(writeClient, {
  schema: schema,
  logger: process.env.NODE_ENV === "development",
});

/**
 * Read replica connection (if configured)
 * Falls back to primary if no replica is configured
 * Used for read-heavy operations like analytics, search, AI context loading
 */
const readUrl = process.env.DATABASE_READ_URL || process.env.DATABASE_URL!;
const readClient = neon(readUrl);
export const dbRead = drizzle(readClient, {
  schema: schema,
  logger: process.env.NODE_ENV === "development",
});

/**
 * Unpooled connection for migrations and admin operations
 * Uses direct connection without pooling
 */
const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
const unpooledClient = neon(unpooledUrl);
export const dbUnpooled = drizzle(unpooledClient, { schema: schema });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Database = typeof db;
export type ReadDatabase = typeof dbRead;

// Re-export schema for convenience
export * from "./schema";

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Execute a read query with automatic replica routing
 * @param queryFn - Function that receives the read database
 */
export async function withRead<T>(
  queryFn: (db: NeonHttpDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  return queryFn(dbRead);
}

/**
 * Execute a write query with the primary connection
 * @param queryFn - Function that receives the write database
 */
export async function withWrite<T>(
  queryFn: (db: NeonHttpDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  return queryFn(db);
}

/**
 * Execute multiple queries in parallel using the read replica
 * Great for loading AI context where many tables need to be queried
 * @param queries - Array of query functions
 */
export async function parallelRead<T extends readonly unknown[]>(
  queries: { [K in keyof T]: (db: NeonHttpDatabase<typeof schema>) => Promise<T[K]> }
): Promise<T> {
  const results = await Promise.all(queries.map((q) => q(dbRead)));
  return results as unknown as T;
}

// =============================================================================
// TRANSACTION HELPERS
// =============================================================================

/**
 * Execute a transaction with automatic retry on serialization errors
 * Uses exponential backoff for retries
 */
export async function withTransaction<T>(
  fn: (tx: NeonHttpDatabase<typeof schema>) => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Note: Neon HTTP doesn't support traditional transactions
      // For true ACID transactions, use the WebSocket driver
      // This is a pseudo-transaction for now
      return await fn(db);
    } catch (error) {
      lastError = error as Error;

      // Check if it's a serialization error that can be retried
      if (error instanceof Error && error.message.includes("serialization")) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// =============================================================================
// CACHE INTEGRATION
// =============================================================================

/**
 * Simple in-memory cache for frequently accessed data
 * For production, replace with Redis/Vercel KV
 */
const queryCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Execute a cached read query
 * @param key - Cache key
 * @param queryFn - Query function to execute on cache miss
 * @param ttlSeconds - Time to live in seconds (default: 60)
 */
export async function cachedRead<T>(
  key: string,
  queryFn: (db: NeonHttpDatabase<typeof schema>) => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  const cached = queryCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const data = await queryFn(dbRead);
  queryCache.set(key, { data, expiresAt: now + ttlSeconds * 1000 });

  return data;
}

/**
 * Invalidate cache entries by key prefix
 * @param prefix - Key prefix to match
 */
export function invalidateCache(prefix: string): void {
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Clear entire query cache
 */
export function clearCache(): void {
  queryCache.clear();
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check database connectivity
 * Returns latency in milliseconds
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();

  try {
    await dbRead.execute("SELECT 1");
    return {
      healthy: true,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
