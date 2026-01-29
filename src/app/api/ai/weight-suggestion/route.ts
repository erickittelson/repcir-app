import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  personalRecords,
  workoutSessionExercises,
  exerciseSets,
  workoutSessions,
  exercises,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * AI-powered weight suggestion based on user's history and PRs
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { exerciseId, targetReps, targetSets } = body;

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Exercise ID required" },
        { status: 400 }
      );
    }

    const memberId = session.activeCircle?.memberId;
    if (!memberId) {
      return NextResponse.json(
        { error: "No active circle" },
        { status: 400 }
      );
    }

    // Get the exercise details
    const exercise = await db.query.exercises.findFirst({
      where: eq(exercises.id, exerciseId),
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Get user's PR for this exercise at the target rep range
    const pr = await db.query.personalRecords.findFirst({
      where: and(
        eq(personalRecords.memberId, memberId),
        eq(personalRecords.exerciseId, exerciseId),
        eq(personalRecords.repMax, targetReps || 5)
      ),
      orderBy: [desc(personalRecords.value)],
    });

    // Get recent performance on this exercise
    const recentSets = await db
      .select({
        weight: exerciseSets.actualWeight,
        reps: exerciseSets.actualReps,
        completed: exerciseSets.completed,
        sessionDate: workoutSessions.date,
      })
      .from(exerciseSets)
      .innerJoin(
        workoutSessionExercises,
        eq(exerciseSets.sessionExerciseId, workoutSessionExercises.id)
      )
      .innerJoin(
        workoutSessions,
        eq(workoutSessionExercises.sessionId, workoutSessions.id)
      )
      .where(
        and(
          eq(workoutSessionExercises.exerciseId, exerciseId),
          eq(workoutSessions.memberId, memberId),
          eq(exerciseSets.completed, true)
        )
      )
      .orderBy(desc(workoutSessions.date))
      .limit(20);

    // Calculate suggestion based on available data
    let suggestedWeight = 0;
    let reasoning = "";
    let confidence: "high" | "medium" | "low" = "low";

    if (pr) {
      // If we have a PR at this rep range, suggest 85-90% for working sets
      suggestedWeight = Math.round((pr.value * 0.85) / 5) * 5; // Round to nearest 5
      reasoning = `Based on your ${targetReps}RM PR of ${pr.value}lbs, suggesting ~85% for working sets`;
      confidence = "high";
    } else if (recentSets.length > 0) {
      // Use average of recent successful sets
      const successfulSets = recentSets.filter(
        (s) => s.weight && s.completed
      );
      if (successfulSets.length > 0) {
        const avgWeight =
          successfulSets.reduce((sum, s) => sum + (s.weight || 0), 0) /
          successfulSets.length;
        suggestedWeight = Math.round(avgWeight / 5) * 5;
        reasoning = `Based on your recent average of ${Math.round(avgWeight)}lbs`;
        confidence = "medium";
      }
    }

    // If no data, provide general guidance
    if (suggestedWeight === 0) {
      reasoning =
        "No historical data available. Start light and increase based on feel.";
      confidence = "low";
    }

    // Calculate progressive overload suggestion
    let nextWeekSuggestion = null;
    if (suggestedWeight > 0) {
      // Check if user has consistently hit this weight
      const recentAtWeight = recentSets.filter(
        (s) => Math.abs((s.weight || 0) - suggestedWeight) <= 5 && s.completed
      );
      if (recentAtWeight.length >= 3) {
        nextWeekSuggestion = {
          weight: suggestedWeight + 5,
          reasoning: "You've consistently hit this weight - time to progress!",
        };
      }
    }

    return NextResponse.json({
      exerciseId,
      exerciseName: exercise.name,
      targetReps,
      targetSets,
      suggestion: {
        weight: suggestedWeight,
        unit: "lbs",
        reasoning,
        confidence,
      },
      pr: pr
        ? {
            value: pr.value,
            repMax: pr.repMax,
            date: pr.date,
          }
        : null,
      recentHistory: recentSets.slice(0, 5).map((s) => ({
        weight: s.weight,
        reps: s.reps,
        date: s.sessionDate,
      })),
      nextWeekSuggestion,
    });
  } catch (error) {
    console.error("Error generating weight suggestion:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
