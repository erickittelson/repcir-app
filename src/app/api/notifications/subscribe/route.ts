/**
 * Push Notifications Subscription API
 *
 * Handles subscribing and unsubscribing from push notifications.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { VAPID_PUBLIC_KEY } from "@/lib/notifications";

// Schema for push subscription
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

// GET: Get VAPID public key for client
export async function GET() {
  return NextResponse.json({
    publicKey: VAPID_PUBLIC_KEY,
  });
}

// POST: Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const validation = subscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid subscription format" },
        { status: 400 }
      );
    }

    const subscription = validation.data;

    // Update or create user profile with subscription
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    if (existingProfile) {
      await db
        .update(userProfiles)
        .set({
          pushSubscription: subscription,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));
    } else {
      await db.insert(userProfiles).values({
        userId,
        pushSubscription: subscription,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Push notifications enabled",
    });
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}

// DELETE: Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Remove push subscription
    await db
      .update(userProfiles)
      .set({
        pushSubscription: null,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    return NextResponse.json({
      success: true,
      message: "Push notifications disabled",
    });
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    );
  }
}
