/**
 * Badge Check API
 * 
 * Checks user's data against badge criteria and awards any newly earned badges.
 * Returns the list of newly awarded badges for celebration modal display.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { 
  badgeDefinitions, 
  userBadges, 
  personalRecords,
  circleMembers,
  memberMetrics,
} from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// Type for badge criteria (matches seed-badges.ts structure)
interface BadgeCriteria {
  type?: string;
  // For single exercise PRs (e.g., 225 bench)
  exercises?: string[];  // Array of exercise name patterns to match
  singleValue?: number;  // Target value for single exercise
  // For combined totals (e.g., 1000lb club)
  totalValue?: number;   // Target value for combined total
  // For bodyweight ratio badges
  bodyweightRatio?: number;  // e.g., 2.0 for 2x bodyweight
  // For skill badges
  skillName?: string;
  // Legacy fields for backwards compatibility
  exercise?: string;
  minValue?: number;
  minTotal?: number;
  bodyweightMultiplier?: number;
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's member profile
    const member = await db.query.circleMembers.findFirst({
      where: eq(circleMembers.userId, userId),
    });

    if (!member) {
      return NextResponse.json({ newBadges: [] });
    }

    // Get user's existing badges
    const existingBadges = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
    });
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    // Get user's PRs
    const prs = await db.query.personalRecords.findMany({
      where: eq(personalRecords.memberId, member.id),
      with: { exercise: true },
    });

    // Get user's weight for bodyweight ratio badges
    const latestMetrics = await db.query.memberMetrics.findFirst({
      where: eq(memberMetrics.memberId, member.id),
      orderBy: (m, { desc }) => desc(m.createdAt),
    });
    const bodyweight = latestMetrics?.weight || 0;

    // Get all active automatic badges
    const allBadges = await db.query.badgeDefinitions.findMany({
      where: and(
        eq(badgeDefinitions.isActive, true),
        eq(badgeDefinitions.isAutomatic, true)
      ),
    });

    // Check each badge for eligibility
    const newlyEarnedBadges: typeof allBadges = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (existingBadgeIds.has(badge.id)) continue;

      const criteria = badge.criteria as BadgeCriteria;
      if (!criteria) continue;

      let earned = false;

      // Check different criteria types
      if (criteria.type === "pr_single") {
        // Single exercise PR (e.g., 225 bench)
        // Support both new format (exercises array + singleValue) and legacy (exercise + minValue)
        const exercisePatterns = criteria.exercises || (criteria.exercise ? [criteria.exercise] : []);
        const targetValue = criteria.singleValue || criteria.minValue || 0;
        
        if (exercisePatterns.length > 0 && targetValue > 0) {
          const matchingPr = prs.find((p) => {
            const exerciseName = p.exercise?.name?.toLowerCase() || "";
            return exercisePatterns.some((pattern) => 
              exerciseName.includes(pattern.toLowerCase())
            );
          });
          
          if (matchingPr && matchingPr.value >= targetValue) {
            earned = true;
          }
        }
      } else if (criteria.type === "pr_total") {
        // Combined total (e.g., 1000lb club)
        const exercisePatterns = criteria.exercises || [];
        const targetTotal = criteria.totalValue || criteria.minTotal || 0;
        
        if (exercisePatterns.length > 0 && targetTotal > 0) {
          let total = 0;
          for (const pattern of exercisePatterns) {
            const pr = prs.find((p) => 
              p.exercise?.name?.toLowerCase().includes(pattern.toLowerCase())
            );
            if (pr) total += pr.value;
          }
          if (total >= targetTotal) {
            earned = true;
          }
        }
      } else if (criteria.type === "pr_bodyweight_ratio") {
        // Bodyweight ratio (e.g., 2x bodyweight squat)
        const exercisePatterns = criteria.exercises || (criteria.exercise ? [criteria.exercise] : []);
        const ratio = criteria.bodyweightRatio || criteria.bodyweightMultiplier || 0;
        
        if (bodyweight > 0 && exercisePatterns.length > 0 && ratio > 0) {
          const matchingPr = prs.find((p) => {
            const exerciseName = p.exercise?.name?.toLowerCase() || "";
            return exercisePatterns.some((pattern) => 
              exerciseName.includes(pattern.toLowerCase())
            );
          });
          
          const requiredWeight = bodyweight * ratio;
          if (matchingPr && matchingPr.value >= requiredWeight) {
            earned = true;
          }
        }
      } else if (criteria.type === "reps") {
        // Rep-based (e.g., 20 pull-ups)
        const exercisePatterns = criteria.exercises || (criteria.exercise ? [criteria.exercise] : []);
        const targetReps = criteria.singleValue || criteria.minValue || 0;
        
        if (exercisePatterns.length > 0 && targetReps > 0) {
          const matchingPr = prs.find((p) => {
            const exerciseName = p.exercise?.name?.toLowerCase() || "";
            return p.unit === "reps" && exercisePatterns.some((pattern) => 
              exerciseName.includes(pattern.toLowerCase())
            );
          });
          
          if (matchingPr && matchingPr.value >= targetReps) {
            earned = true;
          }
        }
      } else if (criteria.type === "track_time") {
        // Time-based (e.g., sub-6 minute mile) - lower is better
        const exercisePatterns = criteria.exercises || (criteria.exercise ? [criteria.exercise] : []);
        const targetTime = criteria.singleValue || criteria.minValue || 0;
        
        if (exercisePatterns.length > 0 && targetTime > 0) {
          const matchingPr = prs.find((p) => {
            const exerciseName = p.exercise?.name?.toLowerCase() || "";
            return (p.unit === "seconds" || p.unit === "min:sec") && 
                   exercisePatterns.some((pattern) => 
                     exerciseName.includes(pattern.toLowerCase())
                   );
          });
          
          if (matchingPr && matchingPr.value <= targetTime) {
            earned = true;
          }
        }
      }

      if (earned) {
        newlyEarnedBadges.push(badge);
      }
    }

    // Award the newly earned badges
    if (newlyEarnedBadges.length > 0) {
      await db.insert(userBadges).values(
        newlyEarnedBadges.map((badge) => ({
          userId,
          badgeId: badge.id,
          earnedAt: new Date(),
        }))
      );
    }

    // Return the newly earned badges for the celebration modal
    return NextResponse.json({
      newBadges: newlyEarnedBadges.map((badge) => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        tier: badge.tier,
        rarity: badge.rarity,
        unlockMessage: badge.unlockMessage,
        category: badge.category,
      })),
    });
  } catch (error) {
    console.error("Error checking badges:", error);
    return NextResponse.json({ error: "Failed to check badges" }, { status: 500 });
  }
}
