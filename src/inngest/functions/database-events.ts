/**
 * Inngest Database Event Handlers
 *
 * These functions are triggered automatically by Postgres CDC events
 * from the Neon integration. No manual event sending required.
 *
 * Events flow: Neon DB Change → Logical Replication → Inngest → Function
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  notifications,
  circleMembers,
  memberContextSnapshot,
  memberEmbeddings,
  goals,
  exercises,
  personalRecords,
  workoutSessions,
  memberLimitations,
  challengeParticipants,
  challenges,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { calculateStreak, STREAK_MILESTONES } from "@/lib/streak";

// ===========================================
// Goal Events
// ===========================================

/**
 * Handle goal completion - send achievement notification
 *
 * Triggered when: goals.status changes to 'completed'
 */
export const onGoalCompleted = inngest.createFunction(
  {
    id: "db-goal-completed",
    name: "Goal Completed (DB Trigger)",
    retries: 2,
  },
  { event: "pg/goals.updated" },
  async ({ event, step, logger }) => {
    const { new: newRow, old: oldRow } = event.data;

    // Only process if status changed to 'completed'
    if (newRow.status !== "completed" || oldRow.status === "completed") {
      return { skipped: true, reason: "Status not changed to completed" };
    }

    logger.info("Goal completed", { goalId: newRow.id, title: newRow.title });

    // Get member details to find userId
    const member = await step.run("get-member", async () => {
      return db.query.circleMembers.findFirst({
        where: eq(circleMembers.id, newRow.member_id),
      });
    });

    if (!member?.userId) {
      return { skipped: true, reason: "Member has no userId" };
    }

    // Create achievement notification
    await step.run("create-notification", async () => {
      await db.insert(notifications).values({
        userId: member.userId!,
        type: "achievement",
        title: "Goal Achieved! 🎉",
        body: `Congratulations! You've achieved your goal: ${newRow.title}`,
        data: { goalId: newRow.id, memberId: newRow.member_id },
        createdAt: new Date(),
      });
    });

    // Update member snapshot
    await step.sendEvent("trigger-snapshot-update", {
      name: "member/snapshot-update",
      data: { memberId: newRow.member_id },
    });

    return { success: true, goalId: newRow.id };
  }
);

/**
 * Handle new goal created - generate milestones
 */
export const onGoalCreated = inngest.createFunction(
  {
    id: "db-goal-created",
    name: "Goal Created (DB Trigger)",
    retries: 2,
  },
  { event: "pg/goals.inserted" },
  async ({ event, step, logger }) => {
    const { new: newRow } = event.data;

    logger.info("New goal created", { goalId: newRow.id, title: newRow.title });

    // Get member details
    const member = await step.run("get-member", async () => {
      return db.query.circleMembers.findFirst({
        where: eq(circleMembers.id, newRow.member_id),
      });
    });

    if (!member) {
      return { skipped: true, reason: "Member not found" };
    }

    // Trigger milestone generation if goal has a target
    if (newRow.target_value && member.userId) {
      await step.sendEvent("trigger-milestones", {
        name: "ai/generate-milestones",
        data: {
          userId: member.userId,
          circleId: member.circleId,
          memberId: newRow.member_id,
          goalId: newRow.id,
        },
      });
    }

    return { success: true, goalId: newRow.id };
  }
);

// ===========================================
// Workout Session Events
// ===========================================

/**
 * Handle workout completed - update member snapshot
 *
 * Triggered when: workout_sessions.status changes to 'completed'
 */
