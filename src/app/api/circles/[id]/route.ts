import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  workoutPlans,
  challenges,
  workoutSessions,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

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
    // Get circle details
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, id),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if user is a member
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, id),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    // Check for pending join request (if we have that table)
    const isPendingRequest = false; // Would need join_requests table

    // Get circle members with roles
    const members = await db
      .select({
        id: circleMembers.id,
        userId: circleMembers.userId,
        role: circleMembers.role,
        joinedAt: circleMembers.createdAt,
      })
      .from(circleMembers)
      .where(eq(circleMembers.circleId, id))
      .orderBy(desc(circleMembers.createdAt))
      .limit(20);

    // Get user profiles for members
    const memberUserIds = members.map((m) => m.userId).filter((id): id is string => id !== null);
    const profiles =
      memberUserIds.length > 0
        ? await db.query.userProfiles.findMany({
            where: (profile, { inArray }) =>
              inArray(profile.userId, memberUserIds),
          })
        : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Separate admins/owners from regular members
    const admins = members
      .filter((m) => m.role === "owner" || m.role === "admin")
      .map((m) => {
        const profile = m.userId ? profileMap.get(m.userId) : undefined;
        return {
          id: m.id,
          name: profile?.displayName || "Anonymous",
          avatarUrl: profile?.profilePicture,
          role: m.role as "owner" | "admin" | "member",
        };
      });

    const recentMembers = members.slice(0, 10).map((m) => {
      const profile = m.userId ? profileMap.get(m.userId) : undefined;
      return {
        id: m.id,
        name: profile?.displayName || "Anonymous",
        avatarUrl: profile?.profilePicture,
        role: m.role as "owner" | "admin" | "member",
      };
    });

    // Get weekly workout count (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyWorkoutsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .innerJoin(circleMembers, eq(workoutSessions.memberId, circleMembers.id))
      .where(
        and(
          eq(circleMembers.circleId, id),
          gte(workoutSessions.date, oneWeekAgo)
        )
      );

    const weeklyWorkouts = weeklyWorkoutsResult[0]?.count || 0;

    // Get total workouts
    const totalWorkoutsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .innerJoin(circleMembers, eq(workoutSessions.memberId, circleMembers.id))
      .where(eq(circleMembers.circleId, id));

    const totalWorkouts = totalWorkoutsResult[0]?.count || 0;

    // Get featured workouts from this circle
    const circleWorkouts = await db.query.workoutPlans.findMany({
      where: eq(workoutPlans.circleId, id),
      orderBy: [desc(workoutPlans.createdAt)],
      limit: 5,
    });

    const featuredWorkouts = circleWorkouts.map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      difficulty: w.difficulty,
    }));

    // Get active challenges from this circle
    const circleChallenge = await db.query.challenges.findMany({
      where: eq(challenges.circleId, id),
      orderBy: [desc(challenges.participantCount)],
      limit: 5,
    });

    const activeChallengesList = circleChallenge.map((c) => ({
      id: c.id,
      name: c.name,
      durationDays: c.durationDays,
      participantCount: c.participantCount,
    }));

    return NextResponse.json({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      handle: (circle as any).handle,
      imageUrl: circle.imageUrl,
      coverImageUrl: (circle as any).coverImageUrl,
      focusArea: circle.focusArea,
      visibility: circle.visibility || "public",
      memberCount: circle.memberCount || members.length,
      weeklyWorkouts,
      totalWorkouts,
      activeChallenges: activeChallengesList.length,
      admins,
      recentMembers,
      featuredWorkouts,
      activeChallengesList,
      isMember: !!membership,
      userRole: membership?.role,
      isPendingRequest,
      rules: (circle as any).rules || [],
      location: (circle as any).location,
      createdAt: circle.createdAt,
    });
  } catch (error) {
    console.error("Error fetching circle:", error);
    return NextResponse.json(
      { error: "Failed to fetch circle" },
      { status: 500 }
    );
  }
}
