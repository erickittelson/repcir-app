/**
 * Badge Evaluation System
 * 
 * Automatically awards badges based on user achievements:
 * - Personal records (PRs)
 * - Skills achieved
 * - Sports added
 * - Workout streaks
 * - Workout count
 * - Social metrics
 */

import { db } from "@/lib/db";
import {
  badgeDefinitions,
  userBadges,
  personalRecords,
  userSkills,
  userSports,
  workoutSessions,
  exercises,
  goals,
} from "@/lib/db/schema";
import { eq, and, inArray, desc, gte, sql } from "drizzle-orm";

// Types for badge criteria
interface BadgeCriteria {
  type?: string;
  exercises?: string[];
  totalValue?: number;
  singleValue?: number;
  skillName?: string;
  skillStatus?: string;
  sport?: string;
  streakDays?: number;
  workoutCount?: number;
  followerCount?: number;
  circleCount?: number;
  trackTime?: number;
  trackDistance?: number;
}

interface BadgeEvaluationResult {
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeTier: string;
  earned: boolean;
  metadata?: Record<string, unknown>;
}

interface GoalMatch {
  goalId: string;
  goalTitle: string;
  goalCategory: string;
  targetValue: number;
  targetUnit: string;
  currentPrValue: number;
  exceededBy: number;
  status: "met" | "exceeded";
}

interface EvaluationContext {
  userId: string;
  memberId?: string;
  trigger: "pr" | "skill" | "sport" | "workout" | "social";
  exerciseName?: string;
  exerciseValue?: number;
  exerciseUnit?: string;
  skillName?: string;
  sport?: string;
}

/**
 * Check all automatic badges for a user and award any that are earned
 */
export async function evaluateAndAwardBadges(
  context: EvaluationContext
): Promise<{ awarded: BadgeEvaluationResult[]; goalMatches: GoalMatch[] }> {
  const awarded: BadgeEvaluationResult[] = [];
  const goalMatches: GoalMatch[] = [];

  try {
    // Get all automatic badge definitions
    const allBadges = await db
      .select()
      .from(badgeDefinitions)
      .where(
        and(
          eq(badgeDefinitions.isActive, true),
          eq(badgeDefinitions.isAutomatic, true)
        )
      );

    // Get user's already earned badges
    const earnedBadges = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, context.userId));

    const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId));

    // Check each badge
    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      const criteria = badge.criteria as BadgeCriteria;
      if (!criteria.type) continue;

      const result = await evaluateBadgeCriteria(
        badge.id,
        badge.name,
        badge.icon || "",
        badge.tier,
        criteria,
        context
      );

      if (result.earned) {
        // Award the badge
        await db.insert(userBadges).values({
          userId: context.userId,
          badgeId: badge.id,
          metadata: result.metadata || {},
        });

        awarded.push(result);
      }
    }

    // Check for goal matches if this was a PR trigger
    if (context.trigger === "pr" && context.memberId && context.exerciseName) {
      const matches = await checkGoalCompletion(
        context.memberId,
        context.exerciseName,
        context.exerciseValue || 0,
        context.exerciseUnit || "lbs"
      );
      goalMatches.push(...matches);
    }

    return { awarded, goalMatches };
  } catch (error) {
    console.error("Error evaluating badges:", error);
    return { awarded: [], goalMatches: [] };
  }
}

/**
 * Evaluate a single badge's criteria
 */
async function evaluateBadgeCriteria(
  badgeId: string,
  badgeName: string,
  badgeIcon: string,
  badgeTier: string,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  const baseResult = {
    badgeId,
    badgeName,
    badgeIcon,
    badgeTier,
    earned: false,
  };

  if (!context.memberId && criteria.type !== "sport") {
    return baseResult;
  }

  switch (criteria.type) {
    case "pr_single":
      return await evaluatePrSingleBadge(baseResult, criteria, context);

    case "pr_total":
      return await evaluatePrTotalBadge(baseResult, criteria, context);

    case "skill_achieved":
      return await evaluateSkillBadge(baseResult, criteria, context);

    case "sport":
      return await evaluateSportBadge(baseResult, criteria, context);

    case "streak":
      return await evaluateStreakBadge(baseResult, criteria, context);

    case "workout_count":
      return await evaluateWorkoutCountBadge(baseResult, criteria, context);

    case "track_time":
      return await evaluateTrackTimeBadge(baseResult, criteria, context);

    default:
      return baseResult;
  }
}

