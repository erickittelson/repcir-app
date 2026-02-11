import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleGoals, circleMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createCircleGoalSchema, validateBody } from "@/lib/validations";

export const runtime = "nodejs";

/**
 * GET /api/circles/[id]/goals
 * Fetch active circle goals, ordered by priority descending.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;

    // Verify user is a member of this circle
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this circle" }, { status: 403 });
    }

    const goals = await db
      .select()
      .from(circleGoals)
      .where(and(eq(circleGoals.circleId, circleId), eq(circleGoals.status, "active")))
      .orderBy(desc(circleGoals.priority));

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Failed to fetch circle goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

/**
 * POST /api/circles/[id]/goals
 * Create a new circle goal. Requires owner/admin role.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;

    // Verify user is owner/admin
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });
    if (!membership || !["owner", "admin"].includes(membership.role || "")) {
      return NextResponse.json({ error: "Only owners and admins can create circle goals" }, { status: 403 });
    }

    const validation = await validateBody(request, createCircleGoalSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const [goal] = await db
      .insert(circleGoals)
      .values({
        circleId,
        ...validation.data,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Failed to create circle goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
