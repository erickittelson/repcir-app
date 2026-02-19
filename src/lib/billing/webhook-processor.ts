/**
 * Idempotent Webhook Processor
 *
 * Handles Stripe webhook events with:
 * - Event deduplication via webhook_events table
 * - Multi-tier plan resolution from PLAN_CATALOG
 * - Cache invalidation on plan changes
 * - Inngest event emission for async lifecycle workflows
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions, webhookEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateUserCache } from "@/lib/cache";
import { resolvePriceIdToTier, resolvePriceIdToInterval } from "./plans";
import { inngest } from "@/inngest/client";
import { trackServerEvent } from "@/lib/posthog/server";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

/**
 * Check if a webhook event has already been processed (idempotency).
 * Returns true if already processed (caller should skip).
 */
async function isEventProcessed(
  provider: string,
  eventId: string
): Promise<boolean> {
  const existing = await db.query.webhookEvents.findFirst({
    where: (events, { and, eq: e }) =>
      and(e(events.provider, provider), e(events.eventId, eventId)),
  });
  return !!existing;
}

/**
 * Record that a webhook event was processed.
 */
async function recordEvent(
  provider: string,
  eventId: string,
  eventType: string,
  error?: string
): Promise<void> {
  await db
    .insert(webhookEvents)
    .values({ provider, eventId, eventType, error })
    .onConflictDoNothing();
}

/**
 * Look up userId from a Stripe customerId.
 */
async function getUserIdFromCustomerId(
  customerId: string
): Promise<string | null> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeCustomerId, customerId),
    columns: { userId: true },
  });
  return sub?.userId || null;
}

/**
 * Process a verified Stripe webhook event.
 * Returns { handled: boolean } — true if the event was processed,
 * false if it was a duplicate or unhandled type.
 */
export async function processStripeWebhook(
  event: Stripe.Event
): Promise<{ handled: boolean }> {
  // Idempotency check
  if (await isEventProcessed("stripe", event.id)) {
    return { handled: false };
  }

  let error: string | undefined;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as unknown as SubscriptionWithPeriod
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as unknown as SubscriptionWithPeriod
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.paused":
        await handleSubscriptionPaused(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.resumed":
        await handleSubscriptionResumed(
          event.data.object as unknown as SubscriptionWithPeriod
        );
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      case "invoice.payment_action_required":
        await handlePaymentActionRequired(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await recordEvent("stripe", event.id, event.type, error);
  }

  return { handled: true };
}

// ---------------------------------------------------------------------------
// Individual event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // PostHog tracking is handled by the client-side success page.
  // The subscription.created event handles the actual DB upsert.
  await inngest.send({
    name: "billing/checkout.completed",
    data: {
      userId,
      tier: session.metadata?.tier || "plus",
      interval: session.metadata?.interval || "monthly",
      sessionId: session.id,
    },
  });
}

async function handleSubscriptionCreated(
  subscription: SubscriptionWithPeriod
): Promise<void> {
  const customerId = subscription.customer as string;
  const userId =
    subscription.metadata?.userId ||
    (await getUserIdFromCustomerId(customerId));
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? resolvePriceIdToTier(priceId) : null;
  const interval = priceId ? resolvePriceIdToInterval(priceId) : null;

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: tier || "plus",
      billingInterval: interval || "monthly",
      billingProvider: "stripe",
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan: tier || "plus",
        billingInterval: interval || "monthly",
        billingProvider: "stripe",
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        updatedAt: new Date(),
      },
    });

  await invalidateUserCache(userId);

  // Emit Inngest event for welcome sequence / quota setup
  await inngest.send({
    name: "billing/subscription.created",
    data: {
      userId,
      tier: tier || "plus",
      interval: interval || "monthly",
      isTrialing: subscription.status === "trialing",
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    },
  });

  // PostHog: track subscription start or trial start
  const eventName = subscription.status === "trialing" ? "trial_started" : "subscription_started";
  await trackServerEvent(userId, eventName, {
    tier: tier || "plus",
    interval: interval || "monthly",
    stripe_subscription_id: subscription.id,
  });
}

async function handleSubscriptionUpdated(
  subscription: SubscriptionWithPeriod
): Promise<void> {
  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomerId(customerId);
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? resolvePriceIdToTier(priceId) : null;
  const interval = priceId ? resolvePriceIdToInterval(priceId) : null;

  // Get previous state for comparison
  const previousSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    columns: { plan: true, status: true },
  });
  const previousTier = previousSub?.plan || "free";
  const previousStatus = previousSub?.status || "active";

  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      stripePriceId: priceId,
      ...(tier ? { plan: tier } : {}),
      ...(interval ? { billingInterval: interval } : {}),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  await invalidateUserCache(userId);

  // Detect plan changes
  if (tier && tier !== previousTier) {
    await inngest.send({
      name: "billing/plan.changed",
      data: {
        userId,
        previousTier,
        newTier: tier,
        interval: interval || "monthly",
      },
    });

    const direction = tier > previousTier ? "subscription_upgraded" : "subscription_downgraded";
    await trackServerEvent(userId, direction, {
      previous_tier: previousTier,
      new_tier: tier,
      interval: interval || "monthly",
    });
  }

  // Detect trial -> paid conversion
  if (previousStatus === "trialing" && subscription.status === "active") {
    await inngest.send({
      name: "billing/trial.converted",
      data: { userId, tier: tier || previousTier },
    });

    await trackServerEvent(userId, "trial_converted", {
      tier: tier || previousTier,
    });
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const userId = await getUserIdFromCustomerId(customerId);

  const previousSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeCustomerId, customerId),
    columns: { plan: true },
  });

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      plan: "free",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  if (userId) {
    await invalidateUserCache(userId);

    // Emit for win-back sequence
    await inngest.send({
      name: "billing/subscription.canceled",
      data: {
        userId,
        previousTier: previousSub?.plan || "pro",
        canceledAt: new Date().toISOString(),
      },
    });

    await trackServerEvent(userId, "subscription_canceled", {
      previous_tier: previousSub?.plan || "pro",
    });
  }
}

async function handleSubscriptionPaused(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  await db
    .update(subscriptions)
    .set({ status: "paused", updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  const userId = await getUserIdFromCustomerId(customerId);
  if (userId) await invalidateUserCache(userId);
}

async function handleSubscriptionResumed(
  subscription: SubscriptionWithPeriod
): Promise<void> {
  const customerId = subscription.customer as string;

  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  const userId = await getUserIdFromCustomerId(customerId);
  if (userId) await invalidateUserCache(userId);
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId =
    subscription.metadata?.userId ||
    (await getUserIdFromCustomerId(subscription.customer as string));
  if (!userId) return;

  await inngest.send({
    name: "billing/trial.ending",
    data: {
      userId,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // Restore from past_due
  await db
    .update(subscriptions)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  const userId = await getUserIdFromCustomerId(customerId);
  if (userId) await invalidateUserCache(userId);
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  const userId = await getUserIdFromCustomerId(customerId);
  if (userId) {
    await invalidateUserCache(userId);

    await inngest.send({
      name: "billing/payment.failed",
      data: {
        userId,
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count ?? 1,
      },
    });

    await trackServerEvent(userId, "payment_failed", {
      attempt_count: invoice.attempt_count ?? 1,
    });
  }
}

async function handlePaymentActionRequired(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;
  const userId = await getUserIdFromCustomerId(customerId);
  if (!userId) return;

  // 3D Secure or other action required — notify user
  await inngest.send({
    name: "billing/payment.action_required",
    data: {
      userId,
      invoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    },
  });
}
