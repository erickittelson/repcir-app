/**
 * Billing Service Abstraction
 *
 * Provider-agnostic interface for all billing operations.
 * The application layer never calls Stripe/Apple/Google directly --
 * it always goes through this interface.
 *
 * Implementations:
 * - StripeBillingService (web, current)
 * - AppleIAPBillingService (future, iOS via Expo)
 * - GooglePlayBillingService (future, Android via Expo)
 */

import type {
  BillingProvider,
  PlanTier,
  BillingInterval,
  ActiveSubscription,
  CheckoutResult,
  PlanChangeResult,
  BillingCustomer,
} from "./types";

export interface IBillingService {
  readonly provider: BillingProvider;

  /** Get or create a billing customer record */
  getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<BillingCustomer>;

  /** Create a checkout session for a new subscription */
  createCheckout(params: {
    userId: string;
    email: string;
    name?: string;
    tier: PlanTier;
    interval: BillingInterval;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
  }): Promise<CheckoutResult>;

  /** Get the active subscription for a user */
  getActiveSubscription(userId: string): Promise<ActiveSubscription | null>;

  /** Change the plan on an existing subscription */
  changePlan(params: {
    userId: string;
    newTier: PlanTier;
    newInterval?: BillingInterval;
    immediate?: boolean;
  }): Promise<PlanChangeResult>;

  /** Cancel a subscription */
  cancelSubscription(params: {
    userId: string;
    immediate?: boolean;
  }): Promise<void>;

  /** Resume a canceled subscription */
  resumeSubscription(userId: string): Promise<void>;

  /** Create a self-service billing portal session */
  createPortalSession(userId: string, returnUrl: string): Promise<string>;
}

/**
 * Factory to create the appropriate billing service.
 * Currently always returns StripeBillingService.
 * When Expo ships, this will route based on platform.
 */
export function createBillingService(
  provider: BillingProvider = "stripe"
): IBillingService {
  switch (provider) {
    case "stripe": {
      // Dynamic import to avoid loading Stripe SDK when not needed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { StripeBillingService } = require("./stripe-billing-service");
      return new StripeBillingService();
    }
    case "apple_iap":
      throw new Error("Apple IAP billing service not yet implemented");
    case "google_play":
      throw new Error("Google Play billing service not yet implemented");
    default:
      throw new Error(`Unknown billing provider: ${provider}`);
  }
}
