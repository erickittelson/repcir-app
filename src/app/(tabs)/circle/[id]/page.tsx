import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  userProfiles,
  workoutSessions,
} from "@/lib/db/schema";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { CircleClient } from "./circle-client";

interface CirclePageProps {
  params: Promise<{ id: string }>;
}

export default async function CirclePage({ params }: CirclePageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get circle details
  const circle = await db.query.circles.findFirst({
    where: eq(circles.id, id),
  });

  if (!circle) {
    notFound();
  }

  // Check user membership
  const membership = await db.query.circleMembers.findFirst({
    where: and(
      eq(circleMembers.circleId, id),
      eq(circleMembers.userId, session.user.id)
    ),
  });

  // Get today's date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get this week's start (Monday)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  // Get circle members with profiles
  const membersData = await db
    .select({
      member: circleMembers,
      profile: userProfiles,
    })
    .from(circleMembers)
    .leftJoin(userProfiles, eq(userProfiles.userId, circleMembers.userId))
    .where(eq(circleMembers.circleId, id))
    .orderBy(desc(circleMembers.createdAt));

  const memberIds = membersData.map((row) => row.member.id);

  // Fetch accountability data in parallel
  const [todayWorkouts, weekWorkouts] = await Promise.all([
    // Workouts completed TODAY by circle members
    memberIds.length > 0
      ? db.query.workoutSessions.findMany({
          where: and(
            inArray(workoutSessions.memberId, memberIds),
            gte(workoutSessions.date, today),
            eq(workoutSessions.status, "completed")
          ),
        })
      : [],
    // Workouts this week by circle members
    memberIds.length > 0
      ? db.query.workoutSessions.findMany({
          where: and(
            inArray(workoutSessions.memberId, memberIds),
            gte(workoutSessions.date, weekStart),
            eq(workoutSessions.status, "completed")
          ),
        })
      : [],
  ]);

  // Calculate who has trained today
  const trainedTodayMemberIds = new Set(todayWorkouts.map((w) => w.memberId));

  // Build member accountability data
  const members = membersData.map((row) => {
    const memberWeekWorkouts = weekWorkouts.filter((w) => w.memberId === row.member.id);
    const trainedToday = trainedTodayMemberIds.has(row.member.id);

    return {
      id: row.member.id,
      memberId: row.member.id,
      userId: row.member.userId,
      role: row.member.role,
      joinedAt: row.member.createdAt,
      name: row.profile?.displayName || row.member.name || "Anonymous",
      profilePicture: row.profile?.profilePicture || null,
      trainedToday,
      workoutsThisWeek: memberWeekWorkouts.length,
    };
  });

  // Sort by workouts this week (leaderboard)
  members.sort((a, b) => {
    if (a.trainedToday !== b.trainedToday) return a.trainedToday ? -1 : 1;
    return b.workoutsThisWeek - a.workoutsThisWeek;
  });

  const trainedTodayCount = members.filter((m) => m.trainedToday).length;

  return (
    <CircleClient
      circle={circle}
      membership={membership || null}
      members={members}
      trainedTodayCount={trainedTodayCount}
      userId={session.user.id}
    />
  );
}
