import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circleMembers,
  circleGoals,
  goals,
  userLocations,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/members/context?circleId=X
 *
 * Returns aggregated member context for the workout config form:
 * - Current user info (userId, memberId in this circle)
 * - All circles the user belongs to
 * - Circle members (id, userId, name, gender, profile picture, isCurrentUser)
 * - Each member's active goals
 * - Circle-level goals
 * - User's saved locations with equipment
 *
 * If circleId is omitted, defaults to activeCircle.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Determine which circle to use
    const requestedCircleId = request.nextUrl.searchParams.get("circleId");
    let targetCircle: (typeof session.circles)[number] | undefined;

    if (requestedCircleId) {
      // Validate user belongs to the requested circle
      targetCircle = session.circles.find((c) => c.id === requestedCircleId);
      if (!targetCircle) {
        return NextResponse.json(
          { error: "You are not a member of this circle" },
          { status: 403 }
        );
      }
    } else {
      // Default to active circle
      if (!session.activeCircle) {
        return NextResponse.json({ error: "No active circle" }, { status: 400 });
      }
      targetCircle = session.activeCircle;
    }

    const circleId = targetCircle.id;
    const currentUserMemberId = targetCircle.memberId;

    // Fetch circle members
    const members = await db
      .select({
        id: circleMembers.id,
        userId: circleMembers.userId,
        name: circleMembers.name,
        gender: circleMembers.gender,
        profilePicture: circleMembers.profilePicture,
      })
      .from(circleMembers)
      .where(eq(circleMembers.circleId, circleId));

    // Fetch goals for each member (batch)
    const memberIds = members.map((m) => m.id);
    const allGoals = memberIds.length > 0
      ? await db
          .select({
            id: goals.id,
            memberId: goals.memberId,
            title: goals.title,
            category: goals.category,
            status: goals.status,
          })
          .from(goals)
          .where(eq(goals.status, "active"))
      : [];

    // Group goals by memberId
    const goalsByMember = new Map<string, typeof allGoals>();
    for (const goal of allGoals) {
      if (memberIds.includes(goal.memberId)) {
        const existing = goalsByMember.get(goal.memberId) || [];
        existing.push(goal);
        goalsByMember.set(goal.memberId, existing);
      }
    }

    // Fetch circle goals
    const circleGoalsList = await db
      .select({
        id: circleGoals.id,
        title: circleGoals.title,
        category: circleGoals.category,
        priority: circleGoals.priority,
      })
      .from(circleGoals)
      .where(
        and(eq(circleGoals.circleId, circleId), eq(circleGoals.status, "active"))
      )
      .orderBy(desc(circleGoals.priority));

    // Fetch user's locations
    const locations = await db
      .select({
        id: userLocations.id,
        name: userLocations.name,
        type: userLocations.type,
        isActive: userLocations.isActive,
        equipment: userLocations.equipment,
      })
      .from(userLocations)
      .where(eq(userLocations.userId, userId));

    return NextResponse.json({
      currentUserId: userId,
      currentUserMemberId,
      circles: session.circles.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        memberId: c.memberId,
        isSystemCircle: c.isSystemCircle,
      })),
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId ?? "",
        name: m.name,
        gender: m.gender,
        profilePicture: m.profilePicture,
        isCurrentUser: m.userId === userId,
        goals: goalsByMember.get(m.id) || [],
      })),
      circleGoals: circleGoalsList,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        isActive: l.isActive ?? false,
        equipment: (l.equipment as string[]) || [],
      })),
    });
  } catch (error) {
    console.error("Failed to fetch member context:", error);
    return NextResponse.json(
      { error: "Failed to fetch member context" },
      { status: 500 }
    );
  }
}
