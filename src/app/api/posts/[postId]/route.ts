import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { posts, postLikes, postComments, postCommentLikes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// DELETE /api/posts/[postId] - Delete own post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Cascade deletes handle likes/comments via FK onDelete
    await db.delete(posts).where(eq(posts.id, postId));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
