import { getSession } from "@/lib/neon-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  communityPrograms,
  programWeeks,
  programWorkouts,
  programEnrollments,
  challenges,
  challengeParticipants,
  circles,
  circleMembers,
  sharedWorkouts,
  savedWorkouts,
  workoutSessions,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { DiscoverPage } from "./discover-client";

export default async function DiscoverRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch all discover data in parallel
  const [
    programsData,
    challengesData,
    circlesData,
    workoutsData,
  ] = await Promise.all([
    // Programs (public)
    db.query.communityPrograms.findMany({
      where: eq(communityPrograms.visibility, "public"),
      orderBy: [desc(communityPrograms.popularityScore)],
      limit: 30,
    }),
    // Challenges (public)
    db.query.challenges.findMany({
      where: eq(challenges.visibility, "public"),
      orderBy: [desc(challenges.popularityScore)],
      limit: 30,
    }),
    // Circles (public, non-system)
    db
      .select({
        id: circles.id,
        name: circles.name,
        description: circles.description,
        memberCount: circles.memberCount,
        imageUrl: circles.imageUrl,
        focusArea: circles.focusArea,
      })
      .from(circles)
      .where(
        and(
          eq(circles.visibility, "public"),
          eq(circles.isSystemCircle, false)
        )
      )
      .orderBy(desc(circles.memberCount))
      .limit(30),
    // Workouts (public) — include creator profile
    db.query.sharedWorkouts.findMany({
      where: eq(sharedWorkouts.visibility, "public"),
      orderBy: [desc(sharedWorkouts.popularityScore)],
      limit: 30,
      with: {
        creator: {
          columns: {
            displayName: true,
            handle: true,
            profilePicture: true,
          },
        },
      },
    }),
  ]);

  // Fetch user relationships in parallel
  const programIds = programsData.map((p) => p.id);
  const challengeIds = challengesData.map((c) => c.id);
  const circleIds = circlesData.map((c) => c.id);
  const workoutIds = workoutsData.map((w) => w.id);

  const [
    userEnrollments,
    userChallenges,
    userCircles,
    userSaved,
    weeksData,
    weekWorkoutsData,
  ] = await Promise.all([
    // Program enrollments
    programIds.length > 0
      ? db.query.programEnrollments.findMany({
          where: and(
            eq(programEnrollments.userId, userId),
            inArray(programEnrollments.programId, programIds)
          ),
        })
      : [],
    // Challenge participation
    challengeIds.length > 0
      ? db.query.challengeParticipants.findMany({
          where: and(
            eq(challengeParticipants.userId, userId),
            inArray(challengeParticipants.challengeId, challengeIds)
          ),
        })
      : [],
    // Circle membership
    circleIds.length > 0
      ? db
          .select({
            circleId: circleMembers.circleId,
            role: circleMembers.role,
            createdAt: circleMembers.createdAt,
          })
          .from(circleMembers)
          .where(
            and(
              eq(circleMembers.userId, userId),
              inArray(circleMembers.circleId, circleIds)
            )
          )
      : [],
    // Saved workouts
    workoutIds.length > 0
      ? db.query.savedWorkouts.findMany({
          where: and(
            eq(savedWorkouts.userId, userId),
            inArray(savedWorkouts.sharedWorkoutId, workoutIds)
          ),
        })
      : [],
    // Program weeks
    programIds.length > 0
      ? db.query.programWeeks.findMany({
          where: inArray(programWeeks.programId, programIds),
          orderBy: [programWeeks.weekNumber],
        })
      : [],
    // Program workouts
    programIds.length > 0
      ? db.query.programWorkouts.findMany({
          where: inArray(programWorkouts.programId, programIds),
          orderBy: [programWorkouts.dayNumber],
        })
      : [],
  ]);

  // Build lookup maps
  const enrollmentMap = new Map(
    userEnrollments.map((e) => [e.programId, e])
  );
  const challengeMap = new Map(
    userChallenges.map((c) => [c.challengeId, c])
  );
  const circleMap = new Map(
    userCircles.map((c) => [c.circleId, c])
  );
  const savedMap = new Set(
    userSaved.map((s) => s.sharedWorkoutId)
  );

  // Group weeks and workouts by program
  const weeksByProgram = new Map<string, typeof weeksData>();
  for (const week of weeksData) {
    const arr = weeksByProgram.get(week.programId) || [];
    arr.push(week);
    weeksByProgram.set(week.programId, arr);
  }

  const workoutsByWeek = new Map<string, typeof weekWorkoutsData>();
  for (const workout of weekWorkoutsData) {
    if (!workout.weekId) continue;
    const arr = workoutsByWeek.get(workout.weekId) || [];
    arr.push(workout);
    workoutsByWeek.set(workout.weekId, arr);
  }

  // Transform programs
  const programs = programsData.map((p) => {
    const enrollment = enrollmentMap.get(p.id);
    const weeks = (weeksByProgram.get(p.id) || []).map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      name: w.name || undefined,
      focus: w.focus || undefined,
      workouts: (workoutsByWeek.get(w.id) || []).map((wo) => ({
        id: wo.id,
        dayNumber: wo.dayNumber,
        name: wo.name || undefined,
        workoutPlanId: wo.workoutPlanId || undefined,
        estimatedDuration: wo.estimatedDuration || undefined,
        focus: wo.focus || undefined,
      })),
    }));

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
      enrollmentCount: p.enrollmentCount,
      avgRating: p.avgRating || undefined,
      isOfficial: p.isOfficial,
      weeks,
      userRelationship: enrollment
        ? {
            isEnrolled: true,
            status: enrollment.status,
            currentWeek: enrollment.currentWeek,
            startDate: enrollment.startDate.toISOString(),
          }
        : undefined,
    };
  });

  // Transform challenges
  const challengesList = challengesData.map((c) => {
    const participation = challengeMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      shortDescription: c.shortDescription || undefined,
      category: c.category,
      difficulty: c.difficulty,
      durationDays: c.durationDays,
      participantCount: c.participantCount,
      completionCount: c.completionCount || undefined,
      isOfficial: c.isOfficial,
      coverImage: c.coverImage || undefined,
      avgRating: c.avgRating || undefined,
      userRelationship: participation
        ? {
            isParticipating: true,
            status: participation.status,
            startDate: participation.startDate?.toISOString() || "",
            completedAt: participation.completedDate?.toISOString() || undefined,
          }
        : undefined,
    };
  });

  // Transform circles
  const circlesList = circlesData.map((c) => {
    const membership = circleMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      description: c.description || undefined,
      memberCount: c.memberCount,
      imageUrl: c.imageUrl || undefined,
      focusArea: c.focusArea || undefined,
      userRelationship: membership
        ? {
            isMember: true,
            role: membership.role || "member",
            joinedAt: membership.createdAt?.toISOString() || "",
          }
        : undefined,
    };
  });

  // Transform workouts
  const workoutsList = workoutsData.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description || undefined,
    category: w.category || undefined,
    difficulty: w.difficulty || undefined,
    estimatedDuration: w.estimatedDuration || undefined,
    saveCount: w.saveCount,
    avgRating: w.avgRating || undefined,
    creator: w.creator
      ? {
          displayName: w.creator.displayName || undefined,
          handle: w.creator.handle || undefined,
          profilePicture: w.creator.profilePicture || undefined,
        }
      : undefined,
    userRelationship: savedMap.has(w.id)
      ? {
          isSaved: true,
          completedCount: 0,
        }
      : undefined,
  }));

  return (
    <DiscoverPage
      programs={programs}
      challenges={challengesList}
      circles={circlesList}
      workouts={workoutsList}
    />
  );
}
