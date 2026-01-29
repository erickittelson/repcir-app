import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutPlans,
  workoutPlanExercises,
  sharedWorkouts,
  exercises,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get shared workouts for discovery
    const workouts = await db.query.sharedWorkouts.findMany({
      where: eq(sharedWorkouts.visibility, "public"),
      orderBy: desc(sharedWorkouts.createdAt),
      limit: 50,
    });

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
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
    const {
      name,
      description,
      category,
      visibility = "private",
      exercises: exerciseList = [],
      estimatedDuration,
      difficulty,
      targetMuscles,
      equipmentRequired,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const circleId = session.activeCircle?.id;
    if (!circleId) {
      return NextResponse.json(
        { error: "No active circle" },
        { status: 400 }
      );
    }

    // Create workout plan
    const [workoutPlan] = await db
      .insert(workoutPlans)
      .values({
        circleId,
        name,
        description,
        category,
        estimatedDuration,
        difficulty,
        createdByMemberId: session.activeCircle?.memberId,
      })
      .returning();

    // Add exercises to the plan
    if (exerciseList.length > 0) {
      // First, try to find or create exercises
      for (let i = 0; i < exerciseList.length; i++) {
        const ex = exerciseList[i];

        // Try to find existing exercise by name
        let exercise = await db.query.exercises.findFirst({
          where: eq(exercises.name, ex.name),
        });

        // If no exercise found, create a placeholder
        if (!exercise) {
          const [newExercise] = await db
            .insert(exercises)
            .values({
              name: ex.name,
              category: category || "general",
              isCustom: true,
            })
            .returning();
          exercise = newExercise;
        }

        // Add to workout plan
        await db.insert(workoutPlanExercises).values({
          planId: workoutPlan.id,
          exerciseId: exercise.id,
          order: i + 1,
          sets: ex.sets || 3,
          reps: String(ex.reps || 10),
          restBetweenSets: ex.restSeconds || 60,
          notes: ex.notes,
        });
      }
    }

    // If visibility is not private, create a shared workout entry
    if (visibility !== "private") {
      await db.insert(sharedWorkouts).values({
        workoutPlanId: workoutPlan.id,
        userId: session.user.id,
        title: name,
        description,
        category,
        difficulty,
        estimatedDuration,
        targetMuscles,
        equipmentRequired,
        visibility,
      });
    }

    return NextResponse.json({
      success: true,
      workoutPlan,
    });
  } catch (error) {
    console.error("Error creating workout:", error);
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
