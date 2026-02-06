import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  challenges,
  challengeParticipants,
  challengeProgress,
  personalRecords,
  circleMembers,
  exercises,
} from "@/lib/db/schema";
import { eq, and, sql, ilike, inArray, desc } from "drizzle-orm";
import { evaluateAndAwardBadges } from "@/lib/badges";

interface PRTask {
  exercise?: string;
  targetValue?: number;
  targetUnit?: string;
  name?: string;
}

/**
 * Batch check all PR tasks at once to avoid N+1 queries
 * Instead of querying per task, we:
 * 1. Collect all unique exercise names
 * 2. Batch query exercises
 * 3. Batch query all PRs for those exercises
 * 4. Process results in memory
 */
async function checkPRTasksBatch(
  tasks: PRTask[],
  memberId: string
): Promise<Record<string, { achieved: boolean; currentValue?: number }>> {
  const results: Record<string, { achieved: boolean; currentValue?: number }> = {};

  // Filter to only PR tasks with exercise names
  const prTasks = tasks.filter(
    (t): t is PRTask & { exercise: string } =>
      t.exercise !== undefined && t.targetValue !== undefined
  );

  if (prTasks.length === 0) {
    return results;
  }

  // Get unique exercise names
  const exerciseNames = [...new Set(prTasks.map((t) => t.exercise))];

  // Batch query all exercises using ilike patterns
  // For better performance, we use a single query with OR conditions
  const exerciseResults = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .where(
      sql`${exercises.name} ILIKE ANY(ARRAY[${sql.join(
        exerciseNames.map((name) => sql`${'%' + name + '%'}`),
        sql`, `
      )}])`
    );

  // Create a map of exercise name patterns to exercise IDs
  const exerciseMap = new Map<string, string>();
  for (const ex of exerciseResults) {
    for (const name of exerciseNames) {
      if (ex.name.toLowerCase().includes(name.toLowerCase())) {
        exerciseMap.set(name, ex.id);
      }
    }
  }

  // Get the exercise IDs that were found
  const foundExerciseIds = [...new Set(exerciseMap.values())];

  if (foundExerciseIds.length === 0) {
    // No exercises found, mark all as not achieved
    for (const task of prTasks) {
      results[task.exercise] = { achieved: false };
    }
    return results;
  }

  // Batch query all PRs for these exercises and this member
  const prs = await db
    .select({
      exerciseId: personalRecords.exerciseId,
      value: personalRecords.value,
    })
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.memberId, memberId),
        inArray(personalRecords.exerciseId, foundExerciseIds)
      )
    )
    .orderBy(desc(personalRecords.value));

  // Create a map of exerciseId to best PR value
  const prMap = new Map<string, number>();
  for (const pr of prs) {
    // Only keep the highest value (first one due to ORDER BY DESC)
    if (!prMap.has(pr.exerciseId)) {
      prMap.set(pr.exerciseId, pr.value);
    }
  }

  // Now process each task
  for (const task of prTasks) {
    const exerciseId = exerciseMap.get(task.exercise);
    if (!exerciseId) {
      results[task.exercise] = { achieved: false };
      continue;
    }

    const currentValue = prMap.get(exerciseId) || 0;
    const achieved = currentValue >= (task.targetValue || 0);
    results[task.exercise] = { achieved, currentValue };
  }

  return results;
}

