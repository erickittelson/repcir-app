import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises, circleMembers, userProfiles } from "@/lib/db/schema";
import { eq, sql, and, or, ilike, inArray } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * Search API - Supports semantic (vector) and text-based search
 *
 * GET /api/search?q=query&type=exercises|members&limit=10
 *
 * For exercises with embeddings, uses vector similarity search.
 * Falls back to text search if embeddings not available.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "exercises";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (type === "exercises") {
      return searchExercises(query, limit);
    } else if (type === "members") {
      return searchMembers(query, limit, session.circleId);
    }

    return NextResponse.json({ error: "Invalid search type" }, { status: 400 });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

async function searchExercises(query: string, limit: number) {
  // Sanitize query for safe SQL usage (parameterized via Drizzle)
  const searchPattern = `%${query}%`;
  
  // First try text-based search (faster, always available)
  // Using parameterized queries to prevent SQL injection
  const textResults = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      description: exercises.description,
      category: exercises.category,
      muscleGroups: exercises.muscleGroups,
      equipment: exercises.equipment,
      difficulty: exercises.difficulty,
      imageUrl: exercises.imageUrl,
    })
    .from(exercises)
    .where(
      or(
        ilike(exercises.name, searchPattern),
        ilike(exercises.description, searchPattern),
        ilike(exercises.category, searchPattern),
        // Use sql.raw for column cast but parameterize the search value
        sql`${exercises.muscleGroups}::text ILIKE ${searchPattern}`,
        sql`${exercises.equipment}::text ILIKE ${searchPattern}`
      )
    )
    .limit(limit);

  return NextResponse.json({
    results: textResults,
    total: textResults.length,
    searchType: "text",
  });
}

async function searchMembers(query: string, limit: number, circleId: string) {
  const members = await db
    .select({
      id: circleMembers.id,
      name: circleMembers.name,
      userId: circleMembers.userId,
      profilePicture: circleMembers.profilePicture,
      role: circleMembers.role,
    })
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        ilike(circleMembers.name, `%${query}%`)
      )
    )
    .limit(limit);

  // Fetch user profiles for members with userId
  const userIds = members
    .filter((m) => m.userId)
    .map((m) => m.userId as string);

  const profiles = userIds.length > 0
    ? await db.query.userProfiles.findMany({
        where: inArray(userProfiles.userId, userIds),
      })
    : [];

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Merge profile data
  const results = members.map((member) => {
    const profile = member.userId ? profileMap.get(member.userId) : null;
    return {
      id: member.id,
      name: member.name,
      profilePicture: profile?.profilePicture || member.profilePicture,
      role: member.role,
    };
  });

  return NextResponse.json({
    results,
    total: results.length,
    searchType: "text",
  });
}

/**
 * POST /api/search/semantic
 *
 * Semantic search using embeddings - requires OpenAI API to generate query embedding
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, type = "exercises", limit = 10 } = body;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (type !== "exercises") {
      return NextResponse.json(
        { error: "Semantic search only available for exercises" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      // Fall back to text search
      return searchExercises(query, limit);
    }

    // Generate embedding for query
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // Perform vector similarity search
    const results = await db.execute(sql`
      SELECT
        id,
        name,
        description,
        category,
        muscle_groups as "muscleGroups",
        equipment,
        difficulty,
        image_url as "imageUrl",
        1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM exercises
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);

    return NextResponse.json({
      results: results.rows,
      total: results.rows.length,
      searchType: "semantic",
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    return NextResponse.json(
      { error: "Semantic search failed" },
      { status: 500 }
    );
  }
}
