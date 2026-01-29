import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  sharedWorkouts,
  workoutPlans,
  workoutPlanExercises,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Duplicate a shared workout to user's own workout plans
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

    // Get the original workout plan
    const originalPlan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, sharedWorkout.workoutPlanId),
    });

    if (!originalPlan) {
      return NextResponse.json(
        { error: "Original workout plan not found" },
        { status: 404 }
      );
    }

    // Get the active circle
    const circleId = session.activeCircle?.id;
    const memberId = session.activeCircle?.memberId;

    if (!circleId || !memberId) {
      return NextResponse.json(
        { error: "No active circle" },
        { status: 400 }
      );
    }

    // Get original exercises
    const originalExercises = await db.query.workoutPlanExercises.findMany({
      where: eq(workoutPlanExercises.planId, originalPlan.id),
      orderBy: (e, { asc }) => [asc(e.order)],
    });

    // Create new workout plan for the user's circle
    const [newPlan] = await db
      .insert(workoutPlans)
      .values({
        circleId,
        name: `${originalPlan.name} (Copy)`,
        description: originalPlan.description,
        category: originalPlan.category,
        difficulty: originalPlan.difficulty,
        estimatedDuration: originalPlan.estimatedDuration,
        structureType: originalPlan.structureType,
        timeCapSeconds: originalPlan.timeCapSeconds,
        scoringType: originalPlan.scoringType,
        roundsTarget: originalPlan.roundsTarget,
        emomIntervalSeconds: originalPlan.emomIntervalSeconds,
        aiGenerated: false,
        createdByMemberId: memberId,
        isOfficial: false,
        tags: originalPlan.tags,
        warmupNotes: originalPlan.warmupNotes,
        cooldownNotes: originalPlan.cooldownNotes,
        scalingNotes: originalPlan.scalingNotes,
      })
      .returning();

    // Duplicate exercises
    if (originalExercises.length > 0) {
      await db.insert(workoutPlanExercises).values(
        originalExercises.map((ex) => ({
          planId: newPlan.id,
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          duration: ex.duration,
          distance: ex.distance,
          notes: ex.notes,
          groupId: ex.groupId,
          groupType: ex.groupType,
          restBetweenSets: ex.restBetweenSets,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      id: newPlan.id,
      message: "Workout duplicated successfully",
    });
  } catch (error) {
    console.error("Error duplicating workout:", error);
    return NextResponse.json(
      { error: "Failed to duplicate workout" },
      { status: 500 }
    );
  }
}