/**
 * Check if user meets a single PR badge (e.g., 225 Bench)
 */
async function evaluatePrSingleBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.exercises || !criteria.singleValue || !context.memberId) {
    return baseResult;
  }

  // Get all exercises that match the badge criteria
  const matchingExercises = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(
      inArray(
        sql`LOWER(${exercises.name})`,
        criteria.exercises.map((e) => e.toLowerCase())
      )
    );

  if (matchingExercises.length === 0) {
    return baseResult;
  }

  const exerciseIds = matchingExercises.map((e) => e.id);

  // Get the user's best PR for these exercises
  const bestPr = await db
    .select({
      value: personalRecords.value,
      exerciseName: exercises.name,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .where(
      and(
        eq(personalRecords.memberId, context.memberId),
        inArray(personalRecords.exerciseId, exerciseIds)
      )
    )
    .orderBy(desc(personalRecords.value))
    .limit(1);

  if (bestPr.length > 0 && bestPr[0].value >= criteria.singleValue) {
    return {
      ...baseResult,
      earned: true,
      metadata: {
        prValue: bestPr[0].value,
        exercise: bestPr[0].exerciseName,
      },
    };
  }

  return baseResult;
}

/**
 * Check if user meets a combined PR total badge (e.g., 1000lb club)
 */
async function evaluatePrTotalBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.exercises || !criteria.totalValue || !context.memberId) {
    return baseResult;
  }

  // Get matching exercises
  const matchingExercises = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(
      inArray(
        sql`LOWER(${exercises.name})`,
        criteria.exercises.map((e) => e.toLowerCase())
      )
    );

  if (matchingExercises.length === 0) {
    return baseResult;
  }

  // Group exercises by type (squat, bench, deadlift)
  const exerciseGroups: Record<string, string[]> = {
    squat: [],
    bench: [],
    deadlift: [],
  };

  for (const ex of matchingExercises) {
    const nameLower = ex.name.toLowerCase();
    if (nameLower.includes("squat")) {
      exerciseGroups.squat.push(ex.id);
    } else if (nameLower.includes("bench")) {
      exerciseGroups.bench.push(ex.id);
    } else if (nameLower.includes("deadlift")) {
      exerciseGroups.deadlift.push(ex.id);
    }
  }

  // Get best PR for each category
  let total = 0;
  const breakdown: Record<string, number> = {};

  for (const [type, ids] of Object.entries(exerciseGroups)) {
    if (ids.length === 0) continue;

    const bestPr = await db
      .select({ value: personalRecords.value })
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.memberId, context.memberId),
          inArray(personalRecords.exerciseId, ids)
        )
      )
      .orderBy(desc(personalRecords.value))
      .limit(1);

    if (bestPr.length > 0) {
      total += bestPr[0].value;
      breakdown[type] = bestPr[0].value;
    }
  }

  if (total >= criteria.totalValue) {
    return {
      ...baseResult,
      earned: true,
      metadata: {
        total,
        breakdown,
      },
    };
  }

  return baseResult;
}

/**
 * Check if user has achieved a skill badge
 */
async function evaluateSkillBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.skillName || !context.memberId) {
    return baseResult;
  }

  const skill = await db
    .select()
    .from(userSkills)
    .where(
      and(
        eq(userSkills.userId, context.userId),
        eq(sql`LOWER(${userSkills.name})`, criteria.skillName.toLowerCase()),
        eq(userSkills.currentStatus, criteria.skillStatus || "achieved")
      )
    )
    .limit(1);

  if (skill.length > 0) {
    return {
      ...baseResult,
      earned: true,
      metadata: {
        skillName: skill[0].name,
        achievedAt: skill[0].updatedAt,
      },
    };
  }

  return baseResult;
}

