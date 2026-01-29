import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  communityPrograms,
  programEnrollments,
  programWeeks,
  programWorkouts,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { TodayWorkoutClient } from "./today-client";

interface TodayPageProps {
  params: Promise<{ id: string }>;
}

export default async function TodayPage({ params }: TodayPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get program
  const program = await db.query.communityPrograms.findFirst({
    where: eq(communityPrograms.id, id),
  });

  if (!program) {
    notFound();
  }

  // Get enrollment
  const enrollment = await db.query.programEnrollments.findFirst({
    where: and(
      eq(programEnrollments.programId, id),
      eq(programEnrollments.userId, session.user.id)
    ),
  });

  if (!enrollment) {
    // Not enrolled, redirect to program page
    redirect(`/program/${id}`);
  }

  // Get today's workout
  const currentWeek = enrollment.currentWeek || 1;
  const currentDay = enrollment.currentDay || 1;

  const week = await db.query.programWeeks.findFirst({
    where: and(
      eq(programWeeks.programId, id),
      eq(programWeeks.weekNumber, currentWeek)
    ),
  });

  if (!week) {
    redirect(`/program/${id}`);
  }

  // Get today's workout from the week
  const todayWorkout = await db.query.programWorkouts.findFirst({
    where: and(
      eq(programWorkouts.weekId, week.id),
      eq(programWorkouts.dayNumber, currentDay)
    ),
  });

  const workout = todayWorkout || null;

  return (
    <TodayWorkoutClient
      program={program}
      enrollment={enrollment}
      week={week}
      workout={workout}
    />
  );
}
