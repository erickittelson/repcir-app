import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { posts, postLikes, userProfiles } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { moderateText } from "@/lib/moderation";
import { z } from "zod";

const createPostSchema = z.object({
  postType: z.enum(["text", "image", "workout", "milestone", "pr"]),
  content: z.string().max(5000, "Post content must be less than 5000 characters").optional(),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  workoutPlanId: z.string().uuid().optional().nullable(),
  challengeId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  visibility: z.enum(["public", "followers", "connections", "private"]).default("public"),
}).strict();

// POST /api/posts - Create a new individual post
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { postType, content, imageUrl, workoutPlanId, challengeId, goalId, visibility } =
      validation.data;

    // Must have content or image
    if (!content?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: "Post must have text content or an image" },
        { status: 400 }
      );
    }

    // Moderate text
    if (content && content.length > 0) {
      const moderation = moderateText(content);
      if (!moderation.isClean && moderation.severity !== "mild") {
        return NextResponse.json(
          { error: "Post content contains inappropriate language. Please revise." },
          { status: 400 }
        );
      }
    }

    const [newPost] = await db
      .insert(posts)
      .values({
        authorId: session.user.id,
        postType,
        content: content?.trim() || null,
        imageUrl: imageUrl || null,
        workoutPlanId: workoutPlanId || null,
        challengeId: challengeId || null,
        goalId: goalId || null,
        visibility,
      })
      .returning();

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { displayName: true, profilePicture: true },
    });

    return NextResponse.json({
      ...newPost,
      authorName: profile?.displayName || session.user.name,
      authorImage: profile?.profilePicture || session.user.image,
      isLiked: false,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

// GET /api/posts?userId=<id>&limit=20&offset=0 - Get posts by a specific user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const targetUserId = searchParams.get("userId") || session.user.id;
  const limitParam = parseInt(searchParams.get("limit") || "20");
  const offsetParam = parseInt(searchParams.get("offset") || "0");
  const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
  const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

  try {
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, targetUserId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const postIds = userPosts.map((p) => p.id);
    const userLikes = postIds.length > 0
      ? await db.query.postLikes.findMany({
          where: and(
            inArray(postLikes.postId, postIds),
            eq(postLikes.userId, session.user.id)
          ),
          columns: { postId: true },
        })
      : [];
    const likedIds = new Set(userLikes.map((l) => l.postId));

    return NextResponse.json({
      posts: userPosts.map((p) => ({ ...p, isLiked: likedIds.has(p.id) })),
      hasMore: userPosts.length === limit,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
