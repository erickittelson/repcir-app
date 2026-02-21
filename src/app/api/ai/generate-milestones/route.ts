import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { goals, milestones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMemberContext, buildSystemPrompt, aiModel, getTaskOptions } from "@/lib/ai";
import { trackAIUsage } from "@/lib/ai/usage-tracking";
import { checkAIPersonalizationConsent, createConsentRequiredResponse } from "@/lib/consent";
import { applyDistributedRateLimit as applyRateLimit, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit-redis";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute for milestone generation

const milestonesSchema = z.object({
  milestones: z.array(
    z.object({
      title: z.string().describe("Short title for the milestone"),
      description: z.string().describe("Detailed description of what to achieve"),
      targetValue: z.number().nullable().describe("Numeric target if applicable, or null if not applicable"),
      weekNumber: z.number().describe("Which week to target this milestone"),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(
      `ai-milestones:${session.user.id}`,
      RATE_LIMITS.aiGeneration
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Check GDPR consent for AI processing of health data
    const consent = await checkAIPersonalizationConsent(session.user.id);
    if (!consent.hasConsent) {
      return createConsentRequiredResponse();
    }

    const { goalId } = await request.json();

    if (!goalId) {
      return new Response("Goal ID is required", { status: 400 });
    }

    // Get the goal
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      with: {
        member: true,
      },
    });

    if (!goal) {
      return new Response("Goal not found", { status: 404 });
    }

    if (goal.member.circleId !== session.circleId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get member context
    const context = await getMemberContext(goal.memberId);
    const systemPrompt = buildSystemPrompt(context);

    // Calculate weeks until target date
    const weeksUntilTarget = goal.targetDate
      ? Math.max(1, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
      : 12;

    const prompt = `Generate ${Math.min(weeksUntilTarget, 8)} milestones for this goal:

Goal: ${goal.title}
${goal.description ? `Description: ${goal.description}` : ""}
Category: ${goal.category}
${goal.targetValue ? `Target: ${goal.targetValue} ${goal.targetUnit}` : ""}
${goal.currentValue ? `Current: ${goal.currentValue} ${goal.targetUnit}` : ""}
${goal.targetDate ? `Target date: ${new Date(goal.targetDate).toLocaleDateString()}` : ""}

Create progressive milestones that build up to the final goal. Each milestone should be:
1. Specific and measurable
2. Progressive (building on previous milestones)
3. Achievable within 1-2 weeks
4. Include specific numbers/targets when applicable

Consider the person's current fitness level, limitations, and recent progress when setting milestone targets.`;

    const startTime = Date.now();
    const result = await generateObject({
      model: aiModel,
      schema: milestonesSchema,
      system: systemPrompt,
      prompt,
      providerOptions: getTaskOptions("milestone_generation") as any,
    });

    trackAIUsage({
      userId: session.user.id,
      endpoint: "/api/ai/generate-milestones",
      feature: "milestones",
      modelUsed: "gpt-5.2",
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheHit: (result.usage?.inputTokenDetails?.cacheReadTokens ?? 0) > 0,
      durationMs: Date.now() - startTime,
    }).catch(() => {});

    // Save milestones to database
    const today = new Date();
    const milestonesToCreate = result.object.milestones.map((m, index) => {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + m.weekNumber * 7);

      return {
        goalId,
        title: m.title,
        description: m.description,
        targetValue: m.targetValue,
        targetDate,
        order: index,
        aiGenerated: true,
      };
    });

    await db.insert(milestones).values(milestonesToCreate);

    return Response.json({
      success: true,
      milestones: result.object.milestones,
    });
  } catch (error) {
    console.error("Error generating milestones:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to generate milestones", details: errorMessage },
      { status: 500 }
    );
  }
}
