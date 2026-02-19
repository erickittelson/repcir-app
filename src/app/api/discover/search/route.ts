import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  userProfiles,
  sharedWorkouts,
  challenges,
  circles,
} from "@/lib/db/schema";
import { sql, ilike, or, eq, and, notInArray } from "drizzle-orm";
import { getBlockedUserIds } from "@/lib/social";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const type = url.searchParams.get("type");

    if (!query || query.length < 2) {
      return NextResponse.json({
        users: [],
        workouts: [],
        challenges: [],
        circles: [],
      });
    }

    const searchPattern = `%${query}%`;
    const results: {
      users: Array<{ type: string; id: string; name: string; subtitle?: string; imageUrl?: string; badges?: string[] }>;
      workouts: Array<{ type: string; id: string; name: string; subtitle?: string; badges?: string[] }>;
      challenges: Array<{ type: string; id: string; name: string; subtitle?: string; badges?: string[] }>;
      circles: Array<{ type: string; id: string; name: string; subtitle?: string; imageUrl?: string }>;
    } = {
      users: [],
      workouts: [],
      challenges: [],
      circles: [],
    };

    // Fetch blocked users for filtering
    const blockedIds = await getBlockedUserIds(session.user.id);

    // Search users (if not filtered or type is users)
    if (!type || type === "users" || type === "all") {
      const users = await db
        .select({
          id: userProfiles.userId,
          displayName: userProfiles.displayName,
          profilePicture: userProfiles.profilePicture,
          city: userProfiles.city,
        })
        .from(userProfiles)
        .where(
          and(
            eq(userProfiles.visibility, "public"),
            // Exclude blocked users
            blockedIds.length > 0 ? notInArray(userProfiles.userId, blockedIds) : undefined,
            or(
              ilike(userProfiles.displayName, searchPattern),
              ilike(userProfiles.city, searchPattern)
            )
          )
        )
        .limit(10);

      results.users = users.map((u) => ({
        type: "user",
        id: u.id,
        name: u.displayName || "Unknown User",
        subtitle: u.city || undefined,
        imageUrl: u.profilePicture || undefined,
      }));
    }

    // Search workouts (if not filtered or type is workouts)
    if (!type || type === "workouts" || type === "all") {
      const workoutResults = await db
        .select({
          id: sharedWorkouts.id,
          title: sharedWorkouts.title,
          description: sharedWorkouts.description,
          category: sharedWorkouts.category,
          difficulty: sharedWorkouts.difficulty,
          estimatedDuration: sharedWorkouts.estimatedDuration,
        })
        .from(sharedWorkouts)
        .where(
          and(
            eq(sharedWorkouts.visibility, "public"),
            or(
              ilike(sharedWorkouts.title, searchPattern),
              ilike(sharedWorkouts.description, searchPattern),
              ilike(sharedWorkouts.category, searchPattern)
            )
          )
        )
        .limit(10);

      results.workouts = workoutResults.map((w) => ({
        type: "workout",
        id: w.id,
        name: w.title,
        subtitle: w.description || undefined,
        badges: [
          w.category,
          w.difficulty,
          w.estimatedDuration ? `${w.estimatedDuration} min` : null,
        ].filter(Boolean) as string[],
      }));
    }

    // Search challenges (if not filtered or type is challenges)
    if (!type || type === "challenges" || type === "all") {
      const challengeResults = await db
        .select({
          id: challenges.id,
          name: challenges.name,
          shortDescription: challenges.shortDescription,
          category: challenges.category,
          difficulty: challenges.difficulty,
          durationDays: challenges.durationDays,
        })
        .from(challenges)
        .where(
          and(
            eq(challenges.visibility, "public"),
            or(
              ilike(challenges.name, searchPattern),
              ilike(challenges.shortDescription, searchPattern),
              ilike(challenges.category, searchPattern)
            )
          )
        )
        .limit(10);

      results.challenges = challengeResults.map((c) => ({
        type: "challenge",
        id: c.id,
        name: c.name,
        subtitle: c.shortDescription || undefined,
        badges: [
          c.category,
          c.difficulty,
          `${c.durationDays} days`,
        ].filter(Boolean) as string[],
      }));
    }

    // Search circles (if not filtered or type is circles)
    if (!type || type === "circles" || type === "all") {
      const circleResults = await db
        .select({
          id: circles.id,
          name: circles.name,
          description: circles.description,
          category: circles.category,
          memberCount: circles.memberCount,
          imageUrl: circles.imageUrl,
        })
        .from(circles)
        .where(
          and(
            eq(circles.visibility, "public"),
            or(
              ilike(circles.name, searchPattern),
              ilike(circles.description, searchPattern),
              ilike(circles.category, searchPattern)
            )
          )
        )
        .limit(10);

      results.circles = circleResults.map((c) => ({
        type: "circle",
        id: c.id,
        name: c.name,
        subtitle: c.description || `${c.memberCount} members`,
        imageUrl: c.imageUrl || undefined,
      }));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
