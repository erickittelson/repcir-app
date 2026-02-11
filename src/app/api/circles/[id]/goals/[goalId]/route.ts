import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleGoals, circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateCircleGoalSchema, validateBody } from "@/lib/validations";

export const runtime = "nodejs";

/**
 * PUT /api/circles/[id]/goals/[goalId]
 * Update a circle goal.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId, goalId } = await params;

    // Verify user is owner/admin
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });
    if (!membership || !["owner", "admin"].includes(membership.role || "")) {
      return NextResponse.json({ error: "Only owners and admins can update circle goals" }, { status: 403 });
    }

    const validation = await validateBody(request, updateCircleGoalSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const [updated] = await db
      .update(circleGoals)
      .set({ ...validation.data, updatedAt: new Date() })
      .where(and(eq(circleGoals.id, goalId), eq(circleGoals.circleId, circleId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update circle goal:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

/**
 * DELETE /api/circles/[id]/goals/[goalId]
 * Archive a circle goal (soft delete).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId, goalId } = await params;

    // Verify user is owner/admin
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });
    if (!membership || !["owner", "admin"].includes(membership.role || "")) {
      return NextResponse.json({ error: "Only owners and admins can delete circle goals" }, { status: 403 });
    }

    const [archived] = await db
      .update(circleGoals)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(circleGoals.id, goalId), eq(circleGoals.circleId, circleId)))
      .returning();

    if (!archived) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete circle goal:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
