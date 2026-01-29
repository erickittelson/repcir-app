import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  communityPrograms,
  programEnrollments,
  programWorkouts,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Enroll in a program
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
    // Check if program exists
    const program = await db.query.communityPrograms.findFirst({
      where: eq(communityPrograms.id, id),
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Check if already enrolled
    const existing = await db.query.programEnrollments.findFirst({
      where: and(
        eq(programEnrollments.programId, id),
        eq(programEnrollments.userId, session.user.id)
      ),
    });

    if (existing) {
      // If they quit before, allow re-enrollment
      if (existing.status === "quit") {
        // Get total workouts
        const workoutCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(programWorkouts)
          .where(eq(programWorkouts.programId, id));

        await db
          .update(programEnrollments)
          .set({
            status: "active",
            currentWeek: 1,
            currentDay: 1,
            workoutsCompleted: 0,
            totalWorkouts: workoutCount[0]?.count || 0,
            startDate: new Date(),
            completedDate: null,
            updatedAt: new Date(),
          })
          .where(eq(programEnrollments.id, existing.id));

        return NextResponse.json({
          success: true,
          message: "Re-enrolled in program",
          enrollmentId: existing.id,
        });
      }

      return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
    }

    // Get total workouts
    const workoutCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(programWorkouts)
      .where(eq(programWorkouts.programId, id));

    // Create enrollment
    const [enrollment] = await db
      .insert(programEnrollments)
      .values({
        programId: id,
        userId: session.user.id,
        status: "active",
        currentWeek: 1,
        currentDay: 1,
        workoutsCompleted: 0,
        totalWorkouts: workoutCount[0]?.count || 0,
        startDate: new Date(),
      })
      .returning();

    // Increment enrollment count
    await db
      .update(communityPrograms)
      .set({
        enrollmentCount: sql`${communityPrograms.enrollmentCount} + 1`,
      })
      .where(eq(communityPrograms.id, id));

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled",
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    console.error("Error enrolling in program:", error);
    return NextResponse.json(
      { error: "Failed to enroll" },
      { status: 500 }
    );
  }
}

// Leave/quit a program
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
    // Find enrollment
    const enrollment = await db.query.programEnrollments.findFirst({
      where: and(
        eq(programEnrollments.programId, id),
        eq(programEnrollments.userId, session.user.id)
      ),
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 404 });
    }

    // Mark as quit (soft delete)
    await db
      .update(programEnrollments)
      .set({
        status: "quit",
        updatedAt: new Date(),
      })
      .where(eq(programEnrollments.id, enrollment.id));

    // Decrement enrollment count
    await db
      .update(communityPrograms)
      .set({
        enrollmentCount: sql`GREATEST(${communityPrograms.enrollmentCount} - 1, 0)`,
      })
      .where(eq(communityPrograms.id, id));

    return NextResponse.json({
      success: true,
      message: "Left program",
    });
  } catch (error) {
    console.error("Error leaving program:", error);
    return NextResponse.json(
      { error: "Failed to leave program" },
      { status: 500 }
    );
  }
}
