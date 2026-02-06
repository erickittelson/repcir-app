import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  goals,
  userProfiles,
  sharedWorkouts,
  challenges,
  communityPrograms,
} from "@/lib/db/schema";
import { eq, and, desc, gte, sql, not, inArray } from "drizzle-orm";
import { generateText } from "ai";
import { aiModel, getMemberContext, buildSystemPrompt } from "@/lib/ai";
import { applyRateLimit, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";

// Query parameter validation
const recommendationTypeSchema = z.enum(["workouts", "challenges", "programs", "all"]);

/**
 * AI-powered recommendations for workouts, challenges, and programs
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Apply rate limiting for AI operations
  const rateLimitResult = applyRateLimit(
    `ai-recommendations:${session.user.id}`,
    RATE_LIMITS.aiGeneration
  );
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type") || "all";

    // Validate type parameter
    const typeValidation = recommendationTypeSchema.safeParse(typeParam);
    if (!typeValidation.success) {
      return NextResponse.json(
        { error: "Invalid type. Must be one of: workouts, challenges, programs, all" },
        { status: 400 }
      );
    }
    const type = typeValidation.data;

    const memberId = session.activeCircle?.memberId;
    const userId = session.user.id;

    // Get user profile for preferences
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    // Get user's active goals
    const activeGoals = memberId
      ? await db.query.goals.findMany({
          where: and(
            eq(goals.memberId, memberId),
            eq(goals.status, "active")
          ),
          limit: 5,
        })
      : [];

    // Get recent workout history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWorkouts = memberId
      ? await db.query.workoutSessions.findMany({
          where: and(
            eq(workoutSessions.memberId, memberId),
            gte(workoutSessions.date, thirtyDaysAgo),
            eq(workoutSessions.status, "completed")
          ),
          with: {
            plan: true,
          },
          orderBy: [desc(workoutSessions.date)],
          limit: 20,
        })
      : [];

    // Analyze recent workout categories
    const categoryCount: Record<string, number> = {};
    recentWorkouts.forEach((w) => {
      const cat = w.plan?.category || "uncategorized";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Find underworked categories
    const allCategories = ["strength", "cardio", "hiit", "crossfit", "flexibility"];
    const underworkedCategories = allCategories.filter(
      (cat) => !categoryCount[cat] || categoryCount[cat] < 2
    );

    // Type definitions for recommendations
    interface WorkoutRecommendation {
      id: string;
      title: string;
      description: string | null;
      category: string | null;
      difficulty: string | null;
      estimatedDuration: number | null;
      saveCount: number | null;
      reason: string;
    }

    interface ChallengeRecommendation {
      id: string;
      name: string;
      shortDescription: string | null;
      category: string | null;
      difficulty: string | null;
      durationDays: number | null;
      participantCount: number | null;
      reason: string;
    }

    interface ProgramRecommendation {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      difficulty: string | null;
      durationWeeks: number | null;
      enrollmentCount: number | null;
      reason: string;
    }

    // Build recommendations based on context
    const recommendations: {
      workouts: WorkoutRecommendation[];
      challenges: ChallengeRecommendation[];
      programs: ProgramRecommendation[];
      aiInsight: string;
    } = {
      workouts: [],
      challenges: [],
      programs: [],
      aiInsight: "",
    };

    // Get workout recommendations
    if (type === "all" || type === "workouts") {
      // Prefer workouts in underworked categories or matching goals
      const goalCategories = activeGoals.map((g) => g.category);
      const preferredCategories = [
        ...new Set([...underworkedCategories, ...goalCategories]),
      ];

      const workoutRecs = await db.query.sharedWorkouts.findMany({
        where: and(
          eq(sharedWorkouts.visibility, "public"),
          preferredCategories.length > 0
            ? inArray(sharedWorkouts.category, preferredCategories)
            : undefined
        ),
        orderBy: [desc(sharedWorkouts.popularityScore)],
        limit: 6,
      });

      recommendations.workouts = workoutRecs.map((w) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        category: w.category,
        difficulty: w.difficulty,
        estimatedDuration: w.estimatedDuration,
        saveCount: w.saveCount,
        reason:
          underworkedCategories.includes(w.category || "")
            ? `You haven't done ${w.category} workouts recently`
            : goalCategories.includes(w.category || "")
            ? `Aligns with your ${w.category} goals`
            : "Popular workout",
      }));
    }

    // Get challenge recommendations
    if (type === "all" || type === "challenges") {
      const challengeRecs = await db.query.challenges.findMany({
        where: eq(challenges.visibility, "public"),
        orderBy: [desc(challenges.participantCount)],
        limit: 4,
      });

      recommendations.challenges = challengeRecs.map((c) => ({
        id: c.id,
        name: c.name,
        shortDescription: c.shortDescription,
        category: c.category,
        difficulty: c.difficulty,
        durationDays: c.durationDays,
        participantCount: c.participantCount,
        reason: "Trending challenge",
      }));
    }

    // Get program recommendations
    if (type === "all" || type === "programs") {
      const goalTypes = activeGoals.map((g) => g.category);

      const programRecs = await db.query.communityPrograms.findMany({
        where: and(
          eq(communityPrograms.visibility, "public"),
          goalTypes.length > 0
            ? inArray(communityPrograms.category, goalTypes)
            : undefined
        ),
        orderBy: [desc(communityPrograms.enrollmentCount)],
        limit: 4,
      });

      recommendations.programs = programRecs.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        difficulty: p.difficulty,
        durationWeeks: p.durationWeeks,
        enrollmentCount: p.enrollmentCount,
        reason: goalTypes.includes(p.category || "")
          ? `Matches your ${p.category} goals`
          : "Popular program",
      }));
    }

    // Generate AI insight
    if (memberId) {
      try {
        const context = await getMemberContext(memberId);
        const systemPrompt = buildSystemPrompt(context);

        const insightPrompt = `Based on this user's profile and recent activity, provide a brief (1-2 sentence) personalized recommendation.

Recent workouts: ${recentWorkouts.length} in last 30 days
Categories: ${Object.entries(categoryCount)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}
Active goals: ${activeGoals.map((g) => g.title).join(", ") || "None set"}
Underworked areas: ${underworkedCategories.join(", ") || "None - well balanced!"}

Provide a brief, motivating insight about what they should focus on next.`;

        const { text } = await generateText({
          model: aiModel,
          system: systemPrompt,
          prompt: insightPrompt,
        });

        recommendations.aiInsight = text;
      } catch (error) {
        console.error("AI insight generation failed:", error);
        recommendations.aiInsight =
          "Keep up the great work! Consider trying something new this week.";
      }
    }

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
