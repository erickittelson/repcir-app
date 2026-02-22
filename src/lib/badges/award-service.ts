/**
 * Badge Award Service
 * 
 * Handles checking badge eligibility and awarding badges to users.
 */

import { db } from "@/lib/db";
import {
  badgeDefinitions,
  userBadges,
  personalRecords,
  userSkills,
  circleMembers,
  userMetrics,
  workoutSessions,
  challengeParticipants,
  programEnrollments,
  userFollows,
  circles,
  userSports,
} from "@/lib/db/schema";
import { eq, and, sql, inArray, count, gte, desc } from "drizzle-orm";
import type { BadgeCriteria, BadgeCheckResult, BadgeProgress } from "./types";

/**
 * Check if a user is eligible for a specific badge
 */
export async function checkBadgeEligibility(
  userId: string,
  badge: {
    id: string;
    criteria: BadgeCriteria;
  }
): Promise<BadgeCheckResult> {
  const { criteria } = badge;

  switch (criteria.type) {
    case "pr_total":
      return checkPRTotalBadge(userId, badge.id, criteria);
    case "pr_single":
      return checkPRSingleBadge(userId, badge.id, criteria);
    case "pr_bodyweight_ratio":
      return checkPRBodyweightRatioBadge(userId, badge.id, criteria);
    case "skill_achieved":
      return checkSkillBadge(userId, badge.id, criteria);
    case "sport":
      return checkSportBadge(userId, badge.id, criteria);
    case "streak":
      return checkStreakBadge(userId, badge.id, criteria);
    case "workout_count":
      return checkWorkoutCountBadge(userId, badge.id, criteria);
    case "challenge_complete":
      return checkChallengeBadge(userId, badge.id, criteria);
    case "program_complete":
      return checkProgramBadge(userId, badge.id, criteria);
    case "followers":
      return checkFollowerBadge(userId, badge.id, criteria);
    case "circles_created":
      return checkCirclesBadge(userId, badge.id, criteria);
    case "track_time":
      return checkTrackTimeBadge(userId, badge.id, criteria);
    default:
      return { eligible: false, badgeId: badge.id };
  }
}

/**
 * Check PR total badges (e.g., 1000lb club)
 */
async function checkPRTotalBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.exercises || !criteria.totalValue) {
    return { eligible: false, badgeId };
  }

  // Get user's circle member IDs
  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return { eligible: false, badgeId };
  }

  const memberIds = members.map((m) => m.id);

  // Get PRs for the specified exercises
  const prs = await db
    .select({
      value: personalRecords.value,
      exerciseName: sql<string>`(SELECT name FROM exercises WHERE id = ${personalRecords.exerciseId})`,
    })
    .from(personalRecords)
    .where(
      and(
        inArray(personalRecords.memberId, memberIds),
        eq(personalRecords.recordType, "all_time")
      )
    );

  // Calculate total for matching exercises
  let total = 0;
  for (const pr of prs) {
    const exerciseName = pr.exerciseName?.toLowerCase() || "";
    if (criteria.exercises.some((e) => exerciseName.includes(e.toLowerCase()))) {
      total += pr.value;
    }
  }

  return {
    eligible: total >= criteria.totalValue,
    badgeId,
    metadata: { prValue: total, prUnit: "lbs" },
  };
}

/**
 * Check single exercise PR badges (e.g., 225 bench)
 */
async function checkPRSingleBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.exercises || !criteria.singleValue) {
    return { eligible: false, badgeId };
  }

  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return { eligible: false, badgeId };
  }

  const memberIds = members.map((m) => m.id);

  // Get best PR for any of the specified exercises
  const prs = await db
    .select({
      value: personalRecords.value,
      exerciseName: sql<string>`(SELECT name FROM exercises WHERE id = ${personalRecords.exerciseId})`,
    })
    .from(personalRecords)
    .where(
      and(
        inArray(personalRecords.memberId, memberIds),
        eq(personalRecords.recordType, "all_time")
      )
    );

  let bestValue = 0;
  for (const pr of prs) {
    const exerciseName = pr.exerciseName?.toLowerCase() || "";
    if (criteria.exercises.some((e) => exerciseName.includes(e.toLowerCase()))) {
      bestValue = Math.max(bestValue, pr.value);
    }
  }

  return {
    eligible: bestValue >= criteria.singleValue,
    badgeId,
    metadata: { prValue: bestValue, prUnit: "lbs" },
  };
}

