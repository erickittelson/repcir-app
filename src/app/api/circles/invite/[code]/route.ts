import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { circleInvitations, circleMembers, circles, subscriptions } from "@/lib/db/schema";
import { getSession } from "@/lib/neon-auth";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/circles/invite/[code]
 * Get invitation details (public endpoint for invite preview)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;

    const invitation = await db.query.circleInvitations.findFirst({
      where: eq(circleInvitations.code, code.toUpperCase()),
      with: {
        circle: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if invitation has reached max uses
    if (invitation.maxUses && invitation.uses >= invitation.maxUses) {
      return NextResponse.json(
        { error: "Invitation has reached maximum uses" },
        { status: 410 }
      );
    }

    // Get member count for the circle
    const memberCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(circleMembers)
      .where(eq(circleMembers.circleId, invitation.circleId));

    return NextResponse.json({
      invitation: {
        code: invitation.code,
        circleName: invitation.circle.name,
        circleDescription: invitation.circle.description,
        role: invitation.role,
        memberCount: memberCount[0]?.count || 0,
        isEmailRestricted: !!invitation.email,
      },
    });
  } catch (error) {
    console.error("Failed to get invitation:", error);
    return NextResponse.json(
      { error: "Failed to get invitation" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circles/invite/[code]
 * Accept an invitation and join the circle
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to accept an invitation" },
        { status: 401 }
      );
    }

    const { code } = await params;
    const body = await request.json().catch(() => ({}));
    const { memberName } = body;

    const invitation = await db.query.circleInvitations.findFirst({
      where: eq(circleInvitations.code, code.toUpperCase()),
      with: {
        circle: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if invitation has reached max uses
    if (invitation.maxUses && invitation.uses >= invitation.maxUses) {
      return NextResponse.json(
        { error: "Invitation has reached maximum uses" },
        { status: 410 }
      );
    }

    // Check email restriction
    if (invitation.email && invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Check if user is already a member of this circle
    const existingMember = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, invitation.circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this circle" },
        { status: 409 }
      );
    }

    // Create new member
    const [newMember] = await db
      .insert(circleMembers)
      .values({
        circleId: invitation.circleId,
        userId: session.user.id,
        name: memberName || session.user.name || "New Member",
        role: invitation.role,
      })
      .returning();

    // Increment invitation uses
    await db
      .update(circleInvitations)
      .set({ uses: invitation.uses + 1 })
      .where(eq(circleInvitations.id, invitation.id));

    // Grant 7-day Plus trial to invited users on the free tier
    let trialGranted = false;
    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
    });

    if (!existingSub || existingSub.plan === "free") {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 7);

      if (existingSub) {
        await db
          .update(subscriptions)
          .set({
            plan: "plus",
            status: "trialing",
            trialEnd,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.userId, session.user.id));
      } else {
        await db.insert(subscriptions).values({
          userId: session.user.id,
          plan: "plus",
          status: "trialing",
          trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
        });
      }
      trialGranted = true;
    }

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        name: newMember.name,
        role: newMember.role,
      },
      circle: {
        id: invitation.circle.id,
        name: invitation.circle.name,
      },
      trialGranted,
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