/**
 * Check if user has added a sport badge
 */
async function evaluateSportBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.sport) {
    return baseResult;
  }

  const sport = await db
    .select()
    .from(userSports)
    .where(
      and(
        eq(userSports.userId, context.userId),
        eq(sql`LOWER(${userSports.sport})`, criteria.sport.toLowerCase())
      )
    )
    .limit(1);

  if (sport.length > 0) {
    return {
      ...baseResult,
      earned: true,
      metadata: {
        sport: sport[0].sport,
        level: sport[0].level,
      },
    };
  }

  return baseResult;
}

/**
 * Check if user has a workout streak badge
 */
async function evaluateStreakBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.streakDays || !context.memberId) {
    return baseResult;
  }

  // Get all completed workouts ordered by date
  const workouts = await db
    .select({ endTime: workoutSessions.endTime })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.memberId, context.memberId),
        eq(workoutSessions.status, "completed")
      )
    )
    .orderBy(desc(workoutSessions.endTime));

  if (workouts.length === 0) {
    return baseResult;
  }

  // Calculate streak
  let streak = 1;
  let maxStreak = 1;
  let lastDate: Date | null = null;

  for (const workout of workouts) {
    if (!workout.endTime) continue;

    const workoutDate = new Date(workout.endTime);
    workoutDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      lastDate = workoutDate;
      continue;
    }

    const dayDiff = Math.floor(
      (lastDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else if (dayDiff > 1) {
      streak = 1;
    }

    lastDate = workoutDate;
  }

  if (maxStreak >= criteria.streakDays) {
    return {
      ...baseResult,
      earned: true,
      metadata: {
        streakDays: maxStreak,
      },
    };
  }

  return baseResult;
}

/**
 * Check if user meets workout count badge
 */
async function evaluateWorkoutCountBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.workoutCount || !context.memberId) {
    return baseResult;
  }

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.memberId, context.memberId),
        eq(workoutSessions.status, "completed")
      )
    );

  const count = Number(result[0]?.count || 0);

  if (count >= criteria.workoutCount) {
    return {
      ...baseResult,
      earned: true,
      metadata: {
        workoutCount: count,
      },
    };
  }

  return baseResult;
}

/**
 * Check if user meets track time badge (e.g., sub-6 minute mile)
 */
async function evaluateTrackTimeBadge(
  baseResult: BadgeEvaluationResult,
  criteria: BadgeCriteria,
  context: EvaluationContext
): Promise<BadgeEvaluationResult> {
  if (!criteria.trackTime || !criteria.trackDistance || !context.memberId) {
    return baseResult;
  }

  // Find running exercises with time-based PRs
  const runningExercises = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      sql`LOWER(${exercises.name}) LIKE '%mile%' OR LOWER(${exercises.name}) LIKE '%run%'`
    );

  if (runningExercises.length === 0) {
    return baseResult;
  }

  // Get best time PR (lower is better for time)
  const bestPr = await db
    .select({ value: personalRecords.value, unit: personalRecords.unit })
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.memberId, context.memberId),
        inArray(
          personalRecords.exerciseId,
          runningExercises.map((e) => e.id)
        ),
        inArray(personalRecords.unit, ["seconds", "minutes", "time"])
      )
    )
    .orderBy(personalRecords.value)
    .limit(1);

  if (bestPr.length > 0) {
    let timeInSeconds = bestPr[0].value;
    if (bestPr[0].unit === "minutes") {
      timeInSeconds = bestPr[0].value * 60;
    }

    if (timeInSeconds <= criteria.trackTime) {
      return {
        ...baseResult,
        earned: true,
        metadata: {
          timeSeconds: timeInSeconds,
        },
      };
    }
  }

  return baseResult;
}

/**
 * Check if a new PR completes or exceeds any active goals
 */
