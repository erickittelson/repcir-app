import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleMembers, circles, userProfiles } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/circles/[id]/members
 * List all members of a circle with their roles and profile info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;

    // Check if circle exists
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, circleId),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if user is a member (for private circles)
    const userMembership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    // For private circles, only members can see the member list
    if (circle.visibility === "private" && !userMembership) {
      return NextResponse.json(
        { error: "You must be a member to view members" },
        { status: 403 }
      );
    }

    // Fetch all circle members with profile info
    const members = await db
      .select({
        id: circleMembers.id,
        userId: circleMembers.userId,
        name: circleMembers.name,
        role: circleMembers.role,
        joinedAt: circleMembers.createdAt,
        // Profile info
        profilePicture: userProfiles.profilePicture,
        handle: userProfiles.handle,
        displayName: userProfiles.displayName,
      })
      .from(circleMembers)
      .leftJoin(userProfiles, eq(userProfiles.userId, circleMembers.userId))
      .where(eq(circleMembers.circleId, circleId))
      .orderBy(
        sql`CASE
          WHEN ${circleMembers.role} = 'owner' THEN 1
          WHEN ${circleMembers.role} = 'admin' THEN 2
          ELSE 3
        END`,
        circleMembers.name
      );

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        memberId: m.id,
        userId: m.userId,
        name: m.displayName || m.name,
        role: m.role,
        profilePicture: m.profilePicture,
        handle: m.handle,
        joinedAt: m.joinedAt,
      })),
      userRole: userMembership?.role || null,
    });
  } catch (error) {
    console.error("Error fetching circle members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/circles/[id]/members
 * Remove a member from the circle (owner/admin only, can't remove owner)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Check if current user has permission (owner or admin)
    const currentUserMembership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (
      !currentUserMembership ||
      !["owner", "admin"].includes(currentUserMembership.role || "")
    ) {
      return NextResponse.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const memberToRemove = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, circleId)
      ),
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove the owner
    if (memberToRemove.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the circle owner" },
        { status: 403 }
      );
    }

    // Admins can only remove regular members, not other admins
    if (
      currentUserMembership.role === "admin" &&
      memberToRemove.role === "admin"
    ) {
      return NextResponse.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 }
      );
    }

    // Remove the member
    await db
      .delete(circleMembers)
      .where(
        and(
          eq(circleMembers.id, memberId),
          eq(circleMembers.circleId, circleId)
        )
      );

    // Update member count
    await db
      .update(circles)
      .set({
        memberCount: sql`${circles.memberCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(circles.id, circleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
