/**
 * Messages SSE Stream
 *
 * Server-Sent Events endpoint for real-time message updates.
 * Polls the database and sends new messages to the client.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastCheckTime = new Date();
      let isRunning = true;

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Poll for new messages every 2 seconds
      const pollInterval = setInterval(async () => {
        if (!isRunning) return;

        try {
          // Check for new messages since last check
          const newMessages = await db.query.messages.findMany({
            where: and(
              eq(messages.recipientId, userId),
              gt(messages.createdAt, lastCheckTime),
              eq(messages.deletedByRecipient, false)
            ),
          });

          if (newMessages.length > 0) {
            for (const message of newMessages) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "message", data: message })}\n\n`
                )
              );
            }
            lastCheckTime = new Date();
          }

          // Send heartbeat every 30 seconds to keep connection alive
          const now = Date.now();
          if (now % 30000 < 2000) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
            );
          }
        } catch (error) {
          console.error("SSE polling error:", error);
          // Don't close the stream on transient errors
        }
      }, 2000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isRunning = false;
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
