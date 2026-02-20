/**
 * Entitlements System
 *
 * Central feature-gating layer. All "can user X do Y?" checks go through here.
 * Replaces ad-hoc `if (plan === "pro")` checks scattered across the codebase.
 */

// TODO: Re-enable these imports when billing is live
// import { db } from "@/lib/db";
// import { subscriptions, aiQuotas } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { cacheUserData, CACHE_CONFIG } from "@/lib/cache";
import { getEntitlements } from "./plans";
import type { PlanTier, PlanEntitlements, UsageSummary } from "./types";

/**
 * Get the effective plan tier for a user.
 *
 * TODO: Re-enable billing checks when ready to launch paid tiers.
 * For now, all users get "leader" (highest tier) to unlock all features.
 */
export async function getUserTier(_userId: string): Promise<PlanTier> {
  return "leader";
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
 *
 * TODO: Re-enable billing checks when ready to launch paid tiers.
 * For now, returns leader-tier entitlements with unlimited usage.
 */
export async function getUsageSummary(_userId: string): Promise<UsageSummary> {
  const tier: PlanTier = "leader";
  const entitlements = getEntitlements(tier);

  return {
    tier,
    entitlements,
    usage: {
      aiWorkouts: {
        used: 0,
        limit: entitlements.aiWorkoutsPerMonth,
        remaining: entitlements.aiWorkoutsPerMonth,
      },
      aiChats: {
        used: 0,
        limit: entitlements.aiChatsPerMonth,
        remaining: entitlements.aiChatsPerMonth,
      },
      circlesJoined: 0,
      circlesOwned: 0,
      tokensUsed: 0,
    },
    subscription: {
      status: "active",
      interval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      isTrialing: false,
    },
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}
