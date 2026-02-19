import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBillingService } from "@/lib/billing/billing-service";
import { PLAN_TIERS } from "@/lib/billing/types";
import { z } from "zod";

const upgradeSchema = z.object({
  newTier: z.enum(PLAN_TIERS).refine((t) => t !== "free", {
    message: "Use the cancel endpoint to downgrade to free",
  }),
  newInterval: z.enum(["monthly", "yearly"]).optional(),
  immediate: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = upgradeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { newTier, newInterval, immediate } = validation.data;
    const billing = createBillingService();

    const result = await billing.changePlan({
      userId: session.user.id,
      newTier,
      newInterval,
      immediate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upgrade error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to change plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
