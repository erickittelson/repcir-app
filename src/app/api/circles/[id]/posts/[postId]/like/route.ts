import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circlePosts, circlePostLikes, circleMembers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

// POST /api/circles/[id]/posts/[postId]/like - Toggle like on a post
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId, postId } = await params;

  try {
    // Verify user is a member of the circle
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this circle" },
        { status: 403 }
      );
    }

    // Get the post
    const post = await db.query.circlePosts.findFirst({
      where: eq(circlePosts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.circleId !== circleId) {
      return NextResponse.json(
        { error: "Post does not belong to this circle" },
        { status: 400 }
      );
    }

    // Check if already liked
    const existingLike = await db.query.circlePostLikes.findFirst({
      where: and(
        eq(circlePostLikes.postId, postId),
        eq(circlePostLikes.userId, session.user.id)
      ),
    });

    if (existingLike) {
      // Unlike
      await db
        .delete(circlePostLikes)
        .where(eq(circlePostLikes.id, existingLike.id));

      // Decrement like count
      await db
        .update(circlePosts)
        .set({
          likeCount: sql`GREATEST(${circlePosts.likeCount} - 1, 0)`,
        })
        .where(eq(circlePosts.id, postId));

      return NextResponse.json({ liked: false, likeCount: post.likeCount - 1 });
    } else {
      // Like
      await db.insert(circlePostLikes).values({
        postId,
        userId: session.user.id,
      });

      // Increment like count
      await db
        .update(circlePosts)
        .set({
          likeCount: sql`${circlePosts.likeCount} + 1`,
        })
        .where(eq(circlePosts.id, postId));

      return NextResponse.json({ liked: true, likeCount: post.likeCount + 1 });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}
