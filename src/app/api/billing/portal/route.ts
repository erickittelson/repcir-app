import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBillingService } from "@/lib/billing/billing-service";

export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const billing = createBillingService();

    const portalUrl = await billing.createPortalSession(
      session.user.id,
      `${baseUrl}/you`
    );

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
