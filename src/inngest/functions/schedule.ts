/**
 * Inngest Schedule & Notification Functions
 *
 * Background jobs for workout scheduling, notifications,
 * and member updates that benefit from reliable execution.
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  scheduledWorkouts,
  userProgramSchedules,
  programWorkouts,
  notifications,
  circleMembers,
  memberContextSnapshot,
  goals,
  memberLimitations,
  personalRecords,
  workoutSessions,
  workoutSessionExercises,
  exercises,
} from "@/lib/db/schema";
import { eq, and, asc, gte, sql, desc, isNull, or, inArray } from "drizzle-orm";

/**
 * Auto-Reschedule Missed Workouts
 *
 * Finds missed workouts and reschedules them to the next available
 * preferred day based on user's schedule preferences.
 *
 * This can be a long-running operation for users with many missed workouts.
 */
export const autoRescheduleFunction = inngest.createFunction(
  {
    id: "schedule-auto-reschedule",
    name: "Auto-Reschedule Missed Workouts",
    retries: 2,
  },
  { event: "schedule/auto-reschedule" },
  async ({ event, step, logger }) => {
    const { userId, scheduleId, workoutIds, strategy = "next_available" } = event.data;

    // Step 1: Get missed workouts
    const missedWorkouts = await step.run("get-missed-workouts", async () => {
      let query = db
        .select({
          workout: scheduledWorkouts,
          schedule: userProgramSchedules,
          programWorkout: programWorkouts,
        })
        .from(scheduledWorkouts)
        .innerJoin(userProgramSchedules, eq(scheduledWorkouts.scheduleId, userProgramSchedules.id))
        .innerJoin(programWorkouts, eq(scheduledWorkouts.programWorkoutId, programWorkouts.id))
        .where(
          and(eq(scheduledWorkouts.userId, userId), eq(scheduledWorkouts.status, "missed"))
        )
        .orderBy(asc(programWorkouts.weekNumber), asc(programWorkouts.dayNumber));

      return query;
    });

    if (missedWorkouts.length === 0) {
      return {
        success: true,
        message: "No missed workouts to reschedule",
        rescheduled: [],
      };
    }

    // Step 2: Filter workouts if specific IDs provided
    let workoutsToReschedule = missedWorkouts;
    if (scheduleId) {
      workoutsToReschedule = missedWorkouts.filter((w) => w.schedule.id === scheduleId);
    }
    if (workoutIds && workoutIds.length > 0) {
      workoutsToReschedule = workoutsToReschedule.filter((w) =>
        workoutIds.includes(w.workout.id)
      );
    }

    // Step 3: Group by schedule
    // Note: Using Record type since Inngest serializes step results
    type WorkoutEntry = (typeof workoutsToReschedule)[number];
    const workoutsBySchedule = new Map<string, WorkoutEntry[]>();

    for (const workout of workoutsToReschedule) {
      const key = workout.schedule.id;
      if (!workoutsBySchedule.has(key)) {
        workoutsBySchedule.set(key, []);
      }
      workoutsBySchedule.get(key)!.push(workout);
    }

    const rescheduled: Array<{
      workoutId: string;
      workoutName: string;
      oldDate: string;
      newDate: string;
    }> = [];

    // Step 4: Process each schedule
    for (const [schId, scheduleWorkouts] of workoutsBySchedule) {
      const result = await step.run(`reschedule-${schId}`, async () => {
        const schedule = scheduleWorkouts[0].schedule;
        const preferredDays = schedule.preferredDays as number[];
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        // Skip if auto-reschedule is disabled
        if (!schedule.autoReschedule) {
          return [];
        }

        // Get existing scheduled workouts
        const existingScheduled = await db.query.scheduledWorkouts.findMany({
          where: and(
            eq(scheduledWorkouts.scheduleId, schId),
            eq(scheduledWorkouts.status, "scheduled"),
            gte(scheduledWorkouts.scheduledDate, todayStr)
          ),
          orderBy: [asc(scheduledWorkouts.scheduledDate)],
        });

        const existingDates = new Set(existingScheduled.map((w) => w.scheduledDate));

        // Helper to find next available date
        const findNextAvailableDate = (from: Date, maxDaysAhead: number = 14): string | null => {
          const maxDate = new Date(from);
          maxDate.setDate(maxDate.getDate() + maxDaysAhead);
          const current = new Date(from);
          current.setDate(current.getDate() + 1);

          while (current <= maxDate) {
            if (preferredDays.includes(current.getDay())) {
              const dateStr = current.toISOString().split("T")[0];
              if (!existingDates.has(dateStr)) {
                return dateStr;
              }
            }
            current.setDate(current.getDate() + 1);
          }
          return null;
        };

        const scheduleRescheduled: typeof rescheduled = [];
        let lastUsedDate = new Date();

        for (const { workout, programWorkout } of scheduleWorkouts) {
          const newDate = findNextAvailableDate(
            lastUsedDate,
            schedule.rescheduleWindowDays * 7
          );

          if (newDate) {
            await db
              .update(scheduledWorkouts)
              .set({
                scheduledDate: newDate,
                status: "scheduled",
                rescheduledFrom: workout.scheduledDate,
                rescheduledCount: (workout.rescheduledCount || 0) + 1,
                rescheduledReason: "Auto-rescheduled from missed workout",
                originalDate: workout.originalDate || workout.scheduledDate,
                updatedAt: new Date(),
              })
              .where(eq(scheduledWorkouts.id, workout.id));

            existingDates.add(newDate);
            lastUsedDate = new Date(newDate);

            scheduleRescheduled.push({
              workoutId: workout.id,
              workoutName: programWorkout.name,
              oldDate: workout.scheduledDate,
              newDate,
            });
          }
        }

        return scheduleRescheduled;
      });

      rescheduled.push(...result);
    }

    logger.info("Auto-reschedule completed", {
      userId,
      totalRescheduled: rescheduled.length,
      strategy,
    });

    return {
      success: true,
      rescheduled,
      totalRescheduled: rescheduled.length,
      strategy,
    };
  }
);

