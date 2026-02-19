/**
 * Blocked Users Utility
 *
 * Returns user IDs that the caller has blocked or been blocked by.
 * Used to filter out blocked users from feeds, search, suggestions, etc.
 */

import { db } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { cacheUserData } from "@/lib/cache";

/**
 * Get IDs of users who are blocked in either direction.
 * If A blocks B, neither A nor B should see each other's content.
 * Cached for 5 minutes.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  return cacheUserData(
    userId,
    "blocked-users",
    async () => {
      const blockedConnections = await db.query.connections.findMany({
        where: and(
          or(
            eq(connections.requesterId, userId),
            eq(connections.addresseeId, userId)
          ),
          eq(connections.status, "blocked")
        ),
        columns: { requesterId: true, addresseeId: true },
      });

      return blockedConnections.map((c) =>
        c.requesterId === userId ? c.addresseeId : c.requesterId
      );
    },
    { ttl: 300 }
  );
}
