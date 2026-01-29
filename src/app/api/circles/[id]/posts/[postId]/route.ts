import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circlePosts, circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

// DELETE /api/circles/[id]/posts/[postId] - Delete a post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId, postId } = await params;

  try {
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

    // Check if user is author or admin
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

    const isAdmin = membership.role === "admin" || membership.role === "owner";
    const isAuthor = post.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "Not authorized to delete this post" },
        { status: 403 }
      );
    }

    // Delete the post (cascade will handle likes and comments)
    await db.delete(circlePosts).where(eq(circlePosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting circle post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

// PATCH /api/circles/[id]/posts/[postId] - Update a post (pin/unpin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId, postId } = await params;

  try {
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

    // Check if user is admin
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

    const isAdmin = membership.role === "admin" || membership.role === "owner";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update posts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isPinned } = body;

    // Update the post
    const [updatedPost] = await db
      .update(circlePosts)
      .set({
        isPinned: isPinned ?? post.isPinned,
        updatedAt: new Date(),
      })
      .where(eq(circlePosts.id, postId))
      .returning();

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Error updating circle post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
