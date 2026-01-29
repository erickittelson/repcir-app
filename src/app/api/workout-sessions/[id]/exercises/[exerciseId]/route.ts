import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { workoutSessions, workoutSessionExercises } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; exerciseId: string }>;
}

/**
 * Update exercise completion status within a workout session
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId, exerciseId } = await params;

  try {
    const body = await request.json();
    const { completed } = body;

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "completed must be a boolean" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const workoutSession = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, sessionId),
    });

    if (!workoutSession) {
      return NextResponse.json(
        { error: "Workout session not found" },
        { status: 404 }
      );
    }

    // Update the exercise completion status
    const [updated] = await db
      .update(workoutSessionExercises)
      .set({
        completed,
      })
      .where(
        and(
          eq(workoutSessionExercises.sessionId, sessionId),
          eq(workoutSessionExercises.id, exerciseId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Exercise not found in session" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      completed: updated.completed,
    });
  } catch (error) {
    console.error("Error updating exercise:", error);
    return NextResponse.json(
      { error: "Failed to update exercise" },
      { status: 500 }
    );
  }
}
