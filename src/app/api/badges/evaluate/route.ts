import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { evaluateAndAwardBadges } from "@/lib/badges";

/**
 * POST /api/badges/evaluate - Evaluate and award badges for current user
 * 
 * Body:
 * - trigger: "pr" | "skill" | "sport" | "workout" | "social"
 * - exerciseName?: string (for PR triggers)
 * - exerciseValue?: number (for PR triggers)
 * - exerciseUnit?: string (for PR triggers)
 * - skillName?: string (for skill triggers)
 * - sport?: string (for sport triggers)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { trigger, exerciseName, exerciseValue, exerciseUnit, skillName, sport } = body;

    if (!trigger) {
      return NextResponse.json(
        { error: "Trigger type is required" },
        { status: 400 }
      );
    }

    // Get member ID for the current user in their active circle
    let memberId: string | undefined;
    
    if (session.activeCircle?.id) {
      const member = await db.query.circleMembers.findFirst({
        where: and(
          eq(circleMembers.circleId, session.activeCircle.id),
          eq(circleMembers.userId, session.user.id)
        ),
      });
      memberId = member?.id;
    }

    const result = await evaluateAndAwardBadges({
      userId: session.user.id,
      memberId,
      trigger,
      exerciseName,
      exerciseValue,
      exerciseUnit,
      skillName,
      sport,
    });

    return NextResponse.json({
      awarded: result.awarded,
      goalMatches: result.goalMatches,
      message: result.awarded.length > 0 
        ? `Congratulations! You earned ${result.awarded.length} badge(s)!`
        : "Badge evaluation complete",
    });
  } catch (error) {
    console.error("Failed to evaluate badges:", error);
    return NextResponse.json(
      { error: "Failed to evaluate badges" },
      { status: 500 }
    );
  }
}
