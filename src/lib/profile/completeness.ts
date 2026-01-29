/**
 * Profile Completeness Service
 * 
 * Calculates and caches profile completeness, identifies missing fields,
 * and provides recommendations for users to complete their profiles.
 */

import { db } from "@/lib/db";
import {
  profileCompletenessCache,
  userProfiles,
  userMetrics,
  userLocations,
  userLimitations,
  userSkills,
  userSports,
  goals,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

// Section weights for overall completeness calculation
const SECTION_WEIGHTS = {
  basics: 20, // Display name, birthday, location
  bodyMetrics: 10, // Weight, height, body fat
  equipment: 20, // Gym locations and equipment
  goals: 15, // Active goals
  limitations: 10, // Injuries and limitations
  skills: 15, // Athletic skills
  sports: 10, // Sports played
} as const;

export type ProfileSection = keyof typeof SECTION_WEIGHTS;

export interface SectionStatus {
  section: ProfileSection;
  percent: number;
  isComplete: boolean;
  missingItems: string[];
  recommendation?: string;
}

export interface ProfileCompleteness {
  overallPercent: number;
  sections: Record<ProfileSection, number>;
  missingFields: string[];
  sectionStatuses: SectionStatus[];
  recommendations: string[];
}

/**
 * Calculate profile completeness for a user
 */
export async function calculateCompleteness(userId: string): Promise<ProfileCompleteness> {
  const sectionStatuses: SectionStatus[] = [];
  const allMissingFields: string[] = [];
  const recommendations: string[] = [];

  // 1. Check basics (profile info)
  const basicsStatus = await checkBasicsSection(userId);
  sectionStatuses.push(basicsStatus);
  allMissingFields.push(...basicsStatus.missingItems.map((i) => `basics.${i}`));
  if (basicsStatus.recommendation) {
    recommendations.push(basicsStatus.recommendation);
  }

  // 2. Check body metrics
  const metricsStatus = await checkBodyMetricsSection(userId);
  sectionStatuses.push(metricsStatus);
  allMissingFields.push(...metricsStatus.missingItems.map((i) => `bodyMetrics.${i}`));
  if (metricsStatus.recommendation) {
    recommendations.push(metricsStatus.recommendation);
  }

  // 3. Check equipment/locations
  const equipmentStatus = await checkEquipmentSection(userId);
  sectionStatuses.push(equipmentStatus);
  allMissingFields.push(...equipmentStatus.missingItems.map((i) => `equipment.${i}`));
  if (equipmentStatus.recommendation) {
    recommendations.push(equipmentStatus.recommendation);
  }

  // 4. Check goals
  const goalsStatus = await checkGoalsSection(userId);
  sectionStatuses.push(goalsStatus);
  allMissingFields.push(...goalsStatus.missingItems.map((i) => `goals.${i}`));
  if (goalsStatus.recommendation) {
    recommendations.push(goalsStatus.recommendation);
  }

  // 5. Check limitations
  const limitationsStatus = await checkLimitationsSection(userId);
  sectionStatuses.push(limitationsStatus);
  allMissingFields.push(...limitationsStatus.missingItems.map((i) => `limitations.${i}`));
  if (limitationsStatus.recommendation) {
    recommendations.push(limitationsStatus.recommendation);
  }

  // 6. Check skills
  const skillsStatus = await checkSkillsSection(userId);
  sectionStatuses.push(skillsStatus);
  allMissingFields.push(...skillsStatus.missingItems.map((i) => `skills.${i}`));
  if (skillsStatus.recommendation) {
    recommendations.push(skillsStatus.recommendation);
  }

  // 7. Check sports
  const sportsStatus = await checkSportsSection(userId);
  sectionStatuses.push(sportsStatus);
  allMissingFields.push(...sportsStatus.missingItems.map((i) => `sports.${i}`));
  if (sportsStatus.recommendation) {
    recommendations.push(sportsStatus.recommendation);
  }

  // Calculate overall percentage
  let weightedTotal = 0;
  let totalWeight = 0;
  const sections: Record<ProfileSection, number> = {} as Record<ProfileSection, number>;

  for (const status of sectionStatuses) {
    const weight = SECTION_WEIGHTS[status.section];
    weightedTotal += (status.percent / 100) * weight;
    totalWeight += weight;
    sections[status.section] = status.percent;
  }

  const overallPercent = Math.round((weightedTotal / totalWeight) * 100);

  return {
    overallPercent,
    sections,
    missingFields: allMissingFields,
    sectionStatuses,
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
  };
}

/**
 * Check basics section (profile info)
 */
async function checkBasicsSection(userId: string): Promise<SectionStatus> {
  const profile = await db
    .select({
      displayName: userProfiles.displayName,
      birthMonth: userProfiles.birthMonth,
      birthYear: userProfiles.birthYear,
      city: userProfiles.city,
      profilePicture: userProfiles.profilePicture,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const p = profile[0];
  const missingItems: string[] = [];

  if (!p) {
    return {
      section: "basics",
      percent: 0,
      isComplete: false,
      missingItems: ["displayName", "birthday", "location", "profilePicture"],
      recommendation: "Complete your basic profile information to help others know you",
    };
  }

  if (!p.displayName) missingItems.push("displayName");
  if (!p.birthMonth || !p.birthYear) missingItems.push("birthday");
  if (!p.city) missingItems.push("location");
  if (!p.profilePicture) missingItems.push("profilePicture");

  const totalFields = 4;
  const completedFields = totalFields - missingItems.length;
  const percent = Math.round((completedFields / totalFields) * 100);

  return {
    section: "basics",
    percent,
    isComplete: missingItems.length === 0,
    missingItems,
    recommendation: missingItems.length > 0
      ? missingItems.includes("profilePicture")
        ? "Add a profile picture to personalize your account"
        : "Complete your basic profile information"
      : undefined,
  };
}

/**
 * Check body metrics section
 */
async function checkBodyMetricsSection(userId: string): Promise<SectionStatus> {
  const metrics = await db
    .select({
      weight: userMetrics.weight,
      height: userMetrics.height,
      bodyFatPercentage: userMetrics.bodyFatPercentage,
      fitnessLevel: userMetrics.fitnessLevel,
    })
    .from(userMetrics)
    .where(eq(userMetrics.userId, userId))
    .orderBy(desc(userMetrics.date))
    .limit(1);

  const m = metrics[0];
  const missingItems: string[] = [];

  if (!m) {
    return {
      section: "bodyMetrics",
      percent: 0,
      isComplete: false,
      missingItems: ["weight", "height", "fitnessLevel"],
      recommendation: "Add your body metrics for personalized workout recommendations",
    };
  }

  // Weight and height are most important
  if (!m.weight) missingItems.push("weight");
  if (!m.height) missingItems.push("height");
  if (!m.fitnessLevel) missingItems.push("fitnessLevel");
  // Body fat is optional bonus

  const totalFields = 3;
  const completedFields = totalFields - missingItems.length;
  const percent = Math.round((completedFields / totalFields) * 100);

  return {
    section: "bodyMetrics",
    percent,
    isComplete: missingItems.length === 0,
    missingItems,
    recommendation: missingItems.length > 0
      ? "Update your body metrics for more accurate workout prescriptions"
      : undefined,
  };
}

/**
 * Check equipment/locations section
 */
async function checkEquipmentSection(userId: string): Promise<SectionStatus> {
  const locations = await db
    .select({
      id: userLocations.id,
      equipment: userLocations.equipment,
    })
    .from(userLocations)
    .where(eq(userLocations.userId, userId));

  const missingItems: string[] = [];

  if (locations.length === 0) {
    return {
      section: "equipment",
      percent: 0,
      isComplete: false,
      missingItems: ["locations"],
      recommendation: "Add your gym locations to get equipment-aware workout recommendations",
    };
  }

  // Check if any location has equipment
  const hasEquipment = locations.some((l) => l.equipment && l.equipment.length > 0);
  if (!hasEquipment) {
    missingItems.push("equipment");
  }

  // Full completion requires at least one location with equipment
  const percent = hasEquipment ? 100 : 50;

  return {
    section: "equipment",
    percent,
    isComplete: hasEquipment,
    missingItems,
    recommendation: !hasEquipment
      ? "Add equipment to your gym locations for better workout recommendations"
      : undefined,
  };
}

/**
 * Check goals section
 */
async function checkGoalsSection(userId: string): Promise<SectionStatus> {
  // Get user's circle member IDs
  const members = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(eq(circleMembers.userId, userId));

  if (members.length === 0) {
    return {
      section: "goals",
      percent: 0,
      isComplete: false,
      missingItems: ["activeGoals"],
      recommendation: "Set fitness goals to track your progress",
    };
  }

  const memberIds = members.map((m) => m.id);

  // Count active goals
  const goalCount = await db
    .select({ count: count() })
    .from(goals)
    .where(
      and(
        eq(goals.status, "active"),
        // goals.memberId in memberIds
      )
    );

  const activeGoals = goalCount[0]?.count || 0;

  if (activeGoals === 0) {
    return {
      section: "goals",
      percent: 0,
      isComplete: false,
      missingItems: ["activeGoals"],
      recommendation: "Set fitness goals to track your progress and stay motivated",
    };
  }

  // Having 1+ active goals is considered complete
  return {
    section: "goals",
    percent: 100,
    isComplete: true,
    missingItems: [],
  };
}

/**
 * Check limitations section
 */
async function checkLimitationsSection(userId: string): Promise<SectionStatus> {
  // Limitations are optional, so having none is fine
  // We just want to know if user has acknowledged this section

  const limitations = await db
    .select({ id: userLimitations.id })
    .from(userLimitations)
    .where(
      and(
        eq(userLimitations.userId, userId),
        eq(userLimitations.active, true)
      )
    );

  // For completeness, we'll check if they have any limitations OR if they've explicitly said they have none
  // Since we can't easily track "no limitations", we'll consider this section complete if they have limitations
  // or give partial credit just for having the section available

  // Give full credit since limitations are optional
  return {
    section: "limitations",
    percent: 100,
    isComplete: true,
    missingItems: [],
    recommendation: limitations.length === 0
      ? "Add any injuries or limitations to get safer workout recommendations"
      : undefined,
  };
}

/**
 * Check skills section
 */
async function checkSkillsSection(userId: string): Promise<SectionStatus> {
  const skills = await db
    .select({ id: userSkills.id })
    .from(userSkills)
    .where(eq(userSkills.userId, userId));

  if (skills.length === 0) {
    return {
      section: "skills",
      percent: 0,
      isComplete: false,
      missingItems: ["skills"],
      recommendation: "Add your athletic skills to earn achievement badges",
    };
  }

  return {
    section: "skills",
    percent: 100,
    isComplete: true,
    missingItems: [],
  };
}

/**
 * Check sports section
 */
async function checkSportsSection(userId: string): Promise<SectionStatus> {
  const sports = await db
    .select({ id: userSports.id })
    .from(userSports)
    .where(eq(userSports.userId, userId));

  if (sports.length === 0) {
    return {
      section: "sports",
      percent: 0,
      isComplete: false,
      missingItems: ["sports"],
      recommendation: "Add sports you play to display badges on your profile",
    };
  }

  return {
    section: "sports",
    percent: 100,
    isComplete: true,
    missingItems: [],
  };
}

/**
 * Update the cached completeness status for a user
 */
export async function updateCompletenessCache(userId: string): Promise<ProfileCompleteness> {
  const completeness = await calculateCompleteness(userId);

  // Upsert the cache
  await db
    .insert(profileCompletenessCache)
    .values({
      userId,
      overallPercent: completeness.overallPercent,
      sections: completeness.sections,
      missingFields: completeness.missingFields,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: profileCompletenessCache.userId,
      set: {
        overallPercent: completeness.overallPercent,
        sections: completeness.sections,
        missingFields: completeness.missingFields,
        lastUpdated: new Date(),
      },
    });

  return completeness;
}

/**
 * Get cached completeness status (or calculate if not cached)
 */
export async function getCompleteness(userId: string): Promise<ProfileCompleteness> {
  const cached = await db
    .select()
    .from(profileCompletenessCache)
    .where(eq(profileCompletenessCache.userId, userId))
    .limit(1);

  // If cache exists and is less than 1 hour old, use it
  if (cached.length > 0) {
    const cacheAge = Date.now() - new Date(cached[0].lastUpdated).getTime();
    const ONE_HOUR = 60 * 60 * 1000;

    if (cacheAge < ONE_HOUR) {
      // Return cached data with calculated section statuses
      return {
        overallPercent: cached[0].overallPercent,
        sections: cached[0].sections as Record<ProfileSection, number>,
        missingFields: cached[0].missingFields as string[],
        sectionStatuses: [], // Would need to recalculate for full statuses
        recommendations: [], // Would need to recalculate
      };
    }
  }

  // Calculate and cache
  return updateCompletenessCache(userId);
}

/**
 * Dismiss a prompt for a user
 */
export async function dismissPrompt(userId: string, promptId: string): Promise<void> {
  const cached = await db
    .select({ dismissedPrompts: profileCompletenessCache.dismissedPrompts })
    .from(profileCompletenessCache)
    .where(eq(profileCompletenessCache.userId, userId))
    .limit(1);

  const currentDismissed = (cached[0]?.dismissedPrompts as string[]) || [];

  if (!currentDismissed.includes(promptId)) {
    await db
      .update(profileCompletenessCache)
      .set({
        dismissedPrompts: [...currentDismissed, promptId],
      })
      .where(eq(profileCompletenessCache.userId, userId));
  }
}

/**
 * Check if a user has dismissed a specific prompt
 */
export async function isPromptDismissed(userId: string, promptId: string): Promise<boolean> {
  const cached = await db
    .select({ dismissedPrompts: profileCompletenessCache.dismissedPrompts })
    .from(profileCompletenessCache)
    .where(eq(profileCompletenessCache.userId, userId))
    .limit(1);

  const dismissed = (cached[0]?.dismissedPrompts as string[]) || [];
  return dismissed.includes(promptId);
}

/**
 * Check if user has equipment set up (for workout generation prompts)
 */
export async function hasEquipmentSetup(userId: string): Promise<boolean> {
  const locations = await db
    .select({
      id: userLocations.id,
      equipment: userLocations.equipment,
    })
    .from(userLocations)
    .where(eq(userLocations.userId, userId));

  return locations.some((l) => l.equipment && l.equipment.length > 0);
}

/**
 * Get specific recommendations based on what action the user is trying to take
 */
export async function getContextualRecommendations(
  userId: string,
  context: "workout_generation" | "goal_setting" | "profile_view"
): Promise<{ promptId: string; message: string; action: string; actionUrl: string }[]> {
  const recommendations: { promptId: string; message: string; action: string; actionUrl: string }[] = [];

  switch (context) {
    case "workout_generation": {
      const hasEquipment = await hasEquipmentSetup(userId);
      if (!hasEquipment) {
        recommendations.push({
          promptId: "equipment_for_workout",
          message: "Add your gym equipment for personalized workouts",
          action: "Add Equipment",
          actionUrl: "/equipment",
        });
      }

      // Check if user has fitness level set
      const metrics = await db
        .select({ fitnessLevel: userMetrics.fitnessLevel })
        .from(userMetrics)
        .where(eq(userMetrics.userId, userId))
        .orderBy(desc(userMetrics.date))
        .limit(1);

      if (!metrics[0]?.fitnessLevel) {
        recommendations.push({
          promptId: "fitness_level_for_workout",
          message: "Set your fitness level for better workout intensity",
          action: "Update Profile",
          actionUrl: "/you?section=health",
        });
      }
      break;
    }

    case "goal_setting": {
      // Check if user has body metrics for goal tracking
      const metrics = await db
        .select({ weight: userMetrics.weight })
        .from(userMetrics)
        .where(eq(userMetrics.userId, userId))
        .limit(1);

      if (!metrics[0]?.weight) {
        recommendations.push({
          promptId: "metrics_for_goals",
          message: "Add your current weight to track progress",
          action: "Add Metrics",
          actionUrl: "/you?section=health",
        });
      }
      break;
    }

    case "profile_view": {
      const completeness = await calculateCompleteness(userId);
      
      if (completeness.overallPercent < 80) {
        // Add top recommendations
        for (const rec of completeness.recommendations.slice(0, 2)) {
          recommendations.push({
            promptId: `profile_${rec.toLowerCase().replace(/\s+/g, "_").substring(0, 30)}`,
            message: rec,
            action: "Complete",
            actionUrl: "/you",
          });
        }
      }
      break;
    }
  }

  // Filter out dismissed prompts
  const cached = await db
    .select({ dismissedPrompts: profileCompletenessCache.dismissedPrompts })
    .from(profileCompletenessCache)
    .where(eq(profileCompletenessCache.userId, userId))
    .limit(1);

  const dismissed = (cached[0]?.dismissedPrompts as string[]) || [];

  return recommendations.filter((r) => !dismissed.includes(r.promptId));
}
