/**
 * Inngest AI Coaching Pipeline
 *
 * Background AI jobs for:
 * - Post-workout analysis (triggered on workout completion)
 * - Coaching memory extraction (after conversations)
 * - Weekly progress reports (cron)
 * - AI quota reset (cron)
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  contextNotes,
  coachConversations,
  coachMessages,
  coachingMemory,
  progressReports,
  aiQuotas,
  circleMembers,
  personalRecords,
} from "@/lib/db/schema";
import { eq, and, desc, gte, sql, lte } from "drizzle-orm";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { aiModel, getReasoningOptions } from "@/lib/ai";
import { trackAIUsage } from "@/lib/ai/usage-tracking";
import { validateMemoryNote } from "@/lib/ai/memory-guardrails";

// ============================================================================
// POST-WORKOUT AI ANALYSIS
// ============================================================================

export const analyzeWorkoutFunction = inngest.createFunction(
  {
    id: "ai-analyze-workout",
    name: "Post-Workout AI Analysis",
    retries: 2,
    concurrency: { limit: 10 },
  },
  { event: "ai/analyze-workout" },
  async ({ event, step }) => {
    const { sessionId, memberId } = event.data;

    // Step 1: Fetch workout data
    const session = await step.run("fetch-session", async () => {
      const s = await db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, sessionId),
      });
      if (!s) return null;

      const exs = await db.query.workoutSessionExercises.findMany({
        where: eq(workoutSessionExercises.sessionId, sessionId),
        with: { exercise: true, sets: true },
      });

      return { ...s, exercises: exs };
    });

    if (!session) return { skipped: true, reason: "Session not found" };

    // Step 2: Fetch recent context for comparison + session PRs
    const recentContext = await step.run("fetch-context", async () => {
      const recentSessions = await db.query.workoutSessions.findMany({
        where: and(
          eq(workoutSessions.memberId, memberId),
          lte(workoutSessions.date, new Date()),
        ),
        orderBy: [desc(workoutSessions.date)],
        limit: 5,
      });

      const recentNotes = await db.query.contextNotes.findMany({
        where: eq(contextNotes.memberId, memberId),
        orderBy: [desc(contextNotes.createdAt)],
        limit: 5,
      });

      // Fetch PRs detected for this specific session (set by inline PR detection)
      const sessionPRs = await db.query.personalRecords.findMany({
        where: and(
          eq(personalRecords.memberId, memberId),
          eq(personalRecords.sessionId, sessionId),
        ),
        with: { exercise: true },
      });

      return { recentSessions, recentNotes, sessionPRs };
    });

    // Step 3: Generate AI analysis
    const analysis = await step.run("generate-analysis", async () => {
      const exerciseSummary = session.exercises?.map((ex: any) => {
        const completedSets = ex.sets?.filter((s: any) => s.completed).length || 0;
        const totalSets = ex.sets?.length || 0;
        const maxWeight = Math.max(...(ex.sets?.map((s: any) => s.actualWeight || 0) || [0]));
        const avgReps = ex.sets?.length
          ? Math.round(ex.sets.reduce((sum: number, s: any) => sum + (s.actualReps || 0), 0) / ex.sets.length)
          : 0;

        return `${ex.exercise?.name || "Unknown"}: ${completedSets}/${totalSets} sets, max ${maxWeight}lbs, avg ${avgReps} reps`;
      }).join("\n") || "No exercises recorded";

      const prSummary = recentContext.sessionPRs.length > 0
        ? `\nNEW PERSONAL RECORDS SET THIS SESSION:\n${recentContext.sessionPRs.map((pr: any) => {
            const repMaxText = pr.repMax ? ` (${pr.repMax}RM)` : "";
            return `- ${pr.exercise?.name || "Unknown"}: ${pr.value} ${pr.unit}${repMaxText}`;
          }).join("\n")}`
        : "";

      const result = await generateObject({
        model: aiModel,
        schema: z.object({
          volumeAssessment: z.string().describe("Overall training volume analysis"),
          progressNotes: z.array(z.string()).describe("Specific progress observations"),
          recoveryRecommendation: z.string().describe("Recovery advice for next 24-48hrs"),
          nextWorkoutSuggestion: z.string().describe("What to focus on next session"),
          highlights: z.array(z.string()).describe("Positive highlights from the workout"),
        }),
        prompt: `Analyze this workout session for member ${memberId}:

Workout: ${session.name}
Date: ${session.date}
Duration: ${session.startTime && session.endTime
          ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
          : "unknown"} minutes
Rating: ${session.rating || "not rated"}/5

Exercises:
${exerciseSummary}
${prSummary}

Recent mood/energy from notes:
${recentContext.recentNotes.map((n: any) => `${n.mood || "unknown"} mood, energy ${n.energyLevel}/5`).join(", ") || "None"}

Recent workout count: ${recentContext.recentSessions.length} sessions this week

Provide a brief, encouraging analysis with actionable recovery and next-session recommendations. If new PRs were set, celebrate them!`,
        providerOptions: getReasoningOptions("standard", { cacheKey: "workout-analysis" }) as any,
      });

      // Look up userId from member for tracking
      const member = await db.query.circleMembers.findFirst({
        where: eq(circleMembers.id, memberId),
        columns: { userId: true },
      });
      if (member?.userId) {
        trackAIUsage({
          userId: member.userId,
          memberId,
          endpoint: "inngest/ai-analyze-workout",
          feature: "session_summary",
          modelUsed: "gpt-5.2",
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheHit: (result.usage?.inputTokenDetails?.cacheReadTokens ?? 0) > 0,
        }).catch(() => {});
      }

      return result.object;
    });

    // Step 4: Save analysis as context note AND update workoutSessions.aiFeedback
    await step.run("save-analysis", async () => {
      const analysisContent = `AI Analysis: ${analysis.volumeAssessment}\n\nProgress: ${analysis.progressNotes.join("; ")}\n\nRecovery: ${analysis.recoveryRecommendation}\n\nNext session: ${analysis.nextWorkoutSuggestion}`;

      // Save structured analysis as contextNote (for AI memory/future context)
      await db.insert(contextNotes).values({
        memberId,
        entityType: "workout_session",
        entityId: sessionId,
        content: analysisContent,
        tags: ["ai_analysis", "post_workout"],
      });

      // Save user-friendly text to aiFeedback column (for UI display)
      const feedbackText = [
        analysis.highlights.length > 0 ? analysis.highlights.join(". ") + "." : "",
        analysis.volumeAssessment,
        analysis.progressNotes.length > 0 ? analysis.progressNotes.join(". ") + "." : "",
        analysis.recoveryRecommendation ? `Recovery: ${analysis.recoveryRecommendation}` : "",
        analysis.nextWorkoutSuggestion ? `Next session: ${analysis.nextWorkoutSuggestion}` : "",
      ].filter(Boolean).join("\n\n");

      await db
        .update(workoutSessions)
        .set({ aiFeedback: feedbackText })
        .where(eq(workoutSessions.id, sessionId));
    });

    return { success: true, sessionId, analysis };
  }
);

// ============================================================================
// COACHING MEMORY EXTRACTION
// ============================================================================

export const extractCoachingMemoryFunction = inngest.createFunction(
  {
    id: "ai-extract-coaching-memory",
    name: "Extract Coaching Memory from Conversation",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "ai/extract-coaching-memory" },
  async ({ event, step }) => {
    const { conversationId, memberId } = event.data;

    // Step 1: Fetch conversation messages
    const conversation = await step.run("fetch-conversation", async () => {
      const conv = await db.query.coachConversations.findFirst({
        where: eq(coachConversations.id, conversationId),
      });

      const messages = await db.query.coachMessages.findMany({
        where: eq(coachMessages.conversationId, conversationId),
        orderBy: [coachMessages.createdAt],
      });

      return { conv, messages };
    });

    if (!conversation.conv || conversation.messages.length < 2) {
      return { skipped: true, reason: "Too few messages to extract" };
    }

    // Step 2: Extract key insights
    const insights = await step.run("extract-insights", async () => {
      const messageText = conversation.messages
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n\n");

      const result = await generateObject({
        model: aiModel,
        schema: z.object({
          memories: z.array(z.object({
            category: z.enum([
              "insight", "preference", "pain_report", "motivation",
              "pr_mention", "goal_update", "behavioral_pattern",
            ]),
            content: z.string().describe("The key insight or observation"),
            importance: z.number().min(1).max(10).describe("How important for future coaching (1-10)"),
            tags: z.array(z.string()).describe("Relevant tags"),
          })),
          conversationSummary: z.string().describe("Brief summary of the conversation"),
        }),
        prompt: `Extract coaching insights from this conversation with a fitness coaching client.

Conversation mode: ${conversation.conv!.mode}

Messages:
${messageText}

Extract the most important insights that should be remembered for future coaching sessions. Focus on:
- Pain/injury mentions and their severity
- Motivation patterns (what motivates or demotivates them)
- Personal records or fitness achievements mentioned
- Goal changes or progress updates
- Behavioral patterns (consistency, time preferences, workout preferences)
- Preferences expressed (exercise types, workout styles, coaching tone)

Only extract genuinely useful insights. Skip generic conversation filler.`,
        providerOptions: getReasoningOptions("standard", { cacheKey: "memory-extraction" }) as any,
      });

      // Look up userId from member for tracking
      const member = await db.query.circleMembers.findFirst({
        where: eq(circleMembers.id, memberId),
        columns: { userId: true },
      });
      if (member?.userId) {
        trackAIUsage({
          userId: member.userId,
          memberId,
          endpoint: "inngest/ai-extract-coaching-memory",
          feature: "coaching_memory",
          modelUsed: "gpt-5.2",
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheHit: (result.usage?.inputTokenDetails?.cacheReadTokens ?? 0) > 0,
        }).catch(() => {});
      }

      return result.object;
    });

    // Step 3: Validate and save memories to database
    await step.run("save-memories", async () => {
      if (insights.memories.length === 0) return;

      // Filter through guardrails before persisting
      const validMemories = insights.memories
        .map((m) => {
          const validation = validateMemoryNote(m.content);
          if (!validation.safe) return null;
          return { ...m, content: validation.sanitized! };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (validMemories.length === 0) return;

      await db.insert(coachingMemory).values(
        validMemories.map((m) => ({
          memberId,
          conversationId,
          category: m.category,
          content: m.content,
          importance: m.importance,
          tags: m.tags,
        }))
      );

      // Update conversation insights summary
      await db
        .update(coachConversations)
        .set({
          insights: insights.conversationSummary,
          updatedAt: new Date(),
        })
        .where(eq(coachConversations.id, conversationId));
    });

    return {
      success: true,
      conversationId,
      memoriesExtracted: insights.memories.length,
      summary: insights.conversationSummary,
    };
  }
);

// ============================================================================
// WEEKLY PROGRESS REPORTS
// ============================================================================

export const weeklyProgressReportsCron = inngest.createFunction(
  {
    id: "cron-weekly-progress-reports",
    name: "Generate Weekly AI Progress Reports",
    retries: 2,
  },
  { cron: "0 20 * * 0" }, // Sunday 8 PM
  async ({ step }) => {
    // Step 1: Find active members (worked out in last 14 days)
    const activeMembers = await step.run("find-active-members", async () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const members = await db
        .select({ memberId: workoutSessions.memberId })
        .from(workoutSessions)
        .where(gte(workoutSessions.date, twoWeeksAgo))
        .groupBy(workoutSessions.memberId);

      return members.map((m) => m.memberId);
    });

    if (activeMembers.length === 0) {
      return { success: true, reportsGenerated: 0, message: "No active members" };
    }

    // Step 2: Process in batches of 5
    let reportsGenerated = 0;

    for (let i = 0; i < activeMembers.length; i += 5) {
      const batch = activeMembers.slice(i, i + 5);

      await step.run(`generate-reports-batch-${i}`, async () => {
        for (const memberId of batch) {
          try {
            await generateProgressReport(memberId);
            reportsGenerated++;
          } catch (error) {
            console.error(`Failed to generate report for ${memberId}:`, error);
          }
        }
      });

      // Rate limit between batches
      if (i + 5 < activeMembers.length) {
        await step.sleep("rate-limit", "30s");
      }
    }

    return { success: true, reportsGenerated, totalMembers: activeMembers.length };
  }
);

async function generateProgressReport(memberId: string) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Fetch this week's workouts
  const sessions = await db.query.workoutSessions.findMany({
    where: and(
      eq(workoutSessions.memberId, memberId),
      gte(workoutSessions.date, weekAgo),
    ),
    orderBy: [desc(workoutSessions.date)],
  });

  if (sessions.length === 0) return;

  // Fetch context notes for mood/energy
  const notes = await db.query.contextNotes.findMany({
    where: and(
      eq(contextNotes.memberId, memberId),
      gte(contextNotes.createdAt, weekAgo),
    ),
  });

  // Fetch any new PRs
  const prs = await db.query.personalRecords.findMany({
    where: and(
      eq(personalRecords.memberId, memberId),
      gte(personalRecords.date, weekAgo),
    ),
  });

  const avgEnergy = notes.length > 0
    ? notes.reduce((sum, n) => sum + (n.energyLevel || 0), 0) / notes.length
    : 0;

  const avgMood = notes.length > 0
    ? notes.map((n) => n.mood).filter(Boolean)[0] || "unknown"
    : "unknown";

  // Generate the report
  const result = await generateText({
    model: aiModel,
    prompt: `Generate a brief, encouraging weekly fitness progress report.

This week's stats:
- ${sessions.length} workouts completed
- ${sessions.filter((s) => s.rating && s.rating >= 4).length} highly-rated sessions
- Average energy: ${avgEnergy.toFixed(1)}/5
- Predominant mood: ${avgMood}
- New PRs set: ${prs.length}

Write 3-4 sentences summarizing the week, highlighting wins, and suggesting focus for next week.
Keep it positive, specific, and actionable. No generic platitudes.`,
    providerOptions: getReasoningOptions("standard", { cacheKey: "progress-report" }) as any,
  });

  // Track usage
  const member = await db.query.circleMembers.findFirst({
    where: eq(circleMembers.id, memberId),
    columns: { userId: true },
  });
  if (member?.userId) {
    trackAIUsage({
      userId: member.userId,
      memberId,
      endpoint: "inngest/weekly-progress-report",
      feature: "session_summary",
      modelUsed: "gpt-5.2",
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheHit: (result.usage?.inputTokenDetails?.cacheReadTokens ?? 0) > 0,
    }).catch(() => {});
  }

  // Save the report
  await db.insert(progressReports).values({
    memberId,
    reportType: "weekly",
    periodStart: weekAgo,
    periodEnd: now,
    summary: result.text,
    metrics: {
      workoutsCompleted: sessions.length,
      totalSets: 0, // Would need to aggregate from sets
      totalVolume: 0,
      prsSet: prs.length,
      avgMood,
      avgEnergy,
      consistencyScore: Math.round((sessions.length / 7) * 100),
      muscleGroupDistribution: {},
    },
    insights: [],
    recommendations: [],
  });
}

// ============================================================================
// AI QUOTA RESET (monthly)
// ============================================================================

export const resetAIQuotasCron = inngest.createFunction(
  {
    id: "cron-reset-ai-quotas",
    name: "Reset AI Quotas for Expired Periods",
    retries: 1,
  },
  { cron: "0 0 * * *" }, // Daily at midnight — checks for expired periods
  async ({ step }) => {
    const resetCount = await step.run("reset-expired-quotas", async () => {
      const result = await db
        .update(aiQuotas)
        .set({
          currentWorkoutCount: 0,
          currentChatCount: 0,
          currentTokensUsed: 0,
          periodStart: new Date(),
          periodEnd: sql`NOW() + INTERVAL '30 days'`,
          updatedAt: new Date(),
        })
        .where(lte(aiQuotas.periodEnd, new Date()))
        .returning({ id: aiQuotas.id });

      return result.length;
    });

    return { success: true, quotasReset: resetCount };
  }
);

/**
 * Export all AI coaching functions for registration
 */
export const aiCoachingFunctions = [
  analyzeWorkoutFunction,
  extractCoachingMemoryFunction,
  weeklyProgressReportsCron,
  resetAIQuotasCron,
];
