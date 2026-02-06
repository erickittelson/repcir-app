import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, desc, sql, and, or, ilike, isNotNull, gt } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/circles/discover
 * Discover public rallies/circles to join
 * Query params:
 *   - q: Search query (optional)
 *   - focusArea: Filter by focus area (optional)
 *   - sort: Sort by "popular" | "newest" | "active" (default: popular)
 *   - limit: Max results (default: 20, max: 50)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const focusArea = searchParams.get("focusArea");
    const sort = searchParams.get("sort") || "popular";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const userId = session.user.id;

    // Get circles the user is already a member of
    const userMemberships = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));

    const memberCircleIds = new Set(userMemberships.map((m) => m.circleId));

    // Build base query for discoverable circles (public circles only)
    const conditions = [eq(circles.visibility, "public")];

    // Filter by search query
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          ilike(circles.name, searchPattern),
          ilike(circles.description, searchPattern),
          ilike(circles.category, searchPattern)
        )!
      );
    }

    // Filter by focus area
    if (focusArea && focusArea !== "all") {
      conditions.push(eq(circles.focusArea, focusArea));
    }

    // Build sort order
    let orderBy: ReturnType<typeof desc>[] = [];
    switch (sort) {
      case "newest":
        orderBy = [desc(circles.createdAt)];
        break;
      case "active":
        orderBy = [desc(circles.updatedAt), desc(circles.memberCount)];
        break;
      case "popular":
      default:
        orderBy = [desc(circles.memberCount), desc(circles.createdAt)];
        break;
    }

    // Fetch circles
    const discoveredCircles = await db
      .select({
        id: circles.id,
        name: circles.name,
        description: circles.description,
        imageUrl: circles.imageUrl,
        memberCount: circles.memberCount,
        focusArea: circles.focusArea,
        visibility: circles.visibility,
        createdAt: circles.createdAt,
        category: circles.category,
      })
      .from(circles)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + memberCircleIds.size); // Fetch extra to account for filtering

    // Add membership status and filter/limit results
    const circlesWithMembership = discoveredCircles
      .map((circle) => ({
        ...circle,
        handle: null, // Not in schema
        lastActivityAt: circle.createdAt, // Use createdAt as fallback
        isMember: memberCircleIds.has(circle.id),
      }))
      .slice(0, limit);

    // Get focus area counts for filter UI
    const focusAreaCounts = await db
      .select({
        focusArea: circles.focusArea,
        count: sql<number>`count(*)::int`,
      })
      .from(circles)
      .where(
        and(
          eq(circles.visibility, "public"),
          isNotNull(circles.focusArea)
        )
      )
      .groupBy(circles.focusArea);

    // Get trending rallies (most popular public rallies)
    const trending = await db
      .select({
        id: circles.id,
        name: circles.name,
        imageUrl: circles.imageUrl,
        memberCount: circles.memberCount,
        focusArea: circles.focusArea,
      })
      .from(circles)
      .where(
        and(
          eq(circles.visibility, "public"),
          gt(circles.memberCount, 3)
        )
      )
      .orderBy(desc(circles.memberCount))
      .limit(5);

    return NextResponse.json({
      circles: circlesWithMembership,
      trending: trending.map((c) => ({
        ...c,
        handle: null,
        isMember: memberCircleIds.has(c.id),
      })),
      filters: {
        focusAreas: focusAreaCounts.filter((f) => f.focusArea),
      },
      total: circlesWithMembership.length,
    });
  } catch (error) {
    console.error("Error discovering circles:", error);
    return NextResponse.json(
      { error: "Failed to discover circles" },
      { status: 500 }
    );
  }
}
