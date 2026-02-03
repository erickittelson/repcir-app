/**
 * Program Schedule Management API
 * 
 * GET - Get user's schedule for a program enrollment
 * PUT - Update schedule preferences
 * POST - Generate/regenerate schedule based on preferences
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  userProgramSchedules,
  scheduledWorkouts,
  programEnrollments,
  programWorkouts,
  communityPrograms,
} from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { z } from "zod";

// Schema for schedule preferences
const schedulePreferencesSchema = z.object({
  preferredDays: z.array(z.number().min(0).max(6)).min(1).max(7),
  preferredTimeSlot: z.enum(["morning", "afternoon", "evening", "late_night"]).optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  autoReschedule: z.boolean().optional(),
  rescheduleWindowDays: z.number().min(1).max(7).optional(),
  minRestDays: z.number().min(0).max(3).optional(),
  maxConsecutiveWorkoutDays: z.number().min(1).max(7).optional(),
});

// GET - Get user's schedule for a program
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: programId } = await params;
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Get user's enrollment for this program
    const enrollment = await db.query.programEnrollments.findFirst({
      where: and(
        eq(programEnrollments.programId, programId),
        eq(programEnrollments.userId, session.user.id)
      ),
    });

    if (!enrollment) {
      return Response.json({ error: "Not enrolled in this program" }, { status: 404 });
    }

    // Get or create schedule preferences
    let schedule = await db.query.userProgramSchedules.findFirst({
      where: eq(userProgramSchedules.enrollmentId, enrollment.id),
    });

    if (!schedule) {
      // Return default preferences (schedule not yet created)
      return Response.json({
        schedule: null,
        preferences: {
          preferredDays: [1, 3, 5], // Mon, Wed, Fri default
          autoReschedule: true,
          rescheduleWindowDays: 2,
          minRestDays: 1,
          maxConsecutiveWorkoutDays: 3,
        },
        scheduledWorkouts: [],
        needsGeneration: true,
      });
    }

    // Build where condition based on date filters
    const whereCondition = startDate && endDate
      ? and(
          eq(scheduledWorkouts.scheduleId, schedule.id),
          gte(scheduledWorkouts.scheduledDate, startDate),
          lte(scheduledWorkouts.scheduledDate, endDate)
        )
      : eq(scheduledWorkouts.scheduleId, schedule.id);

    // Query scheduled workouts
    const workouts = await db
      .select({
        id: scheduledWorkouts.id,
        scheduledDate: scheduledWorkouts.scheduledDate,
        scheduledTime: scheduledWorkouts.scheduledTime,
        status: scheduledWorkouts.status,
        originalDate: scheduledWorkouts.originalDate,
        rescheduledCount: scheduledWorkouts.rescheduledCount,
        notes: scheduledWorkouts.notes,
        programWorkout: {
          id: programWorkouts.id,
          name: programWorkouts.name,
          focus: programWorkouts.focus,
          weekNumber: programWorkouts.weekNumber,
          dayNumber: programWorkouts.dayNumber,
          estimatedDuration: programWorkouts.estimatedDuration,
        },
      })
      .from(scheduledWorkouts)
      .innerJoin(programWorkouts, eq(scheduledWorkouts.programWorkoutId, programWorkouts.id))
      .where(whereCondition)
      .orderBy(asc(scheduledWorkouts.scheduledDate));

    return Response.json({
      schedule: {
        id: schedule.id,
        preferences: {
          preferredDays: schedule.preferredDays,
          preferredTimeSlot: schedule.preferredTimeSlot,
          reminderTime: schedule.reminderTime,
          autoReschedule: schedule.autoReschedule,
          rescheduleWindowDays: schedule.rescheduleWindowDays,
          minRestDays: schedule.minRestDays,
          maxConsecutiveWorkoutDays: schedule.maxConsecutiveWorkoutDays,
        },
        pausedUntil: schedule.pausedUntil,
        pauseReason: schedule.pauseReason,
        lastGenerated: schedule.lastScheduleGeneratedAt,
      },
      scheduledWorkouts: workouts,
      needsGeneration: false,
    });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return Response.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}

// PUT - Update schedule preferences
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: programId } = await params;
    const body = await request.json();

    // Validate input
    const parseResult = schedulePreferencesSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid preferences", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const preferences = parseResult.data;

    // Get user's enrollment
    const enrollment = await db.query.programEnrollments.findFirst({
      where: and(
        eq(programEnrollments.programId, programId),
        eq(programEnrollments.userId, session.user.id)
      ),
    });

    if (!enrollment) {
      return Response.json({ error: "Not enrolled in this program" }, { status: 404 });
    }

    // Check if schedule exists
    let schedule = await db.query.userProgramSchedules.findFirst({
      where: eq(userProgramSchedules.enrollmentId, enrollment.id),
    });

    if (schedule) {
      // Update existing schedule
      const [updated] = await db
        .update(userProgramSchedules)
        .set({
          preferredDays: preferences.preferredDays,
          preferredTimeSlot: preferences.preferredTimeSlot,
          reminderTime: preferences.reminderTime,
          autoReschedule: preferences.autoReschedule,
          rescheduleWindowDays: preferences.rescheduleWindowDays,
          minRestDays: preferences.minRestDays,
          maxConsecutiveWorkoutDays: preferences.maxConsecutiveWorkoutDays,
          updatedAt: new Date(),
        })
        .where(eq(userProgramSchedules.id, schedule.id))
        .returning();

      schedule = updated;
    } else {
      // Create new schedule
      const [created] = await db
        .insert(userProgramSchedules)
        .values({
          enrollmentId: enrollment.id,
          userId: session.user.id,
          preferredDays: preferences.preferredDays,
          preferredTimeSlot: preferences.preferredTimeSlot,
          reminderTime: preferences.reminderTime,
          autoReschedule: preferences.autoReschedule ?? true,
          rescheduleWindowDays: preferences.rescheduleWindowDays ?? 2,
          minRestDays: preferences.minRestDays ?? 1,
          maxConsecutiveWorkoutDays: preferences.maxConsecutiveWorkoutDays ?? 3,
        })
        .returning();

      schedule = created;
    }

    return Response.json({
      success: true,
      schedule: {
        id: schedule.id,
        preferences: {
          preferredDays: schedule.preferredDays,
          preferredTimeSlot: schedule.preferredTimeSlot,
          reminderTime: schedule.reminderTime,
          autoReschedule: schedule.autoReschedule,
          rescheduleWindowDays: schedule.rescheduleWindowDays,
          minRestDays: schedule.minRestDays,
          maxConsecutiveWorkoutDays: schedule.maxConsecutiveWorkoutDays,
        },
      },
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return Response.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

// POST - Generate schedule based on preferences
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: programId } = await params;
    const body = await request.json();
    const { startDate, regenerate = false } = body;

    // Get user's enrollment and program info
    const enrollment = await db.query.programEnrollments.findFirst({
      where: and(
        eq(programEnrollments.programId, programId),
        eq(programEnrollments.userId, session.user.id)
      ),
      with: {
        program: true,
      },
    });

    if (!enrollment) {
      return Response.json({ error: "Not enrolled in this program" }, { status: 404 });
    }

    // Get or create schedule
    let schedule = await db.query.userProgramSchedules.findFirst({
      where: eq(userProgramSchedules.enrollmentId, enrollment.id),
    });

    if (!schedule) {
      // Create default schedule
      const [created] = await db
        .insert(userProgramSchedules)
        .values({
          enrollmentId: enrollment.id,
          userId: session.user.id,
          preferredDays: [1, 3, 5], // Default Mon, Wed, Fri
        })
        .returning();
      schedule = created;
    }

    // Get all program workouts
    const workouts = await db.query.programWorkouts.findMany({
      where: eq(programWorkouts.programId, programId),
      orderBy: [asc(programWorkouts.weekNumber), asc(programWorkouts.dayNumber)],
    });

    if (workouts.length === 0) {
      return Response.json({ error: "No workouts found in program" }, { status: 400 });
    }

    // Delete existing scheduled workouts if regenerating
    if (regenerate) {
      await db
        .delete(scheduledWorkouts)
        .where(eq(scheduledWorkouts.scheduleId, schedule.id));
    }

    // Generate schedule
    const preferredDays = schedule.preferredDays as number[];
    const scheduledStart = startDate ? new Date(startDate) : new Date();
    const newScheduledWorkouts: {
      scheduleId: string;
      programWorkoutId: string;
      userId: string;
      scheduledDate: string;
      status: string;
    }[] = [];

    let currentDate = new Date(scheduledStart);
    let workoutIndex = 0;
    let consecutiveWorkouts = 0;

    // Helper to check if a day is preferred
    const isDayPreferred = (date: Date) => preferredDays.includes(date.getDay());

    // Helper to get next preferred day
    const getNextPreferredDay = (from: Date, minRest: number = 0): Date => {
      const next = new Date(from);
      next.setDate(next.getDate() + 1 + minRest);
      
      while (!isDayPreferred(next)) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    };

    // If current date is not a preferred day, move to next preferred day
    if (!isDayPreferred(currentDate)) {
      currentDate = getNextPreferredDay(currentDate, 0);
      currentDate.setDate(currentDate.getDate() - 1); // Will be incremented in loop
    }

    // Schedule each workout
    while (workoutIndex < workouts.length) {
      // Check for max consecutive workouts
      if (consecutiveWorkouts >= schedule.maxConsecutiveWorkoutDays) {
        // Force a rest day
        currentDate = getNextPreferredDay(currentDate, schedule.minRestDays);
        consecutiveWorkouts = 0;
      } else {
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Skip if not a preferred day
        if (!isDayPreferred(currentDate)) {
          consecutiveWorkouts = 0;
          continue;
        }
      }

      const workout = workouts[workoutIndex];
      const dateString = currentDate.toISOString().split("T")[0];

      newScheduledWorkouts.push({
        scheduleId: schedule.id,
        programWorkoutId: workout.id,
        userId: session.user.id,
        scheduledDate: dateString,
        status: "scheduled",
      });

      workoutIndex++;
      consecutiveWorkouts++;
    }

    // Insert all scheduled workouts
    if (newScheduledWorkouts.length > 0) {
      await db.insert(scheduledWorkouts).values(newScheduledWorkouts);
    }

    // Update schedule generation timestamp
    await db
      .update(userProgramSchedules)
      .set({
        lastScheduleGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userProgramSchedules.id, schedule.id));

    // Fetch the generated schedule
    const generatedWorkouts = await db
      .select({
        id: scheduledWorkouts.id,
        scheduledDate: scheduledWorkouts.scheduledDate,
        status: scheduledWorkouts.status,
        programWorkout: {
          id: programWorkouts.id,
          name: programWorkouts.name,
          focus: programWorkouts.focus,
          weekNumber: programWorkouts.weekNumber,
          dayNumber: programWorkouts.dayNumber,
          estimatedDuration: programWorkouts.estimatedDuration,
        },
      })
      .from(scheduledWorkouts)
      .innerJoin(programWorkouts, eq(scheduledWorkouts.programWorkoutId, programWorkouts.id))
      .where(eq(scheduledWorkouts.scheduleId, schedule.id))
      .orderBy(asc(scheduledWorkouts.scheduledDate));

    return Response.json({
      success: true,
      scheduledWorkouts: generatedWorkouts,
      totalWorkouts: generatedWorkouts.length,
      startDate: newScheduledWorkouts[0]?.scheduledDate,
      endDate: newScheduledWorkouts[newScheduledWorkouts.length - 1]?.scheduledDate,
    });
  } catch (error) {
    console.error("Error generating schedule:", error);
    return Response.json({ error: "Failed to generate schedule" }, { status: 500 });
  }
}
