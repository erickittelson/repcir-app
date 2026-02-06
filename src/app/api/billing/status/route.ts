import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS, type PlanType } from "@/lib/stripe";
import { cacheUserData, CACHE_CONFIG } from "@/lib/cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subscription status (cached for 5 minutes)
    const billingData = await cacheUserData(
      session.user.id,
      "billing",
      async () => {
        const subscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, session.user.id),
        });

        const plan: PlanType = (subscription?.plan as PlanType) || "free";
        const planDetails = PLANS[plan];

        return {
          plan,
          planName: planDetails.name,
          features: planDetails.features,
          limits: planDetails.limits,
          status: subscription?.status || "active",
          currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
          cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
          hasActiveSubscription: subscription?.status === "active" && plan !== "free",
        };
      },
      CACHE_CONFIG.medium
    );

    return NextResponse.json(billingData);
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: "Failed to get billing status" },
      { status: 500 }
    );
  }
}
