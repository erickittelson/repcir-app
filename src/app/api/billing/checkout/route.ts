import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  interval: z.enum(["monthly", "yearly"]).optional(),
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

    const { priceId } = validation.data;

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      session.user.id,
      session.user.email,
      session.user.name
    );

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create checkout session
    const checkoutUrl = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${baseUrl}/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/settings/billing?canceled=true`,
      userId: session.user.id,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
