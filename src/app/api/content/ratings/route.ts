import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentRatings, sharedWorkouts, challenges, communityPrograms } from "@/lib/db/schema";
import { eq, and, avg, count, sql } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// GET /api/content/ratings - Get rating for content
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get("contentType");
  const contentId = searchParams.get("contentId");

  if (!contentType || !contentId) {
    return NextResponse.json(
      { error: "Missing contentType or contentId" },
      { status: 400 }
    );
  }

  try {
    const session = await getSession();
    const userId = session?.user?.id;

    // Get aggregate ratings
    const [stats] = await db
      .select({
        avgRating: avg(contentRatings.rating),
        totalCount: count(),
      })
      .from(contentRatings)
      .where(
        and(
          eq(contentRatings.contentType, contentType),
          eq(contentRatings.contentId, contentId)
        )
      );

    // Get rating distribution
    const distribution = await db
      .select({
        rating: contentRatings.rating,
        count: count(),
      })
      .from(contentRatings)
      .where(
        and(
          eq(contentRatings.contentType, contentType),
          eq(contentRatings.contentId, contentId)
        )
      )
      .groupBy(contentRatings.rating);

    // Get user's rating if logged in
    let userRating = null;
    if (userId) {
      const [existing] = await db
        .select()
        .from(contentRatings)
        .where(
          and(
            eq(contentRatings.contentType, contentType),
            eq(contentRatings.contentId, contentId),
            eq(contentRatings.userId, userId)
          )
        );
      userRating = existing?.rating || null;
    }

    // Convert distribution to object
    const ratingsByValue: Record<number, number> = {};
    distribution.forEach((d) => {
      ratingsByValue[d.rating] = Number(d.count);
    });

    return NextResponse.json({
      avgRating: stats.avgRating ? Number(stats.avgRating) : null,
      totalCount: Number(stats.totalCount),
      distribution: ratingsByValue,
      userRating,
    });
  } catch (error) {
    console.error("Failed to fetch ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}

// POST /api/content/ratings - Create or update rating
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contentType, contentId, rating } = await request.json();

    if (!contentType || !contentId || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Upsert the rating
    await db
      .insert(contentRatings)
      .values({
        userId: session.user.id,
        contentType,
        contentId,
        rating,
      })
      .onConflictDoUpdate({
        target: [contentRatings.userId, contentRatings.contentType, contentRatings.contentId],
        set: {
          rating,
          updatedAt: new Date(),
        },
      });

    // Update average rating on the content
    await updateContentRating(contentType, contentId);

    return NextResponse.json({ success: true, rating });
  } catch (error) {
    console.error("Failed to create rating:", error);
    return NextResponse.json(
      { error: "Failed to create rating" },
      { status: 500 }
    );
  }
}

// DELETE /api/content/ratings - Remove rating
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: "Missing contentType or contentId" },
        { status: 400 }
      );
    }

    await db
      .delete(contentRatings)
      .where(
        and(
          eq(contentRatings.userId, session.user.id),
          eq(contentRatings.contentType, contentType),
          eq(contentRatings.contentId, contentId)
        )
      );

    // Update average rating on the content
    await updateContentRating(contentType, contentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete rating:", error);
    return NextResponse.json(
      { error: "Failed to delete rating" },
      { status: 500 }
    );
  }
}

// Helper to update content's cached average rating
async function updateContentRating(contentType: string, contentId: string) {
  const [stats] = await db
    .select({
      avgRating: avg(contentRatings.rating),
      totalCount: count(),
    })
    .from(contentRatings)
    .where(
      and(
        eq(contentRatings.contentType, contentType),
        eq(contentRatings.contentId, contentId)
      )
    );

  const avgRating = stats.avgRating ? Number(stats.avgRating) : null;
  const ratingCount = Number(stats.totalCount);

  // Update the appropriate table based on content type
  switch (contentType) {
    case "workout":
      await db
        .update(sharedWorkouts)
        .set({
          avgRating,
          reviewCount: ratingCount,
          updatedAt: new Date(),
        })
        .where(eq(sharedWorkouts.id, contentId));
      break;

    case "challenge":
      await db
        .update(challenges)
        .set({
          avgRating,
          ratingCount,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, contentId));
      break;

    case "program":
      await db
        .update(communityPrograms)
        .set({
          avgRating,
          reviewCount: ratingCount,
          updatedAt: new Date(),
        })
        .where(eq(communityPrograms.id, contentId));
      break;
  }

  // Also update popularity score
  await updatePopularityScore(contentType, contentId);
}

// Helper to calculate and update popularity score
async function updatePopularityScore(contentType: string, contentId: string) {
  // Popularity formula: (saves * 2) + (completions * 5) + (avg_rating * 10) + (comments * 1) + freshness_bonus
  // This is a simplified version - in production you'd want more sophisticated calculation
  
  let baseScore = 0;
  const freshnessDays = 30; // Bonus for content less than 30 days old
  
  switch (contentType) {
    case "workout": {
      const [workout] = await db
        .select()
        .from(sharedWorkouts)
        .where(eq(sharedWorkouts.id, contentId));
      
      if (workout) {
        baseScore = 
          (workout.saveCount || 0) * 2 +
          (workout.useCount || 0) * 5 +
          (workout.avgRating || 0) * 10 +
          (workout.commentCount || 0);
        
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(workout.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation < freshnessDays) {
          baseScore += (freshnessDays - daysSinceCreation) * 0.5;
        }

        await db
          .update(sharedWorkouts)
          .set({
            popularityScore: baseScore,
            trendingScore: baseScore * (daysSinceCreation < 7 ? 2 : 1),
            lastActivityAt: new Date(),
          })
          .where(eq(sharedWorkouts.id, contentId));
      }
      break;
    }

    case "challenge": {
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, contentId));
      
      if (challenge) {
        baseScore = 
          (challenge.participantCount || 0) * 2 +
          (challenge.completionCount || 0) * 5 +
          (challenge.avgRating || 0) * 10 +
          (challenge.commentCount || 0);
        
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(challenge.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation < freshnessDays) {
          baseScore += (freshnessDays - daysSinceCreation) * 0.5;
        }

        await db
          .update(challenges)
          .set({
            popularityScore: baseScore,
            trendingScore: baseScore * (daysSinceCreation < 7 ? 2 : 1),
            lastActivityAt: new Date(),
          })
          .where(eq(challenges.id, contentId));
      }
      break;
    }

    case "program": {
      const [program] = await db
        .select()
        .from(communityPrograms)
        .where(eq(communityPrograms.id, contentId));
      
      if (program) {
        baseScore = 
          (program.enrollmentCount || 0) * 2 +
          (program.completionCount || 0) * 5 +
          (program.avgRating || 0) * 10 +
          (program.commentCount || 0);
        
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(program.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation < freshnessDays) {
          baseScore += (freshnessDays - daysSinceCreation) * 0.5;
        }

        await db
          .update(communityPrograms)
          .set({
            popularityScore: baseScore,
            trendingScore: baseScore * (daysSinceCreation < 7 ? 2 : 1),
            lastActivityAt: new Date(),
          })
          .where(eq(communityPrograms.id, contentId));
      }
      break;
    }
  }
}
