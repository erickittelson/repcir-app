import Stripe from "stripe";

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

// Type extension for subscription period fields (API returns these but types may lag)
type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

// Subscription plan configuration
export const PLANS = {
  free: {
    name: "Free",
    description: "Basic features for individuals",
    features: [
      "Track workouts",
      "Join 1 circle",
      "Basic analytics",
      "Community workouts",
    ],
    limits: {
      circles: 1,
      aiChatsPerMonth: 20,
      customWorkouts: 5,
    },
  },
  pro: {
    name: "Pro",
    description: "Everything you need to level up",
    priceMonthly: 9.99,
    priceYearly: 99.99,
    features: [
      "Everything in Free",
      "Unlimited circles",
      "Unlimited AI coaching",
      "Custom workout plans",
      "Advanced analytics",
      "Priority support",
    ],
    limits: {
      circles: Infinity,
      aiChatsPerMonth: Infinity,
      customWorkouts: Infinity,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // First, search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    allow_promotion_codes: true,
  });

  return session.url!;
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Get subscription status for a customer
 */
export async function getSubscriptionStatus(
  customerId: string
): Promise<{
  active: boolean;
  plan: PlanType;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return { active: false, plan: "free" };
  }

  const subscription = subscriptions.data[0] as unknown as SubscriptionWithPeriod;

  return {
    active: true,
    plan: "pro",
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
