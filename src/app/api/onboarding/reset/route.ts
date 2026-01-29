/**
 * Onboarding Reset API
 *
 * Clears all onboarding progress for a user so they can start fresh.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete all onboarding progress for this user
    await db
      .delete(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId));

    return NextResponse.json({
      success: true,
      message: "Onboarding progress has been reset",
    });
  } catch (error) {
    console.error("Error resetting onboarding:", error);
    return NextResponse.json(
      { error: "Failed to reset onboarding progress" },
      { status: 500 }
    );
  }
}
