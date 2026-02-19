import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  exercises,
  circleMembers,
  userProfiles,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { SharePageClient } from "./share-page-client";

interface Props {
  params: Promise<{ id: string }>;
}

async function getWorkoutSession(id: string) {
  const session = await db.query.workoutSessions.findFirst({
    where: eq(workoutSessions.id, id),
  });

  if (!session || session.status !== "completed") return null;

  // Get user info via circle member + user profile
  const member = await db.query.circleMembers.findFirst({
    where: eq(circleMembers.id, session.memberId),
  });
  const profile = member?.userId
    ? await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, member.userId),
      })
    : null;

  // Get exercises with sets
  const sessionExercises = await db
    .select({
      id: workoutSessionExercises.id,
      order: workoutSessionExercises.order,
      completed: workoutSessionExercises.completed,
      exerciseName: exercises.name,
      exerciseCategory: exercises.category,
    })
    .from(workoutSessionExercises)
    .leftJoin(exercises, eq(workoutSessionExercises.exerciseId, exercises.id))
    .where(eq(workoutSessionExercises.sessionId, id))
    .orderBy(workoutSessionExercises.order);

  // Get sets for each exercise
  const exerciseIds = sessionExercises.map((e) => e.id);
  type SetRow = typeof exerciseSets.$inferSelect;
  const setsMap = new Map<string, SetRow[]>();
  for (const exerciseId of exerciseIds) {
    const sets = await db
      .select()
      .from(exerciseSets)
      .where(eq(exerciseSets.sessionExerciseId, exerciseId))
      .orderBy(exerciseSets.setNumber);
    setsMap.set(exerciseId, sets);
  }

  // Calculate stats
  const durationMs =
    session.startTime && session.endTime
      ? new Date(session.endTime).getTime() -
        new Date(session.startTime).getTime()
      : null;
  const durationMin = durationMs ? Math.round(durationMs / 60000) : null;

  let totalVolume = 0;
  let totalSets = 0;
  for (const sets of setsMap.values()) {
    for (const set of sets) {
      if (set.completed) {
        totalSets++;
        if (set.actualWeight && set.actualReps) {
          totalVolume += set.actualWeight * set.actualReps;
        }
      }
    }
  }

  return {
    id: session.id,
    name: session.name,
    date: session.date,
    rating: session.rating,
    durationMin,
    totalExercises: sessionExercises.length,
    completedExercises: sessionExercises.filter((e) => e.completed).length,
    totalSets,
    totalVolume: Math.round(totalVolume),
    exercises: sessionExercises.map((e) => ({
      name: e.exerciseName || "Unknown",
      category: e.exerciseCategory || "strength",
      completed: e.completed,
      sets: (setsMap.get(e.id) || []).map((s) => ({
        reps: s.actualReps,
        weight: s.actualWeight,
        duration: s.actualDuration,
        completed: s.completed,
      })),
    })),
    user: {
      name: profile?.displayName || member?.name || "Athlete",
      image: profile?.profilePicture || null,
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const workout = await getWorkoutSession(id);

  if (!workout) {
    return { title: "Workout Not Found | Repcir" };
  }

  const title = `${workout.user.name} completed ${workout.name} | Repcir`;
  const description = [
    workout.durationMin ? `${workout.durationMin} min` : null,
    `${workout.totalExercises} exercises`,
    `${workout.totalSets} sets`,
    workout.totalVolume > 0 ? `${workout.totalVolume.toLocaleString()} lbs` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [`/api/workouts/${id}/share-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/workouts/${id}/share-image`],
    },
  };
}

export default async function WorkoutSharePage({ params }: Props) {
  const { id } = await params;
  const workout = await getWorkoutSession(id);

  if (!workout) {
    notFound();
  }

  return <SharePageClient workout={workout} />;
}
