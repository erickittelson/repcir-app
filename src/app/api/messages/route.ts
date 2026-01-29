/**
 * Messages API
 *
 * Handles direct messaging between circle members.
 * Users can only message others who are in the same circle.
 * Includes profanity filtering for message content.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, circleMembers } from "@/lib/db/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { moderateText } from "@/lib/moderation";

// Schema for sending a message
const sendMessageSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  circleId: z.string().uuid("Invalid circle ID"),
  content: z.string().min(1, "Message content is required").max(5000, "Message too long"),
});

// GET: List conversations (grouped by user)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all unique conversations (users I've messaged or who messaged me)
    // Returns the latest message for each conversation
    const conversations = await db.execute(sql`
      WITH conversation_partners AS (
        SELECT DISTINCT
          CASE
            WHEN sender_id = ${userId} THEN recipient_id
            ELSE sender_id
          END as partner_id,
          circle_id
        FROM messages
        WHERE (sender_id = ${userId} AND deleted_by_sender = false)
           OR (recipient_id = ${userId} AND deleted_by_recipient = false)
      ),
      latest_messages AS (
        SELECT DISTINCT ON (
          CASE
            WHEN m.sender_id = ${userId} THEN m.recipient_id
            ELSE m.sender_id
          END
        )
          m.*,
          CASE
            WHEN m.sender_id = ${userId} THEN m.recipient_id
            ELSE m.sender_id
          END as partner_id
        FROM messages m
        WHERE (m.sender_id = ${userId} AND m.deleted_by_sender = false)
           OR (m.recipient_id = ${userId} AND m.deleted_by_recipient = false)
        ORDER BY partner_id, m.created_at DESC
      )
      SELECT
        lm.*,
        (
          SELECT COUNT(*)::int
          FROM messages
          WHERE recipient_id = ${userId}
            AND sender_id = lm.partner_id
            AND read_at IS NULL
            AND deleted_by_recipient = false
        ) as unread_count
      FROM latest_messages lm
      ORDER BY lm.created_at DESC
    `);

    return NextResponse.json({
      conversations: conversations.rows,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { recipientId, circleId, content } = validation.data;

    // Moderate message content for profanity
    const moderationResult = moderateText(content);
    if (!moderationResult.isClean) {
      console.warn(`[Moderation] Message rejected from user ${userId}: ${moderationResult.flaggedWords.join(", ")}`);

      return NextResponse.json(
        {
          error: "Your message contains inappropriate language. Please revise and try again.",
          code: "CONTENT_MODERATION_FAILED",
          flaggedWords: moderationResult.flaggedWords,
        },
        { status: 400 }
      );
    }

    // Verify both users are members of the same circle
    const memberships = await db.query.circleMembers.findMany({
      where: and(
        eq(circleMembers.circleId, circleId),
        inArray(circleMembers.userId, [userId, recipientId])
      ),
    });

    // Check both sender and recipient are in the circle
    const senderInCircle = memberships.some((m) => m.userId === userId);
    const recipientInCircle = memberships.some((m) => m.userId === recipientId);

    if (!senderInCircle || !recipientInCircle) {
      return NextResponse.json(
        { error: "Both users must be members of the same circle to message" },
        { status: 403 }
      );
    }

    // Create the message
    const [message] = await db
      .insert(messages)
      .values({
        circleId,
        senderId: userId,
        recipientId,
        content,
      })
      .returning();

    return NextResponse.json({
      message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
