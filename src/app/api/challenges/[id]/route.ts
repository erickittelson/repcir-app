import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challenges,
  challengeParticipants,
  challengeProgress,
  userProfiles,
  badgeDefinitions,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
    // Get challenge details
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, id),
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user is a participant
    const participation = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    // Get user progress if they're a participant
    let userProgress = null;
    if (participation) {
      userProgress = {
        currentDay: participation.currentDay,
        streak: participation.currentStreak,
        status: participation.status,
      };
    }

    // Get leaderboard (top participants by streak/progress)
    const participants = await db
      .select({
        id: challengeParticipants.id,
        userId: challengeParticipants.userId,
        currentDay: challengeParticipants.currentDay,
        currentStreak: challengeParticipants.currentStreak,
        status: challengeParticipants.status,
      })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, id))
      .orderBy(
        desc(challengeParticipants.currentDay),
        desc(challengeParticipants.currentStreak)
      )
      .limit(10);

    // Get user profiles for leaderboard
    const userIds = participants.map((p) => p.userId);
    const profiles =
      userIds.length > 0
        ? await db.query.userProfiles.findMany({
            where: (profile, { inArray }) => inArray(profile.userId, userIds),
          })
        : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const leaderboard = participants.map((p, index) => {
      const profile = profileMap.get(p.userId);
      return {
        userId: p.userId,
        name: profile?.displayName || "Anonymous",
        avatarUrl: profile?.profilePicture,
        rank: index + 1,
        streak: p.currentStreak || 0,
        completedDays: p.currentDay || 0,
      };
    });

    // Find the challenge-specific completion badge
    let completionBadge = null;
    
    // First, try to find a badge specific to this challenge
    const badges = await db.query.badgeDefinitions.findMany({
      where: and(
        eq(badgeDefinitions.category, "challenge"),
        eq(badgeDefinitions.isActive, true)
      ),
    });
    
    // Look for a badge with this challenge's ID in the criteria
    const specificBadge = badges.find((b) => {
      const criteria = b.criteria as { challengeId?: string } | null;
      return criteria?.challengeId === id;
    });
    
    if (specificBadge) {
      completionBadge = {
        id: specificBadge.id,
        name: specificBadge.name,
        icon: specificBadge.icon || "🏆",
        description: specificBadge.description,
        tier: specificBadge.tier,
        rarity: specificBadge.rarity,
        unlockMessage: specificBadge.unlockMessage,
      };
    }

    return NextResponse.json({
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      shortDescription: challenge.shortDescription,
      coverImage: challenge.coverImage,
      category: challenge.category,
      difficulty: challenge.difficulty,
      durationDays: challenge.durationDays,
      rules: challenge.rules || [],
      dailyTasks: challenge.dailyTasks || [],
      progressionType: challenge.progressionType,
      restartOnFail: challenge.restartOnFail,
      weeklyStructure: challenge.weeklyStructure || [],
      participantCount: challenge.participantCount,
      completionCount: challenge.completionCount,
      avgCompletionRate: challenge.avgCompletionRate,
      avgRating: challenge.avgRating,
      ratingCount: challenge.ratingCount,
      isOfficial: challenge.isOfficial,
      isFeatured: challenge.isFeatured,
      isJoined: !!participation,
      userProgress,
      leaderboard,
      completionBadge,
    });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenge" },
      { status: 500 }
    );
  }
}
