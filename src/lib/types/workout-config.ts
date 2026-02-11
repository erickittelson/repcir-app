/**
 * Workout Config Form Data Contract
 *
 * Used by the inline chat config form to collect workout generation parameters,
 * the chat trigger API to validate + dispatch to Inngest, and the Inngest
 * background function to generate the workout.
 */

export type WorkoutType =
  | "standard"
  | "emom"
  | "amrap"
  | "for_time"
  | "tabata"
  | "superset"
  | "circuit"
  | "intervals";

export type WorkoutIntensity = "light" | "moderate" | "hard" | "max";

export type TargetType = "individual" | "circle" | "selected_members";

/** A section within a multi-structure workout (e.g., Standard lifts + EMOM finisher) */
export interface WorkoutStructureSection {
  workoutType: WorkoutType;
  label?: string; // e.g., "Main Lifts", "Finisher"
  order: number;
}

export interface WorkoutConfigFormData {
  targetType: TargetType;
  circleId?: string; // optional — server falls back to active circle
  memberIds?: string[];
  guestMemberUserIds?: string[]; // connections added from outside the circle
  workoutSections: WorkoutStructureSection[]; // replaces single workoutType
  duration: number; // minutes
  goalIds?: string[]; // selected member goal IDs (multi-select)
  circleGoalIds?: string[]; // selected circle goal IDs
  locationId?: string;
  intensity: WorkoutIntensity;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
  conversationId?: string;
}

/** Member context returned by /api/members/context for the config form */
export interface MemberContextForForm {
  currentUserId: string;
  currentUserMemberId: string;
  circles: Array<{
    id: string;
    name: string;
    role: string;
    memberId: string;
    isSystemCircle: boolean;
  }>;
  members: Array<{
    id: string;
    userId: string;
    name: string;
    gender: string | null;
    profilePicture: string | null;
    isCurrentUser: boolean;
    goals: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
    }>;
  }>;
  circleGoals: Array<{
    id: string;
    title: string;
    category: string;
    priority: number;
  }>;
  locations: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    equipment: string[];
  }>;
}

/** Generation job status returned by the polling endpoint */
export interface GenerationJobStatus {
  status: "pending" | "generating" | "complete" | "error";
  planId?: string;
  workout?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
}
