/**
 * Inngest Client Exports
 *
 * Use this module to trigger Inngest events from your application code.
 *
 * Example usage:
 * ```typescript
 * import { triggerEmbeddingGeneration, triggerSnapshotUpdate } from "@/inngest";
 *
 * // In an API route after updating member data:
 * await triggerSnapshotUpdate(memberId);
 *
 * // After saving a new goal:
 * await triggerEmbeddingGeneration(userId, circleId, memberId);
 * ```
 */

import { inngest, type InngestEvents } from "./client";

// Re-export the client for advanced use cases
export { inngest };
export type { InngestEvents };

/**
 * Trigger embedding generation for a member
 *
 * Use after significant profile changes (new goals, updated limitations, etc.)
 */
export async function triggerEmbeddingGeneration(
  userId: string,
  circleId: string,
  memberId: string
) {
  return inngest.send({
    name: "ai/generate-embeddings",
    data: { userId, circleId, memberId },
  });
}

/**
 * Trigger milestone generation for a goal
 *
 * Use after creating or updating a goal
 */
export async function triggerMilestoneGeneration(
  userId: string,
  circleId: string,
  memberId: string,
  goalId?: string
) {
  return inngest.send({
    name: "ai/generate-milestones",
    data: { userId, circleId, memberId, goalId },
  });
}

/**
 * Trigger member snapshot update
 *
 * Use after completing a workout, achieving a goal, or any significant change
 */
export async function triggerSnapshotUpdate(memberId: string) {
  return inngest.send({
    name: "member/snapshot-update",
    data: { memberId },
  });
}

/**
 * Trigger auto-reschedule for missed workouts
 *
 * Use when a user misses workouts or requests rescheduling
 */
export async function triggerAutoReschedule(
  userId: string,
  options?: {
    scheduleId?: string;
    workoutIds?: string[];
    strategy?: "next_available" | "end_of_schedule" | "spread_evenly";
  }
) {
  return inngest.send({
    name: "schedule/auto-reschedule",
    data: {
      userId,
      ...options,
    },
  });
}

/**
 * Send goal achieved notification
 *
 * Use when a goal reaches 100% progress
 */
export async function notifyGoalAchieved(
  userId: string,
  memberId: string,
  goalId: string,
  goalTitle: string
) {
  return inngest.send({
    name: "notification/goal-achieved",
    data: { userId, memberId, goalId, goalTitle },
  });
}

/**
 * Send streak milestone notification
 *
 * Use when a user hits a streak milestone (7, 14, 30, 50, 100, 365 days)
 */
export async function notifyStreakMilestone(
  userId: string,
  memberId: string,
  streakDays: number
) {
  return inngest.send({
    name: "notification/streak-milestone",
    data: { userId, memberId, streakDays },
  });
}

/**
 * Trigger workout generation in background
 *
 * Use for complex workout generation that may take longer
 */
export async function triggerWorkoutGeneration(
  userId: string,
  circleId: string,
  memberIds: string[],
  options: {
    focus?: string;
    customFocus?: string;
    intensity?: string;
    targetDuration?: number;
    restPreference?: string;
    includeWarmup?: boolean;
    includeCooldown?: boolean;
    reasoningLevel?: string;
    trainingGoal?: string;
    sport?: string;
    workoutStructure?: string;
    preset?: string;
    volumeGoal?: string;
    periodizationPhase?: string;
    saveAsPlan?: boolean;
  } = {}
) {
  return inngest.send({
    name: "ai/generate-workout",
    data: {
      userId,
      circleId,
      memberIds,
      options,
    },
  });
}

/**
 * Trigger workout generation from the AI chat config form.
 *
 * Creates an aiGenerationJobs row, sends the Inngest event, and returns the jobId.
 * The client polls /api/ai/generate-workout/status/[id] for completion.
 */
export async function triggerWorkoutGenerationFromChat(
  userId: string,
  circleId: string,
  memberIds: string[],
  jobId: string,
  options: {
    targetType?: "individual" | "circle" | "selected_members";
    workoutType?: string;
    workoutSections?: Array<{ workoutType: string; label?: string; order: number }>;
    intensity?: string;
    targetDuration?: number;
    goalIds?: string[];
    circleGoalIds?: string[];
    locationId?: string;
    includeWarmup?: boolean;
    includeCooldown?: boolean;
    conversationId?: string;
    memberGenders?: Record<string, string>;
    reasoningLevel?: string;
  } = {}
) {
  return inngest.send({
    name: "ai/generate-workout",
    data: {
      userId,
      circleId,
      memberIds,
      jobId,
      options: {
        ...options,
        chatTriggered: true,
        saveAsPlan: true,
      },
    },
  });
}

/**
 * Batch update multiple member snapshots
 *
 * Use after bulk operations or migrations
 */
export async function triggerBatchSnapshotUpdate(memberIds: string[]) {
  return inngest.send({
    name: "member/batch-snapshot-update",
    data: { memberIds },
  });
}

/**
 * Trigger post-workout AI analysis
 *
 * Use after a workout session is completed to generate insights
 */
export async function triggerWorkoutAnalysis(
  sessionId: string,
  memberId: string
) {
  return inngest.send({
    name: "ai/analyze-workout",
    data: { sessionId, memberId },
  });
}

/**
 * Trigger coaching memory extraction from a conversation
 *
 * Use after a coaching conversation ends to extract long-term insights
 */
export async function triggerCoachingMemoryExtraction(
  conversationId: string,
  memberId: string
) {
  return inngest.send({
    name: "ai/extract-coaching-memory",
    data: { conversationId, memberId },
  });
}
