import { redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  circlePosts,
} from "@/lib/db/schema";
import { eq, desc, sql, and, gt, ne } from "drizzle-orm";
import { CirclesClient } from "./circles-client";

export default async function CirclesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get user's circles with membership info and recent activity
  const userCircles = await db
    .select({
      id: circles.id,
      name: circles.name,
      description: circles.description,
      imageUrl: circles.imageUrl,
      memberCount: circles.memberCount,
      visibility: circles.visibility,
      focusArea: circles.focusArea,
      memberRole: circleMembers.role,
      joinedAt: circleMembers.createdAt,
    })
    .from(circleMembers)
    .innerJoin(circles, eq(circles.id, circleMembers.circleId))
    .where(and(
      eq(circleMembers.userId, session.user.id),
      eq(circles.isSystemCircle, false),
    ))
    .orderBy(desc(circleMembers.createdAt));

  // Get unread post counts for each circle (posts since last visit)
  // For simplicity, we'll count posts from the last 24 hours as "new"
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentPostCounts = await db
    .select({
      circleId: circlePosts.circleId,
      count: sql<number>`count(*)::int`,
    })
    .from(circlePosts)
    .where(gt(circlePosts.createdAt, oneDayAgo))
    .groupBy(circlePosts.circleId);

  const postCountMap = new Map(
    recentPostCounts.map((r) => [r.circleId, r.count])
  );

  const circlesWithActivity = userCircles.map((circle) => ({
    ...circle,
    recentPostCount: postCountMap.get(circle.id) || 0,
  }));

  return (
    <CirclesClient
      circles={circlesWithActivity}
      userId={session.user.id}
    />
  );
}
