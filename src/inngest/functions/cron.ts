/**
 * Inngest Cron Functions
 *
 * Background jobs that run on schedules, replacing Vercel Cron jobs.
 * Benefits:
 * - No timeout limits (up to hours vs 10 min)
 * - Built-in retries and error handling
 * - Observability and logging
 * - Easier local development
 */

import { inngest } from "../client";
import { db, dbRead } from "@/lib/db";
import {
  coachMessages,
  coachConversations,
  messages,
  activityFeed,
  notifications,
  aiResponseCache,
  circleMembers,
  memberContextSnapshot,
  goals,
  memberLimitations,
  personalRecords,
  workoutSessions,
  workoutSessionExercises,
  exercises,
} from "@/lib/db/schema";
import { sql, lt, and, eq, isNull, or, inArray, desc } from "drizzle-orm";
import { calculateStreak } from "@/lib/streak";
import { clearExpiredCache } from "@/lib/ai/cache";

// Retention periods in days
const RETENTION_PERIODS = {
  COACH_MESSAGES: 90,
  DIRECT_MESSAGES: 365,
  ACTIVITY_FEED: 730, // 2 years
  NOTIFICATIONS: 90,
} as const;

function getRetentionDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Data Retention Cron - GDPR/CCPA Compliance
 *
 * Runs daily at 4 AM to enforce data retention policies.
 * Deletes old messages, notifications, and activity feed entries.
 */
