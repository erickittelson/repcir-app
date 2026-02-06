import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userProfiles, connections, userSports } from "@/lib/db/schema";
import { ilike, or, ne, and, sql, eq, inArray, isNotNull, desc, asc } from "drizzle-orm";

export const runtime = "nodejs";

type ConnectionStatus = "connected" | "pending_outgoing" | "pending_incoming" | "not_connected";

interface ConnectionInfo {
  status: ConnectionStatus;
  connectionId: string | null;
}

type FieldVisibility = {
  bio?: "public" | "circles" | "private";
  city?: "public" | "circles" | "private";
  metrics?: "public" | "circles" | "private";
  sports?: "public" | "circles" | "private";
  skills?: "public" | "circles" | "private";
  prs?: "public" | "circles" | "private";
  badges?: "public" | "circles" | "private";
  socialLinks?: "public" | "circles" | "private";
};

/**
 * GET /api/users/search?q=searchterm
 * Search users by name, handle, location, or bio
 * Only returns users with public profiles and respects field-level visibility
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

    // Helper to filter fields based on visibility
    const filterByVisibility = (
      profile: {
        userId: string;
        name: string | null;
        handle: string | null;
        profilePicture: string | null;
        city: string | null;
        state: string | null;
        bio: string | null;
        visibility: string | null;
        fieldVisibility: FieldVisibility | null;
      }
    ) => {
      const fv = profile.fieldVisibility || {};
      const connInfo = getConnectionStatus(profile.userId);
      const isConnected = connInfo.status === "connected";

      // For public profiles, check field-level visibility
      // For connected users, show "circles" level fields too
      const canSeeField = (fieldVis?: "public" | "circles" | "private") => {
        if (!fieldVis || fieldVis === "public") return true;
        if (fieldVis === "circles" && isConnected) return true;
        return false;
      };

      return {
        id: profile.userId, // Use as the main ID for client
        memberId: profile.userId,
        userId: profile.userId,
        name: profile.name || "User",
        handle: profile.handle,
        profilePicture: profile.profilePicture,
        city: canSeeField(fv.city) ? profile.city : null,
        state: canSeeField(fv.city) ? profile.state : null,
        bio: canSeeField(fv.bio) ? profile.bio : null,
        connectionStatus: connInfo.status,
        connectionId: connInfo.connectionId,
      };
    };

    // If no query, return recommended users (users with public profiles, sorted by completeness)
    if (!query) {
      const recommended = await db
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          name: userProfiles.displayName,
          handle: userProfiles.handle,
          profilePicture: userProfiles.profilePicture,
          city: userProfiles.city,
          state: userProfiles.state,
          bio: userProfiles.bio,
          visibility: userProfiles.visibility,
          fieldVisibility: userProfiles.fieldVisibility,
        })
        .from(userProfiles)
        .where(
          and(
            ne(userProfiles.userId, userId),
            // Must be public profile OR have a handle (discoverable)
            or(
              sql`${userProfiles.visibility} = 'public'`,
              isNotNull(userProfiles.handle)
            )
          )
        )
        // Sort by profile completeness (has picture, has bio, has handle)
        .orderBy(
          desc(sql`CASE WHEN ${userProfiles.profilePicture} IS NOT NULL THEN 1 ELSE 0 END`),
          desc(sql`CASE WHEN ${userProfiles.bio} IS NOT NULL THEN 1 ELSE 0 END`),
          desc(sql`CASE WHEN ${userProfiles.handle} IS NOT NULL THEN 1 ELSE 0 END`)
        )
        .limit(limit);

      return NextResponse.json({
        users: recommended.map((u) => filterByVisibility({
          userId: u.userId,
          name: u.name,
          handle: u.handle,
          profilePicture: u.profilePicture,
          city: u.city,
          state: u.state,
          bio: u.bio,
          visibility: u.visibility,
          fieldVisibility: u.fieldVisibility as FieldVisibility | null,
        })),
      });
    }

    // Strip @ symbol if present
    const searchTerm = query.replace(/^@/, "");
    const searchPattern = `%${searchTerm}%`;

    // Search by display name, handle, city, state, or bio
    // Only search users with public profiles or handles
    const results = await db
      .select({
        id: userProfiles.id,
        userId: userProfiles.userId,
        name: userProfiles.displayName,
        handle: userProfiles.handle,
        profilePicture: userProfiles.profilePicture,
        city: userProfiles.city,
        state: userProfiles.state,
        bio: userProfiles.bio,
        visibility: userProfiles.visibility,
        fieldVisibility: userProfiles.fieldVisibility,
      })
      .from(userProfiles)
      .where(
        and(
          ne(userProfiles.userId, userId),
          // Must be discoverable (public or has handle)
          or(
            sql`${userProfiles.visibility} = 'public'`,
            isNotNull(userProfiles.handle)
          ),
          // Match search term against multiple fields
          or(
            ilike(userProfiles.displayName, searchPattern),
            ilike(userProfiles.handle, searchPattern),
            // Only search city/state/bio if they're publicly visible
            sql`(${userProfiles.city} ILIKE ${searchPattern} AND (
              ${userProfiles.fieldVisibility}->>'city' IS NULL OR
              ${userProfiles.fieldVisibility}->>'city' = 'public'
            ))`,
            sql`(${userProfiles.state} ILIKE ${searchPattern} AND (
              ${userProfiles.fieldVisibility}->>'city' IS NULL OR
              ${userProfiles.fieldVisibility}->>'city' = 'public'
            ))`,
            sql`(${userProfiles.bio} ILIKE ${searchPattern} AND (
              ${userProfiles.fieldVisibility}->>'bio' IS NULL OR
              ${userProfiles.fieldVisibility}->>'bio' = 'public'
            ))`
          )
        )
      )
      // Prioritize exact handle matches, then name matches
      .orderBy(
        desc(sql`CASE WHEN LOWER(${userProfiles.handle}) = LOWER(${searchTerm}) THEN 2
                      WHEN ${userProfiles.handle} ILIKE ${searchPattern} THEN 1
                      ELSE 0 END`),
        desc(sql`CASE WHEN ${userProfiles.displayName} ILIKE ${searchPattern} THEN 1 ELSE 0 END`),
        asc(userProfiles.displayName)
      )
      .limit(limit);

    return NextResponse.json({
      users: results.map((u) => filterByVisibility({
        userId: u.userId,
        name: u.name,
        handle: u.handle,
        profilePicture: u.profilePicture,
        city: u.city,
        state: u.state,
        bio: u.bio,
        visibility: u.visibility,
        fieldVisibility: u.fieldVisibility as FieldVisibility | null,
      })),
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
