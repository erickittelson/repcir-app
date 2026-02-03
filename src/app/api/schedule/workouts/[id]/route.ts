/**
 * Scheduled Workout Management API
 * 
 * GET - Get a specific scheduled workout
 * PUT - Update scheduled workout (reschedule, skip, complete, etc.)
 * DELETE - Remove a scheduled workout
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  scheduledWorkouts,
  userProgramSchedules,
  programWorkouts,
  workoutSessions,
} from "@/lib/db/schema";
import { eq, and, ne, gte, lte } from "drizzle-orm";
import { z } from "zod";

// Schema for workout updates
const workoutUpdateSchema = z.object({
  action: z.enum(["reschedule", "skip", "complete", "unschedule", "update"]),
  // For reschedule
  newDate: z.string().optional(),
  newTime: z.string().optional(),
  rescheduleReason: z.string().optional(),
  // For skip
  skipReason: z.string().optional(),
  // For complete
  workoutSessionId: z.string().optional(),
  // For update
  notes: z.string().optional(),
});

// GET - Get a specific scheduled workout
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const workout = await db
      .select({
        id: scheduledWorkouts.id,
        scheduledDate: scheduledWorkouts.scheduledDate,
        scheduledTime: scheduledWorkouts.scheduledTime,
        originalDate: scheduledWorkouts.originalDate,
        status: scheduledWorkouts.status,
        rescheduledCount: scheduledWorkouts.rescheduledCount,
        rescheduledFrom: scheduledWorkouts.rescheduledFrom,
        rescheduledReason: scheduledWorkouts.rescheduledReason,
        skippedReason: scheduledWorkouts.skippedReason,
        notes: scheduledWorkouts.notes,
        completedAt: scheduledWorkouts.completedAt,
        programWorkout: {
          id: programWorkouts.id,
          name: programWorkouts.name,
          focus: programWorkouts.focus,
          weekNumber: programWorkouts.weekNumber,
          dayNumber: programWorkouts.dayNumber,
          estimatedDuration: programWorkouts.estimatedDuration,
          workoutPlanId: programWorkouts.workoutPlanId,
        },
      })
      .from(scheduledWorkouts)
      .innerJoin(programWorkouts, eq(scheduledWorkouts.programWorkoutId, programWorkouts.id))
      .where(
        and(
          eq(scheduledWorkouts.id, id),
          eq(scheduledWorkouts.userId, session.user.id)
        )
      )
      .limit(1);

    if (workout.length === 0) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    return Response.json(workout[0]);
  } catch (error) {
    console.error("Error fetching scheduled workout:", error);
    return Response.json({ error: "Failed to fetch workout" }, { status: 500 });
  }
}

// PUT - Update scheduled workout
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const parseResult = workoutUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { action, newDate, newTime, rescheduleReason, skipReason, workoutSessionId, notes } =
      parseResult.data;

    // Verify workout belongs to user
    const existing = await db.query.scheduledWorkouts.findFirst({
      where: and(
        eq(scheduledWorkouts.id, id),
        eq(scheduledWorkouts.userId, session.user.id)
      ),
    });

    if (!existing) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    let updateData: Partial<typeof scheduledWorkouts.$inferInsert> = {
      updatedAt: new Date(),
    };

    switch (action) {
      case "reschedule":
        if (!newDate) {
          return Response.json({ error: "New date required for reschedule" }, { status: 400 });
        }

        // Check for conflicts on the new date
        const conflicts = await db.query.scheduledWorkouts.findFirst({
          where: and(
            eq(scheduledWorkouts.scheduleId, existing.scheduleId),
            eq(scheduledWorkouts.scheduledDate, newDate),
            ne(scheduledWorkouts.id, id)
          ),
        });

        if (conflicts) {
          return Response.json(
            { error: "Another workout is already scheduled for this date" },
            { status: 409 }
          );
        }

        updateData = {
          ...updateData,
          scheduledDate: newDate,
          scheduledTime: newTime || existing.scheduledTime,
          rescheduledFrom: existing.scheduledDate,
          rescheduledCount: (existing.rescheduledCount || 0) + 1,
          rescheduledReason: rescheduleReason,
          status: "scheduled", // Reset status if it was missed
          originalDate: existing.originalDate || existing.scheduledDate, // Keep track of original
        };
        break;

      case "skip":
        updateData = {
          ...updateData,
          status: "skipped",
          skippedAt: new Date(),
          skippedReason: skipReason,
        };
        break;

      case "complete":
        updateData = {
          ...updateData,
          status: "completed",
          completedAt: new Date(),
          workoutSessionId: workoutSessionId,
        };
        break;

      case "unschedule":
        updateData = {
          ...updateData,
          status: "scheduled",
          completedAt: null,
          skippedAt: null,
          skippedReason: null,
        };
        break;

      case "update":
        updateData = {
          ...updateData,
          notes: notes,
          scheduledTime: newTime || existing.scheduledTime,
        };
        break;
    }

    const [updated] = await db
      .update(scheduledWorkouts)
      .set(updateData)
      .where(eq(scheduledWorkouts.id, id))
      .returning();

    return Response.json({
      success: true,
      workout: updated,
    });
  } catch (error) {
    console.error("Error updating scheduled workout:", error);
    return Response.json({ error: "Failed to update workout" }, { status: 500 });
  }
}

// DELETE - Remove a scheduled workout
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    // Verify workout belongs to user
    const existing = await db.query.scheduledWorkouts.findFirst({
      where: and(
        eq(scheduledWorkouts.id, id),
        eq(scheduledWorkouts.userId, session.user.id)
      ),
    });

    if (!existing) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    await db.delete(scheduledWorkouts).where(eq(scheduledWorkouts.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled workout:", error);
    return Response.json({ error: "Failed to delete workout" }, { status: 500 });
  }
}
