/**
 * Onboarding Progress API
 * 
 * GET: Fetch current onboarding progress for the user
 * POST: Save/update onboarding progress
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, session.user.id),
    });

    if (!progress) {
      return NextResponse.json({ progress: null });
    }

    // If already completed, return completed status
    if (progress.completedAt) {
      return NextResponse.json({ 
        progress: null, 
        completed: true,
        completedAt: progress.completedAt,
      });
    }

    return NextResponse.json({
      progress: {
        currentPhase: progress.currentPhase,
        phaseIndex: progress.phaseIndex,
        extractedData: progress.extractedData,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentSection, data } = body;

    // Upsert progress
    await db
      .insert(onboardingProgress)
      .values({
        userId: session.user.id,
        currentPhase: `section_${currentSection}`,
        phaseIndex: currentSection,
        extractedData: data || {},
      })
      .onConflictDoUpdate({
        target: onboardingProgress.userId,
        set: {
          currentPhase: `section_${currentSection}`,
          phaseIndex: currentSection,
          extractedData: data || {},
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving onboarding progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