/**
 * Check bodyweight ratio badges (e.g., 2x bodyweight squat)
 */
async function checkPRBodyweightRatioBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.exercises || !criteria.bodyweightRatio) {
    return { eligible: false, badgeId };
  }

  // Get user's latest weight
  const latestMetric = await db
    .select({ weight: userMetrics.weight })
    .from(userMetrics)
    .where(eq(userMetrics.userId, userId))
    .orderBy(desc(userMetrics.date))
    .limit(1);

  const bodyweight = latestMetric[0]?.weight;
  if (!bodyweight) {
    return { eligible: false, badgeId };
  }

  const targetValue = bodyweight * criteria.bodyweightRatio;

  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return { eligible: false, badgeId };
  }

  const memberIds = members.map((m) => m.id);

  const prs = await db
    .select({
      value: personalRecords.value,
      exerciseName: sql<string>`(SELECT name FROM exercises WHERE id = ${personalRecords.exerciseId})`,
    })
    .from(personalRecords)
    .where(
      and(
        inArray(personalRecords.memberId, memberIds),
        eq(personalRecords.recordType, "all_time")
      )
    );

  let bestValue = 0;
  for (const pr of prs) {
    const exerciseName = pr.exerciseName?.toLowerCase() || "";
    if (criteria.exercises.some((e) => exerciseName.includes(e.toLowerCase()))) {
      bestValue = Math.max(bestValue, pr.value);
    }
  }

  return {
    eligible: bestValue >= targetValue,
    badgeId,
    metadata: { prValue: bestValue, prUnit: "lbs" },
  };
}

/**
 * Check skill achievement badges
 */
async function checkSkillBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.skillName) {
    return { eligible: false, badgeId };
  }

  const requiredStatus = criteria.skillStatus || "achieved";

  // Check user-level skills
  const userSkill = await db
    .select({ currentStatus: userSkills.currentStatus })
    .from(userSkills)
    .where(
      and(
        eq(userSkills.userId, userId),
        sql`LOWER(${userSkills.name}) = ${criteria.skillName.toLowerCase()}`
      )
    )
    .limit(1);

  if (userSkill.length > 0) {
    const status = userSkill[0].currentStatus;
    if (
      status === requiredStatus ||
      (requiredStatus === "achieved" && status === "mastered")
    ) {
      return { eligible: true, badgeId };
    }
  }

  return { eligible: false, badgeId };
}

/**
 * Check sport participation badges
 */
async function checkSportBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.sport) {
    return { eligible: false, badgeId };
  }

  const sport = await db
    .select({ sport: userSports.sport })
    .from(userSports)
    .where(
      and(
        eq(userSports.userId, userId),
        sql`LOWER(${userSports.sport}) = ${criteria.sport.toLowerCase()}`
      )
    )
    .limit(1);

  return { eligible: sport.length > 0, badgeId };
}

/**
 * Check workout streak badges
 */
async function checkStreakBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.streakDays) {
    return { eligible: false, badgeId };
  }

  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return { eligible: false, badgeId };
  }

  const memberIds = members.map((m) => m.id);

  // Get completed workouts ordered by date
  const workouts = await db
    .select({ date: workoutSessions.date })
    .from(workoutSessions)
    .where(
      and(
        inArray(workoutSessions.memberId, memberIds),
        eq(workoutSessions.status, "completed")
      )
    )
    .orderBy(desc(workoutSessions.date));

  // Calculate current streak
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const workout of workouts) {
    const workoutDate = new Date(workout.date);
    workoutDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      // First workout, check if it's today or yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (workoutDate >= yesterday) {
        currentStreak = 1;
        lastDate = workoutDate;
      } else {
        break; // Streak is broken
      }
    } else {
      const expectedDate = new Date(lastDate);
      expectedDate.setDate(expectedDate.getDate() - 1);

      if (workoutDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
        lastDate = workoutDate;
      } else if (workoutDate.getTime() === lastDate.getTime()) {
        // Same day, skip
        continue;
      } else {
        break; // Streak is broken
      }
    }
  }

  return {
    eligible: currentStreak >= criteria.streakDays,
    badgeId,
  };
}

/**
 * Check workout count badges
 */
