import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutPlans, workoutPlanExercises } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plans = await db.query.workoutPlans.findMany({
      where: and(
        eq(workoutPlans.circleId, session.circleId),
        eq(workoutPlans.isDraft, false)
      ),
      with: {
        exercises: true,
      },
    });

    const formattedPlans = (plans || []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
      estimatedDuration: plan.estimatedDuration,
      visibility: plan.visibility,
      exerciseCount: plan.exercises?.length || 0,
    }));

    return NextResponse.json(formattedPlans);
  } catch (error) {
    console.error("Error fetching workout plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      difficulty,
      estimatedDuration,
      exercises,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the workout plan
    const [plan] = await db
      .insert(workoutPlans)
      .values({
        circleId: session.circleId,
        name,
        description,
        category,
        difficulty,
        estimatedDuration,
      })
      .returning();

    // Add exercises to the plan
    if (exercises && exercises.length > 0) {
      await db.insert(workoutPlanExercises).values(
        exercises.map((ex: any) => ({
          planId: plan.id,
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          duration: ex.duration,
          restBetweenSets: ex.restBetweenSets,
          notes: ex.notes,
        }))
      );
    }

    return NextResponse.json({ id: plan.id, name: plan.name });
  } catch (error) {
    console.error("Error creating workout plan:", error);
    return NextResponse.json(
      { error: "Failed to create workout plan" },
      { status: 500 }
    );
  }
}
