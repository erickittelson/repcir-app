/**
 * Community Challenges API
 * 
 * GET - Browse community-submitted challenges (sorted by rating/popularity)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { challenges } from "@/lib/db/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const sort = searchParams.get("sort") || "popular"; // popular, rating, newest, participants
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const offsetParam = parseInt(searchParams.get("offset") || "0");
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

    // Build where clause
    const conditions = [
      eq(challenges.visibility, "public"),
    ];

    if (q && q.length > 0) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(challenges.name, pattern),
          ilike(challenges.shortDescription, pattern),
          ilike(challenges.category, pattern),
        )!
      );
    }
    if (category) {
      conditions.push(eq(challenges.category, category));
    }
    if (difficulty) {
      conditions.push(eq(challenges.difficulty, difficulty));
    }

    // Determine sort order
    let orderBy;
    switch (sort) {
      case "rating":
        orderBy = [desc(challenges.avgRating), desc(challenges.ratingCount)];
        break;
      case "newest":
        orderBy = [desc(challenges.createdAt)];
        break;
      case "participants":
        orderBy = [desc(challenges.participantCount)];
        break;
      case "popular":
      default:
        orderBy = [desc(challenges.popularityScore), desc(challenges.participantCount)];
        break;
    }

    const communityChallenges = await db.query.challenges.findMany({
      where: and(...conditions),
      orderBy,
      limit,
      offset,
    });

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(challenges)
      .where(and(...conditions));

    return NextResponse.json({
      challenges: communityChallenges.map((c) => ({
        id: c.id,
        name: c.name,
        shortDescription: c.shortDescription,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        durationDays: c.durationDays,
        participantCount: c.participantCount,
        completionCount: c.completionCount,
        avgRating: c.avgRating,
        ratingCount: c.ratingCount,
        isOfficial: c.isOfficial,
        isFeatured: c.isFeatured,
        coverImage: c.coverImage,
        createdByUserId: c.createdByUserId,
        createdAt: c.createdAt,
        restartOnFail: c.restartOnFail,
        dailyTasks: c.dailyTasks,
      })),
      total: Number(countResult?.count || 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching community challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}
