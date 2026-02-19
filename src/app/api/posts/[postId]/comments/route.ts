import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { posts, postComments, userProfiles } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { moderateText } from "@/lib/moderation";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
}).strict();

// GET /api/posts/[postId]/comments - Get comments for a post
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const comments = await db
      .select({
        id: postComments.id,
        authorId: postComments.authorId,
        content: postComments.content,
        createdAt: postComments.createdAt,
      })
      .from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt))
      .limit(50);

    // Batch fetch profiles
    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const profiles = authorIds.length > 0
      ? await db.query.userProfiles.findMany({
          where: inArray(userProfiles.userId, authorIds),
          columns: { userId: true, displayName: true, profilePicture: true },
        })
      : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return NextResponse.json({
      comments: comments.map((c) => {
        const profile = profileMap.get(c.authorId);
        return {
          id: c.id,
          authorName: profile?.displayName || "Unknown",
          authorImage: profile?.profilePicture || null,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching post comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/posts/[postId]/comments - Add a comment to a post
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    // Verify post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = createCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    // Moderate
    const moderation = moderateText(content);
    if (!moderation.isClean && moderation.severity !== "mild") {
      return NextResponse.json(
        { error: "Comment contains inappropriate language." },
        { status: 400 }
      );
    }

    const [newComment] = await db
      .insert(postComments)
      .values({
        postId,
        authorId: session.user.id,
        content: content.trim(),
      })
      .returning();

    // Increment comment count
    await db
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, postId));

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { displayName: true, profilePicture: true },
    });

    return NextResponse.json({
      id: newComment.id,
      authorName: profile?.displayName || session.user.name,
      authorImage: profile?.profilePicture || null,
      content: newComment.content,
      createdAt: newComment.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating post comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
