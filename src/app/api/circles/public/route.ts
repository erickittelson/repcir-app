import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circles, circleMembers, circleJoinRequests } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get public circles (excluding system/personal circles)
    const publicCircles = await db.query.circles.findMany({
      where: and(
        eq(circles.visibility, "public"),
        eq(circles.isSystemCircle, false),
      ),
      orderBy: [desc(circles.memberCount), desc(circles.createdAt)],
      limit: 20,
    });

    // Get user's memberships to mark which circles they've joined
    const userMemberships = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, session.user.id),
    });
    const joinedCircleIds = new Set(userMemberships.map((m) => m.circleId));

    // Get pending join requests
    const pendingRequests = await db.query.circleJoinRequests.findMany({
      where: and(
        eq(circleJoinRequests.userId, session.user.id),
        eq(circleJoinRequests.status, "pending")
      ),
    });
    const pendingCircleIds = new Set(pendingRequests.map((r) => r.circleId));

    // Enhance circles with user's status
    const circlesWithStatus = publicCircles.map((circle) => ({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      category: circle.category,
      visibility: circle.visibility,
      memberCount: circle.memberCount,
      imageUrl: circle.imageUrl,
      isJoined: joinedCircleIds.has(circle.id),
      isPending: pendingCircleIds.has(circle.id),
    }));

    return NextResponse.json({ circles: circlesWithStatus });
  } catch (error) {
    console.error("Failed to fetch public circles:", error);
    return NextResponse.json({ error: "Failed to fetch circles" }, { status: 500 });
  }
}
