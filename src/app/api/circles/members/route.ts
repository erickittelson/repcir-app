import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleMembers, userProfiles } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/circles/members
 * Returns members of the user's active circle (excluding current user by default)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCurrentUser = searchParams.get("includeCurrentUser") === "true";
    const circleId = searchParams.get("circleId") || session.circleId;

    if (!circleId) {
      return NextResponse.json({ error: "No active circle" }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(circleMembers.circleId, circleId)];

    if (!includeCurrentUser) {
      conditions.push(ne(circleMembers.userId, session.user.id));
    }

    // Fetch circle members with their profile info
    const members = await db
      .select({
        id: circleMembers.id,
        memberId: circleMembers.id,
        userId: circleMembers.userId,
        name: circleMembers.name,
        role: circleMembers.role,
        profilePicture: userProfiles.profilePicture,
        handle: userProfiles.handle,
      })
      .from(circleMembers)
      .leftJoin(userProfiles, eq(userProfiles.userId, circleMembers.userId))
      .where(and(...conditions))
      .orderBy(circleMembers.name);

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        memberId: m.memberId,
        userId: m.userId,
        name: m.name,
        role: m.role,
        profilePicture: m.profilePicture,
        handle: m.handle,
      })),
    });
  } catch (error) {
    console.error("Error fetching circle members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
