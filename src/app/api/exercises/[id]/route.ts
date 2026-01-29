import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exercise = await db.query.exercises.findFirst({
      where: eq(exercises.id, id),
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      instructions: exercise.instructions,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      force: exercise.force,
      mechanic: exercise.mechanic,
      benefits: exercise.benefits,
      contraindications: exercise.contraindications,
      safetyNotes: exercise.safetyNotes,
      commonMistakes: exercise.commonMistakes,
      progressions: exercise.progressions,
      regressions: exercise.regressions,
      scalingOptions: exercise.scalingOptions,
      equipmentAlternatives: exercise.equipmentAlternatives,
      videoUrl: exercise.videoUrl,
      imageUrl: exercise.imageUrl,
      tags: exercise.tags,
      synonyms: exercise.synonyms,
      sportApplications: exercise.sportApplications,
    });
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercise" },
      { status: 500 }
    );
  }
}
