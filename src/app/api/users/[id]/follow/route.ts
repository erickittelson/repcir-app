import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userFollows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getBlockedUserIds } from "@/lib/social";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  try {
    // Check blocked status (bidirectional)
    const blockedIds = await getBlockedUserIds(session.user.id);
    if (blockedIds.includes(targetUserId)) {
      return NextResponse.json({ error: "Cannot follow this user" }, { status: 403 });
    }

    // Check if already following
    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, session.user.id),
        eq(userFollows.followingId, targetUserId)
      ),
    });

    if (existing) {
      return NextResponse.json({ error: "Already following" }, { status: 400 });
    }

    // Create follow relationship
    const [follow] = await db
      .insert(userFollows)
      .values({
        followerId: session.user.id,
        followingId: targetUserId,
      })
      .returning();

    return NextResponse.json({ success: true, follow });
  } catch (error) {
    console.error("Failed to follow user:", error);
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  try {
    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, session.user.id),
          eq(userFollows.followingId, targetUserId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unfollow user:", error);
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }
}