/**
 * Check for Missed Workouts
 *
 * Runs daily to identify missed workouts and optionally trigger auto-reschedule.
 */
export const missedWorkoutCheckCron = inngest.createFunction(
  {
    id: "cron-missed-workout-check",
    name: "Check for Missed Workouts",
    retries: 2,
  },
  { cron: "0 6 * * *" }, // 6 AM daily
  async ({ step, logger }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Find all workouts that were scheduled for yesterday but not completed
    const missedWorkouts = await step.run("find-missed-workouts", async () => {
      const result = await db.execute(sql`
        UPDATE scheduled_workouts
        SET status = 'missed'
        WHERE scheduled_date = ${yesterdayStr}
        AND status = 'scheduled'
        RETURNING id, user_id
      `);

      // Raw SQL result has rows property
      const rows = (result as unknown as { rows: Array<{ id: string; user_id: string }> }).rows;
      return rows || [];
    });

    logger.info("Marked missed workouts", { count: missedWorkouts.length });

    // Trigger auto-reschedule for each user with missed workouts
    const userIds = [...new Set(missedWorkouts.map((w) => w.user_id))];

    for (const userId of userIds) {
      await step.sendEvent(`trigger-reschedule-${userId}`, {
        name: "schedule/auto-reschedule",
        data: {
          userId,
          strategy: "next_available",
        },
      });
    }

    return {
      success: true,
      missedCount: missedWorkouts.length,
      usersNotified: userIds.length,
    };
  }
);

/**
 * Send Notification (Generic)
 *
 * Creates and sends notifications to users.
 */
