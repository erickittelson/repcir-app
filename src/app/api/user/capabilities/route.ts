import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userCapabilities } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// GET /api/user/capabilities - Get user's latest capability assessment
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [capabilities] = await db
      .select()
      .from(userCapabilities)
      .where(eq(userCapabilities.userId, session.user.id))
      .orderBy(desc(userCapabilities.assessedAt))
      .limit(1);

    if (!capabilities) {
      return NextResponse.json(null);
    }

    return NextResponse.json(capabilities);
  } catch (error) {
    console.error("Failed to fetch capabilities:", error);
    return NextResponse.json(
      { error: "Failed to fetch capabilities" },
      { status: 500 }
    );
  }
}

// POST /api/user/capabilities - Save new capability assessment
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const [capabilities] = await db
      .insert(userCapabilities)
      .values({
        userId: session.user.id,
        // Mobility Tests
        canTouchToes: body.canTouchToes,
        canDeepSquat: body.canDeepSquat,
        canChildsPose: body.canChildsPose,
        canOverheadReach: body.canOverheadReach,
        canLungeDeep: body.canLungeDeep,
        // Stability Tests
        canSingleLegStand: body.canSingleLegStand,
        canPlankHold: body.canPlankHold,
        // Power/Plyometric
        canBoxJump: body.canBoxJump,
        canJumpRope: body.canJumpRope,
        canBurpees: body.canBurpees,
        // Strength Baseline
        canPushup: body.canPushup,
        canPullup: body.canPullup,
        canDeadliftHinge: body.canDeadliftHinge,
        // Special Considerations
        balanceIssues: body.balanceIssues || false,
        dizzinessWithMovement: body.dizzinessWithMovement || false,
        cardioLimitationsNotes: body.cardioLimitationsNotes,
        // Overall Assessment
        overallMobilityScore: body.overallMobilityScore,
        overallStrengthScore: body.overallStrengthScore,
        readinessLevel: body.readinessLevel,
      })
      .returning();

    return NextResponse.json(capabilities);
  } catch (error) {
    console.error("Failed to save capabilities:", error);
    return NextResponse.json(
      { error: "Failed to save capabilities" },
      { status: 500 }
    );
  }
}

// PUT /api/user/capabilities - Update latest capability assessment
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Get the latest assessment
    const [existing] = await db
      .select()
      .from(userCapabilities)
      .where(eq(userCapabilities.userId, session.user.id))
      .orderBy(desc(userCapabilities.assessedAt))
      .limit(1);

    if (!existing) {
      // Create new if none exists
      const [capabilities] = await db
        .insert(userCapabilities)
        .values({
          userId: session.user.id,
          ...body,
        })
        .returning();
      return NextResponse.json(capabilities);
    }

    // Update existing
    const [capabilities] = await db
      .update(userCapabilities)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(userCapabilities.id, existing.id))
      .returning();

    return NextResponse.json(capabilities);
  } catch (error) {
    console.error("Failed to update capabilities:", error);
    return NextResponse.json(
      { error: "Failed to update capabilities" },
      { status: 500 }
    );
  }
}
