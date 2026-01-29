import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  userProfiles,
  userMetrics,
  userLimitations,
  userSports,
  circleMembers,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// GET /api/user/profile/preview - Get profile data for preview
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all profile data in parallel
    const [
      profileResult,
      metricsResult,
      limitationsResult,
      sportsResult,
      membershipResult,
    ] = await Promise.all([
      // Profile
      db.select().from(userProfiles).where(eq(userProfiles.userId, userId)),
      
      // Metrics
      db
        .select()
        .from(userMetrics)
        .where(eq(userMetrics.userId, userId))
        .orderBy(desc(userMetrics.date))
        .limit(1),
      
      // Limitations
      db
        .select({
          type: userLimitations.type,
          bodyPart: userLimitations.bodyPart,
          condition: userLimitations.condition,
          description: userLimitations.description,
        })
        .from(userLimitations)
        .where(eq(userLimitations.userId, userId))
        .limit(5),
      
      // Sports
      db
        .select({ sport: userSports.sport, level: userSports.level })
        .from(userSports)
        .where(eq(userSports.userId, userId)),
      
      // Circle memberships (for goals and workout count)
      db
        .select({ id: circleMembers.id })
        .from(circleMembers)
        .where(eq(circleMembers.userId, userId)),
    ]);

    const profile = profileResult[0];
    const metrics = metricsResult[0];

    // Calculate age from birthday if available
    let age: number | undefined;
    if (profile?.birthYear) {
      age = new Date().getFullYear() - profile.birthYear;
    }

    return NextResponse.json({
      displayName: profile?.displayName,
      profilePicture: profile?.profilePicture,
      city: profile?.city,
      age,
      fitnessLevel: metrics?.fitnessLevel,
      weight: metrics?.weight,
      bodyFat: metrics?.bodyFatPercentage,
      limitations: limitationsResult,
      sports: sportsResult,
      membershipCount: membershipResult.length,
    });
  } catch (error) {
    console.error("Failed to fetch profile preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile preview" },
      { status: 500 }
    );
  }
}
