import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { posts, postLikes } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// POST /api/posts/[postId]/like - Toggle like on an individual post
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { id: true, likeCount: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingLike = await db.query.postLikes.findFirst({
      where: and(
        eq(postLikes.postId, postId),
        eq(postLikes.userId, session.user.id)
      ),
    });

    if (existingLike) {
      await db.delete(postLikes).where(eq(postLikes.id, existingLike.id));
      await db
        .update(posts)
        .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
        .where(eq(posts.id, postId));

      return NextResponse.json({ liked: false, likeCount: Math.max(post.likeCount - 1, 0) });
    } else {
      await db.insert(postLikes).values({ postId, userId: session.user.id });
      await db
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} + 1` })
        .where(eq(posts.id, postId));

      return NextResponse.json({ liked: true, likeCount: post.likeCount + 1 });
    }
  } catch (error) {
    console.error("Error toggling post like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
