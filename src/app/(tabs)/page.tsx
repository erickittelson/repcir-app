import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  circleMembers,
  circlePosts,
  circlePostLikes,
  userProfiles,
  circles,
} from "@/lib/db/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { CircleFeed } from "./circle-feed";

// Revalidate this page every 30 seconds for fresh accountability data
export const revalidate = 30;

export default async function HomePage() {
  const session = await getSession();
  if (!session?.activeCircle) return null;

  const circleId = session.activeCircle.id;
  const memberId = session.activeCircle.memberId;
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
        name: userProfile?.displayName || session.user.name,
        image: session.user.image,
        memberId,
      }}
      circle={{
        id: circleId,
        name: circle?.name || session.activeCircle.name,
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
          workoutId: post.workoutPlanId,
          likesCount: post.likes?.length || 0,
          commentsCount: post.comments?.length || 0,
          isLiked: post.likes?.some((l) => l.userId === userId) || false,
          createdAt: post.createdAt.toISOString(),
          metadata: undefined, // Posts don't have metadata in this schema
        };
      })}
    />
  );
}
