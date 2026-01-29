import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  userProfiles,
  workoutPlans,
  challenges,
  activityFeed,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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

  // Get circle members with profiles
  const membersData = await db
    .select({
      member: circleMembers,
      profile: userProfiles,
    })
    .from(circleMembers)
    .leftJoin(userProfiles, eq(userProfiles.userId, circleMembers.userId))
    .where(eq(circleMembers.circleId, id))
    .orderBy(desc(circleMembers.createdAt))
    .limit(20);

  const members = membersData.map((row) => ({
    id: row.member.id,
    memberId: row.member.id, // Use id as memberId
    userId: row.member.userId,
    role: row.member.role,
    joinedAt: row.member.createdAt,
    name: row.profile?.displayName || row.member.name || "Anonymous",
    profilePicture: row.profile?.profilePicture || null,
  }));

  // Get circle workouts
  const workoutsData = await db.query.workoutPlans.findMany({
    where: eq(workoutPlans.circleId, id),
    orderBy: [desc(workoutPlans.createdAt)],
    limit: 10,
  });

  // Get circle challenges
  const challengesData = await db.query.challenges.findMany({
    where: eq(challenges.circleId, id),
    orderBy: [desc(challenges.createdAt)],
    limit: 10,
  });

  // Get recent activity for circle members
  const memberUserIds = members.map((m) => m.userId).filter(Boolean) as string[];
  const activityData = memberUserIds.length > 0 
    ? await db.query.activityFeed.findMany({
        where: eq(activityFeed.visibility, "public"),
        orderBy: [desc(activityFeed.createdAt)],
        limit: 20,
      })
    : [];

  return (
    <CircleClient
      circle={circle}
      membership={membership || null}
      members={members}
      workouts={workoutsData}
      challenges={challengesData}
      activity={activityData}
      userId={session.user.id}
    />
  );
}