export const dataRetentionCron = inngest.createFunction(
  {
    id: "cron-data-retention",
    name: "Data Retention Cleanup (GDPR)",
    retries: 3,
  },
  { cron: "0 4 * * *" }, // 4 AM daily
  async ({ step, logger }) => {
    const results: Record<string, { deleted: number; error?: string }> = {};

    // Step 1: Clean up old coach messages
    const coachResult = await step.run("clean-coach-messages", async () => {
      try {
        const cutoffDate = getRetentionDate(RETENTION_PERIODS.COACH_MESSAGES);
        const deleted = await db
          .delete(coachMessages)
          .where(lt(coachMessages.createdAt, cutoffDate))
          .returning({ id: coachMessages.id });
        return { deleted: deleted.length };
      } catch (error) {
        logger.error("Failed to clean coach messages", { error });
        return { deleted: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });
    results.coachMessages = coachResult;

    // Step 2: Clean up empty coach conversations
    const convResult = await step.run("clean-empty-conversations", async () => {
      try {
        const emptyConversations = await db.execute(sql`
          DELETE FROM coach_conversations c
          WHERE NOT EXISTS (
            SELECT 1 FROM coach_messages m WHERE m.conversation_id = c.id
          )
          AND c.updated_at < ${getRetentionDate(RETENTION_PERIODS.COACH_MESSAGES)}
          RETURNING c.id
        `);
        return { deleted: (emptyConversations as { rows: unknown[] }).rows?.length || 0 };
      } catch (error) {
        logger.error("Failed to clean empty conversations", { error });
        return { deleted: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });
    results.emptyConversations = convResult;

    // Step 3: Clean up old direct messages
    const dmResult = await step.run("clean-direct-messages", async () => {
      try {
        const cutoffDate = getRetentionDate(RETENTION_PERIODS.DIRECT_MESSAGES);
        const deleted = await db
          .delete(messages)
          .where(lt(messages.createdAt, cutoffDate))
          .returning({ id: messages.id });
        return { deleted: deleted.length };
      } catch (error) {
        logger.error("Failed to clean direct messages", { error });
        return { deleted: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });
    results.directMessages = dmResult;

    // Step 4: Clean up old activity feed
    const activityResult = await step.run("clean-activity-feed", async () => {
      try {
        const cutoffDate = getRetentionDate(RETENTION_PERIODS.ACTIVITY_FEED);
        const deleted = await db
          .delete(activityFeed)
          .where(lt(activityFeed.createdAt, cutoffDate))
          .returning({ id: activityFeed.id });
        return { deleted: deleted.length };
      } catch (error) {
        logger.error("Failed to clean activity feed", { error });
        return { deleted: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });
    results.activityFeed = activityResult;

    // Step 5: Clean up old notifications
    const notifResult = await step.run("clean-notifications", async () => {
      try {
        const cutoffDate = getRetentionDate(RETENTION_PERIODS.NOTIFICATIONS);
        const deleted = await db
          .delete(notifications)
          .where(lt(notifications.createdAt, cutoffDate))
          .returning({ id: notifications.id });
        return { deleted: deleted.length };
      } catch (error) {
        logger.error("Failed to clean notifications", { error });
        return { deleted: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });
    results.notifications = notifResult;

    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);

    logger.info("Data retention completed", {
      totalDeleted,
      results,
    });

    return {
      success: true,
      totalDeleted,
      results,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Member Snapshots Refresh Cron
 *
 * Runs every 15 minutes to keep member context snapshots fresh.
 * Critical for fast AI context loading.
 */
export const snapshotsRefreshCron = inngest.createFunction(
  {
    id: "cron-snapshots-refresh",
    name: "Refresh Member Snapshots",
    retries: 2,
    concurrency: {
      limit: 1, // Only one instance at a time
    },
  },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step, logger }) => {
    // Step 1: Find stale members
    const staleMembers = await step.run("find-stale-members", async () => {
      return dbRead
        .select({ id: circleMembers.id, name: circleMembers.name })
        .from(circleMembers)
        .leftJoin(memberContextSnapshot, eq(circleMembers.id, memberContextSnapshot.memberId))
        .where(
          or(
            isNull(memberContextSnapshot.memberId),
            sql`${memberContextSnapshot.lastUpdated} < NOW() - INTERVAL '30 minutes'`
          )
        )
        .limit(50); // Process in batches
    });

    if (staleMembers.length === 0) {
      logger.info("No stale snapshots to update");
      return { updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    // Process each member in parallel batches
    const batchSize = 10;
    for (let i = 0; i < staleMembers.length; i += batchSize) {
      const batch = staleMembers.slice(i, i + batchSize);

      const results = await step.run(`update-batch-${i}`, async () => {
        const batchResults = await Promise.allSettled(
          batch.map((member) => updateMemberSnapshot(member.id))
        );

        return batchResults.map((r, idx) => ({
          memberId: batch[idx].id,
          success: r.status === "fulfilled",
          error: r.status === "rejected" ? r.reason?.message : undefined,
        }));
      });

      for (const result of results) {
        if (result.success) {
          updated++;
        } else {
          errors++;
          logger.warn("Failed to update snapshot", { memberId: result.memberId, error: result.error });
        }
      }
    }

    logger.info("Snapshots refresh completed", { updated, errors, total: staleMembers.length });

    return {
      success: true,
      updated,
      errors,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Cache Cleanup Cron
 *
 * Runs daily at 3 AM to clean up expired cache entries.
 */
export const cacheCleanupCron = inngest.createFunction(
  {
    id: "cron-cache-cleanup",
    name: "Cache Cleanup",
    retries: 2,
  },
  { cron: "0 3 * * *" }, // 3 AM daily
  async ({ step, logger }) => {
    const results = {
      aiCache: { deleted: 0, error: null as string | null },
      memoryCache: { cleared: false, error: null as string | null },
      abandonedSessions: { updated: 0, error: null as string | null },
    };

    // Step 1: Clean AI response cache
    results.aiCache = await step.run("clean-ai-cache", async () => {
      try {
        const deleted = await db
          .delete(aiResponseCache)
          .where(lt(aiResponseCache.expiresAt, new Date()))
          .returning({ id: aiResponseCache.id });
        return { deleted: deleted.length, error: null };
      } catch (error) {
        return { deleted: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });

    // Step 2: Clear in-memory cache
    results.memoryCache = await step.run("clear-memory-cache", async () => {
      try {
        clearExpiredCache();
        return { cleared: true, error: null };
      } catch (error) {
        return { cleared: false, error: error instanceof Error ? error.message : "Unknown" };
      }
    });

    // Step 3: Mark abandoned workout sessions
    results.abandonedSessions = await step.run("mark-abandoned-sessions", async () => {
      try {
        const result = await db.execute(sql`
          UPDATE workout_sessions
          SET status = 'abandoned'
          WHERE status = 'in_progress'
          AND started_at < NOW() - INTERVAL '24 hours'
        `);
        return { updated: (result as { rowCount?: number }).rowCount || 0, error: null };
      } catch (error) {
        return { updated: 0, error: error instanceof Error ? error.message : "Unknown" };
      }
    });

    logger.info("Cache cleanup completed", { results });

    return {
      success: true,
      results,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Materialized Views Refresh Cron
 *
 * Runs daily at 1 AM to refresh analytics materialized views.
 */
export const aggregateRefreshCron = inngest.createFunction(
  {
    id: "cron-aggregate-refresh",
    name: "Refresh Materialized Views",
    retries: 2,
  },
  { cron: "0 1 * * *" }, // 1 AM daily
  async ({ step, logger }) => {
    const results = {
      dailyActivityView: { refreshed: false, error: null as string | null },
      weeklySummaryView: { refreshed: false, error: null as string | null },
    };

    // Step 1: Refresh daily activity view
    results.dailyActivityView = await step.run("refresh-daily-activity", async () => {
      try {
        // Try concurrent refresh first
        try {
          await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_daily_activity`);
        } catch {
          // Fall back to regular refresh if concurrent fails
          await db.execute(sql`REFRESH MATERIALIZED VIEW mv_member_daily_activity`);
        }
        return { refreshed: true, error: null };
      } catch (error) {
        return { refreshed: false, error: error instanceof Error ? error.message : "Unknown" };
      }
    });

    // Step 2: Refresh weekly summary view
    results.weeklySummaryView = await step.run("refresh-weekly-summary", async () => {
      try {
        try {
          await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_weekly_summary`);
        } catch {
          await db.execute(sql`REFRESH MATERIALIZED VIEW mv_member_weekly_summary`);
        }
        return { refreshed: true, error: null };
      } catch (error) {
        return { refreshed: false, error: error instanceof Error ? error.message : "Unknown" };
      }
    });

    logger.info("Aggregate refresh completed", { results });

    return {
      success: results.dailyActivityView.refreshed || results.weeklySummaryView.refreshed,
      results,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Helper function to update a single member's snapshot
 */
async function updateMemberSnapshot(memberId: string): Promise<void> {
  // Parallel fetch all data needed for snapshot
  const [memberGoals, limitations, memberPRs, recentWorkouts] = await Promise.all([
    dbRead
      .select()
      .from(goals)
      .where(and(eq(goals.memberId, memberId), eq(goals.status, "active")))
      .limit(10),
    dbRead
      .select()
      .from(memberLimitations)
      .where(and(eq(memberLimitations.memberId, memberId), eq(memberLimitations.active, true))),
    dbRead
      .select({
        id: personalRecords.id,
        value: personalRecords.value,
        unit: personalRecords.unit,
        repMax: personalRecords.repMax,
        date: personalRecords.date,
        exerciseName: exercises.name,
      })
      .from(personalRecords)
      .leftJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
      .where(eq(personalRecords.memberId, memberId))
      .orderBy(desc(personalRecords.date))
      .limit(20),
    dbRead
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.memberId, memberId))
      .orderBy(desc(workoutSessions.date))
      .limit(14),
  ]);

  // Get muscle groups worked from recent workouts
  const workoutIds = recentWorkouts
    .filter((w) => w.status === "completed" && w.endTime)
    .slice(0, 7)
    .map((w) => w.id);

  let muscleRecoveryStatus: Record<string, { status: string; hoursSinceWorked: number; readyToTrain: boolean }> = {};

  if (workoutIds.length > 0) {
    const sessionExercises = await dbRead
      .select({
        sessionId: workoutSessionExercises.sessionId,
        muscleGroups: exercises.muscleGroups,
      })
      .from(workoutSessionExercises)
      .leftJoin(exercises, eq(workoutSessionExercises.exerciseId, exercises.id))
      .where(inArray(workoutSessionExercises.sessionId, workoutIds));

    const workoutActivity = recentWorkouts
      .filter((w) => w.status === "completed" && w.endTime)
      .slice(0, 7)
      .map((w) => {
        const exercisesInSession = sessionExercises.filter((e) => e.sessionId === w.id);
        const muscleGroups = new Set<string>();
        exercisesInSession.forEach((e) => {
          ((e.muscleGroups as string[]) || []).forEach((g) => muscleGroups.add(g));
        });
        return {
          date: w.endTime!,
          muscleGroupsWorked: Array.from(muscleGroups),
        };
      });

    muscleRecoveryStatus = calculateMuscleRecovery(workoutActivity);
  } else {
    muscleRecoveryStatus = calculateMuscleRecovery([]);
  }

  const weeklyWorkoutAvg =
    recentWorkouts.filter(
      (w) =>
        w.status === "completed" &&
        new Date(w.date) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    ).length / 2;

  // Calculate workout streak from completed sessions
  const completedDates = recentWorkouts
    .filter((w) => w.status === "completed")
    .map((w) => w.date);
  const streakData = calculateStreak(completedDates);

  // Get existing longest streak to preserve it
  const existingSnapshot = await dbRead.query.memberContextSnapshot.findFirst({
    where: eq(memberContextSnapshot.memberId, memberId),
    columns: { longestStreak: true },
  });
  const longestStreak = Math.max(
    streakData.longest,
    existingSnapshot?.longestStreak ?? 0
  );

  // Upsert snapshot
  await db
    .insert(memberContextSnapshot)
    .values({
      memberId,
      activeGoals: memberGoals.map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        targetValue: g.targetValue || 0,
        currentValue: g.currentValue || 0,
        progressPercent: g.targetValue ? ((g.currentValue || 0) / g.targetValue) * 100 : 0,
        targetDate: g.targetDate?.toISOString() || "",
      })),
      activeLimitations: limitations.map((l) => ({
        type: l.type,
        description: l.description,
        severity: l.severity || "moderate",
        affectedAreas: (l.affectedAreas as string[]) || [],
      })),
      personalRecords: memberPRs.map((pr) => ({
        exercise: pr.exerciseName || "Unknown",
        value: pr.value,
        unit: pr.unit,
        repMax: pr.repMax || undefined,
        date: pr.date?.toISOString() || "",
      })),
      muscleRecoveryStatus,
      weeklyWorkoutAvg: weeklyWorkoutAvg.toString(),
      currentStreak: streakData.current,
      longestStreak,
      lastWorkoutDate: recentWorkouts[0]?.endTime || null,
      lastUpdated: new Date(),
      snapshotVersion: 1,
    })
    .onConflictDoUpdate({
      target: memberContextSnapshot.memberId,
      set: {
        activeGoals: sql`EXCLUDED.active_goals`,
        activeLimitations: sql`EXCLUDED.active_limitations`,
        personalRecords: sql`EXCLUDED.personal_records`,
        muscleRecoveryStatus: sql`EXCLUDED.muscle_recovery_status`,
        weeklyWorkoutAvg: sql`EXCLUDED.weekly_workout_avg`,
        currentStreak: sql`EXCLUDED.current_streak`,
        longestStreak: sql`EXCLUDED.longest_streak`,
        lastWorkoutDate: sql`EXCLUDED.last_workout_date`,
        lastUpdated: new Date(),
        snapshotVersion: sql`${memberContextSnapshot.snapshotVersion} + 1`,
      },
    });
}

function calculateMuscleRecovery(
  workoutActivity: Array<{ date: Date; muscleGroupsWorked: string[] }>
): Record<string, { status: string; hoursSinceWorked: number; readyToTrain: boolean }> {
  const now = new Date();
  const muscleLastWorked: Record<string, Date> = {};

  const recoveryHours: Record<string, number> = {
    chest: 48,
    back: 48,
    shoulders: 48,
    biceps: 36,
    triceps: 36,
    quadriceps: 72,
    hamstrings: 72,
    glutes: 48,
    calves: 36,
    core: 24,
  };

  for (const activity of workoutActivity) {
    for (const muscle of activity.muscleGroupsWorked || []) {
      const lowerMuscle = muscle.toLowerCase();
      if (!muscleLastWorked[lowerMuscle] || activity.date > muscleLastWorked[lowerMuscle]) {
        muscleLastWorked[lowerMuscle] = activity.date;
      }
    }
  }

  const result: Record<string, { status: string; hoursSinceWorked: number; readyToTrain: boolean }> = {};

  for (const [muscle, requiredHours] of Object.entries(recoveryHours)) {
    const lastWorked = muscleLastWorked[muscle];

    if (!lastWorked) {
      result[muscle] = { status: "ready", hoursSinceWorked: Infinity, readyToTrain: true };
    } else {
      const hoursSince = Math.floor((now.getTime() - lastWorked.getTime()) / (1000 * 60 * 60));
      const readyToTrain = hoursSince >= requiredHours;

      let status: string;
      if (hoursSince >= requiredHours) {
        status = "ready";
      } else if (hoursSince >= requiredHours * 0.75) {
        status = "recovering";
      } else {
        status = "fatigued";
      }

      result[muscle] = { status, hoursSinceWorked: hoursSince, readyToTrain };
    }
  }

  return result;
}

/**
 * Batch Member Snapshot Update
 *
 * Processes an array of member IDs in batches of 10.
 * Triggered by triggerBatchSnapshotUpdate() from application code.
 */
export const batchSnapshotUpdateFunction = inngest.createFunction(
  {
    id: "member-batch-snapshot-update",
    name: "Batch Member Snapshot Update",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "member/batch-snapshot-update" },
  async ({ event, step, logger }) => {
    const { memberIds } = event.data;

    if (!memberIds || memberIds.length === 0) {
      return { success: true, updated: 0, errors: 0, message: "No member IDs provided" };
    }

    logger.info("Starting batch snapshot update", { count: memberIds.length });

    let updated = 0;
    let errors = 0;

    const batchSize = 10;
    for (let i = 0; i < memberIds.length; i += batchSize) {
      const batch = memberIds.slice(i, i + batchSize);

      const results = await step.run(`update-batch-${i}`, async () => {
        const batchResults = await Promise.allSettled(
          batch.map((memberId: string) => updateMemberSnapshot(memberId))
        );

        return batchResults.map((r, idx) => ({
          memberId: batch[idx],
          success: r.status === "fulfilled",
          error: r.status === "rejected" ? (r.reason as Error)?.message : undefined,
        }));
      });

      for (const result of results) {
        if (result.success) {
          updated++;
        } else {
          errors++;
          logger.warn("Failed to update snapshot in batch", {
            memberId: result.memberId,
            error: result.error,
          });
        }
      }
    }

    logger.info("Batch snapshot update completed", { updated, errors, total: memberIds.length });

    return { success: true, updated, errors, total: memberIds.length };
  }
);

/**
 * Export all cron functions for registration
 */
export const cronFunctions = [
  dataRetentionCron,
  snapshotsRefreshCron,
  cacheCleanupCron,
  aggregateRefreshCron,
  batchSnapshotUpdateFunction,
];
