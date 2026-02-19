import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, userFollows, userProfiles } from "@/lib/db/schema";
import { eq, ne, and, notInArray, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getBlockedUserIds } from "@/lib/social";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get users the current user is already following and blocked users in parallel
    const [following, blockedIds] = await Promise.all([
      db.query.userFollows.findMany({
        where: eq(userFollows.followerId, session.user.id),
      }),
      getBlockedUserIds(session.user.id),
    ]);
    const followingIds = following.map((f) => f.followingId);
    const blockedSet = new Set(blockedIds);

    // Get suggested users (members from public circles that the user isn't following)
    // For now, just get members from circles, excluding the current user
    const allMembers = await db.query.circleMembers.findMany({
      where: ne(circleMembers.userId, session.user.id),
      limit: 50,
    });

    // Filter out already-followed users, blocked users, and dedupe by userId
    const userMap = new Map<string, typeof allMembers[0]>();
    for (const member of allMembers) {
      if (member.userId && !followingIds.includes(member.userId) && !blockedSet.has(member.userId) && !userMap.has(member.userId)) {
        userMap.set(member.userId, member);
      }
    }

    // Fetch user profiles for profile pictures
    const userIds = Array.from(userMap.keys());
    const profiles = userIds.length > 0
      ? await db.query.userProfiles.findMany({
          where: inArray(userProfiles.userId, userIds),
        })
      : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Convert to suggested user format
    const suggestedUsers = Array.from(userMap.values())
      .slice(0, 20)
      .map((member) => {
        const profile = member.userId ? profileMap.get(member.userId) : null;
        return {
          id: member.userId,
          displayName: profile?.displayName || member.name,
          name: member.name,
          profilePicture: profile?.profilePicture || member.profilePicture,
          isFollowing: false,
        };
      });

    return NextResponse.json({ users: suggestedUsers });
  } catch (error) {
    console.error("Failed to fetch suggested users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
