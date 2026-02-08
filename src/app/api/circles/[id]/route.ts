import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  workoutPlans,
  challenges,
  workoutSessions,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc, gte, sql, ne } from "drizzle-orm";

// Valid options for enum-like fields
const VALID_VISIBILITY = ["public", "private"] as const;
const VALID_JOIN_TYPES = ["open", "request", "invite_only"] as const;
const VALID_CATEGORIES = [
  "fitness", "strength", "running", "crossfit", "yoga",
  "cycling", "swimming", "martial_arts", "sports", "weight_loss",
  "family", "other"
] as const;
const VALID_FOCUS_AREAS = [
  "strength", "cardio", "wellness", "sports", "flexibility", "outdoor",
  "weight_loss", "endurance", "muscle_gain", "athletic_performance",
  "rehabilitation", "general"
] as const;
const VALID_TARGET_DEMOGRAPHICS = [
  "beginners", "intermediate", "advanced", "seniors",
  "women", "men", "teens", "parents", "all"
] as const;
const VALID_ACTIVITY_TYPES = [
  "challenges", "workout_plans", "accountability", "social", "coaching"
] as const;
const VALID_SCHEDULE_TYPES = [
  "daily_challenges", "weekly_workouts", "monthly_goals", "self_paced"
] as const;

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
    // Get circle details
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, id),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if user is a member
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, id),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    // Check for pending join request (if we have that table)
    const isPendingRequest = false; // Would need join_requests table

    // Get circle members with roles
    const members = await db
      .select({
        id: circleMembers.id,
        userId: circleMembers.userId,
        role: circleMembers.role,
        joinedAt: circleMembers.createdAt,
      })
      .from(circleMembers)
      .where(eq(circleMembers.circleId, id))
      .orderBy(desc(circleMembers.createdAt))
      .limit(20);

    // Get user profiles for members
    const memberUserIds = members.map((m) => m.userId).filter((id): id is string => id !== null);
    const profiles =
      memberUserIds.length > 0
        ? await db.query.userProfiles.findMany({
            where: (profile, { inArray }) =>
              inArray(profile.userId, memberUserIds),
          })
        : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Separate admins/owners from regular members
    const admins = members
      .filter((m) => m.role === "owner" || m.role === "admin")
      .map((m) => {
        const profile = m.userId ? profileMap.get(m.userId) : undefined;
        return {
          id: m.id,
          name: profile?.displayName || "Anonymous",
          avatarUrl: profile?.profilePicture,
          role: m.role as "owner" | "admin" | "member",
        };
      });

    const recentMembers = members.slice(0, 10).map((m) => {
      const profile = m.userId ? profileMap.get(m.userId) : undefined;
      return {
        id: m.id,
        name: profile?.displayName || "Anonymous",
        avatarUrl: profile?.profilePicture,
        role: m.role as "owner" | "admin" | "member",
      };
    });

    // Get weekly workout count (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyWorkoutsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .innerJoin(circleMembers, eq(workoutSessions.memberId, circleMembers.id))
      .where(
        and(
          eq(circleMembers.circleId, id),
          gte(workoutSessions.date, oneWeekAgo)
        )
      );

    const weeklyWorkouts = weeklyWorkoutsResult[0]?.count || 0;

    // Get total workouts
    const totalWorkoutsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .innerJoin(circleMembers, eq(workoutSessions.memberId, circleMembers.id))
      .where(eq(circleMembers.circleId, id));

    const totalWorkouts = totalWorkoutsResult[0]?.count || 0;

    // Get featured workouts from this circle
    const circleWorkouts = await db.query.workoutPlans.findMany({
      where: eq(workoutPlans.circleId, id),
      orderBy: [desc(workoutPlans.createdAt)],
      limit: 5,
    });

    const featuredWorkouts = circleWorkouts.map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      difficulty: w.difficulty,
    }));

    // Get active challenges from this circle
    const circleChallenge = await db.query.challenges.findMany({
      where: eq(challenges.circleId, id),
      orderBy: [desc(challenges.participantCount)],
      limit: 5,
    });

    const activeChallengesList = circleChallenge.map((c) => ({
      id: c.id,
      name: c.name,
      durationDays: c.durationDays,
      participantCount: c.participantCount,
    }));

    return NextResponse.json({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      handle: (circle as any).handle,
      imageUrl: circle.imageUrl,
      coverImageUrl: (circle as any).coverImageUrl,
      focusArea: circle.focusArea,
      visibility: circle.visibility || "public",
      memberCount: circle.memberCount || members.length,
      weeklyWorkouts,
      totalWorkouts,
      activeChallenges: activeChallengesList.length,
      admins,
      recentMembers,
      featuredWorkouts,
      activeChallengesList,
      isMember: !!membership,
      userRole: membership?.role,
      isPendingRequest,
      rules: (circle as any).rules || [],
      location: (circle as any).location,
      createdAt: circle.createdAt,
    });
  } catch (error) {
    console.error("Error fetching circle:", error);
    return NextResponse.json(
      { error: "Failed to fetch circle" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if circle exists
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, id),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if user is admin or owner
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, id),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
      return NextResponse.json(
        { error: "Only admins and owners can edit this circle" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      visibility,
      category,
      focusArea,
      targetDemographic,
      activityType,
      scheduleType,
      maxMembers,
      joinType,
      rules,
      tags,
    } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: "Name must be 50 characters or less" },
          { status: 400 }
        );
      }
    }

    // Validate description if provided
    if (description !== undefined && description !== null) {
      if (typeof description !== "string") {
        return NextResponse.json(
          { error: "Description must be a string" },
          { status: 400 }
        );
      }
      if (description.length > 500) {
        return NextResponse.json(
          { error: "Description must be 500 characters or less" },
          { status: 400 }
        );
      }
    }

    // Validate enum fields
    if (visibility !== undefined && visibility !== null && !VALID_VISIBILITY.includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility. Must be 'public' or 'private'" },
        { status: 400 }
      );
    }

    if (joinType !== undefined && joinType !== null && !VALID_JOIN_TYPES.includes(joinType)) {
      return NextResponse.json(
        { error: "Invalid joinType. Must be 'open', 'request', or 'invite_only'" },
        { status: 400 }
      );
    }

    if (category !== undefined && category !== null && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (focusArea !== undefined && focusArea !== null && !VALID_FOCUS_AREAS.includes(focusArea)) {
      return NextResponse.json(
        { error: "Invalid focusArea" },
        { status: 400 }
      );
    }

    if (targetDemographic !== undefined && targetDemographic !== null && !VALID_TARGET_DEMOGRAPHICS.includes(targetDemographic)) {
      return NextResponse.json(
        { error: "Invalid targetDemographic" },
        { status: 400 }
      );
    }

    if (activityType !== undefined && activityType !== null && !VALID_ACTIVITY_TYPES.includes(activityType)) {
      return NextResponse.json(
        { error: "Invalid activityType" },
        { status: 400 }
      );
    }

    if (scheduleType !== undefined && scheduleType !== null && !VALID_SCHEDULE_TYPES.includes(scheduleType)) {
      return NextResponse.json(
        { error: "Invalid scheduleType" },
        { status: 400 }
      );
    }

    // Validate maxMembers
    if (maxMembers !== undefined && maxMembers !== null) {
      if (typeof maxMembers !== "number" || !Number.isInteger(maxMembers)) {
        return NextResponse.json(
          { error: "maxMembers must be an integer" },
          { status: 400 }
        );
      }
      if (maxMembers < 2 || maxMembers > 10000) {
        return NextResponse.json(
          { error: "maxMembers must be between 2 and 10000" },
          { status: 400 }
        );
      }
    }

    // Validate rules array
    if (rules !== undefined && rules !== null) {
      if (!Array.isArray(rules)) {
        return NextResponse.json(
          { error: "rules must be an array" },
          { status: 400 }
        );
      }
      if (rules.length > 10) {
        return NextResponse.json(
          { error: "Maximum 10 rules allowed" },
          { status: 400 }
        );
      }
      if (!rules.every((r: unknown) => typeof r === "string" && r.length <= 500)) {
        return NextResponse.json(
          { error: "Each rule must be a string of 500 characters or less" },
          { status: 400 }
        );
      }
    }

    // Validate tags array
    if (tags !== undefined && tags !== null) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { error: "tags must be an array" },
          { status: 400 }
        );
      }
      if (tags.length > 10) {
        return NextResponse.json(
          { error: "Maximum 10 tags allowed" },
          { status: 400 }
        );
      }
      if (!tags.every((t: unknown) => typeof t === "string" && t.length <= 50)) {
        return NextResponse.json(
          { error: "Each tag must be a string of 50 characters or less" },
          { status: 400 }
        );
      }
    }

    // Check if new name is taken (excluding current circle)
    if (name && name !== circle.name) {
      const existing = await db.query.circles.findFirst({
        where: and(
          eq(circles.name, name.trim()),
          ne(circles.id, id)
        ),
      });

      if (existing) {
        return NextResponse.json(
          { error: "A circle with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof circles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (category !== undefined) updateData.category = category || null;
    if (focusArea !== undefined) updateData.focusArea = focusArea || null;
    if (targetDemographic !== undefined) updateData.targetDemographic = targetDemographic || null;
    if (activityType !== undefined) updateData.activityType = activityType || null;
    if (scheduleType !== undefined) updateData.scheduleType = scheduleType || null;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;
    if (joinType !== undefined) updateData.joinType = joinType;
    if (rules !== undefined) updateData.rules = rules || [];
    if (tags !== undefined) updateData.tags = tags || [];

    // Update the circle
    const [updatedCircle] = await db
      .update(circles)
      .set(updateData)
      .where(eq(circles.id, id))
      .returning();

    return NextResponse.json(updatedCircle);
  } catch (error) {
    console.error("Error updating circle:", error);
    return NextResponse.json(
      { error: "Failed to update circle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if circle exists
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, id),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if user is the owner
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, id),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can delete this circle" },
        { status: 403 }
      );
    }

    // Delete the circle (cascade will delete members, etc.)
    await db.delete(circles).where(eq(circles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting circle:", error);
    return NextResponse.json(
      { error: "Failed to delete circle" },
      { status: 500 }
    );
  }
}
