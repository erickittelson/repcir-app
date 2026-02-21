/**
 * AI Usage Tracking - Captures token usage from AI SDK responses
 * and persists to database for cost monitoring and quota enforcement.
 */

import { db } from "@/lib/db";
import { aiUsageTracking, aiQuotas } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { estimateCostDetailed } from "./config";

/** Feature categories for cost-per-feature reporting */
export type AIFeature =
  | "chat"
  | "workout_generation"
  | "caption"
  | "milestones"
  | "recommendations"
  | "parse_workout"
  | "onboarding"
  | "coaching_memory"
  | "session_summary";

interface TrackUsageParams {
  userId: string;
  memberId?: string;
  endpoint: string;
  feature: AIFeature;
  modelUsed: string;
  reasoningLevel?: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  durationMs?: number;
  cacheHit?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Record AI usage to database and update quota counters.
 * Runs async — does not block the response.
 */
export async function trackAIUsage(params: TrackUsageParams): Promise<void> {
  try {
    const cachedTokens = params.cachedTokens ?? 0;
    const uncachedInputTokens = Math.max(0, params.inputTokens - cachedTokens);
    const totalCost = estimateCostDetailed(
      uncachedInputTokens,
      cachedTokens,
      params.outputTokens,
      params.modelUsed
    );

    // Insert usage record
    await db.insert(aiUsageTracking).values({
      userId: params.userId,
      memberId: params.memberId || null,
      endpoint: params.endpoint,
      feature: params.feature,
      modelUsed: params.modelUsed,
      reasoningLevel: params.reasoningLevel || null,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cachedTokens: params.cachedTokens ?? 0,
      totalCostUsd: totalCost.toFixed(6),
      durationMs: params.durationMs || null,
      cacheHit: params.cacheHit ?? false,
      metadata: params.metadata || null,
    });

    // Update quota counters
    const isWorkout = params.endpoint.includes("generate-workout");
    const isChat = params.endpoint.includes("chat");
    const totalTokens = params.inputTokens + params.outputTokens;

    await db
      .update(aiQuotas)
      .set({
        currentWorkoutCount: isWorkout
          ? sql`${aiQuotas.currentWorkoutCount} + 1`
          : sql`${aiQuotas.currentWorkoutCount}`,
        currentChatCount: isChat
          ? sql`${aiQuotas.currentChatCount} + 1`
          : sql`${aiQuotas.currentChatCount}`,
        currentTokensUsed: sql`${aiQuotas.currentTokensUsed} + ${totalTokens}`,
        updatedAt: new Date(),
      })
      .where(eq(aiQuotas.userId, params.userId));
  } catch (error) {
    // Usage tracking should never break the main request
    console.error("[AI Usage] Failed to track usage:", error);
  }
}

/**
 * Get usage summary for a user in the current period.
 */
export async function getUserUsageSummary(userId: string) {
  const quota = await db.query.aiQuotas.findFirst({
    where: eq(aiQuotas.userId, userId),
  });

  if (!quota) {
    return {
      plan: "free" as const,
      workouts: { used: 0, limit: 5, remaining: 5 },
      chats: { used: 0, limit: 100, remaining: 100 },
      tokensUsed: 0,
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  return {
    plan: quota.plan as "free" | "pro",
    workouts: {
      used: quota.currentWorkoutCount,
      limit: quota.monthlyWorkoutLimit,
      remaining: Math.max(0, quota.monthlyWorkoutLimit - quota.currentWorkoutCount),
    },
    chats: {
      used: quota.currentChatCount,
      limit: quota.monthlyChatLimit,
      remaining: Math.max(0, quota.monthlyChatLimit - quota.currentChatCount),
    },
    tokensUsed: quota.currentTokensUsed,
    periodEnd: quota.periodEnd,
  };
}
