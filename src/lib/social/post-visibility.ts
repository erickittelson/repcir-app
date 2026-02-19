/**
 * Post Visibility Checker
 *
 * Determines whether a viewer can see a specific post based on
 * the post's visibility setting and the viewer's relationship to the author.
 */

import { db } from "@/lib/db";
import { userFollows, connections } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getBlockedUserIds } from "./blocked-users";

type PostVisibility = "public" | "followers" | "connections" | "private";

interface PostForVisibilityCheck {
  authorId: string;
  visibility: PostVisibility | string | null;
}

/**
 * Check if a viewer can see a specific post.
 * Returns true if access is allowed, false otherwise.
 */
export async function canViewPost(
  viewerUserId: string | null,
  post: PostForVisibilityCheck
): Promise<boolean> {
  // Author can always see their own posts
  if (viewerUserId === post.authorId) return true;

  // Private posts: author only
  if (post.visibility === "private") return false;

  // Check blocked status (bidirectional)
  if (viewerUserId) {
    const blockedIds = await getBlockedUserIds(viewerUserId);
    if (blockedIds.includes(post.authorId)) return false;
  }

  // Public posts: anyone can see
  if (post.visibility === "public") return true;

  // Remaining types require authentication
  if (!viewerUserId) return false;

  // Followers visibility: viewer must follow the author
  if (post.visibility === "followers") {
    const follow = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, viewerUserId),
        eq(userFollows.followingId, post.authorId)
      ),
    });
    return !!follow;
  }

  // Connections visibility: viewer must have accepted connection with author
  if (post.visibility === "connections") {
    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.status, "accepted"),
        or(
          and(
            eq(connections.requesterId, viewerUserId),
            eq(connections.addresseeId, post.authorId)
          ),
          and(
            eq(connections.requesterId, post.authorId),
            eq(connections.addresseeId, viewerUserId)
          )
        )
      ),
    });
    return !!connection;
  }

  return false;
}
