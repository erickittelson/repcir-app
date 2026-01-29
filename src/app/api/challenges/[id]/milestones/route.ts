import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challengeMilestones,
  challengeParticipants,
  challengeMilestoneProgress,
  workoutPlans,
  programWeeks,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/challenges/[id]/milestones - Get milestones for a challenge
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: challengeId } = await params;

  try {
    // Get milestones with linked entities
    const milestones = await db
      .select({
        id: challengeMilestones.id,
        challengeId: challengeMilestones.challengeId,
        order: challengeMilestones.order,
        name: challengeMilestones.name,
        description: challengeMilestones.description,
        workoutPlanId: challengeMilestones.workoutPlanId,
        programWeekId: challengeMilestones.programWeekId,
        goalTargetValue: challengeMilestones.goalTargetValue,
        goalTargetUnit: challengeMilestones.goalTargetUnit,
        durationDays: challengeMilestones.durationDays,
        completionType: challengeMilestones.completionType,
        requiredCompletions: challengeMilestones.requiredCompletions,
        unlockMessage: challengeMilestones.unlockMessage,
        workoutPlanName: workoutPlans.name,
        programWeekName: programWeeks.name,
      })
      .from(challengeMilestones)
      .leftJoin(workoutPlans, eq(workoutPlans.id, challengeMilestones.workoutPlanId))
      .leftJoin(programWeeks, eq(programWeeks.id, challengeMilestones.programWeekId))
      .where(eq(challengeMilestones.challengeId, challengeId))
      .orderBy(asc(challengeMilestones.order));

    // Check if user is a participant and get their progress
    const participant = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    let progressMap = new Map<string, {
      status: string;
      completionCount: number;
      startedAt: Date | null;
      completedAt: Date | null;
    }>();

    if (participant) {
      const progress = await db
        .select()
        .from(challengeMilestoneProgress)
        .where(eq(challengeMilestoneProgress.participantId, participant.id));

      progress.forEach((p) => {
        progressMap.set(p.milestoneId, {
          status: p.status,
          completionCount: p.completionCount,
          startedAt: p.startedAt,
          completedAt: p.completedAt,
        });
      });
    }

    const enrichedMilestones = milestones.map((milestone, index) => {
      const progress = progressMap.get(milestone.id);
      
      // Determine status based on progress or position
      let status = "locked";
      if (progress) {
        status = progress.status;
      } else if (index === 0 && participant) {
        status = "active"; // First milestone is active by default
      }

      return {
        ...milestone,
        status,
        completionCount: progress?.completionCount || 0,
        startedAt: progress?.startedAt,
        completedAt: progress?.completedAt,
        progressPercent: progress
          ? Math.min(100, (progress.completionCount / milestone.requiredCompletions) * 100)
          : 0,
      };
    });

    return NextResponse.json({
      milestones: enrichedMilestones,
      isParticipant: !!participant,
    });
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}
