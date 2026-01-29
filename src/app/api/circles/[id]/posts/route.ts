import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circlePosts,
  circlePostLikes,
  circleMembers,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

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
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

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

    // Check which posts the current user has liked
    const postIds = posts.map((p) => p.id);
    const userLikes = postIds.length > 0
      ? await db
          .select({ postId: circlePostLikes.postId })
          .from(circlePostLikes)
          .where(
            and(
              eq(circlePostLikes.userId, session.user.id),
              sql`${circlePostLikes.postId} = ANY(${postIds})`
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

    const body = await request.json();
    const {
      postType,
      content,
      imageUrl,
      workoutPlanId,
      challengeId,
      goalId,
      isAssignment,
      dueDate,
    } = body;

    // Validate post type
    const validTypes = ["text", "image", "workout", "challenge", "goal", "milestone"];
    if (!validTypes.includes(postType)) {
      return NextResponse.json(
        { error: "Invalid post type" },
        { status: 400 }
      );
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
        content,
        imageUrl,
        workoutPlanId,
        challengeId,
        goalId,
        isAssignment: isAssignment || false,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    // Get author info
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    return NextResponse.json({
      ...newPost,
      authorName: profile?.displayName || session.user.name,
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
