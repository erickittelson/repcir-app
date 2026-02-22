/**
 * Badge Check API
 *
 * Checks user's data against badge criteria and awards any newly earned badges.
 * Returns the list of newly awarded badges for celebration modal display.
 *
 * Supported criteria types:
 *   pr_single, pr_total, pr_bodyweight_ratio, track_time,
 *   sport, skill_achieved, onboarding_complete, profile_complete, first_login
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  badgeDefinitions,
  userBadges,
  personalRecords,
  circleMembers,
  userMetrics,
  userSports,
  userSkills,
  onboardingProgress,
  goals,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateCompleteness } from "@/lib/profile/completeness";

interface BadgeCriteria {
  type?: string;
  // PR-based
  exercises?: string[];
  singleValue?: number;
  totalValue?: number;
  bodyweightRatio?: number;
  // Track
  trackTime?: number;
  trackDistance?: number;
  // Skill
  skillName?: string;
  skillStatus?: string;
  // Sport
  sport?: string;
  // Profile
  profilePercent?: number;
  // Legacy
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

    // Get user's existing badges
    const existingBadges = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
    });
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    // Get all active automatic badges
    const allBadges = await db.query.badgeDefinitions.findMany({
      where: and(
        eq(badgeDefinitions.isActive, true),
        eq(badgeDefinitions.isAutomatic, true)
      ),
    });

    // Lazily fetch data only when needed (avoid unnecessary DB calls)
    let _prs: Awaited<ReturnType<typeof fetchPRs>> | null = null;
    let _bodyweight: number | null = null;
    let _sports: Awaited<ReturnType<typeof fetchSports>> | null = null;
    let _skills: Awaited<ReturnType<typeof fetchSkills>> | null = null;
    let _completeness: Awaited<ReturnType<typeof calculateCompleteness>> | null = null;
    let _hasGoals: boolean | null = null;
    let _onboardingComplete: boolean | null = null;

    async function fetchPRs() {
      if (!member) return [];
      return db.query.personalRecords.findMany({
        where: eq(personalRecords.memberId, member.id),
        with: { exercise: true },
      });
    }
    async function getPRs() {
      if (_prs === null) _prs = await fetchPRs();
      return _prs;
    }

    async function getBodyweight() {
      if (_bodyweight !== null) return _bodyweight;
      const m = await db.query.userMetrics.findFirst({
        where: eq(userMetrics.userId, userId),
        orderBy: [desc(userMetrics.date)],
      });
      _bodyweight = m?.weight || 0;
      return _bodyweight;
    }

    async function fetchSports() {
      return db.query.userSports.findMany({
        where: eq(userSports.userId, userId),
      });
    }
    async function getSports() {
      if (_sports === null) _sports = await fetchSports();
      return _sports;
    }

    async function fetchSkills() {
      return db.query.userSkills.findMany({
        where: eq(userSkills.userId, userId),
      });
    }
    async function getSkills() {
      if (_skills === null) _skills = await fetchSkills();
      return _skills;
    }

    async function getCompleteness() {
      if (_completeness === null) _completeness = await calculateCompleteness(userId);
      return _completeness;
    }

    async function getHasGoals() {
      if (_hasGoals !== null) return _hasGoals;
      if (!member) { _hasGoals = false; return false; }
      const g = await db.query.goals.findFirst({
        where: eq(goals.memberId, member.id),
      });
      _hasGoals = !!g;
      return _hasGoals;
    }

    async function getOnboardingComplete() {
      if (_onboardingComplete !== null) return _onboardingComplete;
      const p = await db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.userId, userId),
      });
      _onboardingComplete = !!p?.completedAt;
      return _onboardingComplete;
    }

    // Check each badge for eligibility
    const newlyEarnedBadges: typeof allBadges = [];

    for (const badge of allBadges) {
      if (existingBadgeIds.has(badge.id)) continue;

      const criteria = badge.criteria as BadgeCriteria;
      if (!criteria?.type) continue;

      let earned = false;

      switch (criteria.type) {
        case "pr_single": {
          const prs = await getPRs();
          const exercisePatterns = criteria.exercises || (criteria.exercise ? [criteria.exercise] : []);
          const targetValue = criteria.singleValue || criteria.minValue || 0;

          // Special case: PR Pioneer (any PR, exercises=[], singleValue=1)
          if (exercisePatterns.length === 0 && targetValue <= 1) {
            earned = prs.length > 0;
            break;
          }

          if (exercisePatterns.length > 0 && targetValue > 0) {
            const matchingPr = prs.find((p) => {
              const name = p.exercise?.name?.toLowerCase() || "";
              return exercisePatterns.some((pat) => name.includes(pat.toLowerCase()));
            });
            if (matchingPr && matchingPr.value >= targetValue) {
              earned = true;
            }
          }
          break;
        }

        case "pr_total": {
          const prs = await getPRs();
          const exercisePatterns = criteria.exercises || [];
          const targetTotal = criteria.totalValue || criteria.minTotal || 0;

          if (exercisePatterns.length > 0 && targetTotal > 0) {
            // For combined totals, we need the best PR per exercise group
            // Group patterns: squat/back squat = one group, bench press = one group, deadlift = one group
            const groups = new Map<string, number>();
            const groupKeys = ["squat", "bench", "deadlift"];

            for (const pr of prs) {
              const name = pr.exercise?.name?.toLowerCase() || "";
              for (const key of groupKeys) {
                if (name.includes(key)) {
                  groups.set(key, Math.max(groups.get(key) || 0, pr.value));
                }
              }
            }

            const total = Array.from(groups.values()).reduce((s, v) => s + v, 0);
            if (total >= targetTotal) {
              earned = true;
            }
          }
          break;
        }

        case "pr_bodyweight_ratio": {
          const prs = await getPRs();
          const bodyweight = await getBodyweight();
          const exercisePatterns = criteria.exercises || (criteria.exercise ? [criteria.exercise] : []);
          const ratio = criteria.bodyweightRatio || criteria.bodyweightMultiplier || 0;

          if (bodyweight > 0 && exercisePatterns.length > 0 && ratio > 0) {
            const matchingPr = prs.find((p) => {
              const name = p.exercise?.name?.toLowerCase() || "";
              return exercisePatterns.some((pat) => name.includes(pat.toLowerCase()));
            });
            if (matchingPr && matchingPr.value >= bodyweight * ratio) {
              earned = true;
            }
          }
          break;
        }

        case "track_time": {
          // Time-based PRs (lower is better). Uses trackDistance + trackTime from criteria.
          const prs = await getPRs();
          const targetTime = criteria.trackTime || criteria.singleValue || 0;
          const targetDistance = criteria.trackDistance || 0;

          if (targetTime > 0) {
            // Match PRs by distance-related exercise names
            const distancePatterns: string[] = [];
            if (targetDistance >= 1600 && targetDistance <= 1610) {
              distancePatterns.push("mile", "1 mile", "1600");
            } else if (targetDistance === 400) {
              distancePatterns.push("400");
            } else if (targetDistance === 100) {
              distancePatterns.push("100m", "100 m", "100 meter");
            }

            // Also try the exercises array if provided
            const allPatterns = [...distancePatterns, ...(criteria.exercises || [])];

            if (allPatterns.length > 0) {
              const matchingPr = prs.find((p) => {
                const name = p.exercise?.name?.toLowerCase() || "";
                const isTimeUnit = ["seconds", "sec", "min:sec", "mm:ss", "hh:mm:ss", "time"].includes(p.unit?.toLowerCase() || "");
                return isTimeUnit && allPatterns.some((pat) => name.includes(pat.toLowerCase()));
              });
              if (matchingPr && matchingPr.value <= targetTime) {
                earned = true;
              }
            }
          }
          break;
        }

        case "sport": {
          const sports = await getSports();
          const targetSport = criteria.sport?.toLowerCase() || "";
          if (targetSport) {
            earned = sports.some(
              (s) => s.sport.toLowerCase() === targetSport ||
                     s.sport.toLowerCase().replace(/[_\s-]/g, "") === targetSport.replace(/[_\s-]/g, "")
            );
          }
          break;
        }

        case "skill_achieved": {
          const skills = await getSkills();
          const targetSkill = criteria.skillName?.toLowerCase().replace(/[_\s-]/g, "") || "";
          if (targetSkill) {
            earned = skills.some((s) => {
              const skillName = s.name.toLowerCase().replace(/[_\s-]/g, "");
              const status = s.currentStatus?.toLowerCase() || "";
              return skillName === targetSkill && (status === "achieved" || status === "mastered");
            });
          }
          break;
        }

        case "onboarding_complete": {
          earned = await getOnboardingComplete();
          break;
        }

        case "profile_complete": {
          const targetPercent = criteria.profilePercent || 0;
          if (targetPercent > 0) {
            const completeness = await getCompleteness();
            earned = completeness.overallPercent >= targetPercent;
          }
          break;
        }

        case "first_login": {
          // "Goal Setter" — has at least one goal
          earned = await getHasGoals();
          break;
        }

        // Criteria types that require workout logging (not checked during onboarding):
        // streak, workout_count, challenge_complete, program_complete, circles_created, followers
        // These will be checked by future event-driven badge evaluation, not here.
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
