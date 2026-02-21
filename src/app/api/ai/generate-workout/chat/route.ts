import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { aiGenerationJobs, circleMembers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { workoutConfigFormSchema } from "@/lib/validations";
import { checkAIQuota, createQuotaExceededResponse } from "@/lib/ai/quota-check";
import { triggerWorkoutGenerationFromChat } from "@/inngest";

export const runtime = "nodejs";

/**
 * POST /api/ai/generate-workout/chat
 *
 * Triggered from the inline chat config form.
 * Creates an aiGenerationJobs row and dispatches an Inngest event.
 * Returns the jobId for client-side polling.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const activeCircle = session.activeCircle;
    if (!activeCircle) {
      return NextResponse.json({ error: "No active circle" }, { status: 400 });
    }

    // Quota check
    const quota = await checkAIQuota(userId, "workout");
    if (!quota.allowed) {
      return createQuotaExceededResponse(quota, "workout");
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = workoutConfigFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const config = parsed.data;
    const circleId = config.circleId || activeCircle.id;

    // Resolve member IDs based on targetType
    let memberIds: string[];
    if (config.targetType === "individual") {
      memberIds = activeCircle.memberId ? [activeCircle.memberId] : [];
    } else if (config.targetType === "circle") {
      const members = await db
        .select({ id: circleMembers.id })
        .from(circleMembers)
        .where(eq(circleMembers.circleId, circleId));
      memberIds = members.map((m) => m.id);
    } else {
      memberIds = config.memberIds || [];
    }

    if (memberIds.length === 0) {
      return NextResponse.json({ error: "No members selected" }, { status: 400 });
    }

    // Fetch member genders for Rx weight calculation
    const memberGenders: Record<string, string> = {};
    if (memberIds.length > 3) {
      const members = await db
        .select({ id: circleMembers.id, gender: circleMembers.gender })
        .from(circleMembers)
        .where(inArray(circleMembers.id, memberIds));
      for (const m of members) {
        if (m.gender) memberGenders[m.id] = m.gender;
      }
    }

    // Create job tracking row
    const [job] = await db
      .insert(aiGenerationJobs)
      .values({
        userId,
        circleId,
        jobType: "workout",
        status: "pending",
        input: config as Record<string, unknown>,
        conversationId: config.conversationId || null,
      })
      .returning({ id: aiGenerationJobs.id });

    // Dispatch Inngest event
    try {
      await triggerWorkoutGenerationFromChat(userId, circleId, memberIds, job.id, {
        targetType: config.targetType,
        workoutType: config.workoutSections[0]?.workoutType ?? "standard",
        workoutSections: config.workoutSections,
        focus: config.focusAreas?.join(", ") || "full_body",
        intensity: config.intensity,
        targetDuration: config.duration,
        goalIds: config.goalIds,
        circleGoalIds: config.circleGoalIds,
        locationId: config.locationId,
        includeWarmup: config.includeWarmup,
        includeCooldown: config.includeCooldown,
        conversationId: config.conversationId,
        memberGenders,
        reasoningLevel: memberIds.length > 3 ? "deep" : "standard",
      });
    } catch (inngestError) {
      console.error("Inngest dispatch failed:", inngestError);
      // Mark job as errored so polling doesn't hang
      await db
        .update(aiGenerationJobs)
        .set({ status: "error", error: "Failed to dispatch generation job" })
        .where(eq(aiGenerationJobs.id, job.id));
      return NextResponse.json(
        { error: "Workout generation service unavailable. Is the Inngest dev server running?" },
        { status: 503 }
      );
    }

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("Failed to trigger workout generation:", error);
    return NextResponse.json(
      { error: "Failed to start workout generation" },
      { status: 500 }
    );
  }
}
