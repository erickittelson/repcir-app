import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { connections, userProfiles } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/connections/requests
 * Returns pending connection requests sent TO the current user (incoming requests)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get pending connections where current user is the addressee (incoming requests)
    const pendingRequests = await db
      .select({
        id: connections.id,
        requesterId: connections.requesterId,
        addresseeId: connections.addresseeId,
        status: connections.status,
        createdAt: connections.createdAt,
        updatedAt: connections.updatedAt,
      })
      .from(connections)
      .where(
        and(
          eq(connections.status, "pending"),
          eq(connections.addresseeId, userId)
        )
      )
      .orderBy(connections.createdAt);

    // Get requester user IDs
    const requesterIds = pendingRequests.map((req) => req.requesterId);

    // Fetch user profiles for requesters
    const userProfilesMap: Map<string, {
      id: string;
      userId: string;
      displayName: string | null;
      handle: string | null;
      profilePicture: string | null;
      bio: string | null;
      city: string | null;
    }> = new Map();

    if (requesterIds.length > 0) {
      const profiles = await db
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          displayName: userProfiles.displayName,
          handle: userProfiles.handle,
          profilePicture: userProfiles.profilePicture,
          bio: userProfiles.bio,
          city: userProfiles.city,
        })
        .from(userProfiles)
        .where(sql`${userProfiles.userId} = ANY(${requesterIds})`);

      profiles.forEach((profile) => {
        userProfilesMap.set(profile.userId, profile);
      });
    }

    // Build response with user details
    const requestsWithUsers = pendingRequests.map((req) => {
      const profile = userProfilesMap.get(req.requesterId);

      return {
        id: req.id,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        user: profile
          ? {
              id: profile.id,
              userId: profile.userId,
              name: profile.displayName || "User",
              handle: profile.handle,
              profilePicture: profile.profilePicture,
              bio: profile.bio,
              city: profile.city,
            }
          : {
              id: null,
              userId: req.requesterId,
              name: "Unknown User",
              handle: null,
              profilePicture: null,
              bio: null,
              city: null,
            },
      };
    });

    return NextResponse.json({
      requests: requestsWithUsers,
      total: requestsWithUsers.length,
    });
  } catch (error) {
    console.error("Error fetching connection requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch connection requests" },
      { status: 500 }
    );
  }
}
