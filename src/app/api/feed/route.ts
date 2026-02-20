/**
 * Unified Social Feed API
 *
 * Returns a merged timeline of:
 *  1. Individual user posts (filtered by social graph + visibility)
 *  2. Circle posts (user's circles + public circle posts from followed users)
 *  3. Activity feed items (user's own activities)
 *
 * Uses cursor-based pagination for efficient infinite scroll.
 *
 * GET /api/feed?cursor=<ISO_DATE>|<UUID>&limit=20
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  activityFeed,
  circlePosts,
  circlePostLikes,
  posts,
  postLikes,
  userProfiles,
  userBadges,
  badgeDefinitions,
} from "@/lib/db/schema";
import { eq, and, lt, desc, inArray, or, asc } from "drizzle-orm";
import { getSocialGraph, getUserCircleIds } from "@/lib/social";
import { getBlockedUserIds } from "@/lib/social";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface FeedItem {
  id: string;
  type: "activity" | "post" | "individual_post";
  actorId: string;
  actorName: string;
  actorImage: string | null;
  actorBadges: Array<{
    id: string;
    icon: string | null;
    name: string;
    tier: string;
  }>;
  activityType: string;
  content: string | null;
  imageUrl: string | null;
  circleId: string | null;
  circleName: string | null;
  metadata: Record<string, unknown> | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  visibility: string | null;
  challengeId: string | null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get("cursor");
  const limitParam = parseInt(searchParams.get("limit") || "", 10);
  const pageSize = Math.min(
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );

  // Parse cursor
  let cursorDate: Date | null = null;
  if (cursor) {
    const [dateStr] = cursor.split("|");
    cursorDate = new Date(dateStr);
  }

  // Fetch social graph, circle IDs, and blocked users in parallel
  const [socialGraph, userCircleIds, blockedIds] = await Promise.all([
    getSocialGraph(userId),
    getUserCircleIds(userId),
    getBlockedUserIds(userId),
  ]);

  const blockedSet = new Set(blockedIds);

  // Fetch all three sources in parallel
  const [activities, circlePostResults, individualPostResults] = await Promise.all([
    fetchActivities(userId, cursorDate, pageSize),
    userCircleIds.length > 0
      ? fetchCirclePosts(userCircleIds, cursorDate, pageSize)
      : Promise.resolve([]),
    fetchIndividualPosts(userId, socialGraph.allVisibleUserIds, cursorDate, pageSize),
  ]);

  // Collect unique actor IDs for profile lookup (filter blocked)
  const actorIds = new Set<string>();
  activities.forEach((a) => actorIds.add(a.userId));
  circlePostResults.forEach((p) => actorIds.add(p.authorId));
  individualPostResults.forEach((p) => actorIds.add(p.authorId));

  const actorIdArray = Array.from(actorIds);

  const [profiles, featuredBadges] = await Promise.all([
    actorIds.size > 0
      ? db.query.userProfiles.findMany({
          where: inArray(userProfiles.userId, actorIdArray),
          columns: { userId: true, displayName: true, profilePicture: true },
        })
      : Promise.resolve([]),
    actorIds.size > 0
      ? db
          .select({
            userId: userBadges.userId,
            badgeId: badgeDefinitions.id,
            icon: badgeDefinitions.icon,
            name: badgeDefinitions.name,
            tier: badgeDefinitions.tier,
            displayOrder: userBadges.displayOrder,
          })
          .from(userBadges)
          .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
          .where(
            and(
              inArray(userBadges.userId, actorIdArray),
              eq(userBadges.isFeatured, true)
            )
          )
          .orderBy(asc(userBadges.displayOrder))
      : Promise.resolve([]),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Group badges by userId, max 3 per user
  const badgeMap = new Map<string, typeof featuredBadges>();
  for (const badge of featuredBadges) {
    const existing = badgeMap.get(badge.userId) || [];
    if (existing.length < 3) {
      existing.push(badge);
      badgeMap.set(badge.userId, existing);
    }
  }

  // Check which posts the user has liked (both circle + individual)
  const circlePostIds = circlePostResults.map((p) => p.id);
  const individualPostIds = individualPostResults.map((p) => p.id);

  const [circlePostUserLikes, individualPostUserLikes] = await Promise.all([
    circlePostIds.length > 0
      ? db.query.circlePostLikes.findMany({
          where: and(
            inArray(circlePostLikes.postId, circlePostIds),
            eq(circlePostLikes.userId, userId)
          ),
          columns: { postId: true },
        })
      : Promise.resolve([]),
    individualPostIds.length > 0
      ? db.query.postLikes.findMany({
          where: and(
            inArray(postLikes.postId, individualPostIds),
            eq(postLikes.userId, userId)
          ),
          columns: { postId: true },
        })
      : Promise.resolve([]),
  ]);

  const likedCirclePostIds = new Set(circlePostUserLikes.map((l) => l.postId));
  const likedIndividualPostIds = new Set(individualPostUserLikes.map((l) => l.postId));

  // Circle name map from session
  const circleNameMap = new Map(
    session.circles.map((c) => [c.id, c.name])
  );

  // Helper to get flair badges for a user
  const getBadges = (userId: string) =>
    (badgeMap.get(userId) || []).map((b) => ({
      id: b.badgeId,
      icon: b.icon,
      name: b.name,
      tier: b.tier,
    }));

  // Transform and merge all items
  const feedItems: FeedItem[] = [];

  for (const a of activities) {
    if (blockedSet.has(a.userId)) continue;
    const profile = profileMap.get(a.userId);
    feedItems.push({
      id: `activity-${a.id}`,
      type: "activity",
      actorId: a.userId,
      actorName: profile?.displayName || session.user.name,
      actorImage: profile?.profilePicture || null,
      actorBadges: getBadges(a.userId),
      activityType: a.activityType,
      content: null,
      imageUrl: null,
      circleId: null,
      circleName: null,
      metadata: a.metadata,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      createdAt: a.createdAt.toISOString(),
      visibility: a.visibility,
      challengeId: null,
    });
  }

  for (const p of circlePostResults) {
    if (blockedSet.has(p.authorId)) continue;
    const profile = profileMap.get(p.authorId);
    feedItems.push({
      id: `post-${p.id}`,
      type: "post",
      actorId: p.authorId,
      actorName: profile?.displayName || "Unknown",
      actorImage: profile?.profilePicture || null,
      actorBadges: getBadges(p.authorId),
      activityType: p.postType,
      content: p.content,
      imageUrl: p.imageUrl,
      circleId: p.circleId,
      circleName: circleNameMap.get(p.circleId) || null,
      metadata: null,
      likesCount: p.likeCount || 0,
      commentsCount: p.commentCount || 0,
      isLiked: likedCirclePostIds.has(p.id),
      createdAt: p.createdAt.toISOString(),
      visibility: p.visibility,
      challengeId: p.challengeId || null,
    });
  }

  for (const p of individualPostResults) {
    if (blockedSet.has(p.authorId)) continue;
    const profile = profileMap.get(p.authorId);
    feedItems.push({
      id: `ipost-${p.id}`,
      type: "individual_post",
      actorId: p.authorId,
      actorName: profile?.displayName || "Unknown",
      actorImage: profile?.profilePicture || null,
      actorBadges: getBadges(p.authorId),
      activityType: p.postType,
      content: p.content,
      imageUrl: p.imageUrl,
      circleId: null,
      circleName: null,
      metadata: null,
      likesCount: p.likeCount || 0,
      commentsCount: p.commentCount || 0,
      isLiked: likedIndividualPostIds.has(p.id),
      createdAt: p.createdAt.toISOString(),
      visibility: p.visibility,
      challengeId: p.challengeId || null,
    });
  }

  // Sort by createdAt DESC, then by id for deterministic ordering
  feedItems.sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.id.localeCompare(a.id);
  });

  // Trim to page size (detect hasMore)
  const hasMore = feedItems.length > pageSize;
  const pageItems = hasMore ? feedItems.slice(0, pageSize) : feedItems;

  const nextCursor = hasMore && pageItems.length > 0
    ? `${pageItems[pageItems.length - 1].createdAt}|${pageItems[pageItems.length - 1].id}`
    : null;

  return NextResponse.json({
    items: pageItems,
    nextCursor,
    hasMore,
  });
}

// ============================================================================
// Data fetchers
// ============================================================================

async function fetchActivities(
  userId: string,
  cursorDate: Date | null,
  limit: number
) {
  const conditions = [eq(activityFeed.userId, userId)];
  if (cursorDate) {
    conditions.push(lt(activityFeed.createdAt, cursorDate));
  }

  return db
    .select()
    .from(activityFeed)
    .where(and(...conditions))
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit + 1);
}

async function fetchCirclePosts(
  circleIds: string[],
  cursorDate: Date | null,
  limit: number
) {
  const conditions = [inArray(circlePosts.circleId, circleIds)];
  if (cursorDate) {
    conditions.push(lt(circlePosts.createdAt, cursorDate));
  }

  return db
    .select()
    .from(circlePosts)
    .where(and(...conditions))
    .orderBy(desc(circlePosts.createdAt))
    .limit(limit + 1);
}

/**
 * Fetch individual posts visible to this user:
 * - Own posts (any visibility)
 * - Public posts from anyone
 * - "followers" posts from users we follow
 * - "connections" posts from our connections
 */
async function fetchIndividualPosts(
  userId: string,
  socialGraphIds: string[],
  cursorDate: Date | null,
  limit: number
) {
  // Build OR conditions for visibility-based access
  const visibilityConditions = [
    // Always see own posts
    eq(posts.authorId, userId),
    // Public posts from anyone
    eq(posts.visibility, "public"),
  ];

  // Posts from people in our social graph with followers/connections visibility
  if (socialGraphIds.length > 0) {
    visibilityConditions.push(
      and(
        inArray(posts.authorId, socialGraphIds),
        or(
          eq(posts.visibility, "followers"),
          eq(posts.visibility, "connections")
        )!
      )!
    );
  }

  const conditions = [or(...visibilityConditions)!];
  if (cursorDate) {
    conditions.push(lt(posts.createdAt, cursorDate));
  }

  return db
    .select()
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1);
}
