/**
 * Community Workouts API
 * 
 * GET - Browse community-shared workouts (sorted by rating/popularity)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedWorkouts } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const sort = searchParams.get("sort") || "popular"; // popular, rating, newest, saves
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const offsetParam = parseInt(searchParams.get("offset") || "0");
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

    // Get community workouts
    let query = db.query.sharedWorkouts.findMany({
      where: eq(sharedWorkouts.visibility, "public"),
      limit,
      offset,
    });

    const workouts = await db.query.sharedWorkouts.findMany({
      where: eq(sharedWorkouts.visibility, "public"),
      orderBy: sort === "rating" 
        ? [desc(sharedWorkouts.avgRating)]
        : sort === "newest"
        ? [desc(sharedWorkouts.createdAt)]
        : sort === "saves"
        ? [desc(sharedWorkouts.saveCount)]
        : [desc(sharedWorkouts.popularityScore)],
      limit,
      offset,
    });

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sharedWorkouts)
      .where(eq(sharedWorkouts.visibility, "public"));

    return NextResponse.json({
      workouts: workouts.map((w) => ({
        id: w.id,
        workoutPlanId: w.workoutPlanId,
        title: w.title,
        description: w.description,
        category: w.category,
        difficulty: w.difficulty,
        estimatedDuration: w.estimatedDuration,
        targetMuscles: w.targetMuscles,
        equipmentRequired: w.equipmentRequired,
        saveCount: w.saveCount,
        useCount: w.useCount,
        avgRating: w.avgRating,
        reviewCount: w.reviewCount,
        isFeatured: w.isFeatured,
        userId: w.userId,
        createdAt: w.createdAt,
      })),
      total: Number(countResult?.count || 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching community workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}
