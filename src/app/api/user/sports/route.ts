import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userSports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { evaluateAndAwardBadges } from "@/lib/badges";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sports = await db
      .select()
      .from(userSports)
      .where(eq(userSports.userId, session.user.id));

    return NextResponse.json(sports);
  } catch (error) {
    console.error("Failed to fetch sports:", error);
    return NextResponse.json(
      { error: "Failed to fetch sports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sport, level, yearsPlaying, position, currentlyActive = true } = body;

    if (!sport) {
      return NextResponse.json({ error: "Sport is required" }, { status: 400 });
    }

    const [newSport] = await db
      .insert(userSports)
      .values({
        userId: session.user.id,
        sport,
        level,
        yearsPlaying,
        position,
        currentlyActive,
      })
      .returning();

    // Evaluate badges for adding a sport
    let badgeResults = { awarded: [] as any[], goalMatches: [] as any[] };
    try {
      badgeResults = await evaluateAndAwardBadges({
        userId: session.user.id,
        trigger: "sport",
        sport,
      });
    } catch (badgeError) {
      console.error("Error evaluating badges:", badgeError);
    }

    return NextResponse.json({
      ...newSport,
      badgesAwarded: badgeResults.awarded,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to add sport:", error);
    return NextResponse.json(
      { error: "Failed to add sport" },
      { status: 500 }
    );
  }
}
