import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all circles the user is a member of
    const memberships = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, session.user.id),
    });

    if (memberships.length === 0) {
      return NextResponse.json({ circles: [] });
    }

    const circleIds = memberships.map((m) => m.circleId);

    // Get the circles
    const userCircles = await db.query.circles.findMany({
      where: inArray(circles.id, circleIds),
    });

    // Enhance with membership info
    const enhancedCircles = userCircles.map((circle) => {
      const membership = memberships.find((m) => m.circleId === circle.id);
      return {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        category: circle.category,
        visibility: circle.visibility,
        memberCount: circle.memberCount,
        imageUrl: circle.imageUrl,
        role: membership?.role,
      };
    });

    return NextResponse.json({ circles: enhancedCircles });
  } catch (error) {
    console.error("Error fetching circles:", error);
    return NextResponse.json(
      { error: "Failed to fetch circles" },
      { status: 500 }
    );
  }
}

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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
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
      imageUrl,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: "Name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Validate optional string fields
    if (description && typeof description !== "string") {
      return NextResponse.json(
        { error: "Description must be a string" },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Validate enum fields
    if (visibility && !VALID_VISIBILITY.includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility. Must be 'public' or 'private'" },
        { status: 400 }
      );
    }

    if (joinType && !VALID_JOIN_TYPES.includes(joinType)) {
      return NextResponse.json(
        { error: "Invalid joinType. Must be 'open', 'request', or 'invite_only'" },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (focusArea && !VALID_FOCUS_AREAS.includes(focusArea)) {
      return NextResponse.json(
        { error: "Invalid focusArea" },
        { status: 400 }
      );
    }

    if (targetDemographic && !VALID_TARGET_DEMOGRAPHICS.includes(targetDemographic)) {
      return NextResponse.json(
        { error: "Invalid targetDemographic" },
        { status: 400 }
      );
    }

    if (activityType && !VALID_ACTIVITY_TYPES.includes(activityType)) {
      return NextResponse.json(
        { error: "Invalid activityType" },
        { status: 400 }
      );
    }

    if (scheduleType && !VALID_SCHEDULE_TYPES.includes(scheduleType)) {
      return NextResponse.json(
        { error: "Invalid scheduleType" },
        { status: 400 }
      );
    }

    // Validate maxMembers
    if (maxMembers !== null && maxMembers !== undefined) {
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
    if (rules !== undefined) {
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
    if (tags !== undefined) {
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

    // Check if circle name already exists
    const existing = await db.query.circles.findFirst({
      where: eq(circles.name, trimmedName),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A circle with this name already exists" },
        { status: 400 }
      );
    }

    // Validate imageUrl if provided
    if (imageUrl !== undefined && imageUrl !== null) {
      if (typeof imageUrl !== "string") {
        return NextResponse.json(
          { error: "imageUrl must be a string" },
          { status: 400 }
        );
      }
      // Don't accept data URLs - those should be uploaded via the upload-image endpoint
      if (imageUrl.startsWith("data:")) {
        return NextResponse.json(
          { error: "imageUrl cannot be a data URL. Use the upload-image endpoint." },
          { status: 400 }
        );
      }
    }

    // Create the circle with all fields
    const [circle] = await db
      .insert(circles)
      .values({
        name: trimmedName,
        description: description?.trim() || null,
        visibility: visibility || "private",
        category: category || null,
        focusArea: focusArea || null,
        targetDemographic: targetDemographic || null,
        activityType: activityType || null,
        scheduleType: scheduleType || null,
        maxMembers: maxMembers || null,
        joinType: joinType || "request",
        rules: rules || [],
        tags: tags || [],
        imageUrl: imageUrl || null,
      })
      .returning();

    // Add the creator as owner
    await db.insert(circleMembers).values({
      circleId: circle.id,
      userId: session.user.id,
      name: session.user.name,
      role: "owner",
    });

    return NextResponse.json({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      visibility: circle.visibility,
      category: circle.category,
      focusArea: circle.focusArea,
      targetDemographic: circle.targetDemographic,
      activityType: circle.activityType,
      scheduleType: circle.scheduleType,
      maxMembers: circle.maxMembers,
      joinType: circle.joinType,
      rules: circle.rules,
      tags: circle.tags,
      imageUrl: circle.imageUrl,
    });
  } catch (error) {
    console.error("Error creating circle:", error);
    return NextResponse.json(
      { error: "Failed to create circle" },
      { status: 500 }
    );
  }
}