async function checkGoalCompletion(
  memberId: string,
  exerciseName: string,
  prValue: number,
  prUnit: string
): Promise<GoalMatch[]> {
  const matches: GoalMatch[] = [];

  // Get active goals that might match
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.memberId, memberId), eq(goals.status, "active")));

  for (const goal of activeGoals) {
    // Check if goal title contains the exercise name
    const goalTitleLower = goal.title.toLowerCase();
    const exerciseNameLower = exerciseName.toLowerCase();

    // Match common patterns: "225 bench", "bench 225", "bench press 225"
    const isExerciseMatch =
      goalTitleLower.includes(exerciseNameLower) ||
      (exerciseNameLower.includes("bench") && goalTitleLower.includes("bench")) ||
      (exerciseNameLower.includes("squat") && goalTitleLower.includes("squat")) ||
      (exerciseNameLower.includes("deadlift") && goalTitleLower.includes("deadlift"));

    if (!isExerciseMatch) continue;

    // Check if goal has a target value and units match
    if (goal.targetValue && goal.targetUnit) {
      // Normalize units
      const goalUnit = goal.targetUnit.toLowerCase();
      const prUnitLower = prUnit.toLowerCase();

      const unitsMatch =
        goalUnit === prUnitLower ||
        (goalUnit.includes("lb") && prUnitLower.includes("lb")) ||
        (goalUnit.includes("kg") && prUnitLower.includes("kg"));

      if (unitsMatch && prValue >= goal.targetValue) {
        matches.push({
          goalId: goal.id,
          goalTitle: goal.title,
          goalCategory: goal.category,
          targetValue: goal.targetValue,
          targetUnit: goal.targetUnit,
          currentPrValue: prValue,
          exceededBy: prValue - goal.targetValue,
          status: prValue > goal.targetValue ? "exceeded" : "met",
        });
      }
    }
  }

  return matches;
}

/**
 * Manually award a badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeId: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    // Check if already earned
    const existing = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
      .limit(1);

    if (existing.length > 0) {
      return false; // Already earned
    }

    await db.insert(userBadges).values({
      userId,
      badgeId,
      metadata: metadata || {},
    });

    return true;
  } catch (error) {
    console.error("Error awarding badge:", error);
    return false;
  }
}

/**
 * Get user's badge progress for a specific badge
 */
export async function getBadgeProgress(
  userId: string,
  memberId: string,
  badgeId: string
): Promise<{ progress: number; current: number; target: number } | null> {
  try {
    const badge = await db
      .select()
      .from(badgeDefinitions)
      .where(eq(badgeDefinitions.id, badgeId))
      .limit(1);

    if (badge.length === 0) return null;

    const criteria = badge[0].criteria as BadgeCriteria;
    if (!criteria.type) return null;

    // Calculate progress based on criteria type
    switch (criteria.type) {
      case "pr_single":
        if (criteria.exercises && criteria.singleValue) {
          const matchingExercises = await db
            .select({ id: exercises.id })
            .from(exercises)
            .where(
              inArray(
                sql`LOWER(${exercises.name})`,
                criteria.exercises.map((e) => e.toLowerCase())
              )
            );

          if (matchingExercises.length > 0) {
            const bestPr = await db
              .select({ value: personalRecords.value })
              .from(personalRecords)
              .where(
                and(
                  eq(personalRecords.memberId, memberId),
                  inArray(
                    personalRecords.exerciseId,
                    matchingExercises.map((e) => e.id)
                  )
                )
              )
              .orderBy(desc(personalRecords.value))
              .limit(1);

            const current = bestPr.length > 0 ? bestPr[0].value : 0;
            return {
              progress: Math.min(100, (current / criteria.singleValue) * 100),
              current,
              target: criteria.singleValue,
            };
          }
        }
        break;

      case "workout_count":
        if (criteria.workoutCount) {
          const result = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(workoutSessions)
            .where(
              and(
                eq(workoutSessions.memberId, memberId),
                eq(workoutSessions.status, "completed")
              )
            );

          const current = Number(result[0]?.count || 0);
          return {
            progress: Math.min(100, (current / criteria.workoutCount) * 100),
            current,
            target: criteria.workoutCount,
          };
        }
        break;

      case "streak":
        // Streak progress would require more complex calculation
        break;
    }

    return null;
  } catch (error) {
    console.error("Error getting badge progress:", error);
    return null;
  }
}
