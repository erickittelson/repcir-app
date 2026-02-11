import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { aiGenerationJobs, workoutPlans, workoutPlanExercises, exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/ai/generate-workout/status/[id]
 *
 * Poll endpoint for checking background workout generation status.
 * Returns the job status and, when complete, the full workout data.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await db.query.aiGenerationJobs.findFirst({
      where: eq(aiGenerationJobs.id, id),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify ownership
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Timeout safety: if pending for >3 minutes, mark as error
    const createdAt = new Date(job.createdAt);
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();
    if (job.status === "pending" && ageMs > 3 * 60 * 1000) {
      return NextResponse.json({
        status: "error",
        error: "Generation timed out. Please try again.",
      });
    }

    // If complete, fetch the full workout plan with exercises
    if (job.status === "complete" && job.resultPlanId) {
      const plan = await db.query.workoutPlans.findFirst({
        where: eq(workoutPlans.id, job.resultPlanId),
      });

      const planExercises = await db
        .select({
          id: workoutPlanExercises.id,
          name: exercises.name,
          sets: workoutPlanExercises.sets,
          reps: workoutPlanExercises.reps,
          restSeconds: workoutPlanExercises.restBetweenSets,
          notes: workoutPlanExercises.notes,
          order: workoutPlanExercises.order,
          groupId: workoutPlanExercises.groupId,
          groupType: workoutPlanExercises.groupType,
          rxWeights: workoutPlanExercises.rxWeights,
        })
        .from(workoutPlanExercises)
        .innerJoin(exercises, eq(workoutPlanExercises.exerciseId, exercises.id))
        .where(eq(workoutPlanExercises.planId, job.resultPlanId))
        .orderBy(workoutPlanExercises.order);

      // Also return the full result data from the job (includes warmup, cooldown, etc.)
      const resultData = (job.resultData || {}) as Record<string, unknown>;

      return NextResponse.json({
        status: "complete",
        planId: job.resultPlanId,
        workout: {
          name: plan?.name || resultData.name || "Generated Workout",
          description: plan?.description || resultData.description || "",
          exercises: planExercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || "8-12",
            restSeconds: ex.restSeconds || 60,
            notes: ex.notes,
            structureType: ex.groupType || null,
            supersetGroup: ex.groupId ? parseInt(ex.groupId.replace("S", "")) : null,
            rxWeights: ex.rxWeights || null,
          })),
          warmup: (resultData.warmup as string[]) || [],
          cooldown: (resultData.cooldown as string[]) || [],
          estimatedDuration: plan?.estimatedDuration || (resultData.estimatedDuration as number) || 45,
          difficulty: plan?.difficulty || (resultData.difficulty as string) || "intermediate",
          structure: plan?.structureType || (resultData.structure as string) || null,
        },
      });
    }

    // Pending or generating
    return NextResponse.json({
      status: job.status,
      startedAt: job.startedAt?.toISOString() || null,
      error: job.error || null,
    });
  } catch (error) {
    console.error("Failed to fetch generation status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
