/**
 * Message Thread API
 *
 * Get messages between the current user and a specific user.
 * Auto-marks messages as read when fetched.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, or, desc, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET: Get message thread with a specific user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { userId: partnerId } = await params;

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const before = searchParams.get("before"); // ISO timestamp for pagination

    // Build query conditions
    const threadCondition = or(
      and(
        eq(messages.senderId, userId),
        eq(messages.recipientId, partnerId),
        eq(messages.deletedBySender, false)
      ),
      and(
        eq(messages.senderId, partnerId),
        eq(messages.recipientId, userId),
        eq(messages.deletedByRecipient, false)
      )
    );

    // Fetch messages
    const threadMessages = await db.query.messages.findMany({
      where: threadCondition,
      orderBy: [desc(messages.createdAt)],
      limit: limit + 1, // Fetch one extra to check if there are more
    });

    // Check if there are more messages
    const hasMore = threadMessages.length > limit;
    const messagesToReturn = hasMore ? threadMessages.slice(0, limit) : threadMessages;

    // Mark unread messages as read
    const unreadIds = messagesToReturn
      .filter((m) => m.recipientId === userId && !m.readAt)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await db
        .update(messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messages.recipientId, userId),
            eq(messages.senderId, partnerId),
            isNull(messages.readAt)
          )
        );
    }

    // Return messages in chronological order for display
    return NextResponse.json({
      messages: messagesToReturn.reverse(),
      hasMore,
      oldestTimestamp: messagesToReturn.length > 0
        ? messagesToReturn[messagesToReturn.length - 1].createdAt?.toISOString()
        : null,
    });
  } catch (error) {
    console.error("Error fetching message thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a message (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    }

    // Find the message
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user is sender or recipient
    const isSender = message.senderId === userId;
    const isRecipient = message.recipientId === userId;

    if (!isSender && !isRecipient) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Soft delete for the appropriate party
    await db
      .update(messages)
      .set(
        isSender
          ? { deletedBySender: true }
          : { deletedByRecipient: true }
      )
      .where(eq(messages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