// Daily check-in for a challenge
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
    const body = await request.json();
    let { completedTasks, notes } = body;

    // Get challenge
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, id),
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Get participation
    const participation = await db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, session.user.id)
      ),
    });

    if (!participation) {
      return NextResponse.json(
        { error: "Not enrolled in this challenge" },
        { status: 400 }
      );
    }

    if (participation.status !== "active") {
      return NextResponse.json(
        { error: "Challenge is not active" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const todayProgress = await db.query.challengeProgress.findFirst({
      where: and(
        eq(challengeProgress.participantId, participation.id),
        eq(challengeProgress.date, today)
      ),
    });

    if (todayProgress) {
      return NextResponse.json(
        { error: "Already checked in today" },
        { status: 400 }
      );
    }

    // Get member ID for PR checks
    const member = await db.query.circleMembers.findFirst({
      where: eq(circleMembers.userId, session.user.id),
    });

    // Check if all required tasks are completed, including PR auto-verification
    const requiredTasks = challenge.dailyTasks?.filter(
      (t: any) => t.isRequired
    ) || [];
    
    // Build PR status for all PR-linked tasks using batch query
    const allTasks = challenge.dailyTasks || [];
    const prTasks = allTasks.filter((t: any) => t.type === "pr_check" && t.exercise);

    const prStatus = member
      ? await checkPRTasksBatch(prTasks, member.id)
      : {};

    // Auto-complete PR tasks that are achieved
    for (const task of prTasks) {
      const exerciseName = task.exercise as string;
      if (prStatus[exerciseName]?.achieved && !completedTasks?.includes(task.name)) {
        completedTasks = completedTasks || [];
        completedTasks.push(task.name);
      }
    }
    
    const completedRequired = requiredTasks.every((task: any) => {
      // For PR tasks, check against PR status
      if (task.type === "pr_check" && task.exercise) {
        return prStatus[task.exercise]?.achieved;
      }
      // For regular tasks, check against completedTasks array
      return completedTasks?.includes(task.name);
    });

    if (!completedRequired) {
      // For challenges that restart on fail, this would reset progress
      if (challenge.restartOnFail) {
        await db
          .update(challengeParticipants)
          .set({
            currentDay: 1,
            currentStreak: 0,
            updatedAt: new Date(),
          })
          .where(eq(challengeParticipants.id, participation.id));

        return NextResponse.json({
          success: false,
          message: "Missing required tasks. Challenge progress reset.",
          reset: true,
        });
      }
    }

    // Record progress
    const newDayNumber = (participation.currentDay || 0) + 1;
    await db.insert(challengeProgress).values({
      participantId: participation.id,
      date: today,
      day: newDayNumber,
      completed: completedRequired,
      tasksCompleted: (completedTasks || []).map((task: string) => ({
        taskName: task,
        completed: true,
      })),
      notes,
    });

    // Calculate new streak (using newDayNumber from above)
    const newStreak = completedRequired
      ? (participation.currentStreak || 0) + 1
      : 0;
    const newLongestStreak = Math.max(
      newStreak,
      participation.longestStreak || 0
    );
    const newDaysCompleted = (participation.daysCompleted || 0) + 1;

    // Check if challenge is completed
    const isCompleted = newDayNumber >= challenge.durationDays;

    // Update participation
    await db
      .update(challengeParticipants)
      .set({
        currentDay: newDayNumber,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        daysCompleted: newDaysCompleted,
        status: isCompleted ? "completed" : "active",
        completedDate: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(challengeParticipants.id, participation.id));

    // If challenge is completed, update challenge stats and evaluate badges
    if (isCompleted) {
      await db
        .update(challenges)
        .set({
          completionCount: sql`${challenges.completionCount} + 1`,
        })
        .where(eq(challenges.id, id));

      // Evaluate badges for challenge completion
      evaluateAndAwardBadges({
        userId: session.user.id,
        trigger: "workout", // Use workout trigger which checks challenge completions
      }).catch((err) => {
        console.error("Badge evaluation error:", err);
      });

      return NextResponse.json({
        success: true,
        completed: true,
        message: `Congratulations! You completed ${challenge.name}!`,
        day: newDayNumber,
        streak: newStreak,
      });
    }

    return NextResponse.json({
      success: true,
      day: newDayNumber,
      streak: newStreak,
      daysRemaining: challenge.durationDays - newDayNumber,
      prStatus, // Include PR status for UI to display
    });
  } catch (error) {
    console.error("Error checking in:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}

// GET - Fetch current PR status for challenge tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get challenge
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, id),
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Get member ID for PR checks
    const member = await db.query.circleMembers.findFirst({
      where: eq(circleMembers.userId, session.user.id),
    });

    if (!member) {
      return NextResponse.json({ prStatus: {} });
    }

    // Build PR status for all PR-linked tasks using batch query
    const allTasks = challenge.dailyTasks || [];
    const prTasks = (allTasks as any[]).filter((t) => t.type === "pr_check" && t.exercise);
    const prStatus = await checkPRTasksBatch(prTasks, member.id);

    return NextResponse.json({ prStatus });
  } catch (error) {
    console.error("Error fetching PR status:", error);
    return NextResponse.json(
      { error: "Failed to fetch PR status" },
      { status: 500 }
    );
  }
}
