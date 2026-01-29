import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentComments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// PATCH /api/content/comments/[id] - Update a comment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Only allow owner to update
    const [comment] = await db
      .update(contentComments)
      .set({
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentComments.id, id),
          eq(contentComments.userId, session.user.id)
        )
      )
      .returning();

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/content/comments/[id] - Soft delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Only allow owner to delete
    const [comment] = await db
      .update(contentComments)
      .set({
        isDeleted: true,
        content: "[deleted]",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentComments.id, id),
          eq(contentComments.userId, session.user.id)
        )
      )
      .returning();

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
