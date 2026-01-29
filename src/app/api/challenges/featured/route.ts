import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { challenges } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch featured and official challenges
    const featuredChallenges = await db.query.challenges.findMany({
      where: and(
        eq(challenges.visibility, "public"),
        or(
          eq(challenges.isFeatured, true),
          eq(challenges.isOfficial, true)
        )
      ),
      orderBy: [desc(challenges.participantCount)],
      limit: 6,
    });

    return NextResponse.json({
      challenges: featuredChallenges.map((c) => ({
        id: c.id,
        name: c.name,
        shortDescription: c.shortDescription,
        category: c.category,
        difficulty: c.difficulty,
        durationDays: c.durationDays,
        participantCount: c.participantCount,
        isOfficial: c.isOfficial,
        isFeatured: c.isFeatured,
        coverImage: c.coverImage,
      })),
    });
  } catch (error) {
    console.error("Error fetching featured challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}
