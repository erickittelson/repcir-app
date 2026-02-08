import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circles, circleMembers, circleJoinRequests, userProfiles } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;

  try {
    // Check if circle exists
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, circleId),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMembership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (existingMembership) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Handle based on joinType
    const joinType = circle.joinType || "request";

    // INVITE ONLY: Reject requests (can only join via invite)
    if (joinType === "invite_only") {
      return NextResponse.json(
        { error: "This circle is invite-only. You can only join via an invitation." },
        { status: 403 }
      );
    }

    // OPEN: Auto-approve and add as member immediately
    if (joinType === "open") {
      // Check max members
      if (circle.maxMembers) {
        const currentCount = circle.memberCount || 0;
        if (currentCount >= circle.maxMembers) {
          return NextResponse.json(
            { error: "This circle is full" },
            { status: 400 }
          );
        }
      }

      // Get user profile for name
      const userProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, session.user.id),
      });

      // Create membership directly
      const [membership] = await db
        .insert(circleMembers)
        .values({
          circleId,
          userId: session.user.id,
          name: userProfile?.displayName || session.user.name || "New Member",
          role: "member",
        })
        .returning();

      // Update member count
      await db
        .update(circles)
        .set({
          memberCount: sql`${circles.memberCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(circles.id, circleId));

      return NextResponse.json({
        success: true,
        status: "joined",
        membership,
        message: `Welcome to ${circle.name}!`,
      });
    }

    // REQUEST: Create a pending join request (existing behavior)
    // Check if there's already a pending request
    const existingRequest = await db.query.circleJoinRequests.findFirst({
      where: and(
        eq(circleJoinRequests.circleId, circleId),
        eq(circleJoinRequests.userId, session.user.id),
        eq(circleJoinRequests.status, "pending")
      ),
    });

    if (existingRequest) {
      return NextResponse.json({ error: "Request already pending" }, { status: 400 });
    }

    // Get message from request body if provided
    let message: string | null = null;
    try {
      const body = await request.json();
      message = body.message || null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Get user profile for notification
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    const requesterName = userProfile?.displayName || session.user.name || "Someone";

    // Create join request
    const [joinRequest] = await db
      .insert(circleJoinRequests)
      .values({
        circleId,
        userId: session.user.id,
        message,
        status: "pending",
      })
      .returning();

    // Notify all admins/owners of the circle
    const admins = await db
      .select({ userId: circleMembers.userId })
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          sql`${circleMembers.role} IN ('owner', 'admin')`
        )
      );

    // Send notifications to all admins (in parallel, non-blocking)
    const adminUserIds = admins.map((a) => a.userId).filter((id): id is string => !!id);
    Promise.all(
      adminUserIds.map((adminUserId) =>
        createNotification({
          userId: adminUserId,
          type: "circle_request",
          title: `${requesterName} wants to join ${circle.name}`,
          body: message ? `"${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"` : "Tap to review and respond",
          data: { requestId: joinRequest.id, circleId },
          actionUrl: `/circle/${circleId}/members`,
        }).catch((err) => console.error("Failed to notify admin:", err))
      )
    );

    return NextResponse.json({
      success: true,
      status: "pending",
      request: joinRequest,
      message: "Request sent! You'll be notified when approved.",
    });
  } catch (error) {
    console.error("Failed to request to join circle:", error);
    return NextResponse.json({ error: "Failed to request to join" }, { status: 500 });
  }
}
