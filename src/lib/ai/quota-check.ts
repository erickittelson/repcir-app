/**
 * AI Quota Check - Enforces subscription-based AI usage limits.
 *
 * Free tier: 5 AI workouts/month, 100 coach chats/month
 * Pro tier: Unlimited
 */

import { db } from "@/lib/db";
import { aiQuotas, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type QuotaType = "workout" | "chat";

interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
  upgradeRequired: boolean;
}

const PLAN_LIMITS = {
  free: { monthlyWorkoutLimit: 5, monthlyChatLimit: 100 },
  pro: { monthlyWorkoutLimit: 999999, monthlyChatLimit: 999999 },
} as const;

/**
 * Ensure a quota record exists for a user, creating one if needed.
 */
async function ensureQuota(userId: string): Promise<typeof aiQuotas.$inferSelect> {
  let quota = await db.query.aiQuotas.findFirst({
    where: eq(aiQuotas.userId, userId),
  });

  if (!quota) {
    // Determine plan from subscription (table may not exist yet)
    let plan = "free";
    try {
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });
      if (sub?.plan === "pro") plan = "pro";
    } catch {
      // subscriptions table may not exist yet — default to free
    }
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const [created] = await db
      .insert(aiQuotas)
      .values({
        userId,
        plan,
        monthlyWorkoutLimit: limits.monthlyWorkoutLimit,
        monthlyChatLimit: limits.monthlyChatLimit,
        currentWorkoutCount: 0,
        currentChatCount: 0,
        currentTokensUsed: 0,
        periodStart: now,
        periodEnd,
      })
      .onConflictDoNothing()
      .returning();

    // If conflict (race condition), just fetch the existing one
    if (!created) {
      quota = await db.query.aiQuotas.findFirst({
        where: eq(aiQuotas.userId, userId),
      });
    } else {
      quota = created;
    }
  }

  // Reset counters if period has expired
  if (quota && new Date(quota.periodEnd) < new Date()) {
    const now = new Date();
    const newPeriodEnd = new Date(now);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

    const [updated] = await db
      .update(aiQuotas)
      .set({
        currentWorkoutCount: 0,
        currentChatCount: 0,
        currentTokensUsed: 0,
        periodStart: now,
        periodEnd: newPeriodEnd,
        updatedAt: now,
      })
      .where(eq(aiQuotas.userId, userId))
      .returning();

    quota = updated || quota;
  }

  return quota!;
}

/**
 * Check if a user has quota remaining for an AI operation.
 */
export async function checkAIQuota(
  userId: string,
  type: QuotaType
): Promise<QuotaCheckResult> {
  const quota = await ensureQuota(userId);

  // Pro users always allowed
  if (quota.plan === "pro") {
    return {
      allowed: true,
      remaining: 999999,
      limit: 999999,
      plan: "pro",
      upgradeRequired: false,
    };
  }

  if (type === "workout") {
    const remaining = Math.max(0, quota.monthlyWorkoutLimit - quota.currentWorkoutCount);
    return {
      allowed: remaining > 0,
      remaining,
      limit: quota.monthlyWorkoutLimit,
      plan: quota.plan,
      upgradeRequired: remaining === 0,
    };
  }

  // chat
  const remaining = Math.max(0, quota.monthlyChatLimit - quota.currentChatCount);
  return {
    allowed: remaining > 0,
    remaining,
    limit: quota.monthlyChatLimit,
    plan: quota.plan,
    upgradeRequired: remaining === 0,
  };
}

/**
 * Create a 429 response for quota exceeded.
 */
export function createQuotaExceededResponse(result: QuotaCheckResult, type: QuotaType): Response {
  return new Response(
    JSON.stringify({
      error: "AI quota exceeded",
      type,
      plan: result.plan,
      limit: result.limit,
      upgradeRequired: result.upgradeRequired,
      message:
        type === "workout"
          ? `You've used all ${result.limit} AI workout generations this month. Upgrade to Pro for unlimited.`
          : `You've reached your ${result.limit} AI coach messages this month. Upgrade to Pro for unlimited.`,
    }),
    {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }
  );
}
