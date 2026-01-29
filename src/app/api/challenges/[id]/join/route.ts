import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { challenges, challengeParticipants } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Join a challenge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if challenge exists
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, id),
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if already joined
    const existing = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (existing) {
      // If they previously quit, allow them to rejoin
      if (existing.status === "quit") {
        await db
          .update(challengeParticipants)
          .set({
            status: "active",
            currentDay: 1,
            currentStreak: 0,
            longestStreak: 0,
            startDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(challengeParticipants.id, existing.id));

        return NextResponse.json({
          success: true,
          message: "Rejoined challenge",
        });
      }

      return NextResponse.json({ error: "Already joined" }, { status: 400 });
    }

    // Join the challenge
    await db.insert(challengeParticipants).values({
      challengeId: id,
      userId: session.user.id,
      status: "active",
      currentDay: 1,
      currentStreak: 0,
      longestStreak: 0,
      startDate: new Date(),
    });

    // Increment participant count
    await db
      .update(challenges)
      .set({
        participantCount: sql`${challenges.participantCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(challenges.id, id));

    return NextResponse.json({
      success: true,
      message: "Successfully joined challenge",
    });
  } catch (error) {
    console.error("Error joining challenge:", error);
    return NextResponse.json(
      { error: "Failed to join challenge" },
      { status: 500 }
    );
  }
}

// Leave a challenge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Find participation
    const participation = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participation) {
      return NextResponse.json(
        { error: "Not a participant" },
        { status: 404 }
      );
    }

    // Mark as quit (soft delete to preserve history)
    await db
      .update(challengeParticipants)
      .set({
        status: "quit",
        updatedAt: new Date(),
      })
      .where(eq(challengeParticipants.id, participation.id));

    // Decrement participant count
    await db
      .update(challenges)
      .set({
        participantCount: sql`GREATEST(${challenges.participantCount} - 1, 0)`,
      })
      .where(eq(challenges.id, id));

    return NextResponse.json({
      success: true,
      message: "Left challenge",
    });
  } catch (error) {
    console.error("Error leaving challenge:", error);
    return NextResponse.json(
      { error: "Failed to leave challenge" },
      { status: 500 }
    );
  }
}
