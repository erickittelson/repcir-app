import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

/**
 * PATCH /api/circles/[id]/members/[memberId]/role
 * Change a member's role
 * - Owner can promote to admin or demote from admin
 * - Admin can only demote (not promote)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId, memberId } = await params;
    const body = await request.json();
    const { role: newRole } = body;

    // Validate new role
    if (!["member", "admin"].includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'member' or 'admin'" },
        { status: 400 }
      );
    }

    // Get current user's membership
    const currentUserMembership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!currentUserMembership) {
      return NextResponse.json(
        { error: "You are not a member of this circle" },
        { status: 403 }
      );
    }

    // Get the member whose role is being changed
    const targetMember = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, circleId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't change owner's role
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change owner's role" },
        { status: 403 }
      );
    }

    // Can't change your own role
    if (targetMember.id === currentUserMembership.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 403 }
      );
    }

    const currentUserRole = currentUserMembership.role || "member";
    const targetCurrentRole = targetMember.role || "member";

    // Permission checks
    if (currentUserRole === "owner") {
      // Owner can do anything (promote or demote)
    } else if (currentUserRole === "admin") {
      // Admin can only demote other admins to member (not promote)
      if (newRole === "admin") {
        return NextResponse.json(
          { error: "Only owners can promote members to admin" },
          { status: 403 }
        );
      }
      // Admin can only demote other admins
      if (targetCurrentRole !== "admin") {
        return NextResponse.json(
          { error: "Admins can only demote other admins" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "You don't have permission to change roles" },
        { status: 403 }
      );
    }

    // Update the role
    await db
      .update(circleMembers)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(
        and(eq(circleMembers.id, memberId), eq(circleMembers.circleId, circleId))
      );

    return NextResponse.json({
      success: true,
      member: {
        id: memberId,
        role: newRole,
      },
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}
