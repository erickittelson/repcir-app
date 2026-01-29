import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { personalRecords, exercises } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = session.activeCircle?.memberId;
    if (!memberId) {
      return NextResponse.json({ prs: [] });
    }

    const prs = await db.query.personalRecords.findMany({
      where: eq(personalRecords.memberId, memberId),
      with: {
        exercise: true,
      },
    });

    return NextResponse.json({ 
      prs: prs.map((pr) => ({
        id: pr.id,
        exerciseName: pr.exercise?.name || "Unknown",
        value: pr.value,
        unit: pr.unit,
      }))
    });
  } catch (error) {
    console.error("Error fetching PRs:", error);
    return NextResponse.json({ error: "Failed to fetch PRs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = session.activeCircle?.memberId;
    if (!memberId) {
      return NextResponse.json({ error: "No active circle member" }, { status: 400 });
    }

    const body = await request.json();
    const { exerciseName, value, unit } = body;

    if (!exerciseName || !value || !unit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find or create exercise
    let exercise = await db.query.exercises.findFirst({
      where: ilike(exercises.name, exerciseName),
    });

    if (!exercise) {
      // Create a custom exercise
      const [newExercise] = await db.insert(exercises).values({
        name: exerciseName,
        category: "strength",
        muscleGroups: [],
        isCustom: true,
      }).returning();
      exercise = newExercise;
    }

    const [pr] = await db.insert(personalRecords).values({
      memberId,
      exerciseId: exercise.id,
      value: parseFloat(value),
      unit,
      date: new Date(),
    }).returning();

    return NextResponse.json({ 
      pr: {
        id: pr.id,
        exerciseName,
        value: pr.value,
        unit: pr.unit,
      }
    });
  } catch (error) {
    console.error("Error creating PR:", error);
    return NextResponse.json({ error: "Failed to create PR" }, { status: 500 });
  }
}
