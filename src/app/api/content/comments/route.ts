import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentComments, userProfiles } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// GET /api/content/comments - Fetch comments for content
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get("contentType");
  const contentId = searchParams.get("contentId");

  if (!contentType || !contentId) {
    return NextResponse.json(
      { error: "Missing contentType or contentId" },
      { status: 400 }
    );
  }

  try {
    const session = await getSession();
    const userId = session?.user?.id;

    // Fetch comments with user info
    const comments = await db
      .select({
        id: contentComments.id,
        userId: contentComments.userId,
        content: contentComments.content,
        likesCount: contentComments.likesCount,
        isEdited: contentComments.isEdited,
        parentCommentId: contentComments.parentCommentId,
        createdAt: contentComments.createdAt,
        updatedAt: contentComments.updatedAt,
        userDisplayName: userProfiles.displayName,
        userProfilePicture: userProfiles.profilePicture,
      })
      .from(contentComments)
      .leftJoin(userProfiles, eq(contentComments.userId, userProfiles.userId))
      .where(
        and(
          eq(contentComments.contentType, contentType),
          eq(contentComments.contentId, contentId),
          eq(contentComments.isDeleted, false)
        )
      )
      .orderBy(desc(contentComments.createdAt));

    // Transform to include user object
    const transformedComments = comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      content: c.content,
      likesCount: c.likesCount,
      isEdited: c.isEdited,
      parentCommentId: c.parentCommentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: {
        displayName: c.userDisplayName || "User",
        profilePictureUrl: c.userProfilePicture,
      },
    }));

    return NextResponse.json(transformedComments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/content/comments - Create a new comment
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contentType, contentId, content, parentCommentId } = await request.json();

    if (!contentType || !contentId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [comment] = await db
      .insert(contentComments)
      .values({
        userId: session.user.id,
        contentType,
        contentId,
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      })
      .returning();

    // Update comment count on parent content
    // This would be done via triggers or in a service layer in production

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
