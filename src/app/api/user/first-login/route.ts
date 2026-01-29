import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { 
  userProfiles, 
  userBadges, 
  badgeDefinitions, 
  personalRecords, 
  userSkills, 
  goals,
  onboardingProgress,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const memberId = session.activeCircle?.memberId;

    // Check onboarding progress
    const progress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId),
    });

    // If they haven't completed onboarding, don't show post-login
    if (!progress?.completedAt) {
      return NextResponse.json({ showPostLogin: false });
    }

    // Check if they've already seen the intro (stored in extractedData)
    const extractedData = progress.extractedData as Record<string, unknown>;
    if (extractedData?.seenPostLoginIntro) {
      return NextResponse.json({ showPostLogin: false });
    }

    // Get user profile for display name
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    // Get user data for the post-login experience
    const [earnedBadges, prs, skills, userGoals] = await Promise.all([
      // Get recently earned badges
      (async () => {
        try {
          return await db
            .select({
              id: userBadges.id,
              name: badgeDefinitions.name,
              description: badgeDefinitions.description,
              icon: badgeDefinitions.icon,
              tier: badgeDefinitions.tier,
            })
            .from(userBadges)
            .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
            .where(eq(userBadges.userId, userId))
            .orderBy(desc(userBadges.earnedAt))
            .limit(5);
        } catch {
          return [];
        }
      })(),

      // Get PRs
      memberId
        ? db.query.personalRecords.findMany({
            where: eq(personalRecords.memberId, memberId),
            with: { exercise: true },
            limit: 5,
          })
        : [],

      // Get skills
      (async () => {
        try {
          return await db.query.userSkills.findMany({
            where: eq(userSkills.userId, userId),
            limit: 5,
          });
        } catch {
          return [];
        }
      })(),

      // Get goals
      memberId
        ? db.query.goals.findMany({
            where: and(eq(goals.memberId, memberId), eq(goals.status, "active")),
            limit: 5,
          })
        : [],
    ]);

    // Get primary goal from onboarding data or goals
    const primaryGoal = extractedData?.primaryGoal as string || userGoals[0]?.title || "";

    return NextResponse.json({
      showPostLogin: true,
      userData: {
        name: profile?.displayName || session.user.name || "there",
        primaryGoal,
        goals: userGoals.map(g => g.title),
        personalRecords: prs.map(pr => ({
          exerciseName: pr.exercise?.name || "Unknown",
          value: pr.value,
          unit: pr.unit,
        })),
        skills: skills.map(s => ({
          name: s.name,
          status: s.currentStatus,
        })),
        earnedBadges: earnedBadges.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description || "",
          icon: b.icon || "🏆",
          tier: b.tier as "bronze" | "silver" | "gold" | "platinum",
        })),
      },
    });
  } catch (error) {
    console.error("First login check error:", error);
    return NextResponse.json({ showPostLogin: false });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current progress
    const progress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, session.user.id),
    });

    if (progress) {
      // Mark the user as having seen the intro in extractedData
      const extractedData = (progress.extractedData || {}) as Record<string, unknown>;
      await db
        .update(onboardingProgress)
        .set({
          extractedData: {
            ...extractedData,
            seenPostLoginIntro: true,
          },
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.userId, session.user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark first login seen error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
