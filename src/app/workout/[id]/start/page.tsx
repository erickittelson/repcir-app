import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutPlans,
  workoutPlanExercises,
  exercises,
  sharedWorkouts,
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

interface StartWorkoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function StartWorkoutPage({ params }: StartWorkoutPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const memberId = session.activeCircle?.memberId;
  if (!memberId) {
    redirect("/");
  }

  // First, try to find a shared workout
  const sharedWorkout = await db.query.sharedWorkouts.findFirst({
    where: eq(sharedWorkouts.id, id),
  });

  let planId = sharedWorkout?.workoutPlanId;

  // If not a shared workout, try to find a workout plan directly
  if (!planId) {
    const plan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, id),
    });
    if (plan) {
      planId = plan.id;
    }
  }

  if (!planId) {
    notFound();
  }

  // Get the workout plan with exercises
  const plan = await db.query.workoutPlans.findFirst({
    where: eq(workoutPlans.id, planId),
  });

  if (!plan) {
    notFound();
  }

  // Get exercises for this plan
  const planExercises = await db
    .select({
      planExercise: workoutPlanExercises,
      exercise: exercises,
    })
    .from(workoutPlanExercises)
    .leftJoin(exercises, eq(exercises.id, workoutPlanExercises.exerciseId))
    .where(eq(workoutPlanExercises.planId, planId))
    .orderBy(asc(workoutPlanExercises.order));

  // Create a new workout session
  const [newSession] = await db
    .insert(workoutSessions)
    .values({
      memberId,
      planId,
      name: sharedWorkout?.title || plan.name,
      status: "in_progress",
      date: new Date(),
    })
    .returning();

  // Create session exercises and sets from plan
  for (const row of planExercises) {
    if (!row.exercise) continue;

    const [sessionExercise] = await db
      .insert(workoutSessionExercises)
      .values({
        sessionId: newSession.id,
        exerciseId: row.planExercise.exerciseId,
        order: row.planExercise.order,
      })
      .returning();

    // Create sets for each exercise
    const numSets = row.planExercise.sets || 3;
    const repsStr = row.planExercise.reps;
    const targetReps = repsStr ? parseInt(repsStr) || undefined : undefined;
    const weightVal = (row.planExercise as any).weight;
    const targetWeight = weightVal ? parseFloat(weightVal) || undefined : undefined;

    const setsToCreate = [];
    for (let i = 1; i <= numSets; i++) {
      setsToCreate.push({
        sessionExerciseId: sessionExercise.id,
        setNumber: i,
        targetReps,
        targetWeight,
        completed: false,
      });
    }

    if (setsToCreate.length > 0) {
      await db.insert(exerciseSets).values(setsToCreate);
    }
  }

  // Increment use count for shared workout
  if (sharedWorkout) {
    await db
      .update(sharedWorkouts)
      .set({ useCount: (sharedWorkout.useCount || 0) + 1 })
      .where(eq(sharedWorkouts.id, id));
  }

  // Redirect to the active workout session
  redirect(`/workouts/active/${newSession.id}`);
}
