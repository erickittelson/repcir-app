import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  challenges,
  sharedWorkouts,
  savedWorkouts,
  programEnrollments,
  challengeParticipants,
  circleMembers,
  workoutSessions,
  communityPrograms,
  programWeeks,
  programWorkouts,
} from "@/lib/db/schema";
import { desc, eq, inArray, and, sql, asc } from "drizzle-orm";
import { DiscoverPage } from "./discover-client";

// Revalidate discover page every 2 minutes (public content changes moderately)
export const revalidate = 120;

export default async function Discover() {
  const session = await getSession();
  if (!session) return null;

  const userId = session.user.id;

  // Fetch data in parallel - including user relationship data
  const [
    featuredChallenges,
    publicCircles,
    popularWorkouts,
    publicPrograms,
    // User relationship data
    userSavedWorkouts,
    userEnrollments,
    userChallenges,
    userCircles,
    userWorkoutHistory,
  ] = await Promise.all([
    // Public challenges
    db.query.challenges.findMany({
      where: eq(challenges.visibility, "public"),
      orderBy: [desc(challenges.participantCount)],
      limit: 30,
    }),

    // Public circles
    db.query.circles.findMany({
      where: eq(circles.visibility, "public"),
      orderBy: [desc(circles.memberCount)],
      limit: 30,
    }),

    // Popular shared workouts
    db.query.sharedWorkouts.findMany({
      where: eq(sharedWorkouts.visibility, "public"),
      orderBy: [desc(sharedWorkouts.saveCount)],
      limit: 30,
    }),

    // Public programs with weeks and workouts
    db.query.communityPrograms.findMany({
      where: eq(communityPrograms.visibility, "public"),
      with: {
        weeks: {
          orderBy: [asc(programWeeks.weekNumber)],
          with: {
            workouts: {
              orderBy: [asc(programWorkouts.dayNumber)],
            },
          },
        },
      },
      orderBy: [desc(communityPrograms.enrollmentCount)],
      limit: 20,
    }),

    // User's saved workouts
    db.query.savedWorkouts.findMany({
      where: eq(savedWorkouts.userId, userId),
    }),

    // User's program enrollments
    db.query.programEnrollments.findMany({
      where: eq(programEnrollments.userId, userId),
    }),

    // User's challenge participations
    db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.userId, userId),
    }),

    // User's circle memberships
    db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, userId),
    }),

    // User's workout completion history (aggregated by workout plan)
    db
      .select({
        workoutPlanId: workoutSessions.planId,
        completedCount: sql<number>`count(*)::int`,
        lastCompletedAt: sql<Date>`max(${workoutSessions.endTime})`,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.status, "completed"),
          // Get member ID for user first - but we'll simplify and filter by circle membership
          sql`${workoutSessions.memberId} IN (
            SELECT id FROM circle_members WHERE user_id = ${userId}
          )`
        )
      )
      .groupBy(workoutSessions.planId),
  ]);

  // Create lookup maps for O(1) access
  const savedWorkoutIds = new Set(userSavedWorkouts.map((sw) => sw.sharedWorkoutId));
  const enrolledProgramIds = new Map(
    userEnrollments.map((e) => [
      e.programId,
      { status: e.status, currentWeek: e.currentWeek, startDate: e.startDate },
    ])
  );
  const participatingChallengeIds = new Map(
    userChallenges.map((c) => [
      c.challengeId,
      { status: c.status, startDate: c.startDate, completedAt: c.completedDate },
    ])
  );
  const memberCircleIds = new Map(
    userCircles.map((c) => [c.circleId, { role: c.role, joinedAt: c.createdAt }])
  );
  const workoutHistoryMap = new Map(
    userWorkoutHistory.map((w) => [
      w.workoutPlanId,
      { completedCount: w.completedCount, lastCompletedAt: w.lastCompletedAt },
    ])
  );

  return (
    <DiscoverPage
      programs={publicPrograms.map((p) => {
        const enrollment = enrolledProgramIds.get(p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          shortDescription: p.shortDescription || undefined,
          coverImage: p.coverImage || undefined,
          category: p.category,
          difficulty: p.difficulty,
          durationWeeks: p.durationWeeks,
          daysPerWeek: p.daysPerWeek,
          enrollmentCount: p.enrollmentCount || 0,
          avgRating: p.avgRating || undefined,
          isOfficial: p.isOfficial || false,
          weeks: p.weeks.map((week) => ({
            id: week.id,
            weekNumber: week.weekNumber,
            name: week.name || undefined,
            focus: week.focus || undefined,
            workouts: week.workouts.map((workout) => ({
              id: workout.id,
              dayNumber: workout.dayNumber,
              name: workout.name || undefined,
              workoutPlanId: workout.workoutPlanId || undefined,
              estimatedDuration: workout.estimatedDuration || undefined,
              focus: workout.focus || undefined,
            })),
          })),
          userRelationship: enrollment
            ? {
                isEnrolled: true,
                status: enrollment.status,
                currentWeek: enrollment.currentWeek,
                startDate: enrollment.startDate?.toISOString(),
              }
            : undefined,
        };
      })}
      challenges={featuredChallenges.map((c) => {
        const participation = participatingChallengeIds.get(c.id);
        return {
          id: c.id,
          name: c.name,
          shortDescription: c.shortDescription || undefined,
          category: c.category,
          difficulty: c.difficulty,
          durationDays: c.durationDays,
          participantCount: c.participantCount || 0,
          isOfficial: c.isOfficial || false,
          avgRating: c.avgRating || undefined,
          // User relationship data
          userRelationship: participation
            ? {
                isParticipating: true,
                status: participation.status,
                startDate: participation.startDate.toISOString(),
                completedAt: participation.completedAt?.toISOString(),
              }
            : undefined,
        };
      })}
      circles={publicCircles.map((c) => {
        const membership = memberCircleIds.get(c.id);
        return {
          id: c.id,
          name: c.name,
          description: c.description || undefined,
          memberCount: c.memberCount || 0,
          imageUrl: c.imageUrl || undefined,
          focusArea: c.focusArea || undefined,
          handle: (c as any).handle || undefined,
          // User relationship data
          userRelationship: membership
            ? {
                isMember: true,
                role: membership.role,
                joinedAt: membership.joinedAt.toISOString(),
              }
            : undefined,
        };
      })}
      workouts={popularWorkouts.map((w) => {
        const isSaved = savedWorkoutIds.has(w.id);
        const history = w.workoutPlanId ? workoutHistoryMap.get(w.workoutPlanId) : undefined;
        return {
          id: w.id,
          title: w.title,
          description: w.description || undefined,
          category: w.category || undefined,
          difficulty: w.difficulty || undefined,
          estimatedDuration: w.estimatedDuration || undefined,
          saveCount: w.saveCount || 0,
          avgRating: w.avgRating || undefined,
          // User relationship data
          userRelationship: {
            isSaved,
            completedCount: history?.completedCount || 0,
            lastCompletedAt: history?.lastCompletedAt?.toISOString(),
          },
        };
      })}
    />
  );
}
