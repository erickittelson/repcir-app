import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challenges,
  challengeParticipants,
  challengeProgress,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { evaluateAndAwardBadges } from "@/lib/badges";

// Daily check-in for a challenge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { completedTasks, notes } = body;

    // Get challenge
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, id),
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Get participation
    const participation = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participation) {
      return NextResponse.json(
        { error: "Not enrolled in this challenge" },
        { status: 400 }
      );
    }

    if (participation.status !== "active") {
      return NextResponse.json(
        { error: "Challenge is not active" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const todayProgress = await db.query.challengeProgress.findFirst({
      where: and(
        eq(challengeProgress.participantId, participation.id),
        eq(challengeProgress.date, today)
      ),
    });

    if (todayProgress) {
      return NextResponse.json(
        { error: "Already checked in today" },
        { status: 400 }
      );
    }

    // Check if all required tasks are completed
    const requiredTasks = challenge.dailyTasks?.filter(
      (t: any) => t.isRequired
    ) || [];
    const completedRequired = requiredTasks.every((task: any) =>
      completedTasks?.includes(task.name)
    );

    if (!completedRequired) {
      // For challenges that restart on fail, this would reset progress
      if (challenge.restartOnFail) {
        await db
          .update(challengeParticipants)
          .set({
            currentDay: 1,
            currentStreak: 0,
            updatedAt: new Date(),
          })
          .where(eq(challengeParticipants.id, participation.id));

        return NextResponse.json({
          success: false,
          message: "Missing required tasks. Challenge progress reset.",
          reset: true,
        });
      }
    }

    // Record progress
    const newDayNumber = (participation.currentDay || 0) + 1;
    await db.insert(challengeProgress).values({
      participantId: participation.id,
      date: today,
      day: newDayNumber,
      completed: completedRequired,
      tasksCompleted: (completedTasks || []).map((task: string) => ({
        taskName: task,
        completed: true,
      })),
      notes,
    });

    // Calculate new streak (using newDayNumber from above)
    const newStreak = completedRequired
      ? (participation.currentStreak || 0) + 1
      : 0;
    const newLongestStreak = Math.max(
      newStreak,
      participation.longestStreak || 0
    );
    const newDaysCompleted = (participation.daysCompleted || 0) + 1;

    // Check if challenge is completed
    const isCompleted = newDayNumber >= challenge.durationDays;

    // Update participation
    await db
      .update(challengeParticipants)
      .set({
        currentDay: newDayNumber,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        daysCompleted: newDaysCompleted,
        status: isCompleted ? "completed" : "active",
        completedDate: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(challengeParticipants.id, participation.id));

    // If challenge is completed, update challenge stats and evaluate badges
    if (isCompleted) {
      await db
        .update(challenges)
        .set({
          completionCount: sql`${challenges.completionCount} + 1`,
        })
        .where(eq(challenges.id, id));

      // Evaluate badges for challenge completion
      evaluateAndAwardBadges({
        userId: session.user.id,
        trigger: "workout", // Use workout trigger which checks challenge completions
      }).catch((err) => {
        console.error("Badge evaluation error:", err);
      });

      return NextResponse.json({
        success: true,
        completed: true,
        message: `Congratulations! You completed ${challenge.name}!`,
        day: newDayNumber,
        streak: newStreak,
      });
    }

    return NextResponse.json({
      success: true,
      day: newDayNumber,
      streak: newStreak,
      daysRemaining: challenge.durationDays - newDayNumber,
    });
  } catch (error) {
    console.error("Error checking in:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
