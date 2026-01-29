/**
 * Badge System Types
 */

export type BadgeCategory =
  | "strength"
  | "skill"
  | "sport"
  | "consistency"
  | "challenge"
  | "program"
  | "social"
  | "track"
  | "milestone";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type BadgeCriteriaType =
  | "pr_total" // Combined PR total (e.g., 1000lb club)
  | "pr_single" // Single exercise PR (e.g., 225 bench)
  | "pr_bodyweight_ratio" // PR as ratio of bodyweight
  | "skill_achieved" // Specific skill achieved
  | "sport" // Sports participation
  | "streak" // Workout streak
  | "workout_count" // Total workouts completed
  | "challenge_complete" // Challenge completion
  | "program_complete" // Program completion
  | "followers" // Follower count
  | "circles_created" // Circles created
  | "track_time" // Track times (mile, sprint, etc.)
  | "first_login" // First login after onboarding
  | "profile_complete" // Profile completion percentage
  | "onboarding_complete"; // Completed onboarding

export interface BadgeCriteria {
  type: BadgeCriteriaType;
  // For PR-based badges
  exercises?: string[]; // Exercise names to consider
  totalValue?: number; // For combined PR badges (1000lb club = 1000)
  singleValue?: number; // For single exercise PR badges (225 bench = 225)
  // For bodyweight ratio badges
  bodyweightRatio?: number; // e.g., 2.0 for 2x bodyweight
  // For skill badges
  skillName?: string;
  skillStatus?: "achieved" | "mastered";
  // For sport badges
  sport?: string;
  // For consistency badges
  streakDays?: number;
  workoutCount?: number;
  // For challenge/program badges
  challengeId?: string;
  programId?: string;
  // For social badges
  followerCount?: number;
  circleCount?: number;
  // For track badges
  trackDistance?: number; // in meters (1609.34 for mile, 100 for 100m sprint)
  trackTime?: number; // in seconds (300 for 5-min mile, 11 for 11s 100m)
  // For milestone badges
  profilePercent?: number; // e.g., 50 for 50% profile complete
}

export interface BadgeProgress {
  badgeId: string;
  badgeName: string;
  category: BadgeCategory;
  tier: BadgeTier;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  isEarned: boolean;
  earnedAt?: Date;
}

export interface BadgeCheckResult {
  eligible: boolean;
  badgeId: string;
  metadata?: {
    prValue?: number;
    prUnit?: string;
    trackTime?: number;
    challengeName?: string;
    programName?: string;
  };
}

// Sports list for sport badges
export const SUPPORTED_SPORTS = [
  "baseball",
  "basketball",
  "boxing",
  "crossfit",
  "cycling",
  "football",
  "golf",
  "gymnastics",
  "hockey",
  "lacrosse",
  "martial_arts",
  "mma",
  "olympic_weightlifting",
  "pickleball",
  "powerlifting",
  "rowing",
  "rugby",
  "running",
  "soccer",
  "softball",
  "swimming",
  "tennis",
  "track_field",
  "triathlon",
  "volleyball",
  "wrestling",
  "yoga",
] as const;

export type SupportedSport = (typeof SUPPORTED_SPORTS)[number];

// Skill badges
export const SUPPORTED_SKILLS = [
  // Gymnastics
  "back_tuck",
  "back_handspring",
  "back_layout",
  "front_tuck",
  "front_handspring",
  "roundoff",
  "aerial",
  "standing_back_tuck",
  // Calisthenics
  "handstand",
  "handstand_walk",
  "handstand_pushup",
  "muscle_up",
  "strict_muscle_up",
  "bar_muscle_up",
  "ring_muscle_up",
  "pistol_squat",
  "nordic_curl",
  "planche",
  "front_lever",
  "back_lever",
  "l_sit",
  "human_flag",
  // Flexibility
  "splits",
  "middle_splits",
  "bridge",
] as const;

export type SupportedSkill = (typeof SUPPORTED_SKILLS)[number];

// Sport levels
export const SPORT_LEVELS = [
  "recreational",
  "youth",
  "high_school",
  "college",
  "amateur",
  "semi_pro",
  "professional",
] as const;

export type SportLevel = (typeof SPORT_LEVELS)[number];
