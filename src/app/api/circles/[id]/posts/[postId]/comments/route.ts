import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circlePosts,
  circlePostComments,
  circleMembers,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

// GET /api/circles/[id]/posts/[postId]/comments - Get comments for a post
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId, postId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

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

    // Get comments with author info
    const comments = await db
      .select({
        id: circlePostComments.id,
        postId: circlePostComments.postId,
        authorId: circlePostComments.authorId,
        content: circlePostComments.content,
        createdAt: circlePostComments.createdAt,
        authorName: userProfiles.displayName,
        authorImage: userProfiles.profilePicture,
      })
      .from(circlePostComments)
      .leftJoin(userProfiles, eq(userProfiles.userId, circlePostComments.authorId))
      .where(eq(circlePostComments.postId, postId))
      .orderBy(desc(circlePostComments.createdAt))
      .limit(limit);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/circles/[id]/posts/[postId]/comments - Add a comment
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

    // Verify post exists and belongs to this circle
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

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Create the comment
    const [newComment] = await db
      .insert(circlePostComments)
      .values({
        postId,
        authorId: session.user.id,
        content: content.trim(),
      })
      .returning();

    // Increment comment count on post
    await db
      .update(circlePosts)
      .set({
        commentCount: sql`${circlePosts.commentCount} + 1`,
      })
      .where(eq(circlePosts.id, postId));

    // Get author info
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    return NextResponse.json({
      ...newComment,
      authorName: profile?.displayName || session.user.name,
      authorImage: profile?.profilePicture || session.user.image,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