export const onWorkoutCompleted = inngest.createFunction(
  {
    id: "db-workout-completed",
    name: "Workout Completed (DB Trigger)",
    retries: 2,
    // Debounce to avoid multiple updates for rapid changes
    debounce: {
      key: "event.data.new.member_id",
      period: "30s",
    },
  },
  { event: "pg/workout_sessions.updated" },
  async ({ event, step, logger }) => {
    const { new: newRow, old: oldRow } = event.data;

    // Only process if status changed to 'completed'
    if (newRow.status !== "completed" || oldRow.status === "completed") {
      return { skipped: true, reason: "Status not changed to completed" };
    }

    logger.info("Workout completed", {
      sessionId: newRow.id,
      memberId: newRow.member_id,
      name: newRow.name,
    });

    // Get member details
    const member = await step.run("get-member", async () => {
      return db.query.circleMembers.findFirst({
        where: eq(circleMembers.id, newRow.member_id),
      });
    });

    if (!member) {
      return { skipped: true, reason: "Member not found" };
    }

    // Update member snapshot (includes muscle recovery, workout stats)
    await step.sendEvent("trigger-snapshot-update", {
      name: "member/snapshot-update",
      data: { memberId: newRow.member_id },
    });

    // Check for streak milestones and persist to snapshot
    if (member.userId) {
      const streakInfo = await step.run("check-streak", async () => {
        const recentWorkouts = await db
          .select({ date: workoutSessions.date })
          .from(workoutSessions)
          .where(
            and(
              eq(workoutSessions.memberId, newRow.member_id),
              eq(workoutSessions.status, "completed")
            )
          )
          .orderBy(desc(workoutSessions.date))
          .limit(400);

        if (recentWorkouts.length === 0) return { current: 0, longest: 0 };

        return calculateStreak(recentWorkouts.map((w) => w.date));
      });

      // Persist streak to snapshot
      await step.run("update-streak-snapshot", async () => {
        const snapshot = await db.query.memberContextSnapshot.findFirst({
          where: eq(memberContextSnapshot.memberId, newRow.member_id),
          columns: { longestStreak: true },
        });

        const longestStreak = Math.max(
          streakInfo.current,
          snapshot?.longestStreak ?? 0
        );

        await db
          .update(memberContextSnapshot)
          .set({
            currentStreak: streakInfo.current,
            longestStreak,
            lastUpdated: new Date(),
          })
          .where(eq(memberContextSnapshot.memberId, newRow.member_id));
      });

      // Send streak milestone notification for key milestones
      if (STREAK_MILESTONES.includes(streakInfo.current)) {
        await step.sendEvent("notify-streak", {
          name: "notification/streak-milestone",
          data: {
            userId: member.userId,
            memberId: newRow.member_id,
            streakDays: streakInfo.current,
          },
        });
      }
    }

    return { success: true, sessionId: newRow.id };
  }
);

// ===========================================
// Circle Member Events
// ===========================================

/**
 * Handle new member - generate initial embeddings
 *
 * Triggered when: circle_members is inserted
 */
export const onMemberCreated = inngest.createFunction(
  {
    id: "db-member-created",
    name: "Member Created (DB Trigger)",
    retries: 2,
  },
  { event: "pg/circle_members.inserted" },
  async ({ event, step, logger }) => {
    const { new: newRow } = event.data;

    logger.info("New member created", {
      memberId: newRow.id,
      name: newRow.name,
      circleId: newRow.circle_id,
    });

    // Create initial empty snapshot
    await step.run("create-initial-snapshot", async () => {
      await db
        .insert(memberContextSnapshot)
        .values({
          memberId: newRow.id,
          activeGoals: [],
          activeLimitations: [],
          personalRecords: [],
          muscleRecoveryStatus: {},
          weeklyWorkoutAvg: "0",
          lastWorkoutDate: null,
          lastUpdated: new Date(),
          snapshotVersion: 1,
        })
        .onConflictDoNothing();
    });

    // If member has a userId, trigger embedding generation after a delay
    // (to allow time for profile data to be added)
    if (newRow.user_id) {
      await step.sleep("wait-for-profile-data", "5m");

      await step.sendEvent("trigger-embeddings", {
        name: "ai/generate-embeddings",
        data: {
          userId: newRow.user_id,
          circleId: newRow.circle_id,
          memberId: newRow.id,
        },
      });
    }

    return { success: true, memberId: newRow.id };
  }
);

// ===========================================
// Personal Record Events
// ===========================================

/**
 * Handle new PR - send celebration notification
 *
 * Triggered when: personal_records is inserted
 */
