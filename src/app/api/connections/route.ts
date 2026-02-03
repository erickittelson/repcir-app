import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { connections, userProfiles } from "@/lib/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/connections
 * List all connections for the current user
 * Query params:
 *   - status: Filter by status ('accepted' by default, 'pending' for pending requests)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "accepted";

    // Validate status filter
    const validStatuses = ["pending", "accepted", "rejected", "blocked"];
    if (!validStatuses.includes(statusFilter)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: pending, accepted, rejected, blocked" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get connections where user is either requester or addressee
    const userConnections = await db
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
          eq(connections.status, statusFilter),
          or(
            eq(connections.requesterId, userId),
            eq(connections.addresseeId, userId)
          )
        )
      );

    // Get the other user's ID for each connection
    const otherUserIds = userConnections.map((conn) =>
      conn.requesterId === userId ? conn.addresseeId : conn.requesterId
    );

    // Fetch user profiles for the connected users
    const userProfilesMap: Map<string, {
      id: string;
      userId: string;
      displayName: string | null;
      handle: string | null;
      profilePicture: string | null;
      bio: string | null;
      city: string | null;
    }> = new Map();

    if (otherUserIds.length > 0) {
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
        .where(sql`${userProfiles.userId} = ANY(${otherUserIds})`);

      profiles.forEach((profile) => {
        userProfilesMap.set(profile.userId, profile);
      });
    }

    // Build response with user details
    const connectionsWithUsers = userConnections.map((conn) => {
      const otherUserId = conn.requesterId === userId ? conn.addresseeId : conn.requesterId;
      const profile = userProfilesMap.get(otherUserId);
      const isIncoming = conn.addresseeId === userId;

      return {
        id: conn.id,
        status: conn.status,
        isIncoming, // True if this is a request TO the current user
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
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
              userId: otherUserId,
              name: "Unknown User",
              handle: null,
              profilePicture: null,
              bio: null,
              city: null,
            },
      };
    });

    return NextResponse.json({
      connections: connectionsWithUsers,
      total: connectionsWithUsers.length,
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connections
 * Send a connection request to another user
 * Body: { addresseeId: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { addresseeId } = body;

    // Validate required field
    if (!addresseeId || typeof addresseeId !== "string") {
      return NextResponse.json(
        { error: "addresseeId is required and must be a string" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Cannot send connection request to yourself
    if (addresseeId === userId) {
      return NextResponse.json(
        { error: "Cannot send connection request to yourself" },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await db
      .select({ id: userProfiles.id, userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, addresseeId))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check for existing connection (in either direction)
    const existingConnection = await db
      .select({
        id: connections.id,
        status: connections.status,
        requesterId: connections.requesterId,
        addresseeId: connections.addresseeId,
      })
      .from(connections)
      .where(
        or(
          and(
            eq(connections.requesterId, userId),
            eq(connections.addresseeId, addresseeId)
          ),
          and(
            eq(connections.requesterId, addresseeId),
            eq(connections.addresseeId, userId)
          )
        )
      )
      .limit(1);

    if (existingConnection.length > 0) {
      const conn = existingConnection[0];

      if (conn.status === "accepted") {
        return NextResponse.json(
          { error: "You are already connected with this user" },
          { status: 400 }
        );
      }

      if (conn.status === "pending") {
        // If THEY sent request to US, auto-accept
        if (conn.requesterId === addresseeId) {
          const [updatedConnection] = await db
            .update(connections)
            .set({
              status: "accepted",
              updatedAt: new Date(),
            })
            .where(eq(connections.id, conn.id))
            .returning();

          return NextResponse.json({
            connection: updatedConnection,
            message: "Connection accepted (mutual request)",
          });
        }

        return NextResponse.json(
          { error: "Connection request already pending" },
          { status: 400 }
        );
      }

      if (conn.status === "blocked") {
        return NextResponse.json(
          { error: "Cannot connect with this user" },
          { status: 400 }
        );
      }

      // If rejected, allow re-requesting by updating the existing record
      if (conn.status === "rejected" && conn.requesterId === userId) {
        const [updatedConnection] = await db
          .update(connections)
          .set({
            status: "pending",
            updatedAt: new Date(),
          })
          .where(eq(connections.id, conn.id))
          .returning();

        return NextResponse.json({
          connection: updatedConnection,
          message: "Connection request sent",
        });
      }
    }

    // Create new connection request
    const [newConnection] = await db
      .insert(connections)
      .values({
        requesterId: userId,
        addresseeId: addresseeId,
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      connection: newConnection,
      message: "Connection request sent",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating connection:", error);
    return NextResponse.json(
      { error: "Failed to send connection request" },
      { status: 500 }
    );
  }
}
