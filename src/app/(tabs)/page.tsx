import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  circleMembers,
  circlePosts,
  circlePostLikes,
  userProfiles,
  circles,
  goals,
  activityFeed,
} from "@/lib/db/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { CircleFeed } from "./circle-feed";
import { HomeFeed } from "./home-feed";

// Revalidate this page every 30 seconds for fresh accountability data
export const revalidate = 30;

export default async function HomePage() {
  const session = await getSession();
  if (!session?.activeCircle) return null;

  const userId = session.user.id;

  // If the active circle is a personal "My Training" circle, show HomeFeed
  if (session.activeCircle.isSystemCircle) {
    const hasGroupCircles = session.circles.some((c) => !c.isSystemCircle);
    return renderPersonalFeed(session, hasGroupCircles);
  }

  // Otherwise, show the group circle feed
  return renderCircleFeed(session);
}

/**
 * Render the personal "My Training" dashboard
 */
async function renderPersonalFeed(session: NonNullable<Awaited<ReturnType<typeof getSession>>>, hasGroupCircles: boolean) {
  const userId = session.user.id;
  const memberId = session.activeCircle!.memberId;

  // Get date boundaries
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  // Get all memberIds for this user across circles (for aggregated stats)
  const allMemberships = await db.query.circleMembers.findMany({
    where: eq(circleMembers.userId, userId),
    columns: { id: true },
  });
  const allMemberIds = allMemberships.map((m) => m.id);

  const [
    weekWorkouts,
    activeGoals,
    recentActivity,
    userProfile,
  ] = await Promise.all([
    // Workouts this week across all circles
    allMemberIds.length > 0
      ? db.query.workoutSessions.findMany({
          where: and(
            inArray(workoutSessions.memberId, allMemberIds),
            gte(workoutSessions.date, weekStart),
            eq(workoutSessions.status, "completed")
          ),
          orderBy: [desc(workoutSessions.date)],
        })
      : Promise.resolve([]),

    // Active goals for this user's personal member
    db.query.goals.findMany({
      where: and(
        eq(goals.memberId, memberId),
        eq(goals.status, "active")
      ),
      limit: 5,
    }),

    // Recent activity feed
    db.query.activityFeed.findMany({
      where: eq(activityFeed.userId, userId),
      orderBy: [desc(activityFeed.createdAt)],
      limit: 15,
    }),

    // User profile
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    }),
  ]);

  // Calculate streak (consecutive days with a completed workout)
  const currentStreak = calculateStreak(weekWorkouts);

  return (
    <HomeFeed
      user={{
        name: userProfile?.displayName || session.user.name,
        image: userProfile?.profilePicture || session.user.image,
      }}
      stats={{
        workoutsThisWeek: weekWorkouts.length,
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
      recentWorkouts={weekWorkouts.slice(0, 5).map((w) => {
        const duration = w.startTime && w.endTime
          ? Math.round((w.endTime.getTime() - w.startTime.getTime()) / 60000)
          : 0;
        return {
          id: w.id,
          name: w.name || "Workout",
          completedAt: w.date.toISOString(),
          duration,
          status: w.status,
        };
      })}
      activityFeed={recentActivity.map((a) => ({
        id: a.id,
        userId: a.userId,
        activityType: a.activityType,
        entityType: a.entityType || undefined,
        metadata: a.metadata || undefined,
        createdAt: a.createdAt.toISOString(),
      }))}
      hasGroupCircles={hasGroupCircles}
    />
  );
}

/**
 * Calculate streak from recent workouts
 */
function calculateStreak(workouts: Array<{ date: Date }>): number {
  if (workouts.length === 0) return 0;

  const workoutDates = new Set(
    workouts.map((w) => {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check today and go backwards
  for (let i = 0; i <= 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (workoutDates.has(checkDate.getTime())) {
      streak++;
    } else if (i > 0) {
      // Allow today to be missing (haven't trained yet today)
      break;
    }
  }

  return streak;
}

/**
 * Render the group circle accountability feed
 */
async function renderCircleFeed(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const circleId = session.activeCircle!.id;
  const memberId = session.activeCircle!.memberId;
  const userId = session.user.id;

  // Get today's date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get this week's start (Monday)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  // Fetch circle members
  const members = await db.query.circleMembers.findMany({
    where: eq(circleMembers.circleId, circleId),
  });

  const memberIds = members.map((m) => m.id);
  const memberUserIds = members.map((m) => m.userId).filter((id): id is string => id !== null);

  // Fetch user profiles for profile pictures
  const memberProfiles = memberUserIds.length > 0
    ? await db.query.userProfiles.findMany({
        where: inArray(userProfiles.userId, memberUserIds),
      })
    : [];

  // Create a map of userId to profile
  const profileMap = new Map(memberProfiles.map((p) => [p.userId, p]));

  // Fetch all data in parallel
  const [
    todayWorkouts,
    weekWorkouts,
    recentPosts,
    circle,
    userProfile,
  ] = await Promise.all([
    // Workouts completed TODAY by circle members
    db.query.workoutSessions.findMany({
      where: and(
        inArray(workoutSessions.memberId, memberIds),
        gte(workoutSessions.date, today),
        eq(workoutSessions.status, "completed")
      ),
    }),

    // Workouts this week by circle members
    db.query.workoutSessions.findMany({
      where: and(
        inArray(workoutSessions.memberId, memberIds),
        gte(workoutSessions.date, weekStart),
        eq(workoutSessions.status, "completed")
      ),
    }),

    // Recent circle posts
    db.query.circlePosts.findMany({
      where: eq(circlePosts.circleId, circleId),
      orderBy: [desc(circlePosts.createdAt)],
      limit: 20,
      with: {
        likes: true,
        comments: {
          limit: 3,
          orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        },
      },
    }),

    // Circle info
    db.query.circles.findFirst({
      where: eq(circles.id, circleId),
    }),

    // User profile
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    }),
  ]);

  // Fetch author profiles for posts
  const postAuthorIds = [...new Set(recentPosts.map((p) => p.authorId))];
  const postAuthorProfiles = postAuthorIds.length > 0
    ? await db.query.userProfiles.findMany({
        where: inArray(userProfiles.userId, postAuthorIds),
      })
    : [];
  const postAuthorMap = new Map(postAuthorProfiles.map((p) => [p.userId, p]));

  // Calculate who has trained today
  const trainedTodayMemberIds = new Set(todayWorkouts.map((w) => w.memberId));

  // Build member status list
  const memberStatuses = members.map((member) => {
    const memberWeekWorkouts = weekWorkouts.filter((w) => w.memberId === member.id);
    const trainedToday = trainedTodayMemberIds.has(member.id);
    const profile = member.userId ? profileMap.get(member.userId) : null;

    return {
      id: member.id,
      userId: member.userId || "",
      name: profile?.displayName || member.name,
      image: profile?.profilePicture,
      role: member.role,
      trainedToday,
      workoutsThisWeek: memberWeekWorkouts.length,
      isCurrentUser: member.userId === userId,
    };
  });

  // Sort: trained today first, then by workouts this week
  memberStatuses.sort((a, b) => {
    if (a.trainedToday !== b.trainedToday) return a.trainedToday ? -1 : 1;
    return b.workoutsThisWeek - a.workoutsThisWeek;
  });

  const trainedTodayCount = memberStatuses.filter((m) => m.trainedToday).length;
  const totalMembers = memberStatuses.length;
  const currentUserTrained = memberStatuses.find((m) => m.isCurrentUser)?.trainedToday || false;

  return (
    <CircleFeed
      user={{
        id: userId,
        name: userProfile?.displayName || session.user.name,
        image: userProfile?.profilePicture || session.user.image,
        memberId,
      }}
      circle={{
        id: circleId,
        name: circle?.name || session.activeCircle!.name,
      }}
      accountability={{
        trainedTodayCount,
        totalMembers,
        currentUserTrained,
        memberStatuses,
      }}
      posts={recentPosts.map((post) => {
        const authorProfile = postAuthorMap.get(post.authorId);
        return {
          id: post.id,
          authorName: authorProfile?.displayName || "Unknown",
          authorImage: authorProfile?.profilePicture,
          authorId: post.authorId,
          content: post.content,
          type: post.postType,
          imageUrl: post.imageUrl,
          workoutId: post.workoutPlanId,
          likesCount: post.likeCount || 0,
          commentsCount: post.commentCount || 0,
          isLiked: post.likes?.some((l) => l.userId === userId) || false,
          createdAt: post.createdAt.toISOString(),
          metadata: undefined,
        };
      })}
    />
  );
}
