/**
 * AI Quota Check - Enforces subscription-based AI usage limits.
 *
 * Delegates to the centralized entitlements system for plan limits.
 * Handles quota record lifecycle (create, reset, check).
 */

import { db } from "@/lib/db";
import { aiQuotas, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserTier } from "@/lib/billing/entitlements";
import { getTierQuotaLimits } from "@/lib/billing/plans";
import type { PlanTier } from "@/lib/billing/types";

type QuotaType = "workout" | "chat";

interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
  upgradeRequired: boolean;
}

/**
 * Ensure a quota record exists for a user, creating one if needed.
 */
async function ensureQuota(userId: string): Promise<typeof aiQuotas.$inferSelect> {
  let quota = await db.query.aiQuotas.findFirst({
    where: eq(aiQuotas.userId, userId),
  });

  if (!quota) {
    const tier = await getUserTier(userId);
    const limits = getTierQuotaLimits(tier);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const [created] = await db
      .insert(aiQuotas)
      .values({
        userId,
        plan: tier,
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
    const tier = await getUserTier(userId);
    const limits = getTierQuotaLimits(tier);

    const now = new Date();
    const newPeriodEnd = new Date(now);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

    const [updated] = await db
      .update(aiQuotas)
      .set({
        plan: tier,
        monthlyWorkoutLimit: limits.monthlyWorkoutLimit,
        monthlyChatLimit: limits.monthlyChatLimit,
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
 * Sync a user's quota limits when their plan changes.
 * Called from webhook processor after plan change.
 */
export async function syncQuotaLimits(userId: string): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierQuotaLimits(tier);

  await db
    .update(aiQuotas)
    .set({
      plan: tier,
      monthlyWorkoutLimit: limits.monthlyWorkoutLimit,
      monthlyChatLimit: limits.monthlyChatLimit,
      updatedAt: new Date(),
    })
    .where(eq(aiQuotas.userId, userId));
}

/**
 * Check if a user has quota remaining for an AI operation.
 */
export async function checkAIQuota(
  userId: string,
  type: QuotaType
): Promise<QuotaCheckResult> {
  const quota = await ensureQuota(userId);
  const tier = await getUserTier(userId);

  // Unlimited tiers (pro and above)
  const UNLIMITED = 999_999;
  if (quota.monthlyWorkoutLimit >= UNLIMITED && quota.monthlyChatLimit >= UNLIMITED) {
    return {
      allowed: true,
      remaining: UNLIMITED,
      limit: UNLIMITED,
      plan: tier,
      upgradeRequired: false,
    };
  }

  if (type === "workout") {
    const remaining = Math.max(0, quota.monthlyWorkoutLimit - quota.currentWorkoutCount);
    return {
      allowed: remaining > 0,
      remaining,
      limit: quota.monthlyWorkoutLimit,
      plan: tier,
      upgradeRequired: remaining === 0,
    };
  }

  // chat
  const remaining = Math.max(0, quota.monthlyChatLimit - quota.currentChatCount);
  return {
    allowed: remaining > 0,
    remaining,
    limit: quota.monthlyChatLimit,
    plan: tier,
    upgradeRequired: remaining === 0,
  };
}

/**
 * Get the next suggested upgrade tier for a user.
 */
function getUpgradeSuggestion(currentTier: PlanTier): { tier: PlanTier; name: string } {
  switch (currentTier) {
    case "free":
      return { tier: "plus", name: "Plus" };
    case "plus":
      return { tier: "pro", name: "Pro" };
    case "pro":
      return { tier: "leader", name: "Circle Leader" };
    default:
      return { tier: "pro", name: "Pro" };
  }
}

/**
 * Create a 429 response for quota exceeded.
 */
export function createQuotaExceededResponse(result: QuotaCheckResult, type: QuotaType): Response {
  const currentTier = result.plan as PlanTier;
  const upgrade = getUpgradeSuggestion(currentTier);

  return new Response(
    JSON.stringify({
      error: "AI quota exceeded",
      type,
      plan: result.plan,
      limit: result.limit,
      upgradeRequired: result.upgradeRequired,
      suggestedTier: upgrade.tier,
      message:
        type === "workout"
          ? `You've used all ${result.limit} AI workout generations this month. Upgrade to ${upgrade.name} for more.`
          : `You've reached your ${result.limit} AI coach messages this month. Upgrade to ${upgrade.name} for more.`,
    }),
    {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }
  );
}
