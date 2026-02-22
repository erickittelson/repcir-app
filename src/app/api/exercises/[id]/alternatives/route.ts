import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises, userLimitations, circleMembers } from "@/lib/db/schema";
import { eq, and, ne, sql, ilike, or } from "drizzle-orm";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
  memberId: z.string().uuid().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const validation = querySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      memberId: searchParams.get("memberId") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const { limit, memberId } = validation.data;

    // 1. Fetch the source exercise
    const sourceExercise = await db.query.exercises.findFirst({
      where: eq(exercises.id, id),
    });

    if (!sourceExercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const primaryMuscles = (sourceExercise.muscleGroups as string[]) || [];
    if (primaryMuscles.length === 0) {
      return NextResponse.json({
        sourceExercise: { id: sourceExercise.id, name: sourceExercise.name },
        alternatives: [],
      });
    }

    // 2. Check for explicit progressions/regressions/equipment alternatives
    const explicitNames = [
      ...((sourceExercise.progressions as string[]) || []),
      ...((sourceExercise.regressions as string[]) || []),
      ...((sourceExercise.equipmentAlternatives as string[]) || []),
    ].filter(Boolean);

    type ExerciseResult = {
      id: string;
      name: string;
      description: string | null;
      category: string;
      muscleGroups: string[] | null;
      equipment: string[] | null;
      difficulty: string | null;
      mechanic: string | null;
      imageUrl: string | null;
    };

    let explicitMatches: ExerciseResult[] = [];
    if (explicitNames.length > 0) {
      explicitMatches = await db
        .select({
          id: exercises.id,
          name: exercises.name,
          description: exercises.description,
          category: exercises.category,
          muscleGroups: exercises.muscleGroups,
          equipment: exercises.equipment,
          difficulty: exercises.difficulty,
          mechanic: exercises.mechanic,
          imageUrl: exercises.imageUrl,
        })
        .from(exercises)
        .where(
          and(
            ne(exercises.id, id),
            eq(exercises.isActive, true),
            or(...explicitNames.map((name) => ilike(exercises.name, name)))
          )
        )
        .limit(limit);
    }

    // 3. Query exercises sharing primary muscle groups, scored by relevance
    const muscleArrayLiteral = primaryMuscles
      .map((m) => `'${m.replace(/'/g, "''")}'`)
      .join(",");

    const alternatives = await db
      .select({
        id: exercises.id,
        name: exercises.name,
        description: exercises.description,
        category: exercises.category,
        muscleGroups: exercises.muscleGroups,
        equipment: exercises.equipment,
        difficulty: exercises.difficulty,
        mechanic: exercises.mechanic,
        imageUrl: exercises.imageUrl,
        matchScore: sql<number>`(
          CASE WHEN ${exercises.category} = ${sourceExercise.category} THEN 20 ELSE 0 END +
          CASE WHEN ${exercises.difficulty} = ${sourceExercise.difficulty || "intermediate"} THEN 10 ELSE 0 END +
          CASE WHEN ${exercises.mechanic} = ${sourceExercise.mechanic || "compound"} THEN 15 ELSE 0 END +
          CASE WHEN ${exercises.force} = ${sourceExercise.force || "push"} THEN 5 ELSE 0 END +
          CASE WHEN ${exercises.imageUrl} IS NOT NULL THEN 10 ELSE 0 END
        )`.as("match_score"),
      })
      .from(exercises)
      .where(
        and(
          ne(exercises.id, id),
          eq(exercises.isActive, true),
          // Must share at least one primary muscle group
          sql`${exercises.muscleGroups}::jsonb ?| ARRAY[${sql.raw(muscleArrayLiteral)}]::text[]`
        )
      )
      .orderBy(sql`match_score DESC`)
      .limit(limit * 3); // Fetch extra for post-filtering

    // 4. Fetch user limitations if memberId provided
    let limitedAreas: string[] = [];
    if (memberId) {
      const member = await db.query.circleMembers.findFirst({
        where: eq(circleMembers.id, memberId),
        columns: { userId: true },
      });
      if (member?.userId) {
        const limitations = await db
          .select({ affectedAreas: userLimitations.affectedAreas })
          .from(userLimitations)
          .where(
            and(
              eq(userLimitations.userId, member.userId),
              eq(userLimitations.active, true)
            )
          );
        limitedAreas = limitations.flatMap(
          (l) => (l.affectedAreas as string[]) || []
        );
      }
    }

    // 5. Post-filter: remove exercises that target limited areas
    let filtered = alternatives;
    if (limitedAreas.length > 0) {
      filtered = alternatives.filter((alt) => {
        const altMuscles = (alt.muscleGroups as string[]) || [];
        return !altMuscles.some((m) =>
          limitedAreas.some(
            (la) =>
              m.toLowerCase().includes(la.toLowerCase()) ||
              la.toLowerCase().includes(m.toLowerCase())
          )
        );
      });
    }

    // 6. Combine explicit matches (prioritized) with scored results
    const explicitIds = new Set(explicitMatches.map((e) => e.id));
    const scoredResults = filtered
      .filter((alt) => !explicitIds.has(alt.id))
      .slice(0, limit);

    const combined = [
      ...explicitMatches.map((e) => ({ ...e, matchScore: 100 })),
      ...scoredResults,
    ].slice(0, limit);

    const result = combined.map((alt) => ({
      id: alt.id,
      name: alt.name,
      description: alt.description,
      category: alt.category,
      muscleGroups: alt.muscleGroups,
      equipment: alt.equipment,
      difficulty: alt.difficulty,
      mechanic: alt.mechanic,
      imageUrl: alt.imageUrl,
      matchScore: alt.matchScore,
    }));

    return NextResponse.json(
      {
        sourceExercise: {
          id: sourceExercise.id,
          name: sourceExercise.name,
          category: sourceExercise.category,
          muscleGroups: sourceExercise.muscleGroups,
          difficulty: sourceExercise.difficulty,
        },
        alternatives: result,
      },
      {
        headers: { "Cache-Control": "private, max-age=300" },
      }
    );
  } catch (error) {
    console.error("Error fetching exercise alternatives:", error);
    return NextResponse.json(
      { error: "Failed to fetch alternatives" },
      { status: 500 }
    );
  }
}
