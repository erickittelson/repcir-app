/**
 * Cron Job: Cache Cleanup
 *
 * Runs daily to clean up expired cache entries
 * Vercel Cron: 0 3 * * * (3 AM daily)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiResponseCache } from "@/lib/db/schema";
import { sql, lt } from "drizzle-orm";
import { clearExpiredCache } from "@/lib/ai/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Require CRON_SECRET in production for security
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET not configured in production");
      return false;
    }
    // Allow in development for testing, but log warning
    console.warn("CRON_SECRET not set - cron endpoint accessible without auth in dev");
    return true;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = performance.now();
  const results = {
    aiCache: { deleted: 0, error: null as string | null },
    memoryCache: { cleared: false, error: null as string | null },
  };

  // Clean AI response cache
  try {
    const deleted = await db
      .delete(aiResponseCache)
      .where(lt(aiResponseCache.expiresAt, new Date()))
      .returning({ id: aiResponseCache.id });

    results.aiCache.deleted = deleted.length;
  } catch (error) {
    results.aiCache.error = error instanceof Error ? error.message : "Unknown error";
  }

  // Clear in-memory cache
  try {
    clearExpiredCache();
    results.memoryCache.cleared = true;
  } catch (error) {
    results.memoryCache.error = error instanceof Error ? error.message : "Unknown error";
  }

  // Also clean up old workout sessions marked as abandoned
  try {
    await db.execute(sql`
      UPDATE workout_sessions
      SET status = 'abandoned'
      WHERE status = 'in_progress'
      AND started_at < NOW() - INTERVAL '24 hours'
    `);
  } catch (error) {
    console.error("Failed to clean abandoned sessions:", error);
  }

  const elapsed = Math.round(performance.now() - start);

  return NextResponse.json({
    success: true,
    results,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  });
}
