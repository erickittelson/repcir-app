import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutPlans,
  workoutPlanExercises,
  sharedWorkouts,
  exercises,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

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

    // Add exercises to the plan (batched queries to avoid N+1)
    if (exerciseList.length > 0) {
      // Batch fetch all existing exercises by name in ONE query
      const exerciseNames = exerciseList.map((ex: { name: string }) => ex.name);
      const existingExercises = await db.query.exercises.findMany({
        where: inArray(exercises.name, exerciseNames),
      });

      // Build a map of name -> exercise for quick lookups
      const exerciseMap = new Map<string, typeof existingExercises[0]>();
      for (const ex of existingExercises) {
        exerciseMap.set(ex.name, ex);
      }

      // Find exercises that need to be created
      const missingNames = exerciseNames.filter((name: string) => !exerciseMap.has(name));

      // Batch create missing exercises
      if (missingNames.length > 0) {
        const newExercises = await db
          .insert(exercises)
          .values(
            missingNames.map((name: string) => ({
              name,
              category: category || "general",
              isCustom: true,
            }))
          )
          .returning();

        // Add newly created exercises to the map
        for (const ex of newExercises) {
          exerciseMap.set(ex.name, ex);
        }
      }

      // Batch insert all workout plan exercises
      const planExerciseValues = exerciseList.map(
        (ex: { name: string; sets?: number; reps?: number; restSeconds?: number; notes?: string }, i: number) => ({
          planId: workoutPlan.id,
          exerciseId: exerciseMap.get(ex.name)!.id,
          order: i + 1,
          sets: ex.sets || 3,
          reps: String(ex.reps || 10),
          restBetweenSets: ex.restSeconds || 60,
          notes: ex.notes,
        })
      );

      await db.insert(workoutPlanExercises).values(planExerciseValues);
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
