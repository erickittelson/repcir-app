/**
 * Social Graph Service
 *
 * Resolves a user's social graph (followers, following, connections, circle members)
 * into a flat set of user IDs. Cached in Redis with 300s TTL.
 *
 * Used by the feed to determine which posts a user can see.
 */

import { db } from "@/lib/db";
import {
  userFollows,
  connections,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { cacheUserData } from "@/lib/cache";

export interface SocialGraph {
  /** Users this person follows (one-way) */
  followingIds: string[];
  /** Users who follow this person (one-way) */
  followerIds: string[];
  /** Accepted bidirectional connections */
  connectionIds: string[];
  /** Users in the same circles (via circle_members) */
  circleMateIds: string[];
  /** Deduplicated union of all above */
  allVisibleUserIds: string[];
}

/**
 * Get a user's social graph, cached for 5 minutes.
 * Returns all user IDs the caller can potentially see content from.
 */
export async function getSocialGraph(userId: string): Promise<SocialGraph> {
  return cacheUserData(
    userId,
    "social-graph",
    async () => {
      const [following, followers, acceptedConnections, myMemberships] =
        await Promise.all([
          // Who I follow
          db.query.userFollows.findMany({
            where: eq(userFollows.followerId, userId),
            columns: { followingId: true },
          }),

          // Who follows me
          db.query.userFollows.findMany({
            where: eq(userFollows.followingId, userId),
            columns: { followerId: true },
          }),

          // Accepted connections (bidirectional)
          db.query.connections.findMany({
            where: and(
              or(
                eq(connections.requesterId, userId),
                eq(connections.addresseeId, userId)
              ),
              eq(connections.status, "accepted")
            ),
            columns: { requesterId: true, addresseeId: true },
          }),

          // My circle memberships
          db.query.circleMembers.findMany({
            where: eq(circleMembers.userId, userId),
            columns: { circleId: true },
          }),
        ]);

      const followingIds = following.map((f) => f.followingId);
      const followerIds = followers.map((f) => f.followerId);
      const connectionIds = acceptedConnections.map((c) =>
        c.requesterId === userId ? c.addresseeId : c.requesterId
      );

      // Get circle-mates: other users in my circles
      let circleMateIds: string[] = [];
      const myCircleIds = myMemberships.map((m) => m.circleId);
      if (myCircleIds.length > 0) {
        const mates = await db.query.circleMembers.findMany({
          where: and(
            inArray(circleMembers.circleId, myCircleIds),
          ),
          columns: { userId: true },
        });
        circleMateIds = mates
          .map((m) => m.userId)
          .filter((id): id is string => id !== null && id !== userId);
      }

      // Deduplicate
      const allVisibleUserIds = [
        ...new Set([
          ...followingIds,
          ...followerIds,
          ...connectionIds,
          ...circleMateIds,
        ]),
      ];

      return {
        followingIds,
        followerIds,
        connectionIds,
        circleMateIds,
        allVisibleUserIds,
      };
    },
    { ttl: 300 }
  );
}

/**
 * Get circle IDs a user belongs to, cached.
 */
export async function getUserCircleIds(userId: string): Promise<string[]> {
  return cacheUserData(
    userId,
    "circle-ids",
    async () => {
      const memberships = await db.query.circleMembers.findMany({
        where: eq(circleMembers.userId, userId),
        columns: { circleId: true },
      });
      return memberships.map((m) => m.circleId);
    },
    { ttl: 300 }
  );
}
