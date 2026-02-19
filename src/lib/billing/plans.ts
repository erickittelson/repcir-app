/**
 * Plan Catalog - Single Source of Truth
 *
 * All plan definitions, pricing, entitlements, and Stripe price mappings.
 * Every part of the system that needs to know "what does plan X include?"
 * imports from this file.
 */

import type {
  PlanConfig,
  PlanTier,
  PlanEntitlements,
  BillingInterval,
  PLAN_TIERS,
} from "./types";
import { PLAN_RANK } from "./types";

const UNLIMITED = 999_999;

export const PLAN_CATALOG: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Basic features for getting started",
    features: [
      "Track workouts",
      "Join 1 circle",
      "3 AI workouts/month",
      "20 AI coach messages/month",
      "Community workout library (browse)",
    ],
    entitlements: {
      maxCircles: 1,
      maxCirclesOwned: 0,
      aiWorkoutsPerMonth: 3,
      aiChatsPerMonth: 20,
      membersPerCircle: 0,
      hasCoachingMemory: false,
      hasAdvancedAnalytics: false,
      hasWorkoutFeedbackLoop: false,
      hasGroupWorkoutGeneration: false,
      hasCircleAnalytics: false,
      hasChallenges: false,
      hasCustomWorkoutBuilder: false,
      hasWorkoutExport: false,
      hasSavedWorkouts: false,
      hasWorkoutScheduling: false,
      hasPriorityAIModel: false,
      hasApiAccess: false,
      hasWhiteLabel: false,
      hasSso: false,
      hasPrioritySupport: false,
    },
    pricing: { monthly: null, yearly: null },
    trialDays: 0,
    stripePriceIds: { monthly: null, yearly: null },
  },

  plus: {
    tier: "plus",
    name: "Plus",
    description: "For the person who trains 3-4x/week",
    features: [
      "Everything in Free",
      "15 AI workouts/month",
      "Unlimited AI coach messages",
      "Join up to 3 circles",
      "Full workout history + basic analytics",
      "Save community workouts",
      "Workout calendar scheduling",
    ],
    entitlements: {
      maxCircles: 3,
      maxCirclesOwned: 1,
      aiWorkoutsPerMonth: 15,
      aiChatsPerMonth: UNLIMITED,
      membersPerCircle: 10,
      hasCoachingMemory: false,
      hasAdvancedAnalytics: false,
      hasWorkoutFeedbackLoop: false,
      hasGroupWorkoutGeneration: false,
      hasCircleAnalytics: false,
      hasChallenges: false,
      hasCustomWorkoutBuilder: false,
      hasWorkoutExport: false,
      hasSavedWorkouts: true,
      hasWorkoutScheduling: true,
      hasPriorityAIModel: false,
      hasApiAccess: false,
      hasWhiteLabel: false,
      hasSso: false,
      hasPrioritySupport: false,
    },
    pricing: { monthly: 6.99, yearly: 59.99 },
    trialDays: 7,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || null,
      yearly: process.env.STRIPE_PRICE_PLUS_YEARLY || null,
    },
  },

  pro: {
    tier: "pro",
    name: "Pro",
    description: "Your AI personal trainer that actually knows you",
    features: [
      "Everything in Plus",
      "Unlimited AI workouts",
      "AI coaching memory",
      "Unlimited circles",
      "Advanced analytics (PR trends, volume)",
      "Custom workout builder",
      "Workout feedback loop",
      "Priority AI model",
    ],
    entitlements: {
      maxCircles: UNLIMITED,
      maxCirclesOwned: 1,
      aiWorkoutsPerMonth: UNLIMITED,
      aiChatsPerMonth: UNLIMITED,
      membersPerCircle: 20,
      hasCoachingMemory: true,
      hasAdvancedAnalytics: true,
      hasWorkoutFeedbackLoop: true,
      hasGroupWorkoutGeneration: false,
      hasCircleAnalytics: false,
      hasChallenges: false,
      hasCustomWorkoutBuilder: true,
      hasWorkoutExport: true,
      hasSavedWorkouts: true,
      hasWorkoutScheduling: true,
      hasPriorityAIModel: true,
      hasApiAccess: false,
      hasWhiteLabel: false,
      hasSso: false,
      hasPrioritySupport: false,
    },
    pricing: { monthly: 12.99, yearly: 109.99 },
    trialDays: 7,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY || null,
    },
  },

  leader: {
    tier: "leader",
    name: "Circle Leader",
    description: "For coaches, gym owners, and group fitness leaders",
    features: [
      "Everything in Pro",
      "Create unlimited circles",
      "AI group workout generation",
      "Circle analytics dashboard",
      "Challenges and leaderboards",
      "Custom invite links with tracking",
      "Up to 50 members per circle",
    ],
    entitlements: {
      maxCircles: UNLIMITED,
      maxCirclesOwned: UNLIMITED,
      aiWorkoutsPerMonth: UNLIMITED,
      aiChatsPerMonth: UNLIMITED,
      membersPerCircle: 50,
      hasCoachingMemory: true,
      hasAdvancedAnalytics: true,
      hasWorkoutFeedbackLoop: true,
      hasGroupWorkoutGeneration: true,
      hasCircleAnalytics: true,
      hasChallenges: true,
      hasCustomWorkoutBuilder: true,
      hasWorkoutExport: true,
      hasSavedWorkouts: true,
      hasWorkoutScheduling: true,
      hasPriorityAIModel: true,
      hasApiAccess: false,
      hasWhiteLabel: false,
      hasSso: false,
      hasPrioritySupport: false,
    },
    pricing: { monthly: 19.99, yearly: 169.99 },
    trialDays: 14,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_LEADER_MONTHLY || null,
      yearly: process.env.STRIPE_PRICE_LEADER_YEARLY || null,
    },
  },

  team: {
    tier: "team",
    name: "Team",
    description: "For gyms and training organizations",
    features: [
      "Everything in Circle Leader",
      "Unlimited members per circle",
      "API access",
      "White-label circle branding",
      "Bulk member onboarding",
      "Priority support",
    ],
    entitlements: {
      maxCircles: UNLIMITED,
      maxCirclesOwned: UNLIMITED,
      aiWorkoutsPerMonth: UNLIMITED,
      aiChatsPerMonth: UNLIMITED,
      membersPerCircle: UNLIMITED,
      hasCoachingMemory: true,
      hasAdvancedAnalytics: true,
      hasWorkoutFeedbackLoop: true,
      hasGroupWorkoutGeneration: true,
      hasCircleAnalytics: true,
      hasChallenges: true,
      hasCustomWorkoutBuilder: true,
      hasWorkoutExport: true,
      hasSavedWorkouts: true,
      hasWorkoutScheduling: true,
      hasPriorityAIModel: true,
      hasApiAccess: true,
      hasWhiteLabel: true,
      hasSso: false,
      hasPrioritySupport: true,
    },
    pricing: { monthly: 39.99, yearly: 349.99 },
    trialDays: 14,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || null,
      yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || null,
    },
  },
};

