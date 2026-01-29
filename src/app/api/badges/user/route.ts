import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userBadges, badgeDefinitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/badges/user - Get current user's badges
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      .where(eq(userBadges.userId, session.user.id))
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
