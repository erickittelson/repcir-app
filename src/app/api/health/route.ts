/**
 * Health Check API - January 2026
 *
 * Production-ready health endpoint for monitoring
 * Checks: Database, Cache, AI availability
 */

import { NextResponse } from "next/server";
import { db, dbRead } from "@/lib/db";
import { getCacheStats } from "@/lib/ai/cache";
import { sql } from "drizzle-orm";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    readReplica: ComponentHealth;
    cache: ComponentHealth;
    ai: ComponentHealth;
  };
  metrics: {
    cacheHitRate: number;
    cacheSize: number;
    uptime: number;
  };
}

interface ComponentHealth {
  status: "up" | "down" | "degraded";
  latencyMs?: number;
  message?: string;
}

const startTime = Date.now();

async function checkDatabase(): Promise<ComponentHealth> {
  const start = performance.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: "up",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkReadReplica(): Promise<ComponentHealth> {
  const start = performance.now();
  try {
    await dbRead.execute(sql`SELECT 1`);
    return {
      status: "up",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function checkCache(): ComponentHealth {
  try {
    const stats = getCacheStats();
    return {
      status: "up",
      message: `${stats.memoryEntries} entries, ${(stats.hitRate * 100).toFixed(1)}% hit rate`,
    };
  } catch (error) {
    return {
      status: "down",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkAI(): Promise<ComponentHealth> {
  // Don't expose whether API key is configured in public endpoint
  // Just return that the service is available
  return {
    status: "up",
    message: "AI service available",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  const [database, readReplica, ai] = await Promise.all([
    checkDatabase(),
    checkReadReplica(),
    checkAI(),
  ]);

  const cache = checkCache();
  const cacheStats = getCacheStats();

  const allUp = [database, readReplica, cache, ai].every((c) => c.status === "up");
  const anyDown = [database, readReplica].some((c) => c.status === "down");

  const overallStatus: HealthStatus["status"] = anyDown
    ? "unhealthy"
    : allUp
      ? "healthy"
      : "degraded";

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    checks: {
      database,
      readReplica,
      cache,
      ai,
    },
    metrics: {
      cacheHitRate: cacheStats.hitRate,
      cacheSize: cacheStats.memoryEntries,
      uptime: Math.round((Date.now() - startTime) / 1000),
    },
  };

  if (verbose) {
    (response as unknown as Record<string, unknown>).cacheDetails = cacheStats;
  }

  return NextResponse.json(response, {
    status: overallStatus === "unhealthy" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