/**
 * Resolve a Stripe Price ID to a plan tier.
 * Used by webhooks to determine which plan a price corresponds to.
 */
export function resolvePriceIdToTier(priceId: string): PlanTier | null {
  for (const [tier, config] of Object.entries(PLAN_CATALOG)) {
    if (
      config.stripePriceIds.monthly === priceId ||
      config.stripePriceIds.yearly === priceId
    ) {
      return tier as PlanTier;
    }
  }
  return null;
}

/**
 * Resolve a Stripe Price ID to a billing interval.
 */
export function resolvePriceIdToInterval(
  priceId: string
): BillingInterval | null {
  for (const config of Object.values(PLAN_CATALOG)) {
    if (config.stripePriceIds.monthly === priceId) return "monthly";
    if (config.stripePriceIds.yearly === priceId) return "yearly";
  }
  return null;
}

/**
 * Get all configured Stripe Price IDs for validation.
 */
export function getAllStripePriceIds(): string[] {
  return Object.values(PLAN_CATALOG)
    .flatMap((c) => [c.stripePriceIds.monthly, c.stripePriceIds.yearly])
    .filter((id): id is string => id !== null);
}

/**
 * Get entitlements for a plan tier.
 */
export function getEntitlements(tier: PlanTier): PlanEntitlements {
  return PLAN_CATALOG[tier].entitlements;
}

/**
 * Compare two tiers to determine upgrade/downgrade direction.
 */
export function compareTiers(
  from: PlanTier,
  to: PlanTier
): "upgrade" | "downgrade" | "same" {
  if (PLAN_RANK[from] < PLAN_RANK[to]) return "upgrade";
  if (PLAN_RANK[from] > PLAN_RANK[to]) return "downgrade";
  return "same";
}

/**
 * Get the tier-specific AI quota limits for syncing with the aiQuotas table.
 */
export function getTierQuotaLimits(tier: PlanTier): {
  monthlyWorkoutLimit: number;
  monthlyChatLimit: number;
} {
  const entitlements = getEntitlements(tier);
  return {
    monthlyWorkoutLimit: entitlements.aiWorkoutsPerMonth,
    monthlyChatLimit: entitlements.aiChatsPerMonth,
  };
}
