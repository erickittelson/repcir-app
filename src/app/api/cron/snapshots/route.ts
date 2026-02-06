/**
 * Cron Job: Update Member Snapshots
 *
 * Runs every 15 minutes to keep member context snapshots fresh
 * Vercel Cron: 0,15,30,45 * * * *
 */

import { NextResponse } from "next/server";
import { db, dbRead } from "@/lib/db";
import {
  circleMembers,
  goals,
  memberLimitations,
  personalRecords,
  workoutSessions,
  workoutSessionExercises,
  exercises,
  memberContextSnapshot,
} from "@/lib/db/schema";
import { eq, sql, desc, and, gte, isNull, or, inArray } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

// Rate limiting for cron endpoints (per-endpoint, 1 request per 2 minutes)
const cronRateLimitStore = new Map<string, number>();
const CRON_RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes

// Verify cron secret and apply additional security checks
function verifyCronRequest(request: Request): { valid: boolean; error?: string } {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Require CRON_SECRET in production for security
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET not configured in production");
      return { valid: false, error: "CRON_SECRET not configured" };
    }
    // Allow in development for testing, but log warning
    console.warn("CRON_SECRET not set - cron endpoint accessible without auth in dev");
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return { valid: false, error: "Invalid authorization" };
  }

  // Rate limiting: Prevent rapid repeated calls
  const endpoint = "snapshots";
  const lastCall = cronRateLimitStore.get(endpoint);
  const now = Date.now();

  if (lastCall && now - lastCall < CRON_RATE_LIMIT_MS) {
    const waitSeconds = Math.ceil((CRON_RATE_LIMIT_MS - (now - lastCall)) / 1000);
    return { valid: false, error: `Rate limited. Retry in ${waitSeconds}s` };
  }
  cronRateLimitStore.set(endpoint, now);

  // Verify request is fresh (within 5 minutes) to prevent replay attacks
  const requestTime = request.headers.get("x-vercel-cron-time");
  if (requestTime) {
    const timeDiff = Math.abs(now - parseInt(requestTime, 10));
    if (timeDiff > 5 * 60 * 1000) {
      return { valid: false, error: "Request timestamp too old" };
    }
  }

  return { valid: true };
}

export async function GET(request: Request) {
  const cronAuth = verifyCronRequest(request);
  if (!cronAuth.valid) {
    const status = cronAuth.error?.includes("Rate limited") ? 429 : 401;
    return NextResponse.json({ error: cronAuth.error || "Unauthorized" }, { status });
  }

  const start = performance.now();
  let updated = 0;
  let errors = 0;

  try {
    // Find members with stale snapshots (older than 30 minutes) or no snapshot
    const staleMembers = await dbRead
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

    for (const member of staleMembers) {
      try {
        await updateMemberSnapshot(member.id);
        updated++;
      } catch (error) {
        console.error(`Failed to update snapshot for ${member.id}:`, error);
        errors++;
      }
    }

    const elapsed = Math.round(performance.now() - start);

    return NextResponse.json({
      success: true,
      updated,
      errors,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Snapshot cron failed:", error);
    return NextResponse.json(
      { error: "Snapshot update failed", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

async function updateMemberSnapshot(memberId: string): Promise<void> {
  // Parallel fetch all data needed for snapshot
  const [
    memberGoals,
    limitations,
    memberPRs,
    recentWorkouts,
  ] = await Promise.all([
    // Active goals
    dbRead
      .select()
      .from(goals)
      .where(and(eq(goals.memberId, memberId), eq(goals.status, "active")))
      .limit(10),

    // Active limitations
    dbRead
      .select()
      .from(memberLimitations)
      .where(and(eq(memberLimitations.memberId, memberId), eq(memberLimitations.active, true))),

    // Recent PRs with exercise info
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

    // Recent workouts
    dbRead
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.memberId, memberId))
      .orderBy(desc(workoutSessions.date))
      .limit(14),
  ]);

  // Get muscle groups worked from recent workouts for recovery calculation
  const workoutIds = recentWorkouts
    .filter((w) => w.status === "completed" && w.endTime)
    .slice(0, 7)
    .map((w) => w.id);

  let muscleRecoveryStatus: Record<string, { status: string; hoursSinceWorked: number; readyToTrain: boolean }> = {};

  if (workoutIds.length > 0) {
    // Get exercises from recent workouts to determine muscle groups
    const sessionExercises = await dbRead
      .select({
        sessionId: workoutSessionExercises.sessionId,
        exerciseId: workoutSessionExercises.exerciseId,
        muscleGroups: exercises.muscleGroups,
      })
      .from(workoutSessionExercises)
      .leftJoin(exercises, eq(workoutSessionExercises.exerciseId, exercises.id))
      .where(inArray(workoutSessionExercises.sessionId, workoutIds));

    // Build workout activity from session exercises
    const workoutActivity = recentWorkouts
      .filter((w) => w.status === "completed" && w.endTime)
      .slice(0, 7)
      .map((w) => {
        const exercisesInSession = sessionExercises.filter((e) => e.sessionId === w.id);
        const muscleGroups = new Set<string>();
        exercisesInSession.forEach((e) => {
          const groups = (e.muscleGroups as string[]) || [];
          groups.forEach((g) => muscleGroups.add(g));
        });
        return {
          date: w.endTime!,
          muscleGroupsWorked: Array.from(muscleGroups),
        };
      });

    muscleRecoveryStatus = calculateMuscleRecovery(workoutActivity);
  } else {
    // No recent workouts, all muscles are ready
    muscleRecoveryStatus = calculateMuscleRecovery([]);
  }

  // Calculate weekly workout average
  const weeklyWorkoutAvg = recentWorkouts.filter(
    (w) => w.status === "completed" &&
    new Date(w.date) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  ).length / 2;

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

  // Recovery hours by muscle group
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
    const muscles = activity.muscleGroupsWorked || [];
    const date = activity.date;

    for (const muscle of muscles) {
      const lowerMuscle = muscle.toLowerCase();
      if (!muscleLastWorked[lowerMuscle] || date > muscleLastWorked[lowerMuscle]) {
        muscleLastWorked[lowerMuscle] = date;
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
