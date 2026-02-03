import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userProfiles, connections } from "@/lib/db/schema";
import { ilike, or, ne, and, sql, eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

type ConnectionStatus = "connected" | "pending_outgoing" | "pending_incoming" | "not_connected";

interface ConnectionInfo {
  status: ConnectionStatus;
  connectionId: string | null;
}

/**
 * GET /api/users/search?q=searchterm
 * Search users by name or handle (works with or without @ symbol)
 *
 * Query params:
 *   - q: Search term (optional, returns recommended users if empty)
 *   - limit: Max results (default 20, max 50)
 *   - connectedOnly: If "true", only return connected users
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const connectedOnly = searchParams.get("connectedOnly") === "true";

    const userId = session.user.id;

    // Get all connections for the current user to build connection status map
    const userConnections = await db
      .select({
        id: connections.id,
        requesterId: connections.requesterId,
        addresseeId: connections.addresseeId,
        status: connections.status,
      })
      .from(connections)
      .where(
        or(
          eq(connections.requesterId, userId),
          eq(connections.addresseeId, userId)
        )
      );

    // Build a map of userId -> connection info
    const connectionMap = new Map<string, ConnectionInfo>();
    const connectedUserIds: string[] = [];

    userConnections.forEach((conn) => {
      const otherUserId = conn.requesterId === userId ? conn.addresseeId : conn.requesterId;

      let connectionStatus: ConnectionStatus = "not_connected";
      if (conn.status === "accepted") {
        connectionStatus = "connected";
        connectedUserIds.push(otherUserId);
      } else if (conn.status === "pending") {
        connectionStatus = conn.requesterId === userId ? "pending_outgoing" : "pending_incoming";
      }
      // Ignore rejected/blocked for display purposes

      connectionMap.set(otherUserId, {
        status: connectionStatus,
        connectionId: conn.id,
      });
    });

    // Helper function to get connection status for a user
    const getConnectionStatus = (targetUserId: string): ConnectionInfo => {
      return connectionMap.get(targetUserId) || {
        status: "not_connected" as ConnectionStatus,
        connectionId: null,
      };
    };

    // If connectedOnly, we filter to only connected users
    if (connectedOnly) {
      if (connectedUserIds.length === 0) {
        return NextResponse.json({ users: [] });
      }

      let connectedProfiles;

      if (query) {
        // Search within connected users
        const searchTerm = query.replace(/^@/, "");
        const searchPattern = `%${searchTerm}%`;

        connectedProfiles = await db
          .select({
            id: userProfiles.id,
            userId: userProfiles.userId,
            name: userProfiles.displayName,
            handle: userProfiles.handle,
            profilePicture: userProfiles.profilePicture,
            city: userProfiles.city,
            bio: userProfiles.bio,
          })
          .from(userProfiles)
          .where(
            and(
              inArray(userProfiles.userId, connectedUserIds),
              or(
                ilike(userProfiles.displayName, searchPattern),
                ilike(userProfiles.handle, searchPattern)
              )
            )
          )
          .limit(limit);
      } else {
        // Return all connected users
        connectedProfiles = await db
          .select({
            id: userProfiles.id,
            userId: userProfiles.userId,
            name: userProfiles.displayName,
            handle: userProfiles.handle,
            profilePicture: userProfiles.profilePicture,
            city: userProfiles.city,
            bio: userProfiles.bio,
          })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, connectedUserIds))
          .limit(limit);
      }

      return NextResponse.json({
        users: connectedProfiles.map((u) => {
          const connInfo = getConnectionStatus(u.userId);
          return {
            id: u.id,
            memberId: u.id,
            userId: u.userId,
            name: u.name || "User",
            handle: u.handle,
            profilePicture: u.profilePicture,
            city: u.city,
            bio: u.bio,
            connectionStatus: connInfo.status,
            connectionId: connInfo.connectionId,
          };
        }),
      });
    }

    // If no query, return recommended users (users with public profiles)
    if (!query) {
      const recommended = await db
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          name: userProfiles.displayName,
          handle: userProfiles.handle,
          profilePicture: userProfiles.profilePicture,
          city: userProfiles.city,
          bio: userProfiles.bio,
        })
        .from(userProfiles)
        .where(
          and(
            ne(userProfiles.userId, userId),
            or(
              sql`${userProfiles.visibility} = 'public'`,
              sql`${userProfiles.handle} IS NOT NULL`
            )
          )
        )
        .limit(limit);

      return NextResponse.json({
        users: recommended.map((u) => {
          const connInfo = getConnectionStatus(u.userId);
          return {
            id: u.id,
            memberId: u.id,
            userId: u.userId,
            name: u.name || "User",
            handle: u.handle,
            profilePicture: u.profilePicture,
            city: u.city,
            bio: u.bio,
            connectionStatus: connInfo.status,
            connectionId: connInfo.connectionId,
          };
        }),
      });
    }

    // Strip @ symbol if present
    const searchTerm = query.replace(/^@/, "");
    const searchPattern = `%${searchTerm}%`;

    // Search by display name or handle
    const results = await db
      .select({
        id: userProfiles.id,
        userId: userProfiles.userId,
        name: userProfiles.displayName,
        handle: userProfiles.handle,
        profilePicture: userProfiles.profilePicture,
        city: userProfiles.city,
        bio: userProfiles.bio,
      })
      .from(userProfiles)
      .where(
        and(
          ne(userProfiles.userId, userId),
          or(
            ilike(userProfiles.displayName, searchPattern),
            ilike(userProfiles.handle, searchPattern)
          )
        )
      )
      .limit(limit);

    return NextResponse.json({
      users: results.map((u) => {
        const connInfo = getConnectionStatus(u.userId);
        return {
          id: u.id,
          memberId: u.id,
          userId: u.userId,
          name: u.name || "User",
          handle: u.handle,
          profilePicture: u.profilePicture,
          city: u.city,
          bio: u.bio,
          connectionStatus: connInfo.status,
          connectionId: connInfo.connectionId,
        };
      }),
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
