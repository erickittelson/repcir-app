import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { challengeParticipants, userProfiles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Get participants sorted by progress
    const participants = await db
      .select({
        id: challengeParticipants.id,
        userId: challengeParticipants.userId,
        currentDay: challengeParticipants.currentDay,
        currentStreak: challengeParticipants.currentStreak,
        longestStreak: challengeParticipants.longestStreak,
        status: challengeParticipants.status,
        startDate: challengeParticipants.startDate,
      })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, id))
      .orderBy(
        desc(challengeParticipants.currentDay),
        desc(challengeParticipants.currentStreak),
        desc(challengeParticipants.longestStreak)
      )
      .limit(limit)
      .offset(offset);

    // Get user profiles
    const userIds = participants.map((p) => p.userId);
    const profiles =
      userIds.length > 0
        ? await db.query.userProfiles.findMany({
            where: (profile, { inArray }) => inArray(profile.userId, userIds),
          })
        : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Build leaderboard
    const leaderboard = participants.map((p, index) => {
      const profile = profileMap.get(p.userId);
      return {
        rank: offset + index + 1,
        userId: p.userId,
        name: profile?.displayName || "Anonymous",
        avatarUrl: profile?.profilePicture,
        handle: profile?.handle,
        completedDays: p.currentDay || 0,
        currentStreak: p.currentStreak || 0,
        longestStreak: p.longestStreak || 0,
        status: p.status,
        startDate: p.startDate,
        isCurrentUser: p.userId === session.user.id,
      };
    });

    // Find current user's rank if not in the returned list
    let currentUserRank = null;
    const currentUserInList = leaderboard.find((l) => l.isCurrentUser);
    
    if (!currentUserInList) {
      // Get user's participation
      const userParticipation = await db.query.challengeParticipants.findFirst({
        where: (cp, { and, eq }) =>
          and(
            eq(cp.challengeId, id),
            eq(cp.userId, session.user.id)
          ),
      });

      if (userParticipation) {
        // Count how many participants are ahead
        const aheadCount = await db
          .select({ count: challengeParticipants.id })
          .from(challengeParticipants)
          .where(eq(challengeParticipants.challengeId, id));
        // This is simplified - would need proper ranking query
        currentUserRank = {
          rank: "50+",
          completedDays: userParticipation.currentDay,
          currentStreak: userParticipation.currentStreak,
        };
      }
    }

    return NextResponse.json({
      leaderboard,
      currentUserRank,
      hasMore: participants.length === limit,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