async function checkWorkoutCountBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.workoutCount) {
    return { eligible: false, badgeId };
  }

  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return { eligible: false, badgeId };
  }

  const memberIds = members.map((m) => m.id);

  const result = await db
    .select({ count: count() })
    .from(workoutSessions)
    .where(
      and(
        inArray(workoutSessions.memberId, memberIds),
        eq(workoutSessions.status, "completed")
      )
    );

  const workoutCount = result[0]?.count || 0;

  return {
    eligible: workoutCount >= criteria.workoutCount,
    badgeId,
  };
}

/**
 * Check challenge completion badges
 */
async function checkChallengeBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  const whereConditions = [
    eq(challengeParticipants.userId, userId),
    eq(challengeParticipants.status, "completed"),
  ];

  if (criteria.challengeId) {
    whereConditions.push(eq(challengeParticipants.challengeId, criteria.challengeId as any));
  }

  const completedChallenges = await db
    .select({ id: challengeParticipants.id })
    .from(challengeParticipants)
    .where(and(...whereConditions))
    .limit(1);

  return { eligible: completedChallenges.length > 0, badgeId };
}

/**
 * Check program completion badges
 */
async function checkProgramBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  const whereConditions = [
    eq(programEnrollments.userId, userId),
    eq(programEnrollments.status, "completed"),
  ];

  if (criteria.programId) {
    whereConditions.push(eq(programEnrollments.programId, criteria.programId as any));
  }

  const completedPrograms = await db
    .select({ id: programEnrollments.id })
    .from(programEnrollments)
    .where(and(...whereConditions))
    .limit(1);

  return { eligible: completedPrograms.length > 0, badgeId };
}

/**
 * Check follower count badges
 */
async function checkFollowerBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.followerCount) {
    return { eligible: false, badgeId };
  }

  const result = await db
    .select({ count: count() })
    .from(userFollows)
    .where(eq(userFollows.followingId, userId));

  const followerCount = result[0]?.count || 0;

  return {
    eligible: followerCount >= criteria.followerCount,
    badgeId,
  };
}

/**
 * Check circles created badges
 */
async function checkCirclesBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.circleCount) {
    return { eligible: false, badgeId };
  }

  // Count circles where user is owner
  const result = await db
    .select({ count: count() })
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.userId, userId),
        eq(circleMembers.role, "owner")
      )
    );

  const circleCount = result[0]?.count || 0;

  return {
    eligible: circleCount >= criteria.circleCount,
    badgeId,
  };
}

/**
 * Check track time badges (e.g., sub-5 minute mile)
 */
async function checkTrackTimeBadge(
  userId: string,
  badgeId: string,
  criteria: BadgeCriteria
): Promise<BadgeCheckResult> {
  if (!criteria.trackDistance || !criteria.trackTime) {
    return { eligible: false, badgeId };
  }

  // Track times are stored in personalRecords with unit "seconds"
  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return { eligible: false, badgeId };
  }

  const memberIds = members.map((m) => m.id);

  // Look for PRs that match running/track exercises
  const prs = await db
    .select({
      value: personalRecords.value,
      unit: personalRecords.unit,
    })
    .from(personalRecords)
    .where(
      and(
        inArray(personalRecords.memberId, memberIds),
        eq(personalRecords.unit, "seconds")
      )
    );

  // Check if any PR beats the required time
  for (const pr of prs) {
    if (pr.value <= criteria.trackTime) {
      return {
        eligible: true,
        badgeId,
        metadata: { trackTime: pr.value },
      };
    }
  }

  return { eligible: false, badgeId };
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeId: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; alreadyEarned?: boolean }> {
  // Check if user already has this badge
  const existing = await db
    .select({ id: userBadges.id })
    .from(userBadges)
    .where(
      and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeId, badgeId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: false, alreadyEarned: true };
  }

  // Check if user has fewer than 3 featured badges — auto-feature if so
  const featuredCount = await db
    .select({ count: count() })
    .from(userBadges)
    .where(
      and(
        eq(userBadges.userId, userId),
        eq(userBadges.isFeatured, true)
      )
    );

  const shouldAutoFeature = (featuredCount[0]?.count || 0) < 3;

  // Award the badge
  await db.insert(userBadges).values({
    userId,
    badgeId,
    metadata: metadata || {},
    isFeatured: shouldAutoFeature,
  });

  return { success: true };
}

