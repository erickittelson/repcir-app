import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { externalAchievements, userBadges, badgeDefinitions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get user's external achievements
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const achievements = await db.query.externalAchievements.findMany({
      where: eq(externalAchievements.userId, session.user.id),
      orderBy: [desc(externalAchievements.achievedDate)],
    });

    return NextResponse.json(achievements);
  } catch (error) {
    console.error("Error fetching external achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

// Log a new external achievement
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, name, description, achievedDate, value, unit, proofUrl } =
      body;

    if (!category || !name) {
      return NextResponse.json(
        { error: "Category and name are required" },
        { status: 400 }
      );
    }

    // Insert the achievement
    const dateToUse = achievedDate
      ? new Date(achievedDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const [achievement] = await db
      .insert(externalAchievements)
      .values({
        userId: session.user.id,
        category,
        name,
        description,
        achievedDate: dateToUse,
        value,
        unit,
        proofUrl,
      })
      .returning();

    // Check if this matches any badge and award it
    const matchingBadge = await db.query.badgeDefinitions.findFirst({
      where: and(
        eq(badgeDefinitions.category, "external"),
        eq(badgeDefinitions.isActive, true)
      ),
    });

    let awardedBadge = null;
    if (matchingBadge) {
      // Check if the badge criteria matches this category
      const criteria = matchingBadge.criteria as any;
      if (criteria?.category === category) {
        // Check if user already has this badge
        const existingBadge = await db.query.userBadges.findFirst({
          where: and(
            eq(userBadges.userId, session.user.id),
            eq(userBadges.badgeId, matchingBadge.id)
          ),
        });

        if (!existingBadge) {
          // Award the badge
          await db.insert(userBadges).values({
            userId: session.user.id,
            badgeId: matchingBadge.id,
            metadata: {
              notes: `Logged ${name} on ${new Date().toLocaleDateString()}`,
            },
          });

          awardedBadge = {
            id: matchingBadge.id,
            name: matchingBadge.name,
            icon: matchingBadge.icon,
            description: matchingBadge.description,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      achievement,
      awardedBadge,
    });
  } catch (error) {
    console.error("Error logging external achievement:", error);
    return NextResponse.json(
      { error: "Failed to log achievement" },
      { status: 500 }
    );
  }
}
