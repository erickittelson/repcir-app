import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  sharedWorkouts,
  workoutPlans,
  workoutPlanExercises,
  workoutSessions,
  workoutSessionExercises,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Start a workout session from a shared workout
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
    // Get shared workout
    const sharedWorkout = await db.query.sharedWorkouts.findFirst({
      where: eq(sharedWorkouts.id, id),
    });

    if (!sharedWorkout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Get the workout plan
    const workoutPlan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, sharedWorkout.workoutPlanId),
    });

    if (!workoutPlan) {
      return NextResponse.json(
        { error: "Workout plan not found" },
        { status: 404 }
      );
    }

    // Get exercises for this workout
    const planExercises = await db.query.workoutPlanExercises.findMany({
      where: eq(workoutPlanExercises.planId, workoutPlan.id),
      orderBy: (e, { asc }) => [asc(e.order)],
    });

    // Get member ID for the active circle
    const memberId = session.activeCircle?.memberId;
    if (!memberId) {
      return NextResponse.json(
        { error: "No active circle" },
        { status: 400 }
      );
    }

    // Create workout session
    const [newSession] = await db
      .insert(workoutSessions)
      .values({
        memberId,
        planId: workoutPlan.id,
        name: sharedWorkout.title,
        date: new Date(),
        startTime: new Date(),
        status: "in_progress",
      })
      .returning();

    // Create session exercises
    if (planExercises.length > 0) {
      await db.insert(workoutSessionExercises).values(
        planExercises.map((ex) => ({
          sessionId: newSession.id,
          exerciseId: ex.exerciseId,
          order: ex.order,
          completed: false,
        }))
      );
    }

    // Increment use count on the shared workout
    await db
      .update(sharedWorkouts)
      .set({
        useCount: sql`${sharedWorkouts.useCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(sharedWorkouts.id, id));

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      message: "Workout started",
    });
  } catch (error) {
    console.error("Error starting workout:", error);
    return NextResponse.json(
      { error: "Failed to start workout" },
      { status: 500 }
    );
  }
}
