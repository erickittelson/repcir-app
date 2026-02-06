/**
 * Admin Cache Management API - January 2026
 *
 * Manage AI response cache and memory cache
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, dbRead } from "@/lib/db";
import { aiResponseCache } from "@/lib/db/schema";
import { sql, lt, desc } from "drizzle-orm";
import { getCacheStats, clearExpiredCache, clearAllCache } from "@/lib/ai/cache";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cache statistics
    const memoryStats = getCacheStats();

    // Get database cache stats
    const [aiStats, topEntries] = await Promise.all([
      dbRead
        .select({
          total: sql<number>`COUNT(*)`,
          totalHits: sql<number>`COALESCE(SUM(hit_count), 0)`,
          avgHits: sql<number>`COALESCE(AVG(hit_count), 0)`,
          expired: sql<number>`COUNT(*) FILTER (WHERE expires_at < NOW())`,
          totalGenerationCost: sql<number>`COALESCE(SUM(total_cost::numeric), 0)`,
          totalTokens: sql<number>`COALESCE(SUM(input_tokens + output_tokens), 0)`,
          // Cost savings = cost per entry * number of hits (each hit avoided regeneration)
          estimatedSavings: sql<number>`COALESCE(SUM(total_cost::numeric * hit_count), 0)`,
        })
        .from(aiResponseCache),

      // Top 10 most hit cache entries
      dbRead
        .select({
          cacheKey: aiResponseCache.cacheKey,
          cacheType: aiResponseCache.cacheType,
          hitCount: aiResponseCache.hitCount,
          totalCost: aiResponseCache.totalCost,
          createdAt: aiResponseCache.createdAt,
          expiresAt: aiResponseCache.expiresAt,
        })
        .from(aiResponseCache)
        .orderBy(desc(aiResponseCache.hitCount))
        .limit(10),
    ]);

    return NextResponse.json({
      memory: {
        entries: memoryStats.memoryEntries,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: (memoryStats.hitRate * 100).toFixed(1) + "%",
        avgRetrievalTimeMs: memoryStats.avgRetrievalTimeMs.toFixed(2),
        estimatedCostSaved: "$" + memoryStats.estimatedCostSaved.toFixed(4),
      },
      database: {
        aiCache: {
          total: aiStats[0].total,
          expired: aiStats[0].expired,
          totalHits: aiStats[0].totalHits,
          avgHitsPerEntry: Number(aiStats[0].avgHits).toFixed(2),
          totalTokensGenerated: aiStats[0].totalTokens,
          totalGenerationCost: "$" + Number(aiStats[0].totalGenerationCost).toFixed(4),
          estimatedSavingsFromCache: "$" + Number(aiStats[0].estimatedSavings).toFixed(4),
        },
      },
      topEntries: topEntries.map((e) => ({
        key: e.cacheKey.slice(0, 32) + "...",
        type: e.cacheType,
        hits: e.hitCount,
        cost: e.totalCost ? "$" + Number(e.totalCost).toFixed(4) : "N/A",
        savedByCaching: e.totalCost && e.hitCount ? "$" + (Number(e.totalCost) * (e.hitCount || 0)).toFixed(4) : "N/A",
        age: Math.round((Date.now() - e.createdAt!.getTime()) / 60000) + " min",
        expiresIn: Math.round((e.expiresAt.getTime() - Date.now()) / 60000) + " min",
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching cache stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch cache stats" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "expired";

    let result: { memory: boolean; database: number };

    switch (action) {
      case "all":
        // Clear all cache (memory + database)
        clearAllCache();

        const aiDeleted = await db.delete(aiResponseCache).returning({ id: aiResponseCache.id });

        result = {
          memory: true,
          database: aiDeleted.length,
        };
        break;

      case "expired":
      default:
        // Clear only expired entries
        clearExpiredCache();

        const expiredAi = await db
          .delete(aiResponseCache)
          .where(lt(aiResponseCache.expiresAt, new Date()))
          .returning({ id: aiResponseCache.id });

        result = {
          memory: true,
          database: expiredAi.length,
        };
        break;
    }

    return NextResponse.json({
      success: true,
      action,
      cleared: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
