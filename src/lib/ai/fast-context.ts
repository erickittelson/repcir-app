/**
 * Fast Context Loader - January 2026
 *
 * Uses snapshot tables for sub-100ms AI context loading
 * Replaces the slower getMemberContext() for time-critical operations
 *
 * Performance targets:
 * - Single member context: < 50ms
 * - Multi-member context: < 100ms
 * - Full workout generation context: < 150ms
 */

import { dbRead, parallelRead, cachedRead } from "@/lib/db";
import { memberContextSnapshot, circleEquipment, exercises, circleMembers } from "@/lib/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { getProgrammingRulesForPrompt, getCoachingModeForPrompt } from "./schemas/loader";

// =============================================================================
// TYPES
// =============================================================================

export interface FastMemberContext {
  memberId: string;
  name: string;
  age: number | null;
  fitnessLevel: string | null;
  trainingAge: string | null;

  // Current state
  currentWeight: number | null;
  currentBodyFat: number | null;

  // Pre-computed data
  activeLimitations: Array<{
    type: string;
    description: string;
    severity: string;
    affectedAreas: string[];
  }>;

  activeGoals: Array<{
    id: string;
    title: string;
    category: string;
    targetValue: number;
    currentValue: number;
    progressPercent: number;
    targetDate: string;
  }>;

  personalRecords: Array<{
    exercise: string;
    value: number;
    unit: string;
    repMax?: number;
    date: string;
  }>;

  skills: Array<{
    name: string;
    status: string;
    category: string;
  }>;

  muscleRecoveryStatus: Record<
    string,
    {
      status: string;
      hoursSinceWorked: number;
      readyToTrain: boolean;
    }
  >;

  // Training patterns
  weeklyWorkoutAvg: number | null;
  avgWorkoutDuration: number | null;
  needsDeload: boolean;

  // Feedback
  avgMood: string | null;
  avgEnergyLevel: number | null;

  // Equipment
  availableEquipment: string[];

  // Metadata
  lastWorkoutDate: Date | null;
  snapshotAge: number; // milliseconds since last update
}

export interface FastWorkoutContext extends FastMemberContext {
  // Exercise library (subset relevant to this workout)
  relevantExercises: Array<{
    id: string;
    name: string;
    category: string;
    primaryMuscles: string[];
    equipment: string[];
    difficulty: string;
  }>;

  // Programming rules
  programmingRules: string;

  // Recovery-ready muscles
  readyMuscleGroups: string[];
  recoveringMuscleGroups: string[];
}

// =============================================================================
// SNAPSHOT LOADING
// =============================================================================

/**
 * Load member context from snapshot table
 * Target: < 50ms
 */
