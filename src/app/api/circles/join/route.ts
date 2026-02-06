/**
 * Join Circle API
 *
 * Allows users to join a circle using an invite code.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleInvitations,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and, or, isNull, gt, sql } from "drizzle-orm";

const joinSchema = z.object({
  code: z.string().min(1).max(8),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = joinSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid invite code format" },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // Find the invitation
    const invitation = await db.query.circleInvitations.findFirst({
      where: and(
        eq(circleInvitations.code, code.toUpperCase()),
        // Not expired (null = never expires)
        or(
          isNull(circleInvitations.expiresAt),
          gt(circleInvitations.expiresAt, new Date())
        )
      ),
      with: {
        circle: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    // Check if max uses reached
    if (invitation.maxUses !== null && invitation.uses >= invitation.maxUses) {
      return NextResponse.json(
        { error: "This invite code has reached its maximum uses" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Atomically increment uses with a conditional check to prevent race conditions
    // This UPDATE only succeeds if uses < maxUses (or maxUses is null)
    const updateResult = await db
      .update(circleInvitations)
      .set({
        uses: sql`${circleInvitations.uses} + 1`,
      })
      .where(
        and(
          eq(circleInvitations.id, invitation.id),
          // Only update if we haven't exceeded maxUses
          or(
            isNull(circleInvitations.maxUses),
            sql`${circleInvitations.uses} < ${circleInvitations.maxUses}`
          )
        )
      )
      .returning({ id: circleInvitations.id });

    // If no rows were updated, the invitation is at max capacity (race condition prevented)
    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: "This invite code has reached its maximum uses" },
        { status: 400 }
      );
    }

    // Now create the member (invitation slot is reserved)
    let newMember;
    try {
      const [member] = await db
        .insert(circleMembers)
        .values({
          circleId: invitation.circleId,
          userId: session.user.id,
          name: session.user.name || "New Member",
          role: invitation.role || "member",
        })
        .returning();
      newMember = member;
    } catch (insertError) {
      // If member creation fails, decrement the uses count to release the slot
      await db
        .update(circleInvitations)
        .set({
          uses: sql`GREATEST(0, ${circleInvitations.uses} - 1)`,
        })
        .where(eq(circleInvitations.id, invitation.id));
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      circleId: invitation.circleId,
      circleName: invitation.circle.name,
      memberId: newMember.id,
      message: `Welcome to ${invitation.circle.name}!`,
    });
  } catch (error) {
    console.error("Error joining circle:", error);
    return NextResponse.json(
      { error: "Failed to join circle" },
      { status: 500 }
    );
  }
}
