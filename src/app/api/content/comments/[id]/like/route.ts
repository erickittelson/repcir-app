import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commentLikes, contentComments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// POST /api/content/comments/[id]/like - Toggle like on a comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: commentId } = await params;
    const userId = session.user.id;

    // Check if already liked
    const existingLike = await db
      .select()
      .from(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId)
        )
      )
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike - remove the like
      await db
        .delete(commentLikes)
        .where(
          and(
            eq(commentLikes.commentId, commentId),
            eq(commentLikes.userId, userId)
          )
        );

      // Decrement like count
      await db
        .update(contentComments)
        .set({
          likesCount: sql`GREATEST(0, ${contentComments.likesCount} - 1)`,
        })
        .where(eq(contentComments.id, commentId));

      return NextResponse.json({ liked: false });
    } else {
      // Like - add the like
      await db.insert(commentLikes).values({
        userId,
        commentId,
      });

      // Increment like count
      await db
        .update(contentComments)
        .set({
          likesCount: sql`${contentComments.likesCount} + 1`,
        })
        .where(eq(contentComments.id, commentId));

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}
