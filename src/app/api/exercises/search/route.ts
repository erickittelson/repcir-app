import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { sql, and, or, ilike, eq, desc, asc } from "drizzle-orm";

export const runtime = "nodejs";

// Query parameter validation
const searchSchema = z.object({
  q: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  muscleGroup: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Compound exercises to boost in scoring
const COMPOUND_EXERCISES = new Set([
  "squat", "deadlift", "bench press", "overhead press", "barbell row",
  "pull-up", "chin-up", "dip", "lunge", "hip thrust", "romanian deadlift",
  "front squat", "incline bench press", "pendlay row", "push-up",
  "clean", "snatch", "thruster", "kettlebell swing", "farmer's walk"
]);

/**
 * GET /api/exercises/search
 * Fast search endpoint optimized for debounced autocomplete
 * Returns scored results with name prefix matches ranked higher
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const validation = searchSchema.safeParse({
      q: searchParams.get("q"),
      category: searchParams.get("category") || undefined,
      muscleGroup: searchParams.get("muscleGroup") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { q, category, muscleGroup, limit } = validation.data;
    const searchTerm = q.toLowerCase().trim();

    // Build conditions
    const conditions = [
      eq(exercises.isActive, true),
      or(
        ilike(exercises.name, `${searchTerm}%`), // Prefix match (higher priority)
        ilike(exercises.name, `%${searchTerm}%`), // Contains match
        sql`${exercises.synonyms}::text ILIKE ${'%' + searchTerm + '%'}`, // Synonym match
        sql`${exercises.muscleGroups}::text ILIKE ${'%' + searchTerm + '%'}` // Muscle group match
      ),
    ];

    if (category) {
      conditions.push(eq(exercises.category, category));
    }

    if (muscleGroup) {
      conditions.push(
        sql`${exercises.muscleGroups}::jsonb ? ${muscleGroup}`
      );
    }

    // Use SQL scoring for ranking:
    // - Exact name match: 100
    // - Name starts with query: 50
    // - Name contains query: 20
    // - Compound exercise boost: +10
    // - Common/popular exercises could be boosted here too
    const results = await db
      .select({
        id: exercises.id,
        name: exercises.name,
        description: exercises.description,
        category: exercises.category,
        muscleGroups: exercises.muscleGroups,
        secondaryMuscles: exercises.secondaryMuscles,
        equipment: exercises.equipment,
        difficulty: exercises.difficulty,
        mechanic: exercises.mechanic,
        force: exercises.force,
        benefits: exercises.benefits,
        imageUrl: exercises.imageUrl,
        // Scoring column for ordering
        score: sql<number>`
          CASE
            WHEN LOWER(${exercises.name}) = ${searchTerm} THEN 100
            WHEN LOWER(${exercises.name}) LIKE ${searchTerm + '%'} THEN 50
            WHEN LOWER(${exercises.name}) LIKE ${'%' + searchTerm + '%'} THEN 20
            ELSE 10
          END +
          CASE WHEN ${exercises.mechanic} = 'compound' THEN 10 ELSE 0 END
        `.as("score"),
      })
      .from(exercises)
      .where(and(...conditions))
      .orderBy(
        desc(sql`score`),
        asc(exercises.name)
      )
      .limit(limit);

    // Apply additional client-side boost for well-known exercises
    const scoredResults = results.map(ex => {
      let score = ex.score;
      const nameLower = ex.name.toLowerCase();
      if (COMPOUND_EXERCISES.has(nameLower) ||
          Array.from(COMPOUND_EXERCISES).some(c => nameLower.includes(c))) {
        score += 5;
      }
      return { ...ex, score };
    }).sort((a, b) => b.score - a.score);

    return NextResponse.json({
      results: scoredResults,
      query: q,
      total: scoredResults.length,
    }, {
      headers: {
        // Short cache for search results
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("Error searching exercises:", error);
    return NextResponse.json(
      { error: "Failed to search exercises" },
      { status: 500 }
    );
  }
}
