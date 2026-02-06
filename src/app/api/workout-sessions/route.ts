import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  circleMembers,
} from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { createWorkoutSessionSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get family member IDs
    const members = await db.query.circleMembers.findMany({
      where: eq(circleMembers.circleId, session.circleId),
      columns: { id: true, name: true, profilePicture: true },
    });

    // Safety check for members array
    if (!members || !Array.isArray(members)) {
      return NextResponse.json([]);
    }

    const memberIds = members.map((m) => m.id);
    const memberMap = Object.fromEntries(
      members.map((m) => [m.id, { name: m.name, profilePicture: m.profilePicture }])
    );

    if (memberIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get sessions with exercises and sets
    const sessions = await db.query.workoutSessions.findMany({
      where: inArray(workoutSessions.memberId, memberIds),
      orderBy: [desc(workoutSessions.date)],
      limit: 50,
      with: {
        exercises: {
          with: {
            exercise: true,
            sets: true,
          },
        },
      },
    });

    const formattedSessions = sessions.map((s) => {
      const memberInfo = memberMap[s.memberId] || { name: "Unknown", profilePicture: null };

      // Calculate completion stats
      const totalSets = s.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
      const completedSets = s.exercises.reduce(
        (acc, ex) => acc + ex.sets.filter((set) => set.completed).length,
        0
      );

      // Get exercise summary with weights
      const exerciseSummary = s.exercises.map((ex) => {
        const maxWeight = Math.max(...ex.sets.map((set) => set.actualWeight || set.targetWeight || 0));
        const completedSetCount = ex.sets.filter((set) => set.completed).length;
        return {
          name: ex.exercise.name,
          category: ex.exercise.category,
          setsCompleted: completedSetCount,
          totalSets: ex.sets.length,
          maxWeight: maxWeight > 0 ? maxWeight : null,
        };
      });

      // Calculate duration from start/end times
      let duration: number | null = null;
      if (s.startTime && s.endTime) {
        duration = Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000); // minutes
      }

      return {
        id: s.id,
        name: s.name,
        date: s.date.toISOString(),
        status: s.status,
        memberId: s.memberId,
        memberName: memberInfo.name,
        memberProfilePicture: memberInfo.profilePicture,
        rating: s.rating,
        notes: s.notes,
        duration,
        completedAt: s.endTime?.toISOString() || null,
        totalSets,
        completedSets,
        exerciseCount: s.exercises.length,
        exercises: exerciseSummary,
      };
    });

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching workout sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout sessions" },
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

    const validation = await validateBody(request, createWorkoutSessionSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { memberId, planId, name, date, exercises } = validation.data;

    // Verify member belongs to this family
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Create the workout session
    const [workoutSession] = await db
      .insert(workoutSessions)
      .values({
        memberId,
        planId: planId || null,
        name,
        date: date ? new Date(date) : new Date(),
        status: "planned",
      })
      .returning();

    // Add exercises to the session
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        const [sessionExercise] = await db
          .insert(workoutSessionExercises)
          .values({
            sessionId: workoutSession.id,
            exerciseId: ex.exerciseId,
            order: ex.order,
          })
          .returning();

        // Add sets for each exercise
        if (ex.sets && ex.sets.length > 0) {
          await db.insert(exerciseSets).values(
            ex.sets.map((set: any, index: number) => ({
              sessionExerciseId: sessionExercise.id,
              setNumber: index + 1,
              targetReps: set.targetReps,
              targetWeight: set.targetWeight,
              targetDuration: set.targetDuration,
            }))
          );
        }
      }
    }

    return NextResponse.json({ id: workoutSession.id });
  } catch (error) {
    console.error("Error creating workout session:", error);
    return NextResponse.json(
      { error: "Failed to create workout session" },
      { status: 500 }
    );
  }
}
