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
  circleMembers,
  userProfiles,
  CONTENT_VISIBILITY,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

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
    // First try to get shared workout
    let sharedWorkout = await db.query.sharedWorkouts.findFirst({
      where: eq(sharedWorkouts.id, id),
    });

    // If not found as sharedWorkout, try to find by workoutPlanId directly
    // This handles cases where program workouts reference workout plans directly
    let workoutPlan = null;
    
    if (sharedWorkout) {
      // Get the workout plan details from sharedWorkout reference
      workoutPlan = await db.query.workoutPlans.findFirst({
        where: eq(workoutPlans.id, sharedWorkout.workoutPlanId),
      });
    } else {
      // Try to find as a workoutPlan directly
      workoutPlan = await db.query.workoutPlans.findFirst({
        where: eq(workoutPlans.id, id),
      });
      
      // If found as workoutPlan, check if there's a sharedWorkout that references it
      if (workoutPlan) {
        sharedWorkout = await db.query.sharedWorkouts.findFirst({
          where: eq(sharedWorkouts.workoutPlanId, workoutPlan.id),
        });
      }
    }

    if (!workoutPlan && !sharedWorkout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

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

    // Fetch creator profile
    const creatorUserId = sharedWorkout?.userId || (workoutPlan?.createdByMemberId
      ? (await db.query.circleMembers.findFirst({
          where: eq(circleMembers.id, workoutPlan.createdByMemberId),
          columns: { userId: true },
        }))?.userId
      : null);

    const creatorProfile = creatorUserId
      ? await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, creatorUserId),
          columns: {
            displayName: true,
            handle: true,
            profilePicture: true,
          },
        })
      : null;

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
      id: sharedWorkout?.id || workoutPlan?.id || id,
      title: sharedWorkout?.title || workoutPlan?.name || "Workout",
      description: sharedWorkout?.description || workoutPlan?.description || null,
      category: sharedWorkout?.category || workoutPlan?.category || null,
      difficulty: sharedWorkout?.difficulty || workoutPlan?.difficulty || null,
      estimatedDuration: sharedWorkout?.estimatedDuration || workoutPlan?.estimatedDuration || null,
      targetMuscles: sharedWorkout?.targetMuscles || [],
      equipmentRequired: sharedWorkout?.equipmentRequired || [],
      structureType: workoutPlan?.structureType,
      timeCapSeconds: workoutPlan?.timeCapSeconds,
      roundsTarget: workoutPlan?.roundsTarget,
      scoringType: workoutPlan?.scoringType,
      saveCount: sharedWorkout?.saveCount || 0,
      useCount: sharedWorkout?.useCount || 0,
      avgRating: sharedWorkout?.avgRating || null,
      reviewCount: sharedWorkout?.reviewCount || 0,
      isOfficial: sharedWorkout?.isFeatured || false,
      isFeatured: sharedWorkout?.isFeatured || false,
      creator: creatorProfile
        ? {
            displayName: creatorProfile.displayName || null,
            handle: creatorProfile.handle || null,
            profilePicture: creatorProfile.profilePicture || null,
          }
        : null,
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

const updateWorkoutSchema = z.object({
  visibility: z.enum(CONTENT_VISIBILITY),
  description: z.string().max(500).optional(),
});

// PATCH /api/workouts/[id] - Update workout visibility
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = updateWorkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid visibility value" }, { status: 400 });
    }

    const { visibility, description } = validation.data;

    // Verify the user owns this workout plan (via circle membership)
    const plan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, id),
      columns: {
        id: true,
        createdByMemberId: true,
        name: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedDuration: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Check ownership: user must be the creator via their circle membership
    if (plan.createdByMemberId) {
      const membership = await db.query.circleMembers.findFirst({
        where: and(
          eq(circleMembers.id, plan.createdByMemberId),
          eq(circleMembers.userId, session.user.id)
        ),
        columns: { id: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Update visibility (and description if provided) on workoutPlans
    await db
      .update(workoutPlans)
      .set({
        visibility,
        ...(description !== undefined && { description }),
        updatedAt: new Date(),
      })
      .where(eq(workoutPlans.id, id));

    // Upsert the shared workout entry
    const existingShared = await db.query.sharedWorkouts.findFirst({
      where: eq(sharedWorkouts.workoutPlanId, id),
      columns: { id: true },
    });

    const effectiveDescription = description !== undefined ? description : plan.description;

    if (existingShared) {
      // Update existing entry
      await db
        .update(sharedWorkouts)
        .set({
          visibility,
          ...(description !== undefined && { description }),
          updatedAt: new Date(),
        })
        .where(eq(sharedWorkouts.id, existingShared.id));
    } else if (visibility !== "private") {
      // Create new shared workout entry (was missing when created as private)
      await db.insert(sharedWorkouts).values({
        workoutPlanId: id,
        userId: session.user.id,
        title: plan.name,
        description: effectiveDescription,
        category: plan.category,
        difficulty: plan.difficulty,
        estimatedDuration: plan.estimatedDuration,
        visibility,
      });
    }

    return NextResponse.json({ id, visibility });
  } catch (error) {
    console.error("Error updating workout:", error);
    return NextResponse.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}
