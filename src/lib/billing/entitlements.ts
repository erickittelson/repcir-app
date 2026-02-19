/**
 * Entitlements System
 *
 * Central feature-gating layer. All "can user X do Y?" checks go through here.
 * Replaces ad-hoc `if (plan === "pro")` checks scattered across the codebase.
 */

import { db } from "@/lib/db";
import { subscriptions, aiQuotas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheUserData, CACHE_CONFIG } from "@/lib/cache";
import { PLAN_CATALOG, getEntitlements } from "./plans";
import type { PlanTier, PlanEntitlements, UsageSummary } from "./types";

/**
 * Get the effective plan tier for a user.
 * Active or trialing subscriptions return their tier.
 * Past due gets a grace period (keeps tier).
 * Everything else falls back to free.
 * Cached for 5 minutes, invalidated on webhook events.
 */
export async function getUserTier(userId: string): Promise<PlanTier> {
  return cacheUserData(
    userId,
    "billing:tier",
    async () => {
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      if (!sub) return "free";

      const status = sub.status;
      const plan = sub.plan as PlanTier;

      // Active or trialing: use their plan
      if (status === "active" || status === "trialing") {
        return plan || "free";
      }

      // Past due: grace period -- keep their tier
      if (status === "past_due") {
        return plan || "free";
      }

      return "free";
    },
    CACHE_CONFIG.medium
  );
}

/**
 * Check if a user has access to a boolean feature.
 */
export async function canAccess(
  userId: string,
  feature: keyof PlanEntitlements
): Promise<boolean> {
  const tier = await getUserTier(userId);
  const entitlements = getEntitlements(tier);
  const value = entitlements[feature];

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Check a numeric entitlement against current usage.
 */
export async function checkLimit(
  userId: string,
  limitKey:
    | "aiWorkoutsPerMonth"
    | "aiChatsPerMonth"
    | "maxCircles"
    | "maxCirclesOwned",
  currentUsage: number
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: PlanTier;
}> {
  const tier = await getUserTier(userId);
  const entitlements = getEntitlements(tier);
  const limit = entitlements[limitKey];
  const remaining = Math.max(0, limit - currentUsage);

  return { allowed: remaining > 0, remaining, limit, tier };
}

/**
 * Get full usage summary for the billing status endpoint and UI.
 */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const [sub, quota] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    }),
    db.query.aiQuotas.findFirst({
      where: eq(aiQuotas.userId, userId),
    }),
  ]);

  const tier: PlanTier = (sub?.plan as PlanTier) || "free";
  const entitlements = getEntitlements(tier);

  const workoutsUsed = quota?.currentWorkoutCount ?? 0;
  const chatsUsed = quota?.currentChatCount ?? 0;

  return {
    tier,
    entitlements,
    usage: {
      aiWorkouts: {
        used: workoutsUsed,
        limit: entitlements.aiWorkoutsPerMonth,
        remaining: Math.max(0, entitlements.aiWorkoutsPerMonth - workoutsUsed),
      },
      aiChats: {
        used: chatsUsed,
        limit: entitlements.aiChatsPerMonth,
        remaining: Math.max(0, entitlements.aiChatsPerMonth - chatsUsed),
      },
      circlesJoined: 0, // populated by caller if needed
      circlesOwned: 0, // populated by caller if needed
      tokensUsed: quota?.currentTokensUsed ?? 0,
    },
    subscription: {
      status: (sub?.status as UsageSummary["subscription"]["status"]) ?? null,
      interval:
        (sub?.billingInterval as UsageSummary["subscription"]["interval"]) ??
        null,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      trialEnd: sub?.trialEnd ?? null,
      isTrialing: sub?.status === "trialing",
    },
    periodEnd:
      quota?.periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}
