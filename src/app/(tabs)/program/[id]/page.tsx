import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  communityPrograms,
  programWeeks,
  programWorkouts,
  programEnrollments,
  programWorkoutProgress,
  workoutPlans,
  sharedWorkouts,
} from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { ProgramClient } from "./program-client";

interface ProgramPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get program details
  const program = await db.query.communityPrograms.findFirst({
    where: eq(communityPrograms.id, id),
  });

  if (!program) {
    notFound();
  }

  // Get program weeks with workouts
  const weeks = await db
    .select({
      week: programWeeks,
      workout: programWorkouts,
    })
    .from(programWeeks)
    .leftJoin(programWorkouts, eq(programWorkouts.weekId, programWeeks.id))
    .where(eq(programWeeks.programId, id))
    .orderBy(asc(programWeeks.weekNumber), asc(programWorkouts.dayNumber));
  
  // Get the workout plan details for each program workout
  const workoutPlanIds = weeks
    .map((w) => w.workout?.workoutPlanId)
    .filter((id): id is string => !!id);
  
  const workoutPlanDetails = workoutPlanIds.length > 0 
    ? await db
        .select({
          id: workoutPlans.id,
          name: workoutPlans.name,
          category: workoutPlans.category,
          difficulty: workoutPlans.difficulty,
          estimatedDuration: workoutPlans.estimatedDuration,
          structureType: workoutPlans.structureType,
        })
        .from(workoutPlans)
        .where(inArray(workoutPlans.id, workoutPlanIds))
    : [];
  
  // Also get shared workout IDs for linking to workout details
  const sharedWorkoutData = workoutPlanIds.length > 0
    ? await db
        .select({
          workoutPlanId: sharedWorkouts.workoutPlanId,
          sharedWorkoutId: sharedWorkouts.id,
        })
        .from(sharedWorkouts)
        .where(inArray(sharedWorkouts.workoutPlanId, workoutPlanIds))
    : [];
  
  // Create lookup maps
  const workoutPlanMap = new Map(workoutPlanDetails.map((wp) => [wp.id, wp]));
  const sharedWorkoutMap = new Map(sharedWorkoutData.map((sw) => [sw.workoutPlanId, sw.sharedWorkoutId]));

  // Group workouts by week with enriched workout plan data
  const weekMap = new Map<
    string,
    {
      week: typeof weeks[0]["week"];
      workouts: Array<{
        id: string;
        dayNumber: number;
        name: string;
        focus: string | null;
        estimatedDuration: number | null;
        notes: string | null;
        workoutPlanId: string | null;
        // Enriched data from workout plan
        workoutPlanName: string | null;
        workoutPlanCategory: string | null;
        workoutPlanDifficulty: string | null;
        workoutPlanStructureType: string | null;
        // Shared workout ID for detail sheet
        sharedWorkoutId: string | null;
      }>;
    }
  >();

  weeks.forEach((row) => {
    const weekId = row.week.id;
    if (!weekMap.has(weekId)) {
      weekMap.set(weekId, { week: row.week, workouts: [] });
    }
    if (row.workout) {
      const workoutPlan = row.workout.workoutPlanId 
        ? workoutPlanMap.get(row.workout.workoutPlanId) 
        : null;
      const sharedWorkoutId = row.workout.workoutPlanId
        ? sharedWorkoutMap.get(row.workout.workoutPlanId) || null
        : null;
      
      weekMap.get(weekId)!.workouts.push({
        id: row.workout.id,
        dayNumber: row.workout.dayNumber,
        name: row.workout.name,
        focus: row.workout.focus,
        estimatedDuration: row.workout.estimatedDuration || workoutPlan?.estimatedDuration || null,
        notes: row.workout.notes,
        workoutPlanId: row.workout.workoutPlanId,
        // Add enriched data
        workoutPlanName: workoutPlan?.name || null,
        workoutPlanCategory: workoutPlan?.category || null,
        workoutPlanDifficulty: workoutPlan?.difficulty || null,
        workoutPlanStructureType: workoutPlan?.structureType || null,
        sharedWorkoutId,
      });
    }
  });

  const programWeeksData = Array.from(weekMap.values()).sort(
    (a, b) => a.week.weekNumber - b.week.weekNumber
  );

  // Check user enrollment
  const enrollment = await db.query.programEnrollments.findFirst({
    where: and(
      eq(programEnrollments.programId, id),
      eq(programEnrollments.userId, session.user.id)
    ),
  });

  // Get user's progress if enrolled
  let progress: Array<{
    workoutId: string;
    completed: boolean;
    completedDate: Date | null;
  }> = [];

  if (enrollment) {
    const progressData = await db
      .select({
        workoutId: programWorkoutProgress.programWorkoutId,
        completed: programWorkoutProgress.completed,
        completedDate: programWorkoutProgress.completedDate,
      })
      .from(programWorkoutProgress)
      .where(eq(programWorkoutProgress.enrollmentId, enrollment.id));

    progress = progressData;
  }

  return (
    <ProgramClient
      program={program}
      weeks={programWeeksData}
      enrollment={enrollment || null}
      progress={progress}
      userId={session.user.id}
    />
  );
}
