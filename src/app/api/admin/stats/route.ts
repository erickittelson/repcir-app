/**
 * Admin Stats API - January 2026
 *
 * Comprehensive system statistics for admin dashboard
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, dbRead } from "@/lib/db";
import {
  circleMembers,
  exercises,
  workoutPlans,
  workoutSessions,
  goals,
  memberContextSnapshot,
  aiResponseCache,
} from "@/lib/db/schema";
import { eq, count, inArray, sql, gte, and, desc } from "drizzle-orm";
import { getCacheStats } from "@/lib/ai/cache";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin or owner role for admin stats access
    const userRole = session.activeCircle?.role;
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const detailed = url.searchParams.get("detailed") === "true";

    // Parallel fetch all stats
    const [
      membersCount,
      exercisesCount,
      workoutPlansCount,
      members,
      cacheStats,
      snapshotStats,
      aiCacheStats,
      recentActivity,
    ] = await Promise.all([
      // Basic counts
      dbRead.select({ count: count() }).from(circleMembers).where(eq(circleMembers.circleId, session.circleId)),
      dbRead.select({ count: count() }).from(exercises),
      dbRead.select({ count: count() }).from(workoutPlans).where(eq(workoutPlans.circleId, session.circleId)),

      // Get members for further queries
      dbRead.query.circleMembers.findMany({
        where: eq(circleMembers.circleId, session.circleId),
        columns: { id: true, name: true },
      }),

      // Cache stats (sync)
      Promise.resolve(getCacheStats()),

      // Snapshot freshness
      dbRead
        .select({
          total: count(),
          fresh: sql<number>`COUNT(*) FILTER (WHERE last_updated > NOW() - INTERVAL '1 hour')`,
          stale: sql<number>`COUNT(*) FILTER (WHERE last_updated <= NOW() - INTERVAL '1 hour')`,
        })
        .from(memberContextSnapshot)
        .catch(() => [{ total: 0, fresh: 0, stale: 0 }]),

      // AI cache stats
      dbRead
        .select({
          total: count(),
          hitCount: sql<number>`COALESCE(SUM(hit_count), 0)`,
          avgHits: sql<number>`COALESCE(AVG(hit_count), 0)`,
        })
        .from(aiResponseCache)
        .catch(() => [{ total: 0, hitCount: 0, avgHits: 0 }]),

      // Recent activity from materialized view (last 7 days)
      dbRead
        .execute(sql`
          SELECT
            COALESCE(SUM(workout_count), 0) as "totalWorkouts",
            COALESCE(SUM(total_sets), 0) as "totalSets",
            COALESCE(SUM(prs_achieved), 0) as "prs"
          FROM mv_member_daily_activity
          WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        `)
        .then((r) => r.rows as Array<{ totalWorkouts: number; totalSets: number; prs: number }>)
        .catch(() => [{ totalWorkouts: 0, totalSets: 0, prs: 0 }]),
    ]);

    const memberIds = members.map((m) => m.id);

    // Get session and goal counts for circle members
    let workoutSessionsCount = { count: 0 };
    let goalsCount = { count: 0 };
    let activeGoalsCount = { count: 0 };

    if (memberIds.length > 0) {
      const [sessions, allGoals, active] = await Promise.all([
        dbRead.select({ count: count() }).from(workoutSessions).where(inArray(workoutSessions.memberId, memberIds)),
        dbRead.select({ count: count() }).from(goals).where(inArray(goals.memberId, memberIds)),
        dbRead.select({ count: count() }).from(goals).where(and(inArray(goals.memberId, memberIds), eq(goals.status, "active"))),
      ]);
      workoutSessionsCount = sessions[0];
      goalsCount = allGoals[0];
      activeGoalsCount = active[0];
    }

    const response: Record<string, unknown> = {
      // Basic stats
      members: membersCount[0].count,
      exercises: exercisesCount[0].count,
      workoutPlans: workoutPlansCount[0].count,
      workoutSessions: workoutSessionsCount.count,
      goals: {
        total: goalsCount.count,
        active: activeGoalsCount.count,
      },

      // Performance stats
      cache: {
        memory: {
          entries: cacheStats.memoryEntries,
          hitRate: (cacheStats.hitRate * 100).toFixed(1) + "%",
          hits: cacheStats.hits,
          misses: cacheStats.misses,
        },
        database: {
          entries: aiCacheStats[0].total,
          totalHits: aiCacheStats[0].hitCount,
          avgHitsPerEntry: Number(aiCacheStats[0].avgHits).toFixed(1),
        },
      },

      // Snapshot freshness
      snapshots: {
        total: snapshotStats[0].total,
        fresh: snapshotStats[0].fresh,
        stale: snapshotStats[0].stale,
        freshnessRate: snapshotStats[0].total > 0
          ? ((snapshotStats[0].fresh / snapshotStats[0].total) * 100).toFixed(1) + "%"
          : "N/A",
      },

      // Recent activity
      last7Days: {
        workouts: recentActivity[0].totalWorkouts,
        sets: recentActivity[0].totalSets,
        prs: recentActivity[0].prs,
      },

      timestamp: new Date().toISOString(),
    };

    // Add detailed member stats if requested
    if (detailed && memberIds.length > 0) {
      const memberStats = await Promise.all(
        members.map(async (m) => {
          const [sessions, activeGoals, snapshot] = await Promise.all([
            dbRead
              .select({ count: count() })
              .from(workoutSessions)
              .where(eq(workoutSessions.memberId, m.id)),
            dbRead
              .select({ count: count() })
              .from(goals)
              .where(and(eq(goals.memberId, m.id), eq(goals.status, "active"))),
            dbRead
              .select({ lastUpdated: memberContextSnapshot.lastUpdated })
              .from(memberContextSnapshot)
              .where(eq(memberContextSnapshot.memberId, m.id))
              .limit(1),
          ]);

          return {
            id: m.id,
            name: m.name,
            workouts: sessions[0].count,
            activeGoals: activeGoals[0].count,
            snapshotAge: snapshot[0]?.lastUpdated
              ? Math.round((Date.now() - snapshot[0].lastUpdated.getTime()) / 60000) + " min"
              : "No snapshot",
          };
        })
      );

      response.memberStats = memberStats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
