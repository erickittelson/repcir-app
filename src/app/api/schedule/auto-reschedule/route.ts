/**
 * Auto-Reschedule API
 * 
 * POST - Automatically reschedule missed workouts to the next available preferred day
 * Uses user's schedule preferences to find appropriate new dates
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  scheduledWorkouts,
  userProgramSchedules,
  programWorkouts,
} from "@/lib/db/schema";
import { eq, and, asc, ne, gte } from "drizzle-orm";
import { z } from "zod";

const autoRescheduleSchema = z.object({
  scheduleId: z.string().uuid().optional(), // Reschedule for a specific program
  workoutIds: z.array(z.string().uuid()).optional(), // Reschedule specific workouts
  startFromDate: z.string().optional(), // Start looking from this date
  strategy: z.enum(["next_available", "end_of_schedule", "spread_evenly"]).default("next_available"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const parseResult = autoRescheduleSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { scheduleId, workoutIds, startFromDate, strategy } = parseResult.data;

    // Get missed workouts to reschedule
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    let missedWorkoutsQuery = db
      .select({
        workout: scheduledWorkouts,
        schedule: userProgramSchedules,
        programWorkout: programWorkouts,
      })
      .from(scheduledWorkouts)
      .innerJoin(userProgramSchedules, eq(scheduledWorkouts.scheduleId, userProgramSchedules.id))
      .innerJoin(programWorkouts, eq(scheduledWorkouts.programWorkoutId, programWorkouts.id))
      .where(
        and(
          eq(scheduledWorkouts.userId, session.user.id),
          eq(scheduledWorkouts.status, "missed")
        )
      )
      .orderBy(asc(programWorkouts.weekNumber), asc(programWorkouts.dayNumber));

    const missedWorkouts = await missedWorkoutsQuery;

    if (missedWorkouts.length === 0) {
      return Response.json({
        success: true,
        message: "No missed workouts to reschedule",
        rescheduled: [],
      });
    }

    // Filter by scheduleId or workoutIds if provided
    let workoutsToReschedule = missedWorkouts;
    if (scheduleId) {
      workoutsToReschedule = missedWorkouts.filter(
        (w) => w.schedule.id === scheduleId
      );
    }
    if (workoutIds && workoutIds.length > 0) {
      workoutsToReschedule = workoutsToReschedule.filter(
        (w) => workoutIds.includes(w.workout.id)
      );
    }

    // Group by schedule for processing
    const workoutsBySchedule = new Map<string, typeof workoutsToReschedule>();
    for (const workout of workoutsToReschedule) {
      const key = workout.schedule.id;
      if (!workoutsBySchedule.has(key)) {
        workoutsBySchedule.set(key, []);
      }
      workoutsBySchedule.get(key)!.push(workout);
    }

    const rescheduled: {
      workoutId: string;
      workoutName: string;
      oldDate: string;
      newDate: string;
    }[] = [];

    // Process each schedule
    for (const [schId, scheduleWorkouts] of workoutsBySchedule) {
      const schedule = scheduleWorkouts[0].schedule;
      const preferredDays = schedule.preferredDays as number[];

      // Check if auto-reschedule is enabled
      if (!schedule.autoReschedule) {
        continue;
      }

      // Get existing scheduled workouts for this schedule
      const existingScheduled = await db.query.scheduledWorkouts.findMany({
        where: and(
          eq(scheduledWorkouts.scheduleId, schId),
          eq(scheduledWorkouts.status, "scheduled"),
          gte(scheduledWorkouts.scheduledDate, todayStr)
        ),
        orderBy: [asc(scheduledWorkouts.scheduledDate)],
      });

      const existingDates = new Set(existingScheduled.map((w) => w.scheduledDate));

      // Helper to find next available date
      const findNextAvailableDate = (
        from: Date,
        maxDaysAhead: number = 14
      ): string | null => {
        const maxDate = new Date(from);
        maxDate.setDate(maxDate.getDate() + maxDaysAhead);

        const current = new Date(from);
        current.setDate(current.getDate() + 1);

        while (current <= maxDate) {
          if (preferredDays.includes(current.getDay())) {
            const dateStr = current.toISOString().split("T")[0];
            if (!existingDates.has(dateStr)) {
              return dateStr;
            }
          }
          current.setDate(current.getDate() + 1);
        }

        return null;
      };

      // Reschedule each missed workout based on strategy
      const startDate = startFromDate ? new Date(startFromDate) : new Date();

      switch (strategy) {
        case "next_available":
          // Find the next available preferred day for each workout
          let lastUsedDate = startDate;
          for (const { workout, programWorkout } of scheduleWorkouts) {
            const newDate = findNextAvailableDate(
              lastUsedDate,
              schedule.rescheduleWindowDays * 7
            );

            if (newDate) {
              await db
                .update(scheduledWorkouts)
                .set({
                  scheduledDate: newDate,
                  status: "scheduled",
                  rescheduledFrom: workout.scheduledDate,
                  rescheduledCount: (workout.rescheduledCount || 0) + 1,
                  rescheduledReason: "Auto-rescheduled from missed workout",
                  originalDate: workout.originalDate || workout.scheduledDate,
                  updatedAt: new Date(),
                })
                .where(eq(scheduledWorkouts.id, workout.id));

              existingDates.add(newDate);
              lastUsedDate = new Date(newDate);

              rescheduled.push({
                workoutId: workout.id,
                workoutName: programWorkout.name,
                oldDate: workout.scheduledDate,
                newDate,
              });
            }
          }
          break;

        case "end_of_schedule":
          // Add missed workouts to the end of the current schedule
          const lastScheduled = existingScheduled[existingScheduled.length - 1];
          let endDate = lastScheduled
            ? new Date(lastScheduled.scheduledDate)
            : new Date();

          for (const { workout, programWorkout } of scheduleWorkouts) {
            const newDate = findNextAvailableDate(endDate, 30);

            if (newDate) {
              await db
                .update(scheduledWorkouts)
                .set({
                  scheduledDate: newDate,
                  status: "scheduled",
                  rescheduledFrom: workout.scheduledDate,
                  rescheduledCount: (workout.rescheduledCount || 0) + 1,
                  rescheduledReason: "Auto-rescheduled to end of schedule",
                  originalDate: workout.originalDate || workout.scheduledDate,
                  updatedAt: new Date(),
                })
                .where(eq(scheduledWorkouts.id, workout.id));

              existingDates.add(newDate);
              endDate = new Date(newDate);

              rescheduled.push({
                workoutId: workout.id,
                workoutName: programWorkout.name,
                oldDate: workout.scheduledDate,
                newDate,
              });
            }
          }
          break;

        case "spread_evenly":
          // Spread missed workouts across available slots
          const availableSlots: string[] = [];
          const scanDate = new Date(startDate);
          const scanEnd = new Date(startDate);
          scanEnd.setDate(scanEnd.getDate() + 21); // Look 3 weeks ahead

          while (scanDate <= scanEnd) {
            if (preferredDays.includes(scanDate.getDay())) {
              const dateStr = scanDate.toISOString().split("T")[0];
              if (!existingDates.has(dateStr)) {
                availableSlots.push(dateStr);
              }
            }
            scanDate.setDate(scanDate.getDate() + 1);
          }

          // Assign workouts to spread across available slots
          const step = Math.max(
            1,
            Math.floor(availableSlots.length / scheduleWorkouts.length)
          );

          for (let i = 0; i < scheduleWorkouts.length; i++) {
            const { workout, programWorkout } = scheduleWorkouts[i];
            const slotIndex = Math.min(i * step, availableSlots.length - 1);
            const newDate = availableSlots[slotIndex];

            if (newDate) {
              await db
                .update(scheduledWorkouts)
                .set({
                  scheduledDate: newDate,
                  status: "scheduled",
                  rescheduledFrom: workout.scheduledDate,
                  rescheduledCount: (workout.rescheduledCount || 0) + 1,
                  rescheduledReason: "Auto-rescheduled (spread evenly)",
                  originalDate: workout.originalDate || workout.scheduledDate,
                  updatedAt: new Date(),
                })
                .where(eq(scheduledWorkouts.id, workout.id));

              rescheduled.push({
                workoutId: workout.id,
                workoutName: programWorkout.name,
                oldDate: workout.scheduledDate,
                newDate,
              });
            }
          }
          break;
      }
    }

    return Response.json({
      success: true,
      rescheduled,
      totalRescheduled: rescheduled.length,
      strategy,
    });
  } catch (error) {
    console.error("Error auto-rescheduling:", error);
    return Response.json({ error: "Failed to auto-reschedule" }, { status: 500 });
  }
}
