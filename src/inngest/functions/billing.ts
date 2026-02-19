/**
 * Inngest Billing Functions
 *
 * Async lifecycle workflows triggered by billing webhook events:
 * - Welcome sequence on new subscription
 * - Trial ending notifications
 * - Win-back emails on cancellation
 * - Payment failure dunning
 * - Quota sync on plan changes
 */

import { inngest } from "../client";
import { syncQuotaLimits } from "@/lib/ai/quota-check";
import {
  sendWelcomeEmail,
  sendTrialEndingEmail,
  sendWinBackEmail,
  sendPaymentFailedEmail,
  sendPaymentActionRequiredEmail,
} from "@/lib/billing/billing-emails";

/**
 * Welcome sequence when a new subscription is created.
 * Syncs quota limits and sends welcome email.
 */
const onSubscriptionCreated = inngest.createFunction(
  {
    id: "billing-subscription-created",
    name: "Billing: Subscription Created",
    retries: 3,
  },
  { event: "billing/subscription.created" },
  async ({ event, step }) => {
    const { userId, tier, isTrialing } = event.data;

    // Sync AI quota limits to match the new plan
    await step.run("sync-quota-limits", async () => {
      await syncQuotaLimits(userId);
    });

    // Send welcome / trial start email
    await step.run("send-welcome-email", async () => {
      await sendWelcomeEmail(userId, tier, isTrialing);
    });

    return { userId, tier, isTrialing };
  }
);

/**
 * Handle plan changes (upgrade/downgrade).
 * Syncs quota limits to the new tier.
 */
const onPlanChanged = inngest.createFunction(
  {
    id: "billing-plan-changed",
    name: "Billing: Plan Changed",
    retries: 3,
  },
  { event: "billing/plan.changed" },
  async ({ event, step }) => {
    const { userId, previousTier, newTier } = event.data;

    await step.run("sync-quota-limits", async () => {
      await syncQuotaLimits(userId);
    });

    await step.run("log-plan-change", async () => {
      console.log(
        `[billing] Plan changed: user=${userId} ${previousTier} -> ${newTier}`
      );
    });

    return { userId, previousTier, newTier };
  }
);

/**
 * Trial ending notification (3 days before expiry).
 * Triggered by Stripe's `customer.subscription.trial_will_end` event.
 */
const onTrialEnding = inngest.createFunction(
  {
    id: "billing-trial-ending",
    name: "Billing: Trial Ending Soon",
    retries: 2,
  },
  { event: "billing/trial.ending" },
  async ({ event, step }) => {
    const { userId, trialEnd } = event.data;

    if (trialEnd) {
      await step.run("send-trial-ending-email", async () => {
        await sendTrialEndingEmail(userId, trialEnd);
      });
    }

    return { userId, trialEnd };
  }
);

/**
 * Trial converted to paid subscription.
 */
const onTrialConverted = inngest.createFunction(
  {
    id: "billing-trial-converted",
    name: "Billing: Trial Converted to Paid",
    retries: 2,
  },
  { event: "billing/trial.converted" },
  async ({ event, step }) => {
    const { userId, tier } = event.data;

    await step.run("send-conversion-email", async () => {
      await sendWelcomeEmail(userId, tier, false);
    });

    return { userId, tier };
  }
);

/**
 * Win-back sequence on subscription cancellation.
 * Sends emails at day 3 and day 14 after cancellation.
 */
const onSubscriptionCanceled = inngest.createFunction(
  {
    id: "billing-subscription-canceled",
    name: "Billing: Cancellation Win-back",
    retries: 2,
  },
  { event: "billing/subscription.canceled" },
  async ({ event, step }) => {
    const { userId, previousTier } = event.data;

    // Downgrade quota immediately
    await step.run("sync-quota-to-free", async () => {
      await syncQuotaLimits(userId);
    });

    // Wait 3 days, then send first win-back email
    await step.sleep("wait-3-days", "3d");
    await step.run("send-winback-day3", async () => {
      await sendWinBackEmail(userId, previousTier, 3);
    });

    // Wait 11 more days (total 14), then send second win-back email
    await step.sleep("wait-11-more-days", "11d");
    await step.run("send-winback-day14", async () => {
      await sendWinBackEmail(userId, previousTier, 14);
    });

    return { userId, previousTier };
  }
);

/**
 * Payment failure dunning flow.
 * Notifies user about failed payment.
 */
const onPaymentFailed = inngest.createFunction(
  {
    id: "billing-payment-failed",
    name: "Billing: Payment Failed",
    retries: 2,
  },
  { event: "billing/payment.failed" },
  async ({ event, step }) => {
    const { userId, invoiceId, attemptCount } = event.data;

    await step.run("send-payment-failed-email", async () => {
      await sendPaymentFailedEmail(userId, attemptCount);
    });

    return { userId, invoiceId, attemptCount };
  }
);

/**
 * Payment action required (e.g., 3D Secure).
 */
const onPaymentActionRequired = inngest.createFunction(
  {
    id: "billing-payment-action-required",
    name: "Billing: Payment Action Required",
    retries: 2,
  },
  { event: "billing/payment.action_required" },
  async ({ event, step }) => {
    const { userId, invoiceId, hostedInvoiceUrl } = event.data;

    await step.run("send-action-required-email", async () => {
      await sendPaymentActionRequiredEmail(userId, hostedInvoiceUrl);
    });

    return { userId, invoiceId };
  }
);

export const billingFunctions = [
  onSubscriptionCreated,
  onPlanChanged,
  onTrialEnding,
  onTrialConverted,
  onSubscriptionCanceled,
  onPaymentFailed,
  onPaymentActionRequired,
];
