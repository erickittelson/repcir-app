import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { sharedWorkouts, savedWorkouts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Save a workout to user's library
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
    // Check if workout exists
    const workout = await db.query.sharedWorkouts.findFirst({
      where: eq(sharedWorkouts.id, id),
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Check if already saved
    const existing = await db.query.savedWorkouts.findFirst({
      where: and(
        eq(savedWorkouts.userId, session.user.id),
        eq(savedWorkouts.sharedWorkoutId, id)
      ),
    });

    if (existing) {
      return NextResponse.json({ message: "Already saved" });
    }

    // Save the workout
    await db.insert(savedWorkouts).values({
      userId: session.user.id,
      sharedWorkoutId: id,
    });

    // Increment save count
    await db
      .update(sharedWorkouts)
      .set({
        saveCount: sql`${sharedWorkouts.saveCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(sharedWorkouts.id, id));

    return NextResponse.json({ success: true, message: "Workout saved" });
  } catch (error) {
    console.error("Error saving workout:", error);
    return NextResponse.json(
      { error: "Failed to save workout" },
      { status: 500 }
    );
  }
}

// Remove workout from saved
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Delete the saved entry
    const result = await db
      .delete(savedWorkouts)
      .where(
        and(
          eq(savedWorkouts.userId, session.user.id),
          eq(savedWorkouts.sharedWorkoutId, id)
        )
      );

    // Decrement save count
    await db
      .update(sharedWorkouts)
      .set({
        saveCount: sql`GREATEST(${sharedWorkouts.saveCount} - 1, 0)`,
      })
      .where(eq(sharedWorkouts.id, id));

    return NextResponse.json({ success: true, message: "Removed from saved" });
  } catch (error) {
    console.error("Error removing saved workout:", error);
    return NextResponse.json(
      { error: "Failed to remove workout" },
      { status: 500 }
    );
  }
}
