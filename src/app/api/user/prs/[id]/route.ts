import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { personalRecords, exercises } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const memberId = session.activeCircle?.memberId;

    if (!memberId) {
      return NextResponse.json({ error: "No active circle member" }, { status: 400 });
    }

    const pr = await db.query.personalRecords.findFirst({
      where: and(
        eq(personalRecords.id, id),
        eq(personalRecords.memberId, memberId)
      ),
      with: {
        exercise: true,
      },
    });

    if (!pr) {
      return NextResponse.json({ error: "PR not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      pr: {
        id: pr.id,
        exerciseName: pr.exercise?.name || "Unknown",
        value: pr.value,
        unit: pr.unit,
      }
    });
  } catch (error) {
    console.error("Error fetching PR:", error);
    return NextResponse.json({ error: "Failed to fetch PR" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const memberId = session.activeCircle?.memberId;

    if (!memberId) {
      return NextResponse.json({ error: "No active circle member" }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query.personalRecords.findFirst({
      where: and(
        eq(personalRecords.id, id),
        eq(personalRecords.memberId, memberId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "PR not found" }, { status: 404 });
    }

    const body = await request.json();
    const { exerciseName, value, unit } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle exercise name change
    if (exerciseName !== undefined) {
      let exercise = await db.query.exercises.findFirst({
        where: ilike(exercises.name, exerciseName),
      });

      if (!exercise) {
        const [newExercise] = await db.insert(exercises).values({
          name: exerciseName,
          category: "strength",
          muscleGroups: [],
          isCustom: true,
        }).returning();
        exercise = newExercise;
      }

      updateData.exerciseId = exercise.id;
    }

    if (value !== undefined) updateData.value = parseFloat(value);
    if (unit !== undefined) updateData.unit = unit;

    const [pr] = await db
      .update(personalRecords)
      .set(updateData)
      .where(eq(personalRecords.id, id))
      .returning();

    // Get exercise name for response
    const updatedPr = await db.query.personalRecords.findFirst({
      where: eq(personalRecords.id, id),
      with: { exercise: true },
    });

    return NextResponse.json({ 
      pr: {
        id: pr.id,
        exerciseName: updatedPr?.exercise?.name || exerciseName || "Unknown",
        value: pr.value,
        unit: pr.unit,
      }
    });
  } catch (error) {
    console.error("Error updating PR:", error);
    return NextResponse.json({ error: "Failed to update PR" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const memberId = session.activeCircle?.memberId;

    if (!memberId) {
      return NextResponse.json({ error: "No active circle member" }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query.personalRecords.findFirst({
      where: and(
        eq(personalRecords.id, id),
        eq(personalRecords.memberId, memberId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "PR not found" }, { status: 404 });
    }

    await db.delete(personalRecords).where(eq(personalRecords.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PR:", error);
    return NextResponse.json({ error: "Failed to delete PR" }, { status: 500 });
  }
}