export const goalAchievedNotification = inngest.createFunction(
  {
    id: "notification-goal-achieved",
    name: "Goal Achievement Notification",
    retries: 2,
  },
  { event: "notification/goal-achieved" },
  async ({ event, step, logger }) => {
    const { userId, memberId, goalId, goalTitle } = event.data;

    // Create in-app notification
    await step.run("create-notification", async () => {
      await db.insert(notifications).values({
        userId,
        type: "achievement",
        title: "Goal Achieved! 🎉",
        body: `Congratulations! You've achieved your goal: ${goalTitle}`,
        data: { goalId, memberId },
        createdAt: new Date(),
      });
    });

    // TODO: Send push notification if user has enabled them

    logger.info("Goal achievement notification sent", { userId, goalId });

    return { success: true };
  }
);

/**
 * Streak Milestone Notification
 */
export const streakMilestoneNotification = inngest.createFunction(
  {
    id: "notification-streak-milestone",
    name: "Streak Milestone Notification",
    retries: 2,
  },
  { event: "notification/streak-milestone" },
  async ({ event, step, logger }) => {
    const { userId, memberId, streakDays } = event.data;

    const milestoneMessages: Record<number, string> = {
      7: "One week strong! 💪",
      14: "Two weeks of consistency!",
      30: "A whole month! You're on fire! 🔥",
      50: "50 days! Incredible dedication!",
      100: "100 days! You're a legend! 🏆",
      365: "ONE YEAR! You're unstoppable! 🌟",
    };

    const message = milestoneMessages[streakDays];
    if (!message) {
      return { success: true, skipped: true, reason: "Not a milestone" };
    }

    await step.run("create-notification", async () => {
      await db.insert(notifications).values({
        userId,
        type: "streak",
        title: `${streakDays}-Day Streak!`,
        body: message,
        data: { streakDays, memberId },
        createdAt: new Date(),
      });
    });

    logger.info("Streak milestone notification sent", { userId, streakDays });

    return { success: true };
  }
);

/**
 * Update Member Snapshot (On-Demand)
 *
 * Updates a single member's context snapshot.
 * Useful after significant changes like completing a workout or achieving a goal.
 */
export const updateMemberSnapshotFunction = inngest.createFunction(
  {
    id: "member-snapshot-update",
    name: "Update Member Snapshot",
    retries: 2,
    concurrency: {
      limit: 10,
    },
  },
  { event: "member/snapshot-update" },
  async ({ event, step, logger }) => {
    const { memberId } = event.data;

    await step.run("update-snapshot", async () => {
      // This duplicates logic from cron.ts - in production you'd extract to a shared function
      const [memberGoals, limitations, memberPRs, recentWorkouts] = await Promise.all([
        db
          .select()
          .from(goals)
          .where(and(eq(goals.memberId, memberId), eq(goals.status, "active")))
          .limit(10),
        db
          .select()
          .from(memberLimitations)
          .where(and(eq(memberLimitations.memberId, memberId), eq(memberLimitations.active, true))),
        db
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
        db
          .select()
          .from(workoutSessions)
          .where(eq(workoutSessions.memberId, memberId))
          .orderBy(desc(workoutSessions.date))
          .limit(14),
      ]);

      const weeklyWorkoutAvg =
        recentWorkouts.filter(
          (w) =>
            w.status === "completed" &&
            new Date(w.date) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        ).length / 2;

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
          muscleRecoveryStatus: {},
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
            weeklyWorkoutAvg: sql`EXCLUDED.weekly_workout_avg`,
            lastWorkoutDate: sql`EXCLUDED.last_workout_date`,
            lastUpdated: new Date(),
            snapshotVersion: sql`${memberContextSnapshot.snapshotVersion} + 1`,
          },
        });
    });

    logger.info("Member snapshot updated", { memberId });

    return { success: true, memberId };
  }
);

/**
 * Export all schedule/notification functions
 */
export const scheduleFunctions = [
  autoRescheduleFunction,
  missedWorkoutCheckCron,
  goalAchievedNotification,
  streakMilestoneNotification,
  updateMemberSnapshotFunction,
];
