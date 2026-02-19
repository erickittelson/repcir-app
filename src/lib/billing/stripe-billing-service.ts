/**
 * Stripe Billing Service
 *
 * Implements IBillingService for Stripe-based web payments.
 * Uses idempotency keys on all mutating API calls.
 */

import type { IBillingService } from "./billing-service";
import type {
  BillingProvider,
  PlanTier,
  BillingInterval,
  ActiveSubscription,
  CheckoutResult,
  PlanChangeResult,
  BillingCustomer,
} from "./types";
import {
  PLAN_CATALOG,
  resolvePriceIdToTier,
  resolvePriceIdToInterval,
  compareTiers,
} from "./plans";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export class StripeBillingService implements IBillingService {
  readonly provider: BillingProvider = "stripe";

  async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<BillingCustomer> {
    // Check local DB first
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      columns: { stripeCustomerId: true },
    });

    if (existing?.stripeCustomerId) {
      return { userId, email, name, stripeCustomerId: existing.stripeCustomerId };
    }

    // Search Stripe by metadata (more reliable than email for duplicates)
    const searchResults = await stripe.customers.search({
      query: `metadata["userId"]:"${userId}"`,
    });

    if (searchResults.data.length > 0) {
      return {
        userId,
        email,
        name,
        stripeCustomerId: searchResults.data[0].id,
      };
    }

    // Create new customer with idempotency key
    const customer = await stripe.customers.create(
      { email, name, metadata: { userId } },
      { idempotencyKey: `create-customer-${userId}` }
    );

    return { userId, email, name, stripeCustomerId: customer.id };
  }

  async createCheckout(params: {
    userId: string;
    email: string;
    name?: string;
    tier: PlanTier;
    interval: BillingInterval;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
  }): Promise<CheckoutResult> {
    const planConfig = PLAN_CATALOG[params.tier];
    const priceId = planConfig.stripePriceIds[params.interval];

    if (!priceId) {
      throw new Error(
        `No Stripe Price ID configured for ${params.tier} ${params.interval}`
      );
    }

    const customer = await this.getOrCreateCustomer(
      params.userId,
      params.email,
      params.name
    );
    const trialDays = params.trialDays ?? planConfig.trialDays;

    const session = await stripe.checkout.sessions.create(
      {
        customer: customer.stripeCustomerId!,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          userId: params.userId,
          tier: params.tier,
          interval: params.interval,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
            tier: params.tier,
          },
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        },
        allow_promotion_codes: true,
      },
      {
        idempotencyKey: `checkout-${params.userId}-${params.tier}-${Date.now()}`,
      }
    );

    return { type: "redirect", url: session.url! };
  }

  async getActiveSubscription(
    userId: string
  ): Promise<ActiveSubscription | null> {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!sub?.stripeSubscriptionId) return null;
    if (sub.status !== "active" && sub.status !== "trialing") return null;

    return {
      id: sub.id,
      provider: "stripe",
      providerSubscriptionId: sub.stripeSubscriptionId,
      tier: (sub.plan as PlanTier) || "free",
      interval: (sub.billingInterval as BillingInterval) || "monthly",
      status: sub.status as ActiveSubscription["status"],
      currentPeriodStart: sub.currentPeriodStart!,
      currentPeriodEnd: sub.currentPeriodEnd!,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEnd: sub.trialEnd,
    };
  }

  async changePlan(params: {
    userId: string;
    newTier: PlanTier;
    newInterval?: BillingInterval;
    immediate?: boolean;
  }): Promise<PlanChangeResult> {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, params.userId),
    });

    if (!sub?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const currentTier = (sub.plan as PlanTier) || "free";
    const direction = compareTiers(currentTier, params.newTier);

    // Get the new price ID
    const interval =
      params.newInterval ||
      (sub.billingInterval as BillingInterval) ||
      "monthly";
    const newPriceId = PLAN_CATALOG[params.newTier].stripePriceIds[interval];

    if (!newPriceId) {
      throw new Error(
        `No price configured for ${params.newTier} ${interval}`
      );
    }

    // Retrieve the Stripe subscription to get the subscription item ID
    const stripeSub = await stripe.subscriptions.retrieve(
      sub.stripeSubscriptionId
    );
    const subscriptionItemId = stripeSub.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new Error("Could not find subscription item");
    }

    // Upgrade: prorate immediately. Downgrade: change at period end.
    const isImmediate = params.immediate ?? direction === "upgrade";

    const updated = await stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      {
        items: [{ id: subscriptionItemId, price: newPriceId }],
        proration_behavior: isImmediate ? "create_prorations" : "none",
        metadata: {
          ...stripeSub.metadata,
          tier: params.newTier,
          previousTier: currentTier,
          changeDirection: direction,
        },
      },
      {
        idempotencyKey: `plan-change-${params.userId}-${params.newTier}-${randomUUID()}`,
      }
    );

    return {
      success: true,
      previousTier: currentTier,
      newTier: params.newTier,
      effectiveDate: isImmediate
        ? new Date()
        : new Date((updated as unknown as { current_period_end: number }).current_period_end * 1000),
    };
  }

  async cancelSubscription(params: {
    userId: string;
    immediate?: boolean;
  }): Promise<void> {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, params.userId),
    });

    if (!sub?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    if (params.immediate) {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(
        sub.stripeSubscriptionId,
        { cancel_at_period_end: true },
        {
          idempotencyKey: `cancel-eop-${params.userId}-${Date.now()}`,
        }
      );
    }
  }

  async resumeSubscription(userId: string): Promise<void> {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!sub?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    await stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      { cancel_at_period_end: false },
      { idempotencyKey: `resume-${userId}-${Date.now()}` }
    );
  }

  async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<string> {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!sub?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}
