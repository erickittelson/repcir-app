import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { eq, desc, and, or, ilike } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/exercises/suggested
 * Returns suggested exercises for the workout builder:
 * - Popular compound movements for all users
 * - Filtered by category if provided
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 24);
    const category = searchParams.get("category");

    // Build conditions for recommended exercises
    const conditions = [eq(exercises.isActive, true)];

    if (category) {
      conditions.push(eq(exercises.category, category));
    }

    // Get compound exercises first (most useful for workouts)
    const compoundExercises = await db
      .select()
      .from(exercises)
      .where(
        and(
          ...conditions,
          eq(exercises.mechanic, "compound")
        )
      )
      .orderBy(exercises.name)
      .limit(limit);

    // Get popular isolation exercises as backup
    const isolationExercises = await db
      .select()
      .from(exercises)
      .where(
        and(
          ...conditions,
          or(
            eq(exercises.mechanic, "isolation"),
            eq(exercises.mechanic, null as unknown as string)
          )
        )
      )
      .orderBy(exercises.name)
      .limit(limit);

    // Combine and dedupe
    const compoundIds = new Set(compoundExercises.map(e => e.id));
    const recommended = [
      ...compoundExercises,
      ...isolationExercises.filter(e => !compoundIds.has(e.id))
    ].slice(0, limit);

    return NextResponse.json({
      recentlyUsed: [], // Simplified - not tracking recently used for now
      popular: [],      // Simplified - not tracking popular for now
      recommended,
    }, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error fetching suggested exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggested exercises", details: String(error) },
      { status: 500 }
    );
  }
}