export const onPersonalRecordCreated = inngest.createFunction(
  {
    id: "db-pr-created",
    name: "Personal Record Created (DB Trigger)",
    retries: 2,
  },
  { event: "pg/personal_records.inserted" },
  async ({ event, step, logger }) => {
    const { new: newRow } = event.data;

    logger.info("New PR created", {
      prId: newRow.id,
      memberId: newRow.member_id,
      value: newRow.value,
      unit: newRow.unit,
    });

    // Get member and exercise details
    const details = await step.run("get-details", async () => {
      const [member, exercise] = await Promise.all([
        db.query.circleMembers.findFirst({
          where: eq(circleMembers.id, newRow.member_id),
        }),
        db.query.exercises.findFirst({
          where: eq(exercises.id, newRow.exercise_id),
        }),
      ]);
      return { member, exercise };
    });

    if (!details.member?.userId || !details.exercise) {
      return { skipped: true, reason: "Member or exercise not found" };
    }

    // Create PR celebration notification
    await step.run("create-notification", async () => {
      const repMaxText = newRow.rep_max ? ` (${newRow.rep_max}RM)` : "";
      await db.insert(notifications).values({
        userId: details.member!.userId!,
        type: "achievement",
        title: "New Personal Record! 💪",
        body: `You set a new PR on ${details.exercise!.name}: ${newRow.value} ${newRow.unit}${repMaxText}`,
        data: {
          prId: newRow.id,
          memberId: newRow.member_id,
          exerciseId: newRow.exercise_id,
        },
        createdAt: new Date(),
      });
    });

    // Update member snapshot
    await step.sendEvent("trigger-snapshot-update", {
      name: "member/snapshot-update",
      data: { memberId: newRow.member_id },
    });

    return { success: true, prId: newRow.id };
  }
);

// ===========================================
// Challenge Events
// ===========================================

/**
 * Handle challenge progress update - check for streaks and leaderboard changes
 *
 * Triggered when: challenge_participants is updated
 */
export const onChallengeProgressUpdated = inngest.createFunction(
  {
    id: "db-challenge-progress",
    name: "Challenge Progress Updated (DB Trigger)",
    retries: 2,
    // Throttle to avoid spam during rapid updates
    throttle: {
      key: "event.data.new.challenge_id",
      limit: 10,
      period: "1m",
    },
  },
  { event: "pg/challenge_participants.updated" },
  async ({ event, step, logger }) => {
    const { new: newRow, old: oldRow } = event.data;

    // Check for streak milestones
    const streakMilestones = [7, 14, 21, 30];
    const hitMilestone =
      streakMilestones.includes(newRow.current_streak) &&
      !streakMilestones.includes(oldRow.current_streak);

    if (!hitMilestone && newRow.current_day === oldRow.current_day) {
      return { skipped: true, reason: "No significant change" };
    }

    logger.info("Challenge progress updated", {
      participantId: newRow.id,
      challengeId: newRow.challenge_id,
      currentStreak: newRow.current_streak,
      currentDay: newRow.current_day,
    });

    // Get challenge details
    const challenge = await step.run("get-challenge", async () => {
      return db.query.challenges.findFirst({
        where: eq(challenges.id, newRow.challenge_id),
      });
    });

    if (!challenge) {
      return { skipped: true, reason: "Challenge not found" };
    }

    // Send streak milestone notification if applicable
    if (hitMilestone) {
      await step.run("create-streak-notification", async () => {
        await db.insert(notifications).values({
          userId: newRow.user_id,
          type: "challenge",
          title: `${newRow.current_streak}-Day Streak! 🔥`,
          body: `You're on fire in "${challenge.name}"! Keep it going!`,
          data: {
            challengeId: newRow.challenge_id,
            participantId: newRow.id,
            streak: newRow.current_streak,
          },
          createdAt: new Date(),
        });
      });
    }

    return {
      success: true,
      participantId: newRow.id,
      milestone: hitMilestone ? newRow.current_streak : null,
    };
  }
);

// ===========================================
// Coach Conversation Events
// ===========================================

/**
 * Handle new coach conversation - track for analytics
 *
 * Triggered when: coach_conversations is inserted
 */
export const onCoachConversationCreated = inngest.createFunction(
  {
    id: "db-coach-conversation-created",
    name: "Coach Conversation Created (DB Trigger)",
    retries: 1,
  },
  { event: "pg/coach_conversations.inserted" },
  async ({ event, step, logger }) => {
    const { new: newRow } = event.data;

    logger.info("New coach conversation started", {
      conversationId: newRow.id,
      memberId: newRow.member_id,
      mode: newRow.mode,
    });

    // Could add analytics tracking, usage monitoring, etc.
    // For now, just log it

    return { success: true, conversationId: newRow.id };
  }
);

/**
 * Export all database event functions
 */
export const databaseEventFunctions = [
  onGoalCompleted,
  onGoalCreated,
  onWorkoutCompleted,
  onMemberCreated,
  onPersonalRecordCreated,
  onChallengeProgressUpdated,
  onCoachConversationCreated,
];
