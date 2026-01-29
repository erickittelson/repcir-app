import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutPlans,
  goals,
  challengeParticipants,
  challenges,
  personalRecords,
  programEnrollments,
  communityPrograms,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ActivityPage } from "./activity-client";

// Revalidate activity page every 60 seconds (workout data may change frequently)
export const revalidate = 60;

export default async function Activity() {
  const session = await getSession();
  if (!session?.activeCircle) return null;

  const memberId = session.activeCircle.memberId;

  // Fetch data in parallel
  const [
    recentSessions,
    savedPlans,
    activeGoals,
    enrolledChallenges,
    prs,
    enrolledPrograms,
  ] = await Promise.all([
    // Recent workout sessions
    db.query.workoutSessions.findMany({
      where: eq(workoutSessions.memberId, memberId),
      orderBy: [desc(workoutSessions.date)],
      limit: 20,
      with: {
        plan: true,
      },
    }),

    // Saved workout plans (by circle or created by this member)
    db.query.workoutPlans.findMany({
      where: eq(workoutPlans.circleId, session.activeCircle.id),
      orderBy: [desc(workoutPlans.createdAt)],
      limit: 10,
    }),

    // Active goals
    db.query.goals.findMany({
      where: and(
        eq(goals.memberId, memberId),
        eq(goals.status, "active")
      ),
      orderBy: [desc(goals.createdAt)],
    }),

    // Enrolled challenges
    db
      .select({
        id: challengeParticipants.id,
        challengeId: challengeParticipants.challengeId,
        currentStreak: challengeParticipants.currentStreak,
        longestStreak: challengeParticipants.longestStreak,
        daysCompleted: challengeParticipants.daysCompleted,
        status: challengeParticipants.status,
        startDate: challengeParticipants.startDate,
        challengeName: challenges.name,
        challengeDurationDays: challenges.durationDays,
        challengeCategory: challenges.category,
      })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(eq(challengeParticipants.userId, session.user.id))
      .orderBy(desc(challengeParticipants.startDate)),

    // Personal records
    db.query.personalRecords.findMany({
      where: eq(personalRecords.memberId, memberId),
      orderBy: [desc(personalRecords.date)],
      limit: 10,
      with: {
        exercise: true,
      },
    }),

    // Program enrollments
    db
      .select({
        id: programEnrollments.id,
        programId: programEnrollments.programId,
        status: programEnrollments.status,
        currentWeek: programEnrollments.currentWeek,
        currentDay: programEnrollments.currentDay,
        workoutsCompleted: programEnrollments.workoutsCompleted,
        totalWorkouts: programEnrollments.totalWorkouts,
        startDate: programEnrollments.startDate,
        programName: communityPrograms.name,
        programCategory: communityPrograms.category,
        durationWeeks: communityPrograms.durationWeeks,
        daysPerWeek: communityPrograms.daysPerWeek,
      })
      .from(programEnrollments)
      .innerJoin(communityPrograms, eq(programEnrollments.programId, communityPrograms.id))
      .where(and(
        eq(programEnrollments.userId, session.user.id),
        eq(programEnrollments.status, "active")
      ))
      .orderBy(desc(programEnrollments.startDate)),
  ]);

  // Calculate stats
  const totalWorkouts = recentSessions.filter(
    (s) => s.status === "completed"
  ).length;
  
  const totalMinutes = recentSessions
    .filter((s) => s.status === "completed" && s.endTime && s.startTime)
    .reduce((acc, s) => {
      const duration = s.endTime && s.startTime
        ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 1000 / 60)
        : 0;
      return acc + duration;
    }, 0);

  return (
    <ActivityPage
      stats={{
        totalWorkouts,
        totalMinutes,
        activeGoalsCount: activeGoals.length,
        personalRecordsCount: prs.length,
      }}
      workoutHistory={recentSessions.map((s) => ({
        id: s.id,
        name: s.plan?.name || s.name || "Quick Workout",
        startedAt: (s.startTime || s.date).toISOString(),
        endedAt: s.endTime?.toISOString(),
        status: s.status,
        rating: s.rating || undefined,
        category: s.plan?.category || undefined,
      }))}
      savedPlans={savedPlans.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || undefined,
        difficulty: p.difficulty || undefined,
        estimatedDuration: p.estimatedDuration || undefined,
        isAiGenerated: p.aiGenerated || false,
      }))}
      goals={activeGoals.map((g) => ({
        id: g.id,
        name: g.title,
        type: g.category,
        targetValue: g.targetValue || 0,
        currentValue: g.currentValue || 0,
        unit: g.targetUnit || "",
        deadline: g.targetDate?.toISOString(),
      }))}
      challenges={enrolledChallenges.map((c) => ({
        id: c.id,
        name: c.challengeName,
        category: c.challengeCategory,
        durationDays: c.challengeDurationDays,
        completedDays: c.daysCompleted || 0,
        currentStreak: c.currentStreak || 0,
        status: c.status,
      }))}
      personalRecords={prs.map((pr) => ({
        id: pr.id,
        exerciseName: pr.exercise?.name || "Unknown",
        value: pr.value,
        unit: pr.unit,
        setAt: pr.date.toISOString(),
      }))}
      programs={enrolledPrograms.map((p) => ({
        id: p.id,
        programId: p.programId,
        name: p.programName,
        category: p.programCategory,
        currentWeek: p.currentWeek || 1,
        currentDay: p.currentDay || 1,
        workoutsCompleted: p.workoutsCompleted || 0,
        totalWorkouts: p.totalWorkouts || 0,
        durationWeeks: p.durationWeeks,
        daysPerWeek: p.daysPerWeek,
        startDate: p.startDate?.toISOString(),
      }))}
    />
  );
}
