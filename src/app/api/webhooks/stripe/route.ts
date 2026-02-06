import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateUserCache } from "@/lib/cache";

// Helper to get userId from Stripe customerId for cache invalidation
async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeCustomerId, customerId),
    columns: { userId: true },
  });
  return sub?.userId || null;
}

// Type extension for subscription period fields (API returns these but types may lag)
type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && customerId && subscriptionId) {
          // Get subscription details with type assertion for period fields
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as SubscriptionWithPeriod;

          await db
            .insert(subscriptions)
            .values({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: subscription.items.data[0]?.price.id,
              plan: "pro",
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            })
            .onConflictDoUpdate({
              target: subscriptions.userId,
              set: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: subscription.items.data[0]?.price.id,
                plan: "pro",
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: new Date(),
              },
            });

          // Invalidate billing cache for this user
          await invalidateUserCache(userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as unknown as SubscriptionWithPeriod;
        const customerId = subscription.customer as string;

        await db
          .update(subscriptions)
          .set({
            status: subscription.status,
            stripePriceId: subscription.items.data[0]?.price.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));

        // Invalidate billing cache
        const userId = await getUserIdFromCustomerId(customerId);
        if (userId) await invalidateUserCache(userId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get userId before updating (for cache invalidation)
        const userId = await getUserIdFromCustomerId(customerId);

        await db
          .update(subscriptions)
          .set({
            status: "canceled",
            plan: "free",
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));

        // Invalidate billing cache
        if (userId) await invalidateUserCache(userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db
          .update(subscriptions)
          .set({
            status: "past_due",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));

        // Invalidate billing cache
        const userIdFailed = await getUserIdFromCustomerId(customerId);
        if (userIdFailed) await invalidateUserCache(userIdFailed);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Restore active status if was past_due
        await db
          .update(subscriptions)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));

        // Invalidate billing cache
        const userIdPaid = await getUserIdFromCustomerId(customerId);
        if (userIdPaid) await invalidateUserCache(userIdPaid);
        break;
      }

      default:
        // Unhandled event type
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
