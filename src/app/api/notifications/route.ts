/**
 * Notifications API
 *
 * Get, mark read, and dismiss notifications.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "@/lib/notifications";
import { z } from "zod";

// GET: List notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const unreadOnly = searchParams.get("unread") === "true";

    // Build query
    let whereCondition = and(
      eq(notifications.userId, userId),
      isNull(notifications.dismissedAt)
    );

    if (unreadOnly) {
      whereCondition = and(whereCondition, isNull(notifications.readAt));
    }

    // Fetch notifications
    const userNotifications = await db.query.notifications.findMany({
      where: whereCondition,
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
    });

    // Get unread count
    const unreadCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
          isNull(notifications.dismissedAt)
        )
      );

    const unreadCount = unreadCountResult[0]?.count || 0;

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount,
      hasMore: userNotifications.length === limit,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH: Mark notifications as read
const patchSchema = z.object({
  action: z.enum(["read", "read_all", "dismiss"]),
  notificationId: z.string().uuid().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { action, notificationId } = validation.data;

    switch (action) {
      case "read":
        if (!notificationId) {
          return NextResponse.json(
            { error: "notificationId required for read action" },
            { status: 400 }
          );
        }
        await markNotificationRead(notificationId, userId);
        break;

      case "read_all":
        await markAllNotificationsRead(userId);
        break;

      case "dismiss":
        if (!notificationId) {
          return NextResponse.json(
            { error: "notificationId required for dismiss action" },
            { status: 400 }
          );
        }
        await dismissNotification(notificationId, userId);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
