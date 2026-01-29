import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challengeMilestones,
  challengeParticipants,
  challengeMilestoneProgress,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

// POST /api/challenges/[id]/milestones/[milestoneId]/progress - Update milestone progress
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: challengeId, milestoneId } = await params;

  try {
    // Verify milestone belongs to this challenge
    const milestone = await db.query.challengeMilestones.findFirst({
      where: and(
        eq(challengeMilestones.id, milestoneId),
        eq(challengeMilestones.challengeId, challengeId)
      ),
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

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
    const { action, notes } = body; // action: "complete", "skip", "progress"

    // Get or create progress record
    let progress = await db.query.challengeMilestoneProgress.findFirst({
      where: and(
        eq(challengeMilestoneProgress.participantId, participant.id),
        eq(challengeMilestoneProgress.milestoneId, milestoneId)
      ),
    });

    if (!progress) {
      // Create new progress record
      const [newProgress] = await db
        .insert(challengeMilestoneProgress)
        .values({
          participantId: participant.id,
          milestoneId,
          status: "active",
          startedAt: new Date(),
          completionCount: 0,
        })
        .returning();
      progress = newProgress;
    }

    let updateData: Partial<typeof challengeMilestoneProgress.$inferInsert> = {
      updatedAt: new Date(),
    };

    switch (action) {
      case "complete":
        updateData.status = "completed";
        updateData.completedAt = new Date();
        updateData.completionCount = milestone.requiredCompletions;
        break;

      case "skip":
        updateData.status = "skipped";
        updateData.completedAt = new Date();
        if (notes) updateData.notes = notes;
        break;

      case "progress":
        // Increment completion count
        const newCount = (progress.completionCount || 0) + 1;
        updateData.completionCount = newCount;
        
        // If reached required completions, mark as completed
        if (newCount >= milestone.requiredCompletions) {
          updateData.status = "completed";
          updateData.completedAt = new Date();
        } else if (progress.status === "locked") {
          updateData.status = "active";
          updateData.startedAt = new Date();
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update progress
    const [updatedProgress] = await db
      .update(challengeMilestoneProgress)
      .set(updateData)
      .where(eq(challengeMilestoneProgress.id, progress.id))
      .returning();

    // If completed or skipped, unlock next milestone
    if (updateData.status === "completed" || updateData.status === "skipped") {
      const nextMilestone = await db.query.challengeMilestones.findFirst({
        where: and(
          eq(challengeMilestones.challengeId, challengeId),
          sql`${challengeMilestones.order} > ${milestone.order}`
        ),
      });

      if (nextMilestone) {
        // Check if next milestone progress exists
        const nextProgress = await db.query.challengeMilestoneProgress.findFirst({
          where: and(
            eq(challengeMilestoneProgress.participantId, participant.id),
            eq(challengeMilestoneProgress.milestoneId, nextMilestone.id)
          ),
        });

        if (!nextProgress) {
          // Create active progress for next milestone
          await db.insert(challengeMilestoneProgress).values({
            participantId: participant.id,
            milestoneId: nextMilestone.id,
            status: "active",
            startedAt: new Date(),
            completionCount: 0,
          });
        } else if (nextProgress.status === "locked") {
          // Unlock it
          await db
            .update(challengeMilestoneProgress)
            .set({ status: "active", startedAt: new Date(), updatedAt: new Date() })
            .where(eq(challengeMilestoneProgress.id, nextProgress.id));
        }
      }
    }

    return NextResponse.json({
      progress: updatedProgress,
      unlockMessage:
        updateData.status === "completed" ? milestone.unlockMessage : null,
    });
  } catch (error) {
    console.error("Error updating milestone progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
