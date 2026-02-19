/**
 * Billing Type System
 *
 * Central type definitions for the subscription and billing system.
 * All billing code imports types from this file.
 */

// ============================================================================
// PLAN TIERS
// ============================================================================

export const PLAN_TIERS = ["free", "plus", "pro", "leader", "team"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/** Ordered by rank for upgrade/downgrade comparison */
export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  leader: 3,
  team: 4,
};

export type BillingInterval = "monthly" | "yearly";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

// ============================================================================
// ENTITLEMENTS (what a plan grants)
// ============================================================================

export interface PlanEntitlements {
  // Numeric limits
  maxCircles: number;
  maxCirclesOwned: number;
  aiWorkoutsPerMonth: number;
  aiChatsPerMonth: number;
  membersPerCircle: number;

  // Boolean feature flags
  hasCoachingMemory: boolean;
  hasAdvancedAnalytics: boolean;
  hasWorkoutFeedbackLoop: boolean;
  hasGroupWorkoutGeneration: boolean;
  hasCircleAnalytics: boolean;
  hasChallenges: boolean;
  hasCustomWorkoutBuilder: boolean;
  hasWorkoutExport: boolean;
  hasSavedWorkouts: boolean;
  hasWorkoutScheduling: boolean;
  hasPriorityAIModel: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  hasSso: boolean;
  hasPrioritySupport: boolean;
}

// ============================================================================
// PLAN CONFIGURATION
// ============================================================================

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  description: string;
  features: string[];
  entitlements: PlanEntitlements;
  pricing: {
    monthly: number | null; // null = free tier
    yearly: number | null;
  };
  trialDays: number; // 0 = no trial
  stripePriceIds: {
    monthly: string | null;
    yearly: string | null;
  };
}

// ============================================================================
// BILLING SERVICE TYPES
// ============================================================================

export type BillingProvider = "stripe" | "apple_iap" | "google_play";

export interface BillingCustomer {
  userId: string;
  email: string;
  name?: string;
  stripeCustomerId?: string;
  appleOriginalTransactionId?: string;
  googlePurchaseToken?: string;
}

export interface ActiveSubscription {
  id: string;
  provider: BillingProvider;
  providerSubscriptionId: string;
  tier: PlanTier;
  interval: BillingInterval;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

export interface CheckoutResult {
  type: "redirect";
  url: string;
}

export interface PlanChangeResult {
  success: boolean;
  previousTier: PlanTier;
  newTier: PlanTier;
  effectiveDate: Date;
  prorationAmount?: number;
}

export interface UsageSummary {
  tier: PlanTier;
  entitlements: PlanEntitlements;
  usage: {
    aiWorkouts: { used: number; limit: number; remaining: number };
    aiChats: { used: number; limit: number; remaining: number };
    circlesJoined: number;
    circlesOwned: number;
    tokensUsed: number;
  };
  subscription: {
    status: SubscriptionStatus | null;
    interval: BillingInterval | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: Date | null;
    isTrialing: boolean;
  };
  periodEnd: Date;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface ProcessedWebhookEvent {
  eventId: string;
  eventType: string;
  processedAt: Date;
}

// ============================================================================
// QUOTA TYPES (extends existing quota system)
// ============================================================================

export type QuotaType = "workout" | "chat";

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: PlanTier;
  upgradeRequired: boolean;
}