export async function getFastMemberContext(memberId: string): Promise<FastMemberContext | null> {
  const start = performance.now();

  // Parallel load snapshot and member name for efficiency
  const [snapshotResult, memberResult] = await Promise.all([
    cachedRead(
      `member-context:${memberId}`,
      async (db) => {
        return db
          .select()
          .from(memberContextSnapshot)
          .where(eq(memberContextSnapshot.memberId, memberId))
          .limit(1);
      },
      30 // 30 second cache
    ),
    cachedRead(
      `member-name:${memberId}`,
      async (db) => {
        return db
          .select({ name: circleMembers.name, dateOfBirth: circleMembers.dateOfBirth })
          .from(circleMembers)
          .where(eq(circleMembers.id, memberId))
          .limit(1);
      },
      300 // 5 minute cache for names
    ),
  ]);

  if (!snapshotResult || snapshotResult.length === 0) {
    console.warn(`No snapshot found for member ${memberId}, falling back to live query`);
    return null;
  }

  const s = snapshotResult[0];
  const member = memberResult?.[0];
  const elapsed = performance.now() - start;

  if (elapsed > 50) {
    console.warn(`Slow context load: ${elapsed.toFixed(1)}ms for member ${memberId}`);
  }

  // Calculate age from date of birth
  let age: number | null = null;
  if (member?.dateOfBirth) {
    const birthDate = new Date(member.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  return {
    memberId: s.memberId,
    name: member?.name || "Member",
    age,
    fitnessLevel: s.fitnessLevel,
    trainingAge: s.trainingAge,
    currentWeight: s.currentWeight ? parseFloat(s.currentWeight) : null,
    currentBodyFat: s.currentBodyFat ? parseFloat(s.currentBodyFat) : null,
    activeLimitations: s.activeLimitations || [],
    activeGoals: s.activeGoals || [],
    personalRecords: s.personalRecords || [],
    skills: s.skills || [],
    muscleRecoveryStatus: s.muscleRecoveryStatus || {},
    weeklyWorkoutAvg: s.weeklyWorkoutAvg ? parseFloat(s.weeklyWorkoutAvg) : null,
    avgWorkoutDuration: s.avgWorkoutDuration,
    needsDeload: s.needsDeload || false,
    avgMood: s.avgMood,
    avgEnergyLevel: s.avgEnergyLevel ? parseFloat(s.avgEnergyLevel) : null,
    availableEquipment: s.availableEquipment || [],
    lastWorkoutDate: s.lastWorkoutDate,
    snapshotAge: s.lastUpdated ? Date.now() - s.lastUpdated.getTime() : Infinity,
  };
}

/**
 * Load multiple member contexts in parallel
 * Target: < 100ms
 */
export async function getFastMemberContexts(
  memberIds: string[]
): Promise<Map<string, FastMemberContext>> {
  const start = performance.now();

  // Parallel load snapshots and member names
  const [snapshots, members] = await Promise.all([
    dbRead
      .select()
      .from(memberContextSnapshot)
      .where(inArray(memberContextSnapshot.memberId, memberIds)),
    dbRead
      .select({ id: circleMembers.id, name: circleMembers.name, dateOfBirth: circleMembers.dateOfBirth })
      .from(circleMembers)
      .where(inArray(circleMembers.id, memberIds)),
  ]);

  // Create a map of member names and dates of birth
  const memberInfo = new Map(members.map(m => [m.id, { name: m.name, dateOfBirth: m.dateOfBirth }]));

  const result = new Map<string, FastMemberContext>();

  for (const s of snapshots) {
    const info = memberInfo.get(s.memberId);

    // Calculate age from date of birth
    let age: number | null = null;
    if (info?.dateOfBirth) {
      const birthDate = new Date(info.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    result.set(s.memberId, {
      memberId: s.memberId,
      name: info?.name || "Member",
      age,
      fitnessLevel: s.fitnessLevel,
      trainingAge: s.trainingAge,
      currentWeight: s.currentWeight ? parseFloat(s.currentWeight) : null,
      currentBodyFat: s.currentBodyFat ? parseFloat(s.currentBodyFat) : null,
      activeLimitations: s.activeLimitations || [],
      activeGoals: s.activeGoals || [],
      personalRecords: s.personalRecords || [],
      skills: s.skills || [],
      muscleRecoveryStatus: s.muscleRecoveryStatus || {},
      weeklyWorkoutAvg: s.weeklyWorkoutAvg ? parseFloat(s.weeklyWorkoutAvg) : null,
      avgWorkoutDuration: s.avgWorkoutDuration,
      needsDeload: s.needsDeload || false,
      avgMood: s.avgMood,
      avgEnergyLevel: s.avgEnergyLevel ? parseFloat(s.avgEnergyLevel) : null,
      availableEquipment: s.availableEquipment || [],
      lastWorkoutDate: s.lastWorkoutDate,
      snapshotAge: s.lastUpdated ? Date.now() - s.lastUpdated.getTime() : Infinity,
    });
  }

  const elapsed = performance.now() - start;
  if (elapsed > 100) {
    console.warn(`Slow multi-context load: ${elapsed.toFixed(1)}ms for ${memberIds.length} members`);
  }

  return result;
}

/**
 * Load full workout generation context
 * Target: < 150ms
 */
export async function getFastWorkoutContext(
  memberId: string,
  circleId: string,
  options: {
    muscleGroups?: string[];
    equipment?: string[];
    category?: string;
    difficulty?: string;
  } = {}
): Promise<FastWorkoutContext | null> {
  const start = performance.now();

  // Parallel load all required data
  const [memberContext, relevantExercises, equipment] = await Promise.all([
    getFastMemberContext(memberId),
    loadRelevantExercises(options),
    loadCircleEquipment(circleId),
  ]);

  if (!memberContext) return null;

  // Determine muscle readiness
  const readyMuscleGroups: string[] = [];
  const recoveringMuscleGroups: string[] = [];

  for (const [muscle, status] of Object.entries(memberContext.muscleRecoveryStatus)) {
    if (status.readyToTrain) {
      readyMuscleGroups.push(muscle);
    } else {
      recoveringMuscleGroups.push(muscle);
    }
  }

  const elapsed = performance.now() - start;
  if (elapsed > 150) {
    console.warn(`Slow workout context load: ${elapsed.toFixed(1)}ms`);
  }

  return {
    ...memberContext,
    availableEquipment: equipment,
    relevantExercises,
    programmingRules: getProgrammingRulesForPrompt(),
    readyMuscleGroups,
    recoveringMuscleGroups,
  };
}

// =============================================================================
// EXERCISE LOADING
// =============================================================================

/**
 * Load exercises relevant for workout generation
 * Uses consolidated exercises table
 */
async function loadRelevantExercises(options: {
  muscleGroups?: string[];
  equipment?: string[];
  category?: string;
  difficulty?: string;
}): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    primaryMuscles: string[];
    equipment: string[];
    difficulty: string;
  }>
> {
  const results = await dbRead
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      muscleGroups: exercises.muscleGroups,
      equipment: exercises.equipment,
      difficulty: exercises.difficulty,
    })
    .from(exercises)
    .limit(200);

  return results.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    primaryMuscles: (e.muscleGroups as string[]) || [],
    equipment: (e.equipment as string[]) || [],
    difficulty: e.difficulty || "intermediate",
  }));
}

/**
 * Load circle's available equipment
 */
