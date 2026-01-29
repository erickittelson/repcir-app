import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedWorkouts, userProfiles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch popular shared workouts
    const workouts = await db.query.sharedWorkouts.findMany({
      where: eq(sharedWorkouts.visibility, "public"),
      orderBy: [desc(sharedWorkouts.saveCount), desc(sharedWorkouts.useCount)],
      limit: 8,
    });

    // Fetch user info for each workout
    const workoutsWithUsers = await Promise.all(
      workouts.map(async (workout) => {
        const user = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, workout.userId),
        });
        return {
          id: workout.id,
          title: workout.title,
          description: workout.description,
          category: workout.category,
          difficulty: workout.difficulty,
          estimatedDuration: workout.estimatedDuration,
          saveCount: workout.saveCount,
          useCount: workout.useCount,
          avgRating: workout.avgRating,
          userName: user?.displayName,
          userImage: user?.profilePicture,
        };
      })
    );

    return NextResponse.json({
      workouts: workoutsWithUsers,
    });
  } catch (error) {
    console.error("Error fetching popular workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}
