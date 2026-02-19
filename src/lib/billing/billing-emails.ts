/**
 * Billing Email Templates via Resend
 *
 * Used by Inngest billing functions for lifecycle emails:
 * welcome, trial ending, win-back, payment failure
 */

import { Resend } from "resend";
import { db } from "@/lib/db";
import { subscriptions, userProfiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

const FROM = "Repcir <noreply@repcir.com>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

async function getUserEmail(userId: string): Promise<string | null> {
  // Try Stripe customer email first (most reliable for billing)
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    columns: { stripeCustomerId: true },
  });

  if (sub?.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(sub.stripeCustomerId);
      if (!customer.deleted && customer.email) {
        return customer.email;
      }
    } catch {
      // Fall through to profile lookup
    }
  }

  // Fallback: query Neon Auth users table via parameterized SQL
  try {
    const result = await db.execute(
      sql`SELECT email FROM auth.users WHERE id = ${userId} LIMIT 1`
    );
    const rows = result as unknown as Array<{ email: string }>;
    if (rows[0]?.email) return rows[0].email;
  } catch {
    // auth.users may not be accessible in all contexts
  }

  return null;
}

async function getUserName(userId: string): Promise<string> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { displayName: true },
  });
  return profile?.displayName || "there";
}

export async function sendWelcomeEmail(userId: string, tier: string, isTrialing: boolean) {
  const resend = getResend();
  if (!resend) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const name = await getUserName(userId);
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: isTrialing
      ? `Welcome to Repcir ${tierName} — your trial is active`
      : `Welcome to Repcir ${tierName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hey ${name},</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          ${isTrialing
            ? `Your ${tierName} trial is now active. You have 7 days to explore everything — unlimited AI workouts, coaching, and more.`
            : `You're now on the ${tierName} plan. All your new features are unlocked and ready to go.`
          }
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Ready to get started?
        </p>
        <a href="https://app.repcir.com/workout/generate" style="display: inline-block; background: #c8a232; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
          Generate a Workout
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 24px;">
          — The Repcir Team
        </p>
      </div>
    `,
  });
}

export async function sendTrialEndingEmail(userId: string, trialEnd: string) {
  const resend = getResend();
  if (!resend) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const name = await getUserName(userId);
  const endDate = new Date(trialEnd).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your Repcir trial ends in 3 days",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hey ${name},</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your trial ends on <strong>${endDate}</strong>. After that, you'll be moved to the Free plan with limited AI workouts and chat.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          To keep your full access, your subscription will continue automatically — no action needed.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          If you'd prefer to cancel, you can do so from your account settings before ${endDate}.
        </p>
        <a href="https://app.repcir.com/you/plan" style="display: inline-block; background: #c8a232; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
          Manage Your Plan
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 24px;">
          — The Repcir Team
        </p>
      </div>
    `,
  });
}

export async function sendWinBackEmail(userId: string, previousTier: string, daysSinceCancellation: number) {
  const resend = getResend();
  if (!resend) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const name = await getUserName(userId);
  const tierName = previousTier.charAt(0).toUpperCase() + previousTier.slice(1);

  const isDay3 = daysSinceCancellation <= 5;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: isDay3
      ? "We miss you — your AI coaching memory is waiting"
      : `Come back to Repcir ${tierName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hey ${name},</h1>
        ${isDay3
          ? `<p style="font-size: 16px; line-height: 1.6; color: #333;">
              Your AI coaching memory and workout preferences are still saved. Pick up right where you left off.
            </p>`
          : `<p style="font-size: 16px; line-height: 1.6; color: #333;">
              It's been a couple weeks since you left ${tierName}. Your circles and workout history are still here whenever you're ready.
            </p>`
        }
        <a href="https://app.repcir.com/you/plan" style="display: inline-block; background: #c8a232; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
          Reactivate Your Plan
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 24px;">
          — The Repcir Team
        </p>
      </div>
    `,
  });
}

export async function sendPaymentFailedEmail(userId: string, attemptCount: number) {
  const resend = getResend();
  if (!resend) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const name = await getUserName(userId);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Action needed: Your Repcir payment failed",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hey ${name},</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          We weren't able to process your payment${attemptCount > 1 ? ` (attempt ${attemptCount})` : ""}. Please update your payment method to keep your plan active.
        </p>
        <a href="https://app.repcir.com/you" style="display: inline-block; background: #c8a232; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
          Update Payment Method
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 24px;">
          If this was a mistake or you need help, reply to this email.
        </p>
        <p style="font-size: 14px; color: #888;">
          — The Repcir Team
        </p>
      </div>
    `,
  });
}

export async function sendPaymentActionRequiredEmail(userId: string, hostedInvoiceUrl: string | null) {
  const resend = getResend();
  if (!resend) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const name = await getUserName(userId);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Action required to complete your Repcir payment",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Hey ${name},</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your bank requires additional verification to process your payment. Please complete the verification to keep your subscription active.
        </p>
        ${hostedInvoiceUrl
          ? `<a href="${hostedInvoiceUrl}" style="display: inline-block; background: #c8a232; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
              Complete Verification
            </a>`
          : `<a href="https://app.repcir.com/you" style="display: inline-block; background: #c8a232; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
              Manage Billing
            </a>`
        }
        <p style="font-size: 14px; color: #888; margin-top: 24px;">
          — The Repcir Team
        </p>
      </div>
    `,
  });
}
