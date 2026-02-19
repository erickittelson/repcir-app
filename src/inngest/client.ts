/**
 * Inngest Client Configuration
 *
 * Central configuration for Inngest event-driven workflows.
 * Used for background jobs, cron tasks, and AI workflows that
 * exceed Vercel's function timeout limits.
 */

import { Inngest, EventSchemas, InngestMiddleware } from "inngest";
import * as Sentry from "@sentry/nextjs";

/**
 * Database row types for Postgres CDC events
 */
interface GoalRow {
  id: string;
  member_id: string;
  title: string;
  category: string;
  status: string;
  target_value: number | null;
  current_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkoutSessionRow {
  id: string;
  member_id: string;
  name: string;
  status: string;
  date: string;
  started_at: string | null;
  end_time: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface CircleMemberRow {
  id: string;
  circle_id: string;
  user_id: string | null;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface PersonalRecordRow {
  id: string;
  member_id: string;
  exercise_id: string;
  value: number;
  unit: string;
  rep_max: number | null;
  date: string;
  created_at: string;
}

interface ChallengeParticipantRow {
  id: string;
  challenge_id: string;
  user_id: string;
  member_id: string | null;
  current_streak: number;
  longest_streak: number;
  current_day: number;
  status: string;
  joined_at: string;
  updated_at: string;
}

interface CoachConversationRow {
  id: string;
  member_id: string;
  mode: string;
  openai_conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Event schemas for type-safe event handling
 */
type Events = {
  // ===========================================
  // Postgres CDC Events (from Neon integration)
  // ===========================================

  // Goals table events
  "pg/goals.inserted": {
    data: {
      new: GoalRow;
      old: null;
    };
  };
  "pg/goals.updated": {
    data: {
      new: GoalRow;
      old: GoalRow;
    };
  };
  "pg/goals.deleted": {
    data: {
      new: null;
      old: GoalRow;
    };
  };

  // Workout sessions table events
  "pg/workout_sessions.inserted": {
    data: {
      new: WorkoutSessionRow;
      old: null;
    };
  };
  "pg/workout_sessions.updated": {
    data: {
      new: WorkoutSessionRow;
      old: WorkoutSessionRow;
    };
  };

  // Circle members table events
  "pg/circle_members.inserted": {
    data: {
      new: CircleMemberRow;
      old: null;
    };
  };
  "pg/circle_members.updated": {
    data: {
      new: CircleMemberRow;
      old: CircleMemberRow;
    };
  };

  // Personal records table events
  "pg/personal_records.inserted": {
    data: {
      new: PersonalRecordRow;
      old: null;
    };
  };

  // Challenge participants table events
  "pg/challenge_participants.updated": {
    data: {
      new: ChallengeParticipantRow;
      old: ChallengeParticipantRow;
    };
  };

  // Coach conversations table events
  "pg/coach_conversations.inserted": {
    data: {
      new: CoachConversationRow;
      old: null;
    };
  };

  // ===========================================
  // Cron events (triggered by Inngest schedules)
  // ===========================================
  "cron/data-retention": Record<string, never>;
  "cron/snapshots-refresh": Record<string, never>;
  "cron/cache-cleanup": Record<string, never>;
  "cron/aggregate-refresh": Record<string, never>;

  // AI workflow events
  "ai/generate-workout": {
    data: {
      userId: string;
      circleId: string;
      memberIds: string[];
      jobId?: string; // Reference to aiGenerationJobs row for status tracking
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
        // Enhanced options for chat-triggered generation
        targetType?: "individual" | "circle" | "selected_members";
        workoutType?: string;
        workoutSections?: Array<{ workoutType: string; label?: string; order: number }>;
        goalIds?: string[];
        circleGoalIds?: string[];
        locationId?: string;
        chatTriggered?: boolean;
        conversationId?: string;
        memberGenders?: Record<string, string>;
      };
    };
  };
  "ai/generate-embeddings": {
    data: {
      userId: string;
      circleId: string;
      memberId: string;
    };
  };
  "ai/generate-milestones": {
    data: {
      userId: string;
      circleId: string;
      memberId: string;
      goalId?: string;
    };
  };
  "ai/onboarding-chat": {
    data: {
      userId: string;
      message: string;
      conversationId?: string;
    };
  };

  // Notification events
  "notification/goal-achieved": {
    data: {
      userId: string;
      memberId: string;
      goalId: string;
      goalTitle: string;
    };
  };
  "notification/workout-reminder": {
    data: {
      userId: string;
      memberId: string;
      workoutName: string;
      scheduledDate: string;
    };
  };
  "notification/streak-milestone": {
    data: {
      userId: string;
      memberId: string;
      streakDays: number;
    };
  };
  "notification/challenge-update": {
    data: {
      challengeId: string;
      type: "started" | "ended" | "milestone" | "leaderboard_change";
      metadata?: Record<string, unknown>;
    };
  };

  // Schedule events
  "schedule/auto-reschedule": {
    data: {
      userId: string;
      scheduleId?: string;
      workoutIds?: string[];
      strategy?: "next_available" | "end_of_schedule" | "spread_evenly";
    };
  };
  "schedule/missed-workout-check": {
    data: {
      userId: string;
    };
  };

  // Member events
  "member/snapshot-update": {
    data: {
      memberId: string;
    };
  };
  "member/batch-snapshot-update": {
    data: {
      memberIds: string[];
    };
  };

  // Post-workout AI analysis
  "ai/analyze-workout": {
    data: {
      sessionId: string;
      memberId: string;
    };
  };
  // Coaching memory extraction
  "ai/extract-coaching-memory": {
    data: {
      conversationId: string;
      memberId: string;
    };
  };
  // Weekly progress report generation
  "cron/weekly-progress-reports": Record<string, never>;
  // Quota reset
  "cron/reset-ai-quotas": Record<string, never>;

  // ===========================================
  // Billing lifecycle events
  // ===========================================
  "billing/checkout.completed": {
    data: {
      userId: string;
      tier: string;
      interval: string;
      sessionId: string;
    };
  };
  "billing/subscription.created": {
    data: {
      userId: string;
      tier: string;
      interval: string;
      isTrialing: boolean;
      trialEnd: string | null;
    };
  };
  "billing/subscription.canceled": {
    data: {
      userId: string;
      previousTier: string;
      canceledAt: string;
    };
  };
  "billing/plan.changed": {
    data: {
      userId: string;
      previousTier: string;
      newTier: string;
      interval: string;
    };
  };
  "billing/trial.ending": {
    data: {
      userId: string;
      trialEnd: string | null;
    };
  };
  "billing/trial.converted": {
    data: {
      userId: string;
      tier: string;
    };
  };
  "billing/payment.failed": {
    data: {
      userId: string;
      invoiceId: string;
      attemptCount: number;
    };
  };
  "billing/payment.action_required": {
    data: {
      userId: string;
      invoiceId: string;
      hostedInvoiceUrl: string | null;
    };
  };

  // Admin/system events
  "admin/migration": {
    data: {
      migrationName: string;
      dryRun?: boolean;
    };
  };
  "admin/analytics-export": {
    data: {
      userId: string;
      format: "csv" | "json";
      dateRange?: { start: string; end: string };
    };
  };
};

/**
 * Sentry middleware — captures errors from all Inngest functions
 * with context (function name, event name, userId, jobId).
 */
const sentryMiddleware = new InngestMiddleware({
  name: "Sentry Error Tracking",
  init() {
    return {
      onFunctionRun({ ctx, fn }) {
        return {
          transformOutput({ result }) {
            if (result.error) {
              Sentry.withScope((scope) => {
                const fnId = fn.id("");
                scope.setTag("inngest.function", fnId);
                scope.setTag("inngest.event", ctx.event.name);
                scope.setContext("inngest", {
                  functionId: fnId,
                  eventName: ctx.event.name,
                  runId: ctx.runId,
                  userId: (ctx.event.data as Record<string, unknown>)?.userId,
                  jobId: (ctx.event.data as Record<string, unknown>)?.jobId,
                });
                Sentry.captureException(result.error);
              });
            }
          },
        };
      },
    };
  },
});

/**
 * Inngest client instance
 *
 * Use this client to:
 * - Send events: inngest.send({ name: "event/name", data: {...} })
 * - Create functions: inngest.createFunction(...)
 */
export const inngest = new Inngest({
  id: "repcir-app",
  schemas: new EventSchemas().fromRecord<Events>(),
  middleware: [sentryMiddleware],
});

/**
 * Type exports for use in other files
 */
export type InngestEvents = Events;
