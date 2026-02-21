/**
 * Gender-Based Rx Weight Prescription
 *
 * Calculates gender-averaged "Rx" weights for groups with >3 members.
 * For groups of 3 or fewer, the existing per-member prescription system
 * in memberPrescriptions is used instead.
 *
 * Algorithm:
 * 1. Group members by gender
 * 2. Find PR data for the exercise (or similar exercises)
 * 3. Normalize to estimated 1RM via Epley formula
 * 4. Average 1RMs per gender group
 * 5. Apply working weight percentage based on intensity
 * 6. Round to nearest 5 lbs
 * 7. Fallback to standard CrossFit Rx weights if no PR data
 */

interface MemberPRData {
  id: string;
  name: string;
  gender: string | null; // "male" | "female" | "other" | null
  personalRecords: Array<{
    exerciseName: string;
    value: number;
    unit: string;
    repMax: number | null;
  }>;
}

export interface RxWeightResult {
  rxMen: string | null;
  rxWomen: string | null;
  calculation: string;
}

/** Standard CrossFit Rx weights (lbs) — fallback when no PR data exists */
const STANDARD_RX_WEIGHTS: Record<string, { men: number; women: number }> = {
  "back squat": { men: 225, women: 155 },
  "front squat": { men: 185, women: 125 },
  "overhead squat": { men: 135, women: 95 },
  "deadlift": { men: 315, women: 225 },
  "clean": { men: 135, women: 95 },
  "clean and jerk": { men: 135, women: 95 },
  "power clean": { men: 135, women: 95 },
  "snatch": { men: 95, women: 65 },
  "power snatch": { men: 95, women: 65 },
  "bench press": { men: 185, women: 105 },
  "overhead press": { men: 115, women: 75 },
  "push press": { men: 115, women: 75 },
  "thruster": { men: 95, women: 65 },
  "wall ball": { men: 20, women: 14 },
  "kettlebell swing": { men: 53, women: 35 },
  "dumbbell snatch": { men: 50, women: 35 },
  "sumo deadlift high pull": { men: 75, women: 55 },
  "barbell row": { men: 135, women: 95 },
  "hip thrust": { men: 225, women: 135 },
  "goblet squat": { men: 53, women: 35 },
  "dumbbell press": { men: 50, women: 30 },
  "dumbbell curl": { men: 35, women: 20 },
  "dumbbell row": { men: 50, women: 30 },
  "lunges": { men: 135, women: 95 },
  "bulgarian split squat": { men: 95, women: 65 },
};

/** Intensity → working weight percentage of 1RM */
const INTENSITY_PERCENTAGE: Record<string, number> = {
  light: 0.55,
  moderate: 0.65,
  hard: 0.75,
  max: 0.85,
};

/**
 * Estimate 1RM using the Epley formula.
 * 1RM = weight × (1 + reps/30)
 * Capped at 10 reps for accuracy.
 */
function estimateOneRepMax(weight: number, reps: number): number {
  const cappedReps = Math.min(reps, 10);
  if (cappedReps <= 1) return weight;
  return weight * (1 + cappedReps / 30);
}

/** Round to nearest 5 lbs */
function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

/** Normalize exercise name for matching */
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
}

/** Find a PR for an exercise name with fuzzy matching */
function findPRForExercise(
  exerciseName: string,
  prs: MemberPRData["personalRecords"]
): { value: number; repMax: number } | null {
  const normalized = normalizeExerciseName(exerciseName);

  // Exact match first
  for (const pr of prs) {
    if (normalizeExerciseName(pr.exerciseName) === normalized) {
      return { value: pr.value, repMax: pr.repMax ?? 1 };
    }
  }

  // Partial match (exercise name contains the search term or vice versa)
  for (const pr of prs) {
    const prNorm = normalizeExerciseName(pr.exerciseName);
    if (prNorm.includes(normalized) || normalized.includes(prNorm)) {
      return { value: pr.value, repMax: pr.repMax ?? 1 };
    }
  }

  return null;
}

/**
 * Calculate gender-based Rx weights for a single exercise.
 */
export function calculateGenderRx(
  exerciseName: string,
  members: MemberPRData[],
  intensity: string = "moderate"
): RxWeightResult {
  const pct = INTENSITY_PERCENTAGE[intensity] ?? 0.65;

  // Group members by gender
  const menMembers = members.filter((m) => m.gender === "male");
  const womenMembers = members.filter((m) => m.gender === "female");

  // Calculate average 1RM per gender group
  function avgOneRM(group: MemberPRData[]): number | null {
    const estimates: number[] = [];
    for (const member of group) {
      const pr = findPRForExercise(exerciseName, member.personalRecords);
      if (pr) {
        estimates.push(estimateOneRepMax(pr.value, pr.repMax));
      }
    }
    if (estimates.length === 0) return null;
    return estimates.reduce((a, b) => a + b, 0) / estimates.length;
  }

  const menAvg1RM = avgOneRM(menMembers);
  const womenAvg1RM = avgOneRM(womenMembers);

  // Check for standard Rx fallback
  const normalized = normalizeExerciseName(exerciseName);
  const standardRx = STANDARD_RX_WEIGHTS[normalized];

  let rxMen: string | null = null;
  let rxWomen: string | null = null;
  let calculation: string;

  if (menAvg1RM !== null) {
    const working = roundToNearest5(menAvg1RM * pct);
    rxMen = `${working} lbs`;
    calculation = `Men: ${Math.round(menAvg1RM)} avg 1RM × ${Math.round(pct * 100)}% = ${working} lbs`;
  } else if (standardRx) {
    rxMen = `${standardRx.men} lbs`;
    calculation = `Men: Standard Rx ${standardRx.men} lbs (no PR data)`;
  } else {
    calculation = "Men: No PR data or standard Rx available";
  }

  if (womenAvg1RM !== null) {
    const working = roundToNearest5(womenAvg1RM * pct);
    rxWomen = `${working} lbs`;
    calculation += ` | Women: ${Math.round(womenAvg1RM)} avg 1RM × ${Math.round(pct * 100)}% = ${working} lbs`;
  } else if (standardRx) {
    rxWomen = `${standardRx.women} lbs`;
    calculation += ` | Women: Standard Rx ${standardRx.women} lbs (no PR data)`;
  } else {
    calculation += " | Women: No PR data or standard Rx available";
  }

  return { rxMen, rxWomen, calculation };
}

/**
 * Batch calculate Rx weights for all exercises in a workout.
 * Returns a map of exerciseName → RxWeightResult.
 */
export function calculateAllRxWeights(
  exerciseNames: string[],
  members: MemberPRData[],
  intensity: string = "moderate"
): Map<string, RxWeightResult> {
  const results = new Map<string, RxWeightResult>();
  for (const name of exerciseNames) {
    results.set(name, calculateGenderRx(name, members, intensity));
  }
  return results;
}

/** Check if gender-Rx prescription should be used (>3 members) */
export function shouldUseGenderRx(memberCount: number): boolean {
  // Uses INDIVIDUAL_RX_THRESHOLD from workout contract (currently 3)
  return memberCount > 3; // Groups <= 3 get individual prescriptions from PRs
}
