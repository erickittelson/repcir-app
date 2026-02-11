import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circlePosts,
  circlePostComments,
  circleMembers,
  userProfiles,
  workoutPlans,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { moderateText } from "@/lib/moderation";
import { z } from "zod";

// Validation schema for comments
const createCommentSchema = z.object({
  content: z.string()
    .min(1, "Comment is required")
    .max(2000, "Comment must be less than 2000 characters")
    .trim(),
  imageUrl: z.string().url().optional(),
  workoutPlanId: z.string().uuid().optional(),
});

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
  const limitParam = parseInt(searchParams.get("limit") || "50");
  const limit = isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 100);

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
        imageUrl: circlePostComments.imageUrl,
        workoutPlanId: circlePostComments.workoutPlanId,
        createdAt: circlePostComments.createdAt,
        authorName: userProfiles.displayName,
        authorImage: userProfiles.profilePicture,
      })
      .from(circlePostComments)
      .leftJoin(userProfiles, eq(userProfiles.userId, circlePostComments.authorId))
      .where(eq(circlePostComments.postId, postId))
      .orderBy(desc(circlePostComments.createdAt))
      .limit(limit);

    // Fetch linked workout names if any comments have workoutPlanId
    const workoutIds = comments
      .map((c) => c.workoutPlanId)
      .filter((id): id is string => id !== null);

    let workoutMap = new Map<string, string>();
    if (workoutIds.length > 0) {
      const plans = await db
        .select({ id: workoutPlans.id, name: workoutPlans.name })
        .from(workoutPlans)
        .where(sql`${workoutPlans.id} IN ${workoutIds}`);
      workoutMap = new Map(plans.map((p) => [p.id, p.name]));
    }

    const enrichedComments = comments.map((c) => ({
      ...c,
      workoutName: c.workoutPlanId ? workoutMap.get(c.workoutPlanId) || null : null,
    }));

    return NextResponse.json({ comments: enrichedComments });
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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = createCommentSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { content, imageUrl, workoutPlanId } = validation.data;

    // Moderate comment content
    const moderation = moderateText(content);
    if (!moderation.isClean && moderation.severity !== "mild") {
      return NextResponse.json(
        { error: "Comment contains inappropriate language. Please revise." },
        { status: 400 }
      );
    }

    // Create the comment
    const [newComment] = await db
      .insert(circlePostComments)
      .values({
        postId,
        authorId: session.user.id,
        content,
        imageUrl: imageUrl || null,
        workoutPlanId: workoutPlanId || null,
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

    // Get workout name if attached
    let workoutName: string | null = null;
    if (workoutPlanId) {
      const plan = await db.query.workoutPlans.findFirst({
        where: eq(workoutPlans.id, workoutPlanId),
        columns: { name: true },
      });
      workoutName = plan?.name || null;
    }

    return NextResponse.json({
      ...newComment,
      authorName: profile?.displayName || session.user.name,
      authorImage: profile?.profilePicture || session.user.image,
      workoutName,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
