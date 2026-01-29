import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, userFollows } from "@/lib/db/schema";
import { eq, ne, and, notInArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get users the current user is already following
    const following = await db.query.userFollows.findMany({
      where: eq(userFollows.followerId, session.user.id),
    });
    const followingIds = following.map((f) => f.followingId);

    // Get suggested users (members from public circles that the user isn't following)
    // For now, just get members from circles, excluding the current user
    const allMembers = await db.query.circleMembers.findMany({
      where: ne(circleMembers.userId, session.user.id),
      limit: 50,
    });

    // Filter out already-followed users and dedupe by userId
    const userMap = new Map<string, typeof allMembers[0]>();
    for (const member of allMembers) {
      if (member.userId && !followingIds.includes(member.userId) && !userMap.has(member.userId)) {
        userMap.set(member.userId, member);
      }
    }

    // Convert to suggested user format
    const suggestedUsers = Array.from(userMap.values())
      .slice(0, 20)
      .map((member) => ({
        id: member.userId,
        displayName: member.name,
        name: member.name,
        profilePicture: member.profilePicture,
        isFollowing: false,
      }));

    return NextResponse.json({ users: suggestedUsers });
  } catch (error) {
    console.error("Failed to fetch suggested users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