/**
 * Check all badges for a user and award any newly earned ones
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = [];

  // Get all active badge definitions
  const badges = await db
    .select()
    .from(badgeDefinitions)
    .where(
      and(
        eq(badgeDefinitions.isActive, true),
        eq(badgeDefinitions.isAutomatic, true)
      )
    );

  // Get user's existing badges
  const existingBadges = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

  // Check each badge
  for (const badge of badges) {
    if (existingBadgeIds.has(badge.id)) {
      continue; // Already earned
    }

    const criteria = badge.criteria as BadgeCriteria;
    const result = await checkBadgeEligibility(userId, {
      id: badge.id,
      criteria,
    });

    if (result.eligible) {
      const awarded = await awardBadge(userId, badge.id, result.metadata);
      if (awarded.success) {
        awardedBadges.push(badge.id);
      }
    }
  }

  return awardedBadges;
}

/**
 * Get user's badge progress toward all badges
 */
export async function getUserBadgeProgress(userId: string): Promise<BadgeProgress[]> {
  const progress: BadgeProgress[] = [];

  // Get all active badges
  const badges = await db
    .select()
    .from(badgeDefinitions)
    .where(eq(badgeDefinitions.isActive, true))
    .orderBy(badgeDefinitions.displayOrder);

  // Get user's earned badges
  const earned = await db
    .select({
      badgeId: userBadges.badgeId,
      earnedAt: userBadges.earnedAt,
    })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

  for (const badge of badges) {
    const isEarned = earnedMap.has(badge.id);
    const earnedAt = earnedMap.get(badge.id);
    const criteria = badge.criteria as BadgeCriteria;

    // Calculate progress based on badge type
    let currentValue = 0;
    let targetValue = 0;

    switch (criteria.type) {
      case "pr_total":
        targetValue = criteria.totalValue || 0;
        // Would need to fetch actual PR total - simplified for now
        break;
      case "pr_single":
        targetValue = criteria.singleValue || 0;
        break;
      case "streak":
        targetValue = criteria.streakDays || 0;
        break;
      case "workout_count":
        targetValue = criteria.workoutCount || 0;
        break;
      case "followers":
        targetValue = criteria.followerCount || 0;
        break;
      case "track_time":
        targetValue = criteria.trackTime || 0;
        break;
      default:
        targetValue = 1;
        currentValue = isEarned ? 1 : 0;
    }

    progress.push({
      badgeId: badge.id,
      badgeName: badge.name,
      category: badge.category as any,
      tier: badge.tier as any,
      currentValue,
      targetValue,
      progressPercent: targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : isEarned ? 100 : 0,
      isEarned,
      earnedAt: earnedAt || undefined,
    });
  }

  return progress;
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string) {
  return db
    .select({
      id: userBadges.id,
      badgeId: userBadges.badgeId,
      earnedAt: userBadges.earnedAt,
      isFeatured: userBadges.isFeatured,
      displayOrder: userBadges.displayOrder,
      metadata: userBadges.metadata,
      badge: {
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
        icon: badgeDefinitions.icon,
        imageUrl: badgeDefinitions.imageUrl,
        category: badgeDefinitions.category,
        tier: badgeDefinitions.tier,
        criteriaDescription: badgeDefinitions.criteriaDescription,
      },
    })
    .from(userBadges)
    .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(userBadges.displayOrder);
}

/**
 * Get featured badges for a user's profile
 */
export async function getFeaturedBadges(userId: string) {
  return db
    .select({
      id: userBadges.id,
      badgeId: userBadges.badgeId,
      earnedAt: userBadges.earnedAt,
      badge: {
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
        icon: badgeDefinitions.icon,
        imageUrl: badgeDefinitions.imageUrl,
        category: badgeDefinitions.category,
        tier: badgeDefinitions.tier,
      },
    })
    .from(userBadges)
    .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
    .where(
      and(
        eq(userBadges.userId, userId),
        eq(userBadges.isFeatured, true)
      )
    )
    .orderBy(userBadges.displayOrder)
    .limit(6);
}

/**
 * Set a badge as featured/unfeatured
 */
export async function toggleBadgeFeatured(
  userId: string,
  userBadgeId: string,
  isFeatured: boolean
) {
  // If featuring, check if user already has 6 featured badges
  if (isFeatured) {
    const featuredCount = await db
      .select({ count: count() })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.isFeatured, true)
        )
      );

    if ((featuredCount[0]?.count || 0) >= 6) {
      throw new Error("Maximum of 6 featured badges allowed");
    }
  }

  await db
    .update(userBadges)
    .set({ isFeatured })
    .where(
      and(
        eq(userBadges.id, userBadgeId),
        eq(userBadges.userId, userId)
      )
    );
}
