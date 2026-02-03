import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circleJoinRequests,
  circleMembers,
  circles,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/circles/[id]/join-requests
 * List pending join requests for a circle (admin/owner only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;

    // Check if current user is admin/owner
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role || "")) {
      return NextResponse.json(
        { error: "Only owners and admins can view join requests" },
        { status: 403 }
      );
    }

    // Fetch pending join requests with user profile info
    const requests = await db
      .select({
        id: circleJoinRequests.id,
        userId: circleJoinRequests.userId,
        message: circleJoinRequests.message,
        status: circleJoinRequests.status,
        createdAt: circleJoinRequests.createdAt,
        // Profile info
        profilePicture: userProfiles.profilePicture,
        displayName: userProfiles.displayName,
        handle: userProfiles.handle,
      })
      .from(circleJoinRequests)
      .leftJoin(userProfiles, eq(userProfiles.userId, circleJoinRequests.userId))
      .where(
        and(
          eq(circleJoinRequests.circleId, circleId),
          eq(circleJoinRequests.status, "pending")
        )
      )
      .orderBy(circleJoinRequests.createdAt);

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt,
        user: {
          name: r.displayName || "User",
          profilePicture: r.profilePicture,
          handle: r.handle,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch join requests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circles/[id]/join-requests
 * Approve or reject a join request (admin/owner only)
 * Body: { requestId: string, action: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;
    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request. Provide requestId and action (approve/reject)" },
        { status: 400 }
      );
    }

    // Check if current user is admin/owner
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role || "")) {
      return NextResponse.json(
        { error: "Only owners and admins can approve/reject requests" },
        { status: 403 }
      );
    }

    // Get the join request
    const joinRequest = await db.query.circleJoinRequests.findFirst({
      where: and(
        eq(circleJoinRequests.id, requestId),
        eq(circleJoinRequests.circleId, circleId),
        eq(circleJoinRequests.status, "pending")
      ),
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: "Join request not found or already processed" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // Get circle info for member count check
      const circle = await db.query.circles.findFirst({
        where: eq(circles.id, circleId),
      });

      // Check max members
      if (circle?.maxMembers) {
        const currentCount = circle.memberCount || 0;
        if (currentCount >= circle.maxMembers) {
          return NextResponse.json(
            { error: "Circle has reached maximum members" },
            { status: 400 }
          );
        }
      }

      // Get user profile for name
      const userProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, joinRequest.userId),
      });

      // Create the membership
      await db.insert(circleMembers).values({
        circleId,
        userId: joinRequest.userId,
        name: userProfile?.displayName || "New Member",
        role: "member",
      });

      // Update member count
      await db
        .update(circles)
        .set({
          memberCount: sql`${circles.memberCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(circles.id, circleId));
    }

    // Update the request status
    await db
      .update(circleJoinRequests)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        respondedBy: session.user.id,
        respondedAt: new Date(),
      })
      .where(eq(circleJoinRequests.id, requestId));

    return NextResponse.json({
      success: true,
      action,
      requestId,
    });
  } catch (error) {
    console.error("Error processing join request:", error);
    return NextResponse.json(
      { error: "Failed to process join request" },
      { status: 500 }
    );
  }
}
