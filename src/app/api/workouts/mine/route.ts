/**
 * My Workouts API
 *
 * GET - Returns workouts the user has created (via circle membership) or saved.
 * Used by the post composer to attach workouts.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  workoutPlans,
  circleMembers,
  sharedWorkouts,
  savedWorkouts,
} from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all circle member IDs for this user
    const memberships = await db
      .select({ id: circleMembers.id })
      .from(circleMembers)
      .where(eq(circleMembers.userId, session.user.id));

    const memberIds = memberships.map((m) => m.id);

    // 2. Get workout plans created by this user (across all circles)
    const createdPlans =
      memberIds.length > 0
        ? await db
            .select({
              id: workoutPlans.id,
              name: workoutPlans.name,
              description: workoutPlans.description,
              category: workoutPlans.category,
              difficulty: workoutPlans.difficulty,
              estimatedDuration: workoutPlans.estimatedDuration,
              visibility: workoutPlans.visibility,
              createdAt: workoutPlans.createdAt,
            })
            .from(workoutPlans)
            .where(inArray(workoutPlans.createdByMemberId, memberIds))
            .orderBy(desc(workoutPlans.createdAt))
            .limit(50)
        : [];

    // 3. Get workouts this user has saved from the community
    const savedEntries = await db
      .select({
        id: sharedWorkouts.id,
        workoutPlanId: sharedWorkouts.workoutPlanId,
        name: sharedWorkouts.title,
        description: sharedWorkouts.description,
        category: sharedWorkouts.category,
        difficulty: sharedWorkouts.difficulty,
        estimatedDuration: sharedWorkouts.estimatedDuration,
        visibility: sharedWorkouts.visibility,
        createdAt: sharedWorkouts.createdAt,
      })
      .from(savedWorkouts)
      .innerJoin(
        sharedWorkouts,
        eq(savedWorkouts.sharedWorkoutId, sharedWorkouts.id)
      )
      .where(eq(savedWorkouts.userId, session.user.id))
      .orderBy(desc(sharedWorkouts.createdAt))
      .limit(50);

    // 4. Combine and deduplicate (created plans take priority)
    const seenIds = new Set<string>();
    const workouts: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      difficulty: string | null;
      estimatedDuration: number | null;
      visibility: string;
      source: "created" | "saved";
    }> = [];

    for (const plan of createdPlans) {
      if (!seenIds.has(plan.id)) {
        seenIds.add(plan.id);
        workouts.push({ ...plan, source: "created" });
      }
    }

    for (const saved of savedEntries) {
      // Use workoutPlanId as dedup key against created plans
      if (!seenIds.has(saved.workoutPlanId) && !seenIds.has(saved.id)) {
        seenIds.add(saved.workoutPlanId);
        workouts.push({
          id: saved.workoutPlanId,
          name: saved.name,
          description: saved.description,
          category: saved.category,
          difficulty: saved.difficulty,
          estimatedDuration: saved.estimatedDuration,
          visibility: saved.visibility,
          source: "saved",
        });
      }
    }

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error("Error fetching user workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}
