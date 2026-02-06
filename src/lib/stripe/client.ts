"use client";

import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe client instance (singleton)
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise || Promise.resolve(null);
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(sessionUrl: string) {
  window.location.href = sessionUrl;
}

/**
 * Redirect to Stripe Billing Portal
 */
export async function redirectToBillingPortal(portalUrl: string) {
  window.location.href = portalUrl;
}
