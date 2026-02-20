import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challenges,
  challengeParticipants,
  challengeProgress,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ChallengeClient } from "./challenge-client";

interface ChallengePageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get challenge details
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, id),
  });

  if (!challenge) {
    notFound();
  }

  // Check user participation - include fields we need
  const participationData = await db
    .select({
      id: challengeParticipants.id,
      status: challengeParticipants.status,
      daysCompleted: challengeParticipants.daysCompleted,
      currentStreak: challengeParticipants.currentStreak,
      startDate: challengeParticipants.startDate,
    })
    .from(challengeParticipants)
    .where(
      and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, session.user.id)
      )
    )
    .limit(1);
  
  const participation = participationData[0] || null;

  // Get user's progress if participating
  let progress: Array<{
    day: number;
    completed: boolean;
    date: Date;
    tasksCompleted: unknown;
  }> = [];

  if (participation) {
    const progressData = await db
      .select({
        day: challengeProgress.day,
        completed: challengeProgress.completed,
        date: challengeProgress.date,
        tasksCompleted: challengeProgress.tasksCompleted,
      })
      .from(challengeProgress)
      .where(eq(challengeProgress.participantId, participation.id))
      .orderBy(desc(challengeProgress.day));

    progress = progressData;
  }

  // Get leaderboard (top 10)
  const leaderboardData = await db
    .select({
      participant: challengeParticipants,
      profile: userProfiles,
    })
    .from(challengeParticipants)
    .leftJoin(userProfiles, eq(userProfiles.userId, challengeParticipants.userId))
    .where(eq(challengeParticipants.challengeId, id))
    .orderBy(desc(challengeParticipants.daysCompleted))
    .limit(10);

  const leaderboard = leaderboardData.map((row, index) => ({
    rank: index + 1,
    userId: row.participant.userId,
    name: row.profile?.displayName || "Anonymous",
    profilePicture: row.profile?.profilePicture || null,
    progress: row.participant.daysCompleted || 0,
    streak: row.participant.currentStreak || 0,
  }));

  // Get user's circles for sharing
  const userCircles = (session.circles || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <ChallengeClient
      challenge={challenge}
      participation={participation}
      progress={progress}
      leaderboard={leaderboard}
      userId={session.user.id}
      circles={userCircles}
    />
  );
}
