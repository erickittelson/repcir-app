import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challenges,
  challengeParticipants,
  challengeProgress,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TodayCheckInClient } from "./today-client";

interface TodayPageProps {
  params: Promise<{ id: string }>;
}

export default async function TodayPage({ params }: TodayPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get challenge
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, id),
  });

  if (!challenge) {
    notFound();
  }

  // Get participation
  const participation = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, id),
      eq(challengeParticipants.userId, session.user.id)
    ),
  });

  if (!participation) {
    // Not participating, redirect to challenge page
    redirect(`/challenge/${id}`);
  }

  // Get today's progress (most recent)
  const todayProgress = await db.query.challengeProgress.findFirst({
    where: eq(challengeProgress.participantId, participation.id),
    orderBy: [desc(challengeProgress.day)],
  });

  // Calculate current day
  const startDate = participation.startDate || new Date();
  const daysSinceJoined = Math.ceil(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const currentDay = Math.min(daysSinceJoined, challenge.durationDays || 30);

  // Check if already checked in today
  const alreadyCheckedIn = todayProgress?.day === currentDay && todayProgress?.completed;

  return (
    <TodayCheckInClient
      challenge={challenge}
      participation={participation}
      currentDay={currentDay}
      alreadyCheckedIn={!!alreadyCheckedIn}
      todayProgress={todayProgress || null}
    />
  );
}
