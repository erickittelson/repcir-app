import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBillingService } from "@/lib/billing/billing-service";
import { PLAN_TIERS } from "@/lib/billing/types";
import { z } from "zod";

const checkoutSchema = z.object({
  tier: z.enum(PLAN_TIERS).refine((t) => t !== "free", {
    message: "Cannot checkout for the free tier",
  }),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  trialDays: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tier, interval, trialDays } = validation.data;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const billing = createBillingService();

    const result = await billing.createCheckout({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      tier,
      interval,
      successUrl: `${baseUrl}/you/plan/success?tier=${tier}`,
      cancelUrl: `${baseUrl}/you/plan?canceled=true`,
      trialDays,
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
