import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challengeProofUploads,
  challengeParticipants,
  circlePosts,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/challenges/[id]/proof - Get proof uploads for a challenge
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: challengeId } = await params;
  const { searchParams } = new URL(request.url);
  const visibility = searchParams.get("visibility"); // optional filter

  try {
    // Get user's participation
    const participant = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Not participating in this challenge" },
        { status: 403 }
      );
    }

    // Get proofs for this participant
    let query = db
      .select()
      .from(challengeProofUploads)
      .where(eq(challengeProofUploads.participantId, participant.id))
      .orderBy(desc(challengeProofUploads.createdAt));

    const proofs = await query;

    return NextResponse.json({ proofs });
  } catch (error) {
    console.error("Error fetching proofs:", error);
    return NextResponse.json(
      { error: "Failed to fetch proofs" },
      { status: 500 }
    );
  }
}

// POST /api/challenges/[id]/proof - Upload proof
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: challengeId } = await params;

  try {
    // Get user's participation
    const participant = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Not participating in this challenge" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      mediaType,
      mediaUrl,
      thumbnailUrl,
      visibility = "private",
      caption,
      dayNumber,
      progressId,
      milestoneId,
    } = body;

    // Validate required fields
    if (!mediaType || !mediaUrl) {
      return NextResponse.json(
        { error: "mediaType and mediaUrl are required" },
        { status: 400 }
      );
    }

    if (!["image", "video"].includes(mediaType)) {
      return NextResponse.json(
        { error: "mediaType must be 'image' or 'video'" },
        { status: 400 }
      );
    }

    if (!["private", "circle", "public"].includes(visibility)) {
      return NextResponse.json(
        { error: "visibility must be 'private', 'circle', or 'public'" },
        { status: 400 }
      );
    }

    // Create the proof upload
    const [newProof] = await db
      .insert(challengeProofUploads)
      .values({
        participantId: participant.id,
        progressId,
        milestoneId,
        mediaType,
        mediaUrl,
        thumbnailUrl,
        visibility,
        caption,
        dayNumber,
      })
      .returning();

    // If visibility is "circle", create a circle post
    if (visibility === "circle") {
      // Find user's circles and post to the first one they're a member of
      const userCircle = await db.query.circleMembers.findFirst({
        where: eq(circleMembers.userId, session.user.id),
      });

      if (userCircle) {
        await db.insert(circlePosts).values({
          circleId: userCircle.circleId,
          authorId: session.user.id,
          postType: "image",
          content: caption || `Challenge progress - Day ${dayNumber || "?"}`,
          imageUrl: mediaUrl,
          challengeId,
          isAssignment: false,
        });
      }
    }

    return NextResponse.json(newProof);
  } catch (error) {
    console.error("Error uploading proof:", error);
    return NextResponse.json(
      { error: "Failed to upload proof" },
      { status: 500 }
    );
  }
}
