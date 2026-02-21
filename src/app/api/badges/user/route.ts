import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userBadges, badgeDefinitions } from "@/lib/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";

/**
 * GET /api/badges/user - Get current user's badges
 * Supports ?q=search&category=strength&tier=gold
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category");
    const tier = searchParams.get("tier");

    const conditions = [eq(userBadges.userId, session.user.id)];

    if (q && q.length > 0) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(badgeDefinitions.name, pattern),
          ilike(badgeDefinitions.category, pattern),
          ilike(badgeDefinitions.description, pattern),
        )!
      );
    }
    if (category) {
      conditions.push(eq(badgeDefinitions.category, category));
    }
    if (tier) {
      conditions.push(eq(badgeDefinitions.tier, tier));
    }

    const badges = await db
      .select({
        id: userBadges.id,
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
        isFeatured: userBadges.isFeatured,
        displayOrder: userBadges.displayOrder,
        metadata: userBadges.metadata,
        badge: {
          name: badgeDefinitions.name,
          description: badgeDefinitions.description,
          icon: badgeDefinitions.icon,
          imageUrl: badgeDefinitions.imageUrl,
          category: badgeDefinitions.category,
          tier: badgeDefinitions.tier,
          criteriaDescription: badgeDefinitions.criteriaDescription,
        },
      })
      .from(userBadges)
      .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
      .where(and(...conditions))
      .orderBy(userBadges.displayOrder);

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Failed to fetch user badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch user badges" },
      { status: 500 }
    );
  }
}
