import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { challenges } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userChallenges = await db
      .select({
        id: challenges.id,
        name: challenges.name,
        shortDescription: challenges.shortDescription,
        category: challenges.category,
        difficulty: challenges.difficulty,
        durationDays: challenges.durationDays,
        visibility: challenges.visibility,
        participantCount: challenges.participantCount,
        completionCount: challenges.completionCount,
        restartOnFail: challenges.restartOnFail,
        createdAt: challenges.createdAt,
      })
      .from(challenges)
      .where(eq(challenges.createdByUserId, session.user.id))
      .orderBy(desc(challenges.createdAt));

    return NextResponse.json(userChallenges);
  } catch (error) {
    console.error("Error fetching user challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}