async function loadCircleEquipment(circleId: string): Promise<string[]> {
  const equipment = await cachedRead(
    `circle-equipment:${circleId}`,
    async (db) => {
      return db
        .select({ name: circleEquipment.name })
        .from(circleEquipment)
        .where(eq(circleEquipment.circleId, circleId));
    },
    300 // 5 minute cache
  );

  return equipment.map((e) => e.name);
}

// =============================================================================
// SNAPSHOT UPDATES
// =============================================================================

/**
 * Update member's context snapshot
 * Called after workouts, goal updates, etc.
 */
export async function updateMemberSnapshot(
  memberId: string,
  updates: Partial<typeof memberContextSnapshot.$inferInsert>
): Promise<void> {
  const { db } = await import("@/lib/db");

  await db
    .insert(memberContextSnapshot)
    .values({
      memberId,
      ...updates,
      lastUpdated: new Date(),
      snapshotVersion: 1,
    })
    .onConflictDoUpdate({
      target: memberContextSnapshot.memberId,
      set: {
        ...updates,
        lastUpdated: new Date(),
        snapshotVersion: sql`${memberContextSnapshot.snapshotVersion} + 1`,
      },
    });
}

/**
 * Rebuild snapshot from source tables
 * Use when snapshot is stale or missing
 */
export async function rebuildMemberSnapshot(memberId: string): Promise<void> {
  // Import the full context builder
  const { getMemberContext } = await import("./index");

  const context = await getMemberContext(memberId);
  if (!context) return;

  // Transform to snapshot format
  await updateMemberSnapshot(memberId, {
    currentWeight: context.currentMetrics?.weight?.toString(),
    currentBodyFat: context.currentMetrics?.bodyFatPercentage?.toString(),
    fitnessLevel: context.currentMetrics?.fitnessLevel,
    activeLimitations: context.limitations.map((l) => ({
      type: l.type,
      description: l.description,
      severity: l.severity || "moderate",
      affectedAreas: (l.affectedAreas as string[]) || [],
    })),
    activeGoals: context.goals
      .filter((g) => g.status === "active")
      .map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        targetValue: g.targetValue || 0,
        currentValue: g.currentValue || 0,
        progressPercent: g.targetValue
          ? ((g.currentValue || 0) / g.targetValue) * 100
          : 0,
        targetDate: g.targetDate?.toISOString() || "",
      })),
    personalRecords: context.personalRecords.slice(0, 20).map((pr) => ({
      exercise: pr.exercise,
      value: pr.value,
      unit: pr.unit,
      repMax: pr.repMax ?? undefined,
      date: pr.date?.toISOString() || "",
    })),
    skills: context.skills.map((s) => ({
      name: s.name,
      status: s.status,
      category: s.category,
    })),
    muscleRecoveryStatus: context.trainingAnalysis?.muscleRecoveryStatus,
    weeklyWorkoutAvg: context.trainingAnalysis?.weeklyStats?.thisWeek?.workouts?.toString(),
    consecutiveTrainingWeeks: context.trainingAnalysis?.consecutiveWeeksTraining,
    needsDeload: context.trainingAnalysis?.needsDeload,
    lastWorkoutDate: context.recentWorkouts[0]?.date
      ? new Date(context.recentWorkouts[0].date)
      : null,
  });
}

// =============================================================================
// PROMPT GENERATION
// =============================================================================

/**
 * Generate a compact prompt from fast context
 * Optimized for token efficiency
 */
export function contextToPrompt(context: FastMemberContext): string {
  const lines: string[] = [];

  // Basic info
  if (context.fitnessLevel) {
    lines.push(`Fitness Level: ${context.fitnessLevel}`);
  }

  // Limitations (critical for safety)
  if (context.activeLimitations.length > 0) {
    lines.push("\n⚠️ LIMITATIONS:");
    for (const l of context.activeLimitations) {
      lines.push(`- ${l.type}: ${l.description} [${l.affectedAreas.join(", ")}]`);
    }
  }

  // Goals
  if (context.activeGoals.length > 0) {
    lines.push("\nGoals:");
    for (const g of context.activeGoals.slice(0, 3)) {
      lines.push(`- ${g.title}: ${g.progressPercent.toFixed(0)}% complete`);
    }
  }

  // PRs (for weight calculations)
  if (context.personalRecords.length > 0) {
    const liftPRs = context.personalRecords.filter((pr) =>
      ["bench press", "squat", "deadlift", "overhead press"].some((lift) =>
        pr.exercise.toLowerCase().includes(lift)
      )
    );
    if (liftPRs.length > 0) {
      lines.push("\nLifting Maxes:");
      for (const pr of liftPRs) {
        lines.push(`- ${pr.exercise}: ${pr.value}${pr.unit}`);
      }
    }
  }

  // Recovery status
  const recovering = Object.entries(context.muscleRecoveryStatus)
    .filter(([, s]) => !s.readyToTrain)
    .map(([m]) => m);

  if (recovering.length > 0) {
    lines.push(`\nRecovering muscles: ${recovering.join(", ")}`);
  }

  // Deload flag
  if (context.needsDeload) {
    lines.push("\n⚠️ DELOAD RECOMMENDED");
  }

  return lines.join("\n");
}
