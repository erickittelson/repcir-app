import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circlePosts,
  circlePostLikes,
  circleMembers,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { parseAndResolveMentions } from "@/lib/mentions";
import { notifyMention, notifyCircleMention } from "@/lib/notifications";
import { moderateText } from "@/lib/moderation";
import { z } from "zod";

// Validation schema for creating posts
const createPostSchema = z.object({
  postType: z.enum(["text", "image", "workout", "challenge", "goal", "milestone"]),
  content: z.string().max(5000, "Post content must be less than 5000 characters").optional(),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  workoutPlanId: z.string().uuid().optional().nullable(),
  challengeId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  isAssignment: z.boolean().optional().default(false),
  dueDate: z.string().datetime().optional().nullable(),
}).strict();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/circles/[id]/posts - Get posts for a circle
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;
  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get("limit") || "20");
  const offsetParam = parseInt(searchParams.get("offset") || "0");
  // Validate pagination params to prevent NaN issues
  const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
  const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

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

    // Get posts with author info and like status
    const posts = await db
      .select({
        id: circlePosts.id,
        circleId: circlePosts.circleId,
        authorId: circlePosts.authorId,
        postType: circlePosts.postType,
        content: circlePosts.content,
        imageUrl: circlePosts.imageUrl,
        workoutPlanId: circlePosts.workoutPlanId,
        challengeId: circlePosts.challengeId,
        goalId: circlePosts.goalId,
        likeCount: circlePosts.likeCount,
        commentCount: circlePosts.commentCount,
        isAssignment: circlePosts.isAssignment,
        dueDate: circlePosts.dueDate,
        isPinned: circlePosts.isPinned,
        createdAt: circlePosts.createdAt,
        authorName: userProfiles.displayName,
        authorImage: userProfiles.profilePicture,
      })
      .from(circlePosts)
      .leftJoin(userProfiles, eq(userProfiles.userId, circlePosts.authorId))
      .where(eq(circlePosts.circleId, circleId))
      .orderBy(desc(circlePosts.isPinned), desc(circlePosts.createdAt))
      .limit(limit)
      .offset(offset);

    // Check which posts the current user has liked - using inArray for type safety
    const postIds = posts.map((p) => p.id);
    const userLikes = postIds.length > 0
      ? await db
          .select({ postId: circlePostLikes.postId })
          .from(circlePostLikes)
          .where(
            and(
              eq(circlePostLikes.userId, session.user.id),
              inArray(circlePostLikes.postId, postIds)
            )
          )
      : [];

    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    const enrichedPosts = posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }));

    return NextResponse.json({
      posts: enrichedPosts,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error("Error fetching circle posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/circles/[id]/posts - Create a new post
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;

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

    // Parse and validate request body
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

    const {
      postType,
      content,
      imageUrl,
      workoutPlanId,
      challengeId,
      goalId,
      isAssignment,
      dueDate,
    } = validation.data;

    // Moderate text content
    if (content && content.length > 0) {
      const moderation = moderateText(content);
      if (!moderation.isClean && moderation.severity !== "mild") {
        return NextResponse.json(
          { error: "Post content contains inappropriate language. Please revise." },
          { status: 400 }
        );
      }
    }

    // Only admins/owners can post assignments or linked content
    const isAdmin = membership.role === "admin" || membership.role === "owner";
    if ((isAssignment || workoutPlanId || challengeId || goalId) && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can post assignments or linked content" },
        { status: 403 }
      );
    }

    // Create the post
    const [newPost] = await db
      .insert(circlePosts)
      .values({
        circleId,
        authorId: session.user.id,
        postType,
        content: content || null,
        imageUrl: imageUrl || null,
        workoutPlanId: workoutPlanId || null,
        challengeId: challengeId || null,
        goalId: goalId || null,
        isAssignment: isAssignment || false,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    // Get author info
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    const authorName = profile?.displayName || session.user.name;

    // Process mentions and send notifications (async, don't block response)
    if (content) {
      processMentionNotifications(
        content,
        newPost.id,
        circleId,
        session.user.id,
        authorName
      ).catch((err) => console.error("Failed to process mentions:", err));
    }

    return NextResponse.json({
      ...newPost,
      authorName,
      authorImage: profile?.profilePicture || session.user.image,
      isLiked: false,
    });
  } catch (error) {
    console.error("Error creating circle post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

/**
 * Process mentions in post content and send notifications
 */
async function processMentionNotifications(
  content: string,
  postId: string,
  circleId: string,
  authorUserId: string,
  authorName: string
): Promise<void> {
  try {
    const mentions = await parseAndResolveMentions(content);

    if (mentions.length === 0) return;

    const contentPreview = content.slice(0, 100);

    for (const mention of mentions) {
      if (mention.type === "user") {
        // Don't notify yourself
        if (mention.userId === authorUserId) continue;

        await notifyMention(
          mention.userId,
          authorName,
          postId,
          circleId,
          contentPreview
        );
      } else if (mention.type === "circle") {
        // Notify all members of the mentioned circle
        await notifyCircleMention(
          mention.memberUserIds,
          authorUserId,
          authorName,
          mention.circleName,
          postId,
          circleId,
          contentPreview
        );
      }
    }
  } catch (error) {
    console.error("Error processing mention notifications:", error);
  }
}
