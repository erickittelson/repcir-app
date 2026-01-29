import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  goals,
  circleMembers,
  activityFeed,
  userProfiles,
} from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { HomeFeed } from "./home-feed";

// Revalidate this page every 60 seconds (ISR)
export const revalidate = 60;

export default async function HomePage() {
  const session = await getSession();
  if (!session?.activeCircle) return null;

  const memberId = session.activeCircle.memberId;
  const userId = session.user.id;

  // Get today's date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch data in parallel
  const [recentWorkouts, activeGoals, feed, userProfile] = await Promise.all([
    // Recent workouts for the user
    db.query.workoutSessions.findMany({
      where: eq(workoutSessions.memberId, memberId),
      orderBy: [desc(workoutSessions.date)],
      limit: 3,
      with: {
        plan: true,
      },
    }),

    // Active goals
    db.query.goals.findMany({
      where: and(
        eq(goals.memberId, memberId),
        eq(goals.status, "active")
      ),
      limit: 3,
    }),

    // Activity feed from followed users and circles
    db.query.activityFeed.findMany({
      orderBy: [desc(activityFeed.createdAt)],
      limit: 20,
    }),

    // User profile for personalized greeting
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    }),
  ]);

  // Calculate stats
  const workoutsThisWeek = recentWorkouts.filter((w) => {
    const workoutDate = new Date(w.startTime || w.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return workoutDate >= weekAgo && w.status === "completed";
  }).length;

  const currentStreak = calculateStreak(recentWorkouts.map(w => ({
    startTime: w.startTime || w.date,
    status: w.status
  })));

  return (
    <HomeFeed
      user={{
        name: userProfile?.displayName || session.user.name,
        image: session.user.image,
      }}
      stats={{
        workoutsThisWeek,
        currentStreak,
        activeGoalsCount: activeGoals.length,
      }}
      activeGoals={activeGoals.map((g) => ({
        id: g.id,
        name: g.title,
        targetValue: g.targetValue || 0,
        currentValue: g.currentValue || 0,
        unit: g.targetUnit || "",
        type: g.category,
      }))}
      recentWorkouts={recentWorkouts.map((w) => ({
        id: w.id,
        name: w.plan?.name || w.name || "Quick Workout",
        completedAt: w.endTime?.toISOString() || (w.startTime || w.date).toISOString(),
        duration: w.endTime && w.startTime
          ? Math.round(
              (w.endTime.getTime() - w.startTime.getTime()) / 1000 / 60
            )
          : 0,
        status: w.status,
      }))}
      activityFeed={feed.map((a) => ({
        id: a.id,
        userId: a.userId,
        activityType: a.activityType,
        entityType: a.entityType || undefined,
        metadata: a.metadata as Record<string, unknown> | undefined,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}

function calculateStreak(
  workouts: Array<{ startTime: Date; status: string }>
): number {
  const completedWorkouts = workouts
    .filter((w) => w.status === "completed")
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  if (completedWorkouts.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const workout of completedWorkouts) {
    const workoutDate = new Date(workout.startTime);
    workoutDate.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor(
      (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff <= 1) {
      streak++;
      currentDate = workoutDate;
    } else {
      break;
    }
  }

  return streak;
}
