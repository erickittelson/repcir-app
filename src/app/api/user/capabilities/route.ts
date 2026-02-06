import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { userCapabilities } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// Validation schema for capabilities (values match database text fields)
const capabilitiesSchema = z.object({
  // Mobility Tests (text values representing ability levels)
  canTouchToes: z.string().max(50).nullable().optional(),
  canDeepSquat: z.string().max(50).nullable().optional(),
  canChildsPose: z.string().max(50).nullable().optional(),
  canOverheadReach: z.string().max(50).nullable().optional(),
  canLungeDeep: z.string().max(50).nullable().optional(),
  // Stability Tests
  canSingleLegStand: z.string().max(50).nullable().optional(),
  canPlankHold: z.string().max(50).nullable().optional(),
  // Power/Plyometric
  canBoxJump: z.string().max(50).nullable().optional(),
  canJumpRope: z.string().max(50).nullable().optional(),
  canBurpees: z.string().max(50).nullable().optional(),
  // Strength Baseline
  canPushup: z.string().max(50).nullable().optional(),
  canPullup: z.string().max(50).nullable().optional(),
  canDeadliftHinge: z.string().max(50).nullable().optional(),
  // Special Considerations
  balanceIssues: z.boolean().optional(),
  dizzinessWithMovement: z.boolean().optional(),
  cardioLimitationsNotes: z.string().max(500).nullable().optional(),
  // Overall Assessment
  overallMobilityScore: z.number().int().min(1).max(10).nullable().optional(),
  overallStrengthScore: z.number().int().min(1).max(10).nullable().optional(),
  readinessLevel: z.string().max(50).nullable().optional(),
});

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

    const rawBody = await request.json();
    const validation = capabilitiesSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    const body = validation.data;

    const [capabilities] = await db
      .insert(userCapabilities)
      .values({
        userId: session.user.id,
        ...body,
        // Ensure boolean defaults
        balanceIssues: body.balanceIssues ?? false,
        dizzinessWithMovement: body.dizzinessWithMovement ?? false,
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
