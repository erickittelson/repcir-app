import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challengeProofUploads,
  challengeParticipants,
  circlePosts,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; proofId: string }>;
}

// PATCH /api/challenges/[id]/proof/[proofId] - Update proof visibility
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: challengeId, proofId } = await params;

  try {
    // Get the proof
    const proof = await db.query.challengeProofUploads.findFirst({
      where: eq(challengeProofUploads.id, proofId),
    });

    if (!proof) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    // Verify ownership via participant
    const participant = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.id, proof.participantId),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Not authorized to update this proof" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { visibility, caption } = body;

    const updateData: Partial<typeof challengeProofUploads.$inferInsert> = {};

    if (visibility) {
      if (!["private", "circle", "public"].includes(visibility)) {
        return NextResponse.json(
          { error: "visibility must be 'private', 'circle', or 'public'" },
          { status: 400 }
        );
      }
      updateData.visibility = visibility;

      // If changing to "circle" and wasn't before, create a circle post
      if (visibility === "circle" && proof.visibility !== "circle") {
        const userCircle = await db.query.circleMembers.findFirst({
          where: eq(circleMembers.userId, session.user.id),
        });

        if (userCircle) {
          await db.insert(circlePosts).values({
            circleId: userCircle.circleId,
            authorId: session.user.id,
            postType: "image",
            content: proof.caption || `Challenge progress - Day ${proof.dayNumber || "?"}`,
            imageUrl: proof.mediaUrl,
            challengeId,
            isAssignment: false,
          });
        }
      }
    }

    if (caption !== undefined) {
      updateData.caption = caption;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    const [updatedProof] = await db
      .update(challengeProofUploads)
      .set(updateData)
      .where(eq(challengeProofUploads.id, proofId))
      .returning();

    return NextResponse.json(updatedProof);
  } catch (error) {
    console.error("Error updating proof:", error);
    return NextResponse.json(
      { error: "Failed to update proof" },
      { status: 500 }
    );
  }
}

// DELETE /api/challenges/[id]/proof/[proofId] - Delete proof
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { proofId } = await params;

  try {
    // Get the proof
    const proof = await db.query.challengeProofUploads.findFirst({
      where: eq(challengeProofUploads.id, proofId),
    });

    if (!proof) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    // Verify ownership via participant
    const participant = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.id, proof.participantId),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Not authorized to delete this proof" },
        { status: 403 }
      );
    }

    // Delete the proof
    await db.delete(challengeProofUploads).where(eq(challengeProofUploads.id, proofId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting proof:", error);
    return NextResponse.json(
      { error: "Failed to delete proof" },
      { status: 500 }
    );
  }
}
