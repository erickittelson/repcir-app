import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  circleMembers,
  personalRecords,
  exercises,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { generateText } from "ai";
import { aiModel, getMemberContext, buildSystemPrompt, getReasoningOptions } from "@/lib/ai";
import { evaluateAndAwardBadges } from "@/lib/badges";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { exercises, notes, rating } = body;

    // Get the workout session
    const workoutSession = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, id),
      with: {
        member: true,
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify member belongs to this family
    if (workoutSession.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the session with completion info
    await db
      .update(workoutSessions)
      .set({
        status: "completed",
        notes,
        rating,
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, id));

    // Update exercise completion and sets
    if (exercises && exercises.length > 0) {
      const sessionExercises = await db.query.workoutSessionExercises.findMany({
        where: eq(workoutSessionExercises.sessionId, id),
      });

      for (const ex of exercises) {
        const sessionEx = sessionExercises.find(
          (se) => se.exerciseId === ex.exerciseId
        );

        if (sessionEx) {
          // Update exercise completion
          await db
            .update(workoutSessionExercises)
            .set({
              completed: ex.completed,
              notes: ex.notes,
            })
            .where(eq(workoutSessionExercises.id, sessionEx.id));

          // Update or create sets
          if (ex.sets && ex.sets.length > 0) {
            // Delete existing sets and create new ones
            await db
              .delete(exerciseSets)
              .where(eq(exerciseSets.sessionExerciseId, sessionEx.id));

            await db.insert(exerciseSets).values(
              ex.sets.map((set: any) => ({
                sessionExerciseId: sessionEx.id,
                setNumber: set.setNumber,
                targetReps: set.targetReps,
                actualReps: set.actualReps,
                targetWeight: set.targetWeight,
                actualWeight: set.actualWeight,
                completed: set.completed,
              }))
            );
          }
        }
      }
    }

    // Get the user ID for badge evaluation
    const member = await db.query.circleMembers.findFirst({
      where: eq(circleMembers.id, workoutSession.memberId),
    });
    const userId = member?.userId;

    // Check for personal records and generate AI analysis (non-blocking)
    detectPersonalRecordsAndAnalyze(id, workoutSession.memberId).catch((err) => {
      console.error("Background PR/analysis error:", err);
    });

    // Evaluate badges for workout completion (non-blocking)
    if (userId) {
      evaluateAndAwardBadges({
        userId,
        memberId: workoutSession.memberId,
        trigger: "workout",
      }).catch((err) => {
        console.error("Background badge evaluation error:", err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing workout session:", error);
    return NextResponse.json(
      { error: "Failed to complete workout session" },
      { status: 500 }
    );
  }
}

// Background function to detect PRs and generate AI analysis
async function detectPersonalRecordsAndAnalyze(sessionId: string, memberId: string) {
  try {
    // Fetch the completed workout with all details
    const workout = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, sessionId),
      with: {
        exercises: {
          with: {
            exercise: true,
            sets: true,
          },
        },
      },
    });

    if (!workout) return;

    // Batch fetch all existing PRs for all exercises in ONE query (fixes N+1)
    const exerciseIds = workout.exercises.map((we) => we.exerciseId);
    const allExistingPRs = exerciseIds.length > 0
      ? await db.query.personalRecords.findMany({
          where: and(
            eq(personalRecords.memberId, memberId),
            inArray(personalRecords.exerciseId, exerciseIds)
          ),
        })
      : [];

    // Build a map of exerciseId -> repMax -> best PR value for quick lookups
    const prMap = new Map<string, Map<number, number>>();
    for (const pr of allExistingPRs) {
      if (!prMap.has(pr.exerciseId)) {
        prMap.set(pr.exerciseId, new Map());
      }
      const repMaxMap = prMap.get(pr.exerciseId)!;
      const repMax = pr.repMax ?? 1; // Default to 1RM if not specified
      const existing = repMaxMap.get(repMax) || 0;
      if (pr.value > existing) {
        repMaxMap.set(repMax, pr.value);
      }
    }

    // Detect personal records for each exercise (no DB queries in loop)
    const prDetections: { exerciseId: string; exerciseName: string; value: number; unit: string; repMax: number }[] = [];

    for (const we of workout.exercises) {
      const completedSets = we.sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      // Find max weight lifted for this exercise
      const maxWeight = Math.max(...completedSets.map((s) => s.actualWeight || 0));
      if (maxWeight <= 0) continue;

      // Get the rep count for the max weight set
      const maxWeightSet = completedSets.find((s) => (s.actualWeight || 0) === maxWeight);
      const repsAtMax = maxWeightSet?.actualReps || 1;

      // Check if this beats existing PR using the pre-fetched map
      const existingPRValue = prMap.get(we.exerciseId)?.get(repsAtMax) || 0;

      if (maxWeight > existingPRValue) {
        prDetections.push({
          exerciseId: we.exerciseId,
          exerciseName: we.exercise.name,
          value: maxWeight,
          unit: "lbs",
          repMax: repsAtMax,
        });
      }
    }

    // Batch insert all new personal records (fixes N+1 inserts)
    if (prDetections.length > 0) {
      await db.insert(personalRecords).values(
        prDetections.map((pr) => ({
          memberId,
          exerciseId: pr.exerciseId,
          value: pr.value,
          unit: pr.unit,
          repMax: pr.repMax,
          date: new Date(),
          recordType: "current" as const,
          notes: `Auto-detected from workout on ${new Date().toLocaleDateString()}`,
        }))
      );
    }

    // Generate AI analysis
    const context = await getMemberContext(memberId);
    const systemPrompt = buildSystemPrompt(context);

    const workoutSummary = workout.exercises.map((we) => {
      const completedSets = we.sets.filter((s) => s.completed);
      const totalVolume = completedSets.reduce(
        (sum, s) => sum + (s.actualWeight || 0) * (s.actualReps || 0),
        0
      );
      return `${we.exercise.name}: ${completedSets.length}/${we.sets.length} sets, max weight ${Math.max(...completedSets.map((s) => s.actualWeight || 0))}lbs, total volume ${totalVolume}lbs`;
    }).join("\n");

    const prSummary = prDetections.length > 0
      ? `\n\nNEW PERSONAL RECORDS:\n${prDetections.map((pr) => `- ${pr.exerciseName}: ${pr.value}lbs x${pr.repMax}`).join("\n")}`
      : "";

    const duration = workout.startTime && workout.endTime
      ? Math.round((new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime()) / 60000)
      : null;

    const analysisPrompt = `Analyze this completed workout and provide brief, actionable feedback (2-3 sentences max):

Workout: ${workout.name}
Duration: ${duration ? `${duration} minutes` : "Unknown"}
Rating: ${workout.rating || "Not rated"}/5
${workout.notes ? `User notes: ${workout.notes}` : ""}

Exercises completed:
${workoutSummary}
${prSummary}

Provide:
1. One thing they did well
2. One suggestion for next time
3. Encouraging comment about their progress`;

    const { text } = await generateText({
      model: aiModel,
      system: systemPrompt,
      prompt: analysisPrompt,
    });

    // Save the AI feedback (analysis is embedded in the feedback text)
    await db
      .update(workoutSessions)
      .set({
        aiFeedback: text,
      })
      .where(eq(workoutSessions.id, sessionId));

  } catch (error) {
    console.error("Error in PR detection/AI analysis:", error);
  }
}
