import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  sharedWorkouts,
  workoutPlans,
  workoutPlanExercises,
  exercises,
  savedWorkouts,
  communityPrograms,
  programWorkouts,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get shared workout with workout plan details
    const sharedWorkout = await db.query.sharedWorkouts.findFirst({
      where: eq(sharedWorkouts.id, id),
    });

    if (!sharedWorkout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Get the workout plan details
    const workoutPlan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, sharedWorkout.workoutPlanId),
    });

    // Get exercises for this workout with full details
    const workoutExercises = workoutPlan
      ? await db
          .select({
            id: workoutPlanExercises.id,
            order: workoutPlanExercises.order,
            sets: workoutPlanExercises.sets,
            reps: workoutPlanExercises.reps,
            weight: workoutPlanExercises.weight,
            duration: workoutPlanExercises.duration,
            distance: workoutPlanExercises.distance,
            notes: workoutPlanExercises.notes,
            groupId: workoutPlanExercises.groupId,
            groupType: workoutPlanExercises.groupType,
            exerciseId: workoutPlanExercises.exerciseId,
            exerciseName: exercises.name,
            exerciseImageUrl: exercises.imageUrl,
            exerciseMuscleGroups: exercises.muscleGroups,
          })
          .from(workoutPlanExercises)
          .leftJoin(exercises, eq(workoutPlanExercises.exerciseId, exercises.id))
          .where(eq(workoutPlanExercises.planId, workoutPlan.id))
          .orderBy(workoutPlanExercises.order)
      : [];

    // Check if user has saved this workout
    const savedEntry = await db.query.savedWorkouts.findFirst({
      where: and(
        eq(savedWorkouts.userId, session.user.id),
        eq(savedWorkouts.sharedWorkoutId, id)
      ),
    });

    // Get programs this workout is part of
    const programWorkoutLinks = workoutPlan
      ? await db
          .select({
            programId: programWorkouts.programId,
            programName: communityPrograms.name,
          })
          .from(programWorkouts)
          .leftJoin(
            communityPrograms,
            eq(programWorkouts.programId, communityPrograms.id)
          )
          .where(eq(programWorkouts.workoutPlanId, workoutPlan.id))
      : [];

    // Deduplicate programs by ID (a workout can appear multiple times in a program across different weeks)
    const programsMap = new Map<string, { id: string; name: string }>();
    programWorkoutLinks
      .filter((p) => p.programId && p.programName)
      .forEach((p) => {
        if (!programsMap.has(p.programId!)) {
          programsMap.set(p.programId!, { id: p.programId!, name: p.programName! });
        }
      });
    const programs = Array.from(programsMap.values());

    return NextResponse.json({
      id: sharedWorkout.id,
      title: sharedWorkout.title,
      description: sharedWorkout.description,
      category: sharedWorkout.category,
      difficulty: sharedWorkout.difficulty,
      estimatedDuration: sharedWorkout.estimatedDuration,
      targetMuscles: sharedWorkout.targetMuscles,
      equipmentRequired: sharedWorkout.equipmentRequired,
      structureType: workoutPlan?.structureType,
      timeCapSeconds: workoutPlan?.timeCapSeconds,
      roundsTarget: workoutPlan?.roundsTarget,
      scoringType: workoutPlan?.scoringType,
      saveCount: sharedWorkout.saveCount,
      useCount: sharedWorkout.useCount,
      avgRating: sharedWorkout.avgRating,
      reviewCount: sharedWorkout.reviewCount,
      isOfficial: sharedWorkout.isFeatured,
      isFeatured: sharedWorkout.isFeatured,
      isSaved: !!savedEntry,
      exercises: workoutExercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId, // The actual exercise ID for fetching details
        name: e.exerciseName || "Unknown Exercise",
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        duration: e.duration,
        distance: e.distance,
        notes: e.notes,
        order: e.order,
        groupId: e.groupId,
        groupType: e.groupType,
        imageUrl: e.exerciseImageUrl,
        primaryMuscles: e.exerciseMuscleGroups || [],
      })),
      programs,
    });
  } catch (error) {
    console.error("Error fetching workout:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}
