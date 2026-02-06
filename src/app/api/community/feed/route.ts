import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityFeed, userFollows, circleMembers, userProfiles } from "@/lib/db/schema";
import { eq, inArray, desc, or } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get users the current user is following
    const following = await db.query.userFollows.findMany({
      where: eq(userFollows.followerId, session.user.id),
    });
    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ activities: [] });
    }

    // Get activities from followed users
    const activities = await db.query.activityFeed.findMany({
      where: inArray(activityFeed.userId, followingIds),
      orderBy: [desc(activityFeed.createdAt)],
      limit: 50,
    });

    // Get user info for the activities
    const userIds = [...new Set(activities.map((a) => a.userId))];
    const members = await db.query.circleMembers.findMany({
      where: inArray(circleMembers.userId, userIds),
    });

    // Fetch user profiles for profile pictures and display names
    const profiles = userIds.length > 0
      ? await db.query.userProfiles.findMany({
          where: inArray(userProfiles.userId, userIds),
        })
      : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Create a map of userId to member info (prefer userProfile, fallback to circleMembers)
    const userInfoMap = new Map<string, { name?: string | null; profilePicture?: string | null }>();
    for (const member of members) {
      if (member.userId && !userInfoMap.has(member.userId)) {
        const profile = profileMap.get(member.userId);
        userInfoMap.set(member.userId, {
          name: profile?.displayName || member.name,
          profilePicture: profile?.profilePicture || member.profilePicture,
        });
      }
    }

    // Enhance activities with user info
    const enhancedActivities = activities.map((activity) => {
      const userInfo = userInfoMap.get(activity.userId);
      return {
        id: activity.id,
        userId: activity.userId,
        userName: userInfo?.name || "User",
        userImage: userInfo?.profilePicture,
        activityType: activity.activityType,
        entityType: activity.entityType,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ activities: enhancedActivities });
  } catch (error) {
    console.error("Failed to fetch activity feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
