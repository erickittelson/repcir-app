/**
 * Workout Data Contract
 *
 * Single source of truth for workout configuration constants.
 * Used by BOTH the AI generation system AND the manual workout builder.
 *
 * If you change something here, both systems stay aligned automatically.
 * See also: src/lib/ai/schemas/workout-data-contract.yaml (spec doc)
 */

// =============================================================================
// FOCUS AREAS
// =============================================================================

export interface FocusOption {
  value: string;
  label: string;
}

/** Primary training split — single select */
export const PRIMARY_FOCUS: FocusOption[] = [
  { value: "full_body", label: "Full Body" },
  { value: "upper_body", label: "Upper Body" },
  { value: "lower_body", label: "Lower Body" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
];

/** Emphasis muscles per split — multi-select, max 3 */
export const EMPHASIS_BY_SPLIT: Record<string, FocusOption[]> = {
  full_body: [
    { value: "chest", label: "Chest" },
    { value: "back", label: "Back" },
    { value: "shoulders", label: "Shoulders" },
    { value: "arms", label: "Arms" },
    { value: "core", label: "Core" },
    { value: "glutes", label: "Glutes" },
    { value: "legs", label: "Legs" },
  ],
  upper_body: [
    { value: "chest", label: "Chest" },
    { value: "back", label: "Back" },
    { value: "shoulders", label: "Shoulders" },
    { value: "arms", label: "Arms" },
    { value: "core", label: "Core" },
  ],
  lower_body: [
    { value: "quads", label: "Quads" },
    { value: "hamstrings", label: "Hamstrings" },
    { value: "glutes", label: "Glutes" },
    { value: "calves", label: "Calves" },
    { value: "core", label: "Core" },
  ],
  push: [
    { value: "chest", label: "Chest" },
    { value: "shoulders", label: "Shoulders" },
    { value: "triceps", label: "Triceps" },
  ],
  pull: [
    { value: "back", label: "Back" },
    { value: "biceps", label: "Biceps" },
    { value: "rear_delts", label: "Rear Delts" },
  ],
};

export const MAX_EMPHASIS = 3;
export const DEFAULT_PRIMARY_FOCUS = "full_body";

// =============================================================================
// INTENSITY
// =============================================================================

export interface IntensityOption {
  value: string;
  label: string;
  color: string;
  rpeRange: [number, number];
}

export const INTENSITY_LEVELS: IntensityOption[] = [
  { value: "light", label: "Light", color: "text-green-500 border-green-500/30 bg-green-500/10", rpeRange: [5, 7] },
  { value: "moderate", label: "Moderate", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10", rpeRange: [7, 8] },
  { value: "hard", label: "Hard", color: "text-orange-500 border-orange-500/30 bg-orange-500/10", rpeRange: [8, 9] },
  { value: "max", label: "Max", color: "text-red-500 border-red-500/30 bg-red-500/10", rpeRange: [9, 10] },
];

export const DEFAULT_INTENSITY = "moderate";

// =============================================================================
// DURATION
// =============================================================================

export const DURATION_PRESETS = [15, 30, 45, 60, 90];
export const DEFAULT_DURATION = 30;

// =============================================================================
// WORKOUT STRUCTURE TYPES
// =============================================================================

export interface StructureOption {
  value: string;
  label: string;
  description: string;
}

export const STRUCTURE_TYPES: StructureOption[] = [
  { value: "standard", label: "Standard", description: "Traditional sets and reps" },
  { value: "superset", label: "Superset", description: "Two exercises back-to-back" },
  { value: "circuit", label: "Circuit", description: "Multiple exercises in a row" },
  { value: "emom", label: "EMOM", description: "Every minute on the minute" },
  { value: "amrap", label: "AMRAP", description: "As many rounds as possible" },
  { value: "interval", label: "Interval", description: "Work/rest intervals" },
  { value: "tabata", label: "Tabata", description: "20s work / 10s rest" },
];

export const MAX_WORKOUT_SECTIONS = 5;
export const DEFAULT_STRUCTURE = "standard";

// =============================================================================
// WEIGHT PRESCRIPTION
// =============================================================================

/** Groups <= this size get individual weight prescriptions from PRs */
export const INDIVIDUAL_RX_THRESHOLD = 3;

/** Percentage of 1RM by rep range for weight prescription */
export const PERCENT_OF_MAX = {
  strength: { reps: [1, 5] as [number, number], percent: [75, 90] as [number, number] },
  hypertrophy: { reps: [6, 12] as [number, number], percent: [60, 75] as [number, number] },
  endurance: { reps: [12, 30] as [number, number], percent: [40, 60] as [number, number] },
};

// =============================================================================
// DIFFICULTY
// =============================================================================

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

// =============================================================================
// CATEGORIES
// =============================================================================

export const WORKOUT_CATEGORIES = ["strength", "cardio", "hiit", "mixed", "skill", "recovery"] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

// =============================================================================
// EXERCISE GROUP TYPES
// =============================================================================

export const GROUP_TYPES = ["superset", "circuit", "triset", "giant_set", "drop_set"] as const;
export type GroupType = (typeof GROUP_TYPES)[number];
