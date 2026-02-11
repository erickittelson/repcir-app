import { generateObject, generateText } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { applyDistributedRateLimit as applyRateLimit, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit-redis";
import { db, dbRead } from "@/lib/db";
import { workoutPlans, workoutPlanExercises, exercises, circleMembers, circleEquipment, coachConversations, coachMessages, userLocations, equipmentCatalog } from "@/lib/db/schema";
import { eq, and, inArray, ilike, desc } from "drizzle-orm";
import { LOCATION_TEMPLATES } from "@/lib/constants/equipment";
import type { EquipmentDetails } from "@/lib/constants/equipment";
import { checkAIQuota, createQuotaExceededResponse } from "@/lib/ai/quota-check";
import { trackAIUsage } from "@/lib/ai/usage-tracking";
import {
  getMemberContext,
  buildSystemPrompt,
  aiModel,
  aiModelPro,
  type ReasoningLevel,
  REASONING_TIMEOUTS,
} from "@/lib/ai";
import { getFastWorkoutContext, getFastMemberContext, contextToPrompt, type FastMemberContext } from "@/lib/ai/fast-context";
import { getCachedResponse, setCachedResponse, generateCacheKey } from "@/lib/ai/cache";
import {
  getProgrammingRulesForPrompt,
  getWorkoutStructureForPrompt,
  getTrainingGoalForPrompt,
  getSportProtocolForPrompt,
  getVolumeGuidance,
  getWorkoutGenerationConfigForPrompt,
  getExerciseCountForDuration,
  getWorkoutPreset,
  getIntensityLevel,
  getRestPeriodConfig,
  getRepRangeForGoal,
  applyIntensityModifiers,
} from "@/lib/ai/schemas/loader";
import { checkAIPersonalizationConsent, createConsentRequiredResponse } from "@/lib/consent";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for AI generation

// Enhanced workout schema with more detail
// Note: Using .nullable() instead of .optional() because OpenAI structured outputs require all properties in 'required' array
const workoutSchema = z.object({
  name: z.string().describe("Creative, descriptive name for the workout"),
  description: z.string().describe("Detailed description explaining the workout's purpose, benefits, and who it's designed for"),
  targetAudience: z.string().describe("Who this workout is designed for (e.g., 'Sarah and Mike - focusing on their shared strength goals')"),
  exercises: z.array(
    z.object({
      name: z.string().describe("Exercise name (prefer matching available exercises, but can create custom if needed)"),
      sets: z.number().describe("Number of sets or rounds"),
      reps: z.string().describe("Rep range/scheme. For AMRAP: 'AMRAP'. For EMOM: reps per minute. For timed: '30 seconds'. For standard: '8-12'"),
      restSeconds: z.number().describe("Rest between sets/rounds in seconds. Use 0 for superset pairs. For EMOM, this is rest within the minute."),

      // Exercise structure type - CRITICAL for workout flow
      structureType: z.string().describe("Structure: 'standard' (regular sets), 'superset' (paired exercises), 'circuit' (3+ exercises back-to-back), 'amrap' (as many reps as possible in time), 'emom' (every minute on the minute), 'interval' (work/rest sprints), 'tabata' (20s work/10s rest)"),

      // For timed structures (AMRAP, EMOM, intervals)
      timeSeconds: z.number().nullable().describe("Total time in seconds for AMRAP blocks, or per-round time for EMOM/intervals. Null for standard sets."),
      workSeconds: z.number().nullable().describe("Work interval for intervals/tabata (e.g., 30 for 30s sprints). Null if not interval-based."),
      restSecondsInterval: z.number().nullable().describe("Rest interval for intervals/tabata (e.g., 30 for 30s rest). Null if not interval-based."),

      // Exercise type classification
      exerciseType: z.string().describe("Type: 'weighted' (barbells/dumbbells), 'bodyweight', 'cardio_machine' (rower/bike/treadmill), 'cardio_other' (jump rope/burpees), 'plyometric' (box jumps/broad jumps), 'sprint', 'flexibility', 'skill'"),

      // Member-specific prescriptions - CRITICAL for multi-person workouts
      memberPrescriptions: z.array(
        z.object({
          memberName: z.string().describe("Member's name"),
          // For weighted exercises
          weight: z.string().nullable().describe("Working weight (e.g., '135 lbs', '70% 1RM', '185 lbs based on 265 1RM'). Include calculation from their max if known. Use null for non-weighted."),
          percentOfMax: z.number().nullable().describe("If calculated from 1RM, what percentage (e.g., 70 for 70%). Use null if not applicable."),
          // For bodyweight exercises
          bodyweightMod: z.string().nullable().describe("Bodyweight modification (e.g., 'assisted', 'weighted +25 lbs', 'band-assisted', 'elevated feet'). Use null if standard bodyweight."),
          // For cardio machines (rower, assault bike, treadmill, etc.)
          cardioTarget: z.string().nullable().describe("Cardio target (e.g., '20 calories', '500m row', '0.25 mile', '2:00 pace'). Use null if not cardio."),
          // For sprints/intervals
          sprintTarget: z.string().nullable().describe("Sprint/interval target (e.g., '100m sprint', '30 sec all-out', '200m run'). Use null if not sprint."),
          // For RPE-based or any special notes for this member
          rpeTarget: z.number().nullable().describe("Target RPE for this member (1-10 scale). Use null if not specified."),
          memberNotes: z.string().nullable().describe("Any specific notes for this member (e.g., 'focus on depth', 'use fat grip'). Use null if none."),
        })
      ).describe("REQUIRED: Weight/intensity prescription for EACH member. Even for solo workouts, include the single member's prescription."),

      notes: z.string().nullable().describe("General notes for all members. Do NOT mention other exercises here - if exercises are paired, they must ALL be in the exercises array. Use null if none."),
      forMembers: z.array(z.string()).nullable().describe("Which circle members this exercise is for. Use null if for whole group."),
      alternatives: z.array(z.string()).nullable().describe("Alternative exercises for those with limitations. Use null if none needed."),
      supersetGroup: z.number().nullable().describe("For supersets/circuits: group number (1, 2, 3...). ALL exercises with same number are done back-to-back. CRITICAL: Each superset group MUST have 2+ exercises! Use null if not grouped."),
      circuitGroup: z.number().nullable().describe("For circuit blocks: circuit number. All exercises with same circuit number form one circuit. Use null if not a circuit."),

      // Fields for creating new exercises if not in database
      category: z.string().nullable().describe("Exercise category (strength, cardio, flexibility, plyometric, skill). Required if exercise is not in database."),
      muscleGroups: z.array(z.string()).nullable().describe("Primary muscle groups worked. Required if exercise is not in database."),
      exerciseDescription: z.string().nullable().describe("Brief description of the exercise. Required if exercise is not in database."),
      instructions: z.string().nullable().describe("How to perform the exercise. Required if exercise is not in database."),
      equipment: z.array(z.string()).nullable().describe("Equipment needed. Use null if bodyweight."),
      difficulty: z.string().nullable().describe("beginner, intermediate, or advanced"),
      mechanic: z.string().nullable().describe("compound or isolation"),
    })
  ),
  warmup: z.array(z.string()).describe("Warmup exercises or dynamic stretches"),
  cooldown: z.array(z.string()).describe("Cooldown stretches or activities"),
  estimatedDuration: z.number().describe("Estimated duration in minutes - MUST match the target duration requested"),
  difficulty: z.string().describe("beginner, intermediate, or advanced"),
  structure: z.string().nullable().describe("Overall workout structure description (e.g., 'A1/A2 Supersets into AMRAP finisher', 'Strength block + Conditioning circuit'). Use null if simple straight sets."),
  reasoning: z.string().describe("Brief summary of exercise selection rationale and time calculation showing total workout duration"),
});

// Agentic planning schema for complex reasoning
// Note: Using .nullable() instead of .optional() because OpenAI structured outputs require all properties in 'required' array
const planningSchema = z.object({
  analysis: z.object({
    memberProfiles: z.array(z.object({
      name: z.string(),
      fitnessLevel: z.string(),
      mainGoals: z.array(z.string()),
      limitations: z.array(z.string()),
      recentFocus: z.string(),
    })),
    sharedGoals: z.array(z.string()),
    conflictingNeeds: z.array(z.string()),
    recommendedFocus: z.string(),
  }),
  strategy: z.object({
    workoutType: z.string(),
    exerciseSelectionCriteria: z.array(z.string()),
    intensityApproach: z.string(),
    adaptationsNeeded: z.array(z.string()),
    plannedExerciseCount: z.number().describe("CRITICAL: The number of exercises planned. Must be at least 6 for a 45-min workout, 8 for a 60-min workout. 3-4 exercises is NEVER acceptable!"),
  }),
  exercisePlan: z.array(z.object({
    order: z.number(),
    exerciseName: z.string(),
    equipmentNeeded: z.string().nullable().describe("What equipment is needed for this exercise. Use null if bodyweight."),
    rationale: z.string(),
    memberModifications: z.array(z.object({
      memberName: z.string(),
      modification: z.string(),
    })).nullable().describe("Modifications for specific members. Use null if none needed."),
  })).describe("MUST contain at least 6-10 exercises for a proper workout. 3-4 exercises is NOT enough!"),
  equipmentConsiderations: z.string().nullable().describe("How the available equipment influenced exercise selection. Use null if not applicable."),
});

// Request validation schema
const workoutRequestSchema = z.object({
  memberIds: z.array(z.string().uuid()).optional(),
  memberId: z.string().uuid().optional(),
  focus: z.string().max(100).optional(),
  customFocus: z.string().max(500).optional(),
  saveAsPlan: z.boolean().optional().default(false),
  intensity: z.enum(["light", "moderate", "hard", "max"]).optional().default("moderate"),
  targetDuration: z.number().int().min(10).max(180).optional().default(45),
  restPreference: z.enum(["minimal", "short", "standard", "long"]).optional().default("standard"),
  includeWarmup: z.boolean().optional().default(true),
  includeCooldown: z.boolean().optional().default(true),
  reasoningLevel: z.enum(["none", "quick", "standard", "deep", "max"]).optional().default("standard"),
  trainingGoal: z.string().max(100).optional(),
  sport: z.string().max(100).optional(),
  workoutStructure: z.string().max(100).optional(),
  preset: z.string().max(50).optional(),
  volumeGoal: z.enum(["strength", "hypertrophy", "endurance", "power"]).optional(),
  periodizationPhase: z.enum(["accumulation", "intensification", "deload"]).optional(),
  muscleRecoveryOverride: z.record(z.string(), z.boolean()).optional(),
  enableTempo: z.boolean().optional().default(false),
  locationId: z.string().uuid().optional(),
}).refine(
  (data) => data.memberIds?.length || data.memberId,
  { message: "Either memberIds or memberId is required" }
);

// Get coaching insights from recent conversations for workout context
async function getCoachingInsights(memberIds: string[]): Promise<string> {
  if (memberIds.length === 0) return "";

  // Batch fetch all conversations for all members in ONE query (fixes N+1)
  const allConversations = await db.query.coachConversations.findMany({
    where: inArray(coachConversations.memberId, memberIds),
    with: {
      member: true,
      messages: {
        orderBy: [desc(coachMessages.createdAt)],
        limit: 10,
      },
    },
    orderBy: [desc(coachConversations.lastMessageAt)],
  });

  // Group conversations by memberId in memory
  const conversationsByMember = new Map<string, typeof allConversations>();
  for (const conv of allConversations) {
    const existing = conversationsByMember.get(conv.memberId) || [];
    if (existing.length < 5) { // Limit to 5 per member
      existing.push(conv);
      conversationsByMember.set(conv.memberId, existing);
    }
  }

  const insights: string[] = [];

  for (const memberId of memberIds) {
    const recentConversations = conversationsByMember.get(memberId) || [];
    if (recentConversations.length === 0) continue;

    const memberName = recentConversations[0]?.member?.name || "Member";
    const memberInsights: string[] = [];

    for (const conv of recentConversations) {
      // Check for mental block discussions
      if (conv.mode === "mental_block") {
        const userMessages = conv.messages
          .filter(m => m.role === "user")
          .map(m => m.content.slice(0, 150));
        if (userMessages.length > 0) {
          memberInsights.push(`Mental Block Discussion: ${userMessages[0]}...`);
        }
      }

      // Check for motivation issues
      if (conv.mode === "motivation") {
        const userMessages = conv.messages
          .filter(m => m.role === "user")
          .map(m => m.content.slice(0, 150));
        if (userMessages.length > 0) {
          memberInsights.push(`Motivation Concern: ${userMessages[0]}...`);
        }
      }

      // Check for confidence issues
      if (conv.mode === "confidence") {
        memberInsights.push("Working on building confidence and self-belief");
      }

      // Include stored insights from conversations
      if (conv.insights) {
        memberInsights.push(`Coach Notes: ${conv.insights}`);
      }

      // Look for keywords in messages that affect workout design
      for (const msg of conv.messages.filter(m => m.role === "user")) {
        const content = msg.content.toLowerCase();
        if (content.includes("scared") || content.includes("afraid") || content.includes("fear")) {
          memberInsights.push("Has expressed fear/anxiety about certain exercises or skills");
        }
        if (content.includes("pain") || content.includes("hurts") || content.includes("sore")) {
          memberInsights.push("Has mentioned pain or soreness - consider recovery needs");
        }
        if (content.includes("boring") || content.includes("bored") || content.includes("same workout")) {
          memberInsights.push("Expressed boredom with workouts - needs variety");
        }
        if (content.includes("too hard") || content.includes("too difficult") || content.includes("can't do")) {
          memberInsights.push("May need scaled/easier progressions");
        }
        if (content.includes("too easy") || content.includes("not challenging")) {
          memberInsights.push("Ready for more challenging progressions");
        }
      }
    }

    if (memberInsights.length > 0) {
      // Deduplicate similar insights
      const uniqueInsights = [...new Set(memberInsights)].slice(0, 5);
      insights.push(`### ${memberName}'s Recent Coaching Insights:\n${uniqueInsights.map(i => `- ${i}`).join("\n")}`);
    }
  }

  if (insights.length === 0) return "";

  return `\n## 🧠 Coaching Context (from AI Coach conversations)
These insights from recent coaching sessions should influence workout design:

${insights.join("\n\n")}

**How to use this context:**
- If member has mental blocks, avoid exercises that might trigger anxiety
- If member expressed boredom, include variety and new exercises
- If member needs confidence building, include exercises they can succeed at
- If member mentioned pain/soreness, adjust volume and intensity
- If member wants more challenge, increase intensity appropriately
`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check GDPR consent for AI processing of health data
    const consent = await checkAIPersonalizationConsent(session.user.id);
    if (!consent.hasConsent) {
      return createConsentRequiredResponse();
    }

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(
      `ai-workout:${session.user.id}`,
      RATE_LIMITS.aiGeneration
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Check AI quota
    const quotaResult = await checkAIQuota(session.user.id, "workout");
    if (!quotaResult.allowed) {
      return createQuotaExceededResponse(quotaResult, "workout");
    }

    const body = await request.json();

    // Validate request body
    const validation = workoutRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.issues.map((e) => e.message).join(", ") }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      memberIds,
      memberId,
      focus,
      customFocus,
      saveAsPlan,
      intensity,
      targetDuration,
      restPreference,
      includeWarmup,
      includeCooldown,
      reasoningLevel,
      trainingGoal,
      sport,
      workoutStructure,
      preset,
      volumeGoal,
      periodizationPhase,
      muscleRecoveryOverride,
      enableTempo,
      locationId,
    } = validation.data;

    // If a preset is specified, use its default values
    let effectiveIntensity = intensity;
    let effectiveDuration = targetDuration;
    let effectiveRestPreference = restPreference;
    let effectiveExerciseCountRange: { min: number; max: number } | null = null;

    if (preset) {
      const presetConfig = getWorkoutPreset(preset);
      if (presetConfig) {
        effectiveIntensity = presetConfig.intensity as typeof intensity;
        effectiveDuration = presetConfig.duration;
        effectiveRestPreference = presetConfig.rest_periods as typeof restPreference;
        effectiveExerciseCountRange = {
          min: presetConfig.exercise_count[0],
          max: presetConfig.exercise_count[1],
        };
      }
    }

    // Get exercise count based on duration if not specified by preset
    if (!effectiveExerciseCountRange) {
      effectiveExerciseCountRange = getExerciseCountForDuration(effectiveDuration);
    }

    // Get intensity-specific configuration
    const intensityConfig = getIntensityLevel(effectiveIntensity);
    const restConfig = getRestPeriodConfig(effectiveRestPreference);
    
    // Get rep ranges based on volume goal
    const repRanges = volumeGoal ? getRepRangeForGoal(volumeGoal) : null;

    // Support both single memberId and array of memberIds
    let memberIdArray: string[] = [];

    if (Array.isArray(memberIds)) {
      memberIdArray = memberIds;
    } else if (memberIds) {
      memberIdArray = [memberIds];
    }

    // Support legacy single memberId field
    if (memberId && !memberIdArray.includes(memberId)) {
      memberIdArray.push(memberId);
    }

    if (memberIdArray.length === 0) {
      return new Response("At least one member ID is required", { status: 400 });
    }

    // Verify all members belong to family
    const members = await db.query.circleMembers.findMany({
      where: and(
        inArray(circleMembers.id, memberIdArray),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (members.length !== memberIdArray.length) {
      return new Response("One or more members not found", { status: 404 });
    }

    // Try fast context first (sub-100ms), fall back to full context if not available
    const useFastContext = true; // Feature flag
    let memberContexts: Array<Awaited<ReturnType<typeof getMemberContext>> | null> = [];
    let fastContexts: Map<string, FastMemberContext> | null = null;

    if (useFastContext) {
      // Try to get fast contexts from snapshot tables
      const fastContextPromises = memberIdArray.map((id) => getFastMemberContext(id));
      const fastResults = await Promise.all(fastContextPromises);

      // Check if all fast contexts were found
      const allFastAvailable = fastResults.every((c) => c !== null);

      if (allFastAvailable) {
        fastContexts = new Map();
        fastResults.forEach((c) => {
          if (c) fastContexts!.set(c.memberId, c);
        });
      } else {
        // Fall back to full context for members without snapshots
        memberContexts = await Promise.all(
          memberIdArray.map((id) => getMemberContext(id))
        );
      }
    } else {
      // Get full context for all members (slower path)
      memberContexts = await Promise.all(
        memberIdArray.map((id) => getMemberContext(id))
      );
    }

    // Get available equipment — prefer user's selected location, fall back to circle equipment
    let availableEquipmentNames: string[] = [];
    let hasEquipment = false;
    let locationEquipmentDetails: EquipmentDetails | null = null;
    let locationName: string | null = null;

    if (locationId) {
      // Fetch user's selected workout location
      const userLocation = await db.query.userLocations.findFirst({
        where: and(
          eq(userLocations.id, locationId),
          eq(userLocations.userId, session.user.id)
        ),
      });

      if (userLocation) {
        locationName = userLocation.name;
        if (userLocation.type === "home") {
          // Home gym: resolve stored equipment IDs via catalog
          const storedEquipment = (userLocation.equipment as string[]) || [];
          if (storedEquipment.length > 0) {
            const catalogItems = await db.query.equipmentCatalog.findMany({
              where: inArray(equipmentCatalog.id, storedEquipment),
            });
            availableEquipmentNames = catalogItems.map(e => e.name.toLowerCase());
          }
          locationEquipmentDetails = (userLocation.equipmentDetails as EquipmentDetails) || null;
          hasEquipment = availableEquipmentNames.length > 0;
        } else {
          // Non-home (commercial, crossfit, etc.): use template equipment
          const templateEquipment = LOCATION_TEMPLATES[userLocation.type] || [];
          availableEquipmentNames = templateEquipment.map(e => e.toLowerCase());
          hasEquipment = templateEquipment.length > 0;
        }
      }
    }

    // Fall back to circle equipment if no location selected or found
    if (!hasEquipment && !locationId) {
      const circleEquipmentList = await db.query.circleEquipment.findMany({
        where: eq(circleEquipment.circleId, session.circleId),
      });
      availableEquipmentNames = circleEquipmentList.map(e => e.name.toLowerCase());
      hasEquipment = circleEquipmentList.length > 0;
    }

    // Get available exercises with full metadata
    const availableExercises = await db.query.exercises.findMany({
      columns: {
        id: true,
        name: true,
        category: true,
        muscleGroups: true,
        secondaryMuscles: true,
        difficulty: true,
        mechanic: true,
        force: true,
        benefits: true,
        progressions: true,
        equipment: true,
      },
    });

    const exerciseNames = availableExercises.map((e) => e.name);

    // Build comprehensive exercise database description
    const exercisesByCategory: Record<string, string[]> = {};
    availableExercises.forEach((ex) => {
      if (!exercisesByCategory[ex.category]) {
        exercisesByCategory[ex.category] = [];
      }
      exercisesByCategory[ex.category].push(ex.name);
    });

    // Determine the focus
    const workoutFocus = customFocus || focus || "Let the AI determine based on goals and recent history";

    // Build multi-member context
    let contextPrompt = `You are an elite AI fitness coach with deep knowledge of exercise science, programming, and periodization.
You are designing a workout for ${members.length > 1 ? 'a group of circle members' : 'an individual'}.

## Circle Members Participating:
`;

    memberContexts.forEach((context, i) => {
      if (!context) return;
      const m = context.member;
      contextPrompt += `\n### ${m.name}`;
      if (m.age) contextPrompt += ` (Age: ${m.age})`;
      if (m.gender) contextPrompt += ` - ${m.gender}`;
      contextPrompt += "\n";

      if (context.currentMetrics) {
        const cm = context.currentMetrics;
        contextPrompt += `Metrics: `;
        if (cm.weight) contextPrompt += `${cm.weight}lbs `;
        if (cm.fitnessLevel) contextPrompt += `| Level: ${cm.fitnessLevel}`;
        contextPrompt += "\n";
      }

      if (context.limitations.length > 0) {
        contextPrompt += `⚠️ LIMITATIONS (MUST ACCOMMODATE):\n`;
        context.limitations.forEach((l) => {
          contextPrompt += `  - ${l.type.toUpperCase()}: ${l.description}`;
          if (l.affectedAreas) contextPrompt += ` [Affects: ${(l.affectedAreas as string[]).join(", ")}]`;
          if (l.severity) contextPrompt += ` (${l.severity})`;
          contextPrompt += "\n";
        });
      }

      if (context.goals.length > 0) {
        contextPrompt += `Goals:\n`;
        context.goals.filter(g => g.status === 'active').forEach((g) => {
          contextPrompt += `  - ${g.title}`;
          if (g.targetValue && g.targetUnit) {
            contextPrompt += ` (Target: ${g.targetValue} ${g.targetUnit}`;
            if (g.currentValue) contextPrompt += `, Current: ${g.currentValue}`;
            contextPrompt += ")";
          }
          contextPrompt += "\n";
        });
      }

      if (context.personalRecords.length > 0) {
        // Group PRs by type
        const liftingPRs = context.personalRecords.filter((pr) =>
          ["bench press", "squat", "deadlift"].includes(pr.exercise.toLowerCase())
        );
        const runningPRs = context.personalRecords.filter((pr) =>
          pr.exercise.toLowerCase().includes("run")
        );
        const otherPRs = context.personalRecords.filter(
          (pr) =>
            !["bench press", "squat", "deadlift"].includes(pr.exercise.toLowerCase()) &&
            !pr.exercise.toLowerCase().includes("run")
        );

        if (liftingPRs.length > 0) {
          contextPrompt += `Lifting Maxes: `;
          contextPrompt += liftingPRs.map(pr => {
            let str = `${pr.exercise}: ${pr.value}${pr.unit}`;
            if (pr.repMax && pr.repMax > 1) str += ` (${pr.repMax}RM)`;
            return str;
          }).join(", ");
          contextPrompt += "\n";
        }

        if (runningPRs.length > 0) {
          contextPrompt += `Running Times: `;
          contextPrompt += runningPRs.map(pr => {
            const mins = Math.floor(pr.value / 60);
            const secs = pr.value % 60;
            return `${pr.exercise}: ${mins}:${secs.toString().padStart(2, "0")}`;
          }).join(", ");
          contextPrompt += "\n";
        }

        if (otherPRs.length > 0) {
          contextPrompt += `Other PRs: `;
          contextPrompt += otherPRs.slice(0, 3).map(pr => `${pr.exercise}: ${pr.value}${pr.unit}`).join(", ");
          contextPrompt += "\n";
        }
      }

      // Add skills
      if (context.skills && context.skills.length > 0) {
        const masteredSkills = context.skills.filter((s) => s.status === "mastered");
        const achievedSkills = context.skills.filter((s) => s.status === "achieved");
        const learningSkills = context.skills.filter((s) => s.status === "learning");

        if (masteredSkills.length > 0 || achievedSkills.length > 0 || learningSkills.length > 0) {
          contextPrompt += `Skills: `;
          const parts = [];
          if (masteredSkills.length > 0) parts.push(`Mastered: ${masteredSkills.map(s => s.name).join(", ")}`);
          if (achievedSkills.length > 0) parts.push(`Achieved: ${achievedSkills.map(s => s.name).join(", ")}`);
          if (learningSkills.length > 0) parts.push(`Learning: ${learningSkills.map(s => s.name).join(", ")}`);
          contextPrompt += parts.join(" | ");
          contextPrompt += "\n";
        }
      }

      if (context.recentWorkouts.length > 0) {
        contextPrompt += `Last workout: ${context.recentWorkouts[0].name} (${new Date(context.recentWorkouts[0].date).toLocaleDateString()})\n`;
      }

      // Include training analysis for smart programming
      if (context.trainingAnalysis) {
        const ta = context.trainingAnalysis;

        // Muscle recovery status
        const recoveredMuscles = Object.entries(ta.muscleRecoveryStatus)
          .filter(([, status]) => status.readyToTrain)
          .map(([muscle]) => muscle);
        const recoveringMuscles = Object.entries(ta.muscleRecoveryStatus)
          .filter(([, status]) => !status.readyToTrain)
          .map(([muscle, status]) => `${muscle} (${status.hoursSinceWorked}h ago)`);

        if (recoveredMuscles.length > 0 || recoveringMuscles.length > 0) {
          contextPrompt += `Muscle Recovery: `;
          if (recoveredMuscles.length > 0) {
            contextPrompt += `Ready: ${recoveredMuscles.join(", ")}`;
          }
          if (recoveringMuscles.length > 0) {
            if (recoveredMuscles.length > 0) contextPrompt += ` | `;
            contextPrompt += `Recovering: ${recoveringMuscles.join(", ")}`;
          }
          contextPrompt += "\n";
        }

        // Progressive overload data
        const exercisesWithHistory = Object.entries(ta.exerciseHistory || {}).slice(0, 5);
        if (exercisesWithHistory.length > 0) {
          contextPrompt += `Recent Performance: `;
          contextPrompt += exercisesWithHistory.map(([name, data]) => {
            if (!data) return null;
            let str = `${name}: ${data.lastWeight}lbs×${data.lastReps}`;
            if (data.trend === "increasing") str += "↑";
            else if (data.trend === "decreasing") str += "↓";
            return str;
          }).filter(Boolean).join(", ");
          contextPrompt += "\n";
        }

        // Deload recommendation
        if (ta.needsDeload) {
          contextPrompt += `⚠️ DELOAD RECOMMENDED: ${ta.consecutiveWeeksTraining} weeks of consistent training\n`;
        }

        // Days since last workout
        if (ta.daysSinceLastWorkout !== null && ta.daysSinceLastWorkout > 3) {
          contextPrompt += `Note: ${ta.daysSinceLastWorkout} days since last workout - consider a lighter reactivation session\n`;
        }
      }
    });

    // Get coaching insights from recent AI Coach conversations
    const coachingInsights = await getCoachingInsights(memberIdArray);
    if (coachingInsights) {
      contextPrompt += coachingInsights;
    }

    // Build equipment section for context
    let equipmentSection = "";
    if (hasEquipment) {
      const equipmentList = availableEquipmentNames.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(", ");
      const locationLabel = locationName ? `at "${locationName}"` : "in the circle";

      equipmentSection = `\n## AVAILABLE EQUIPMENT (MUST USE)
The following equipment is available ${locationLabel}. PRIORITIZE exercises that use this equipment:
${equipmentList}
`;

      // Add weight details for home gym locations
      if (locationEquipmentDetails) {
        if (locationEquipmentDetails.dumbbells?.available) {
          const db = locationEquipmentDetails.dumbbells;
          equipmentSection += `\nDumbbell details: ${db.type || "fixed"} dumbbells, max weight ${db.maxWeight || "unknown"} lbs`;
          if (db.weights?.length) {
            equipmentSection += ` (available: ${db.weights.join(", ")} lbs)`;
          }
          equipmentSection += `. IMPORTANT: Only prescribe dumbbell weights up to ${db.maxWeight || 50} lbs.\n`;
        }
        if (locationEquipmentDetails.barbell?.available) {
          const bb = locationEquipmentDetails.barbell;
          const totalMax = (bb.barWeight || 45) + (bb.totalPlateWeight || 0);
          equipmentSection += `Barbell details: ${bb.type || "olympic"} barbell (${bb.barWeight || 45} lbs bar), plates up to ${bb.totalPlateWeight || 0} lbs total = ${totalMax} lbs max. IMPORTANT: Only prescribe barbell weights up to ${totalMax} lbs.\n`;
        }
      }

      equipmentSection += "\n";
    } else {
      equipmentSection = `\n## EQUIPMENT NOTICE
No specific equipment has been listed. Include a mix of:
- Bodyweight exercises (push-ups, squats, lunges, planks)
- Exercises that can be done with minimal equipment
- If the focus requires equipment, note what would be needed

`;
    }

    // Build intensity description
    const intensityDescriptions: Record<string, string> = {
      low: "Low intensity - focus on recovery, movement quality, and light loads. Keep RPE around 5-6.",
      moderate: "Moderate intensity - standard training loads. Keep RPE around 7-8.",
      high: "High intensity - challenging workout with heavier loads and more volume. Push RPE to 8-9.",
      max: "Maximum intensity - all-out effort, heavy loads, and high volume. RPE 9-10.",
    };

    const restDescriptions: Record<string, string> = {
      short: "Short rest periods (30-45 seconds) - keep the heart rate up, circuit-style training",
      standard: "Standard rest periods (60-90 seconds) - balanced recovery and work capacity",
      long: "Long rest periods (2-3 minutes) - full recovery between sets for strength work",
    };

    // Calculate approximate time allocations
    const warmupTime = includeWarmup ? 5 : 0;
    const cooldownTime = includeCooldown ? 5 : 0;
    const mainWorkoutTime = effectiveDuration - warmupTime - cooldownTime;

    // Rest time per set based on preference (use config values)
    const restTimePerSet = restConfig.between_sets[0] + 
      (restConfig.between_sets[1] - restConfig.between_sets[0]) / 2;

    // Average time per set (30-60 seconds of work depending on reps)
    const avgSetDuration = 45; // seconds for actual lifting
    const avgTimePerSet = (avgSetDuration + restTimePerSet) / 60; // minutes per set including rest

    // Calculate recommended exercise count based on duration using config
    // Use the config-derived exercise count range if available
    const configExerciseCount = effectiveExerciseCountRange || getExerciseCountForDuration(effectiveDuration);
    const recommendedExercises = Math.max(
      configExerciseCount.min,
      Math.min(configExerciseCount.max, Math.ceil(effectiveDuration / 8)) // Scale with duration
    );
    const maxExercises = configExerciseCount.max;
    
    // For reference in prompts
    const totalSetsCapacity = Math.floor(mainWorkoutTime / avgTimePerSet);

    contextPrompt += `\n## Workout Focus
${workoutFocus}
${preset ? `**Using Preset: ${preset}**\n` : ""}

## Workout Parameters
- **Target Duration**: ${effectiveDuration} minutes (STRICTLY follow this)
- **Intensity Level**: ${intensityConfig.label} - ${intensityConfig.description} (RPE ${intensityConfig.rpe_range[0]}-${intensityConfig.rpe_range[1]})
- **Rest Preference**: ${restConfig.description} (${restConfig.between_sets[0]}-${restConfig.between_sets[1]}s between sets)
- **Include Warmup**: ${includeWarmup ? "Yes - include dynamic warmup exercises (~5 min)" : "No - skip warmup section"}
- **Include Cooldown**: ${includeCooldown ? "Yes - include cooldown/stretches (~5 min)" : "No - skip cooldown section"}

## ⏱️ WORKOUT TIME CALCULATION (CRITICAL - YOU MUST FOLLOW THIS)
You have **${mainWorkoutTime} minutes** for the main workout (excluding warmup/cooldown).

**Time per set calculation:**
- Set execution time: ~30-60 seconds (varies by reps)
- Rest between sets: ${restConfig.between_sets[0]}-${restConfig.between_sets[1]} seconds
- Average total per set: ~${avgTimePerSet.toFixed(1)} minutes

**Exercise count guidelines for ${effectiveDuration}-minute workout:**
- With ${effectiveRestPreference} rest: You can fit approximately **${totalSetsCapacity} total sets**
- This means **${recommendedExercises}-${maxExercises} exercises** with 3-4 sets each

**Time-saving techniques to include more volume:**
1. **Supersets**: Pair opposing muscle groups (e.g., bench + rows) - do back-to-back with no rest between
2. **Giant Sets**: 3+ exercises in a row - great for ${effectiveDuration >= 45 ? "high volume in limited time" : "quick workouts"}
3. **Drop Sets**: Multiple sets with decreasing weight, minimal rest
4. **Circuit Training**: Multiple exercises with minimal rest between

${members.length > 1 ? `
**Multi-Person Timing Considerations (${members.length} people):**
- If training together: One person works while others rest (increases efficiency)
- For supersets: Each person can take turns on equipment
- Account for equipment transitions between exercises
` : ""}

## 🏋️ WEIGHT & INTENSITY PRESCRIPTIONS (CRITICAL - PERSONALIZE FOR EACH MEMBER)

**You MUST provide memberPrescriptions for EACH exercise, for EACH member participating.**

### For WEIGHTED Exercises (barbells, dumbbells, machines):
Use the member's known maxes to calculate working weights:

| Intensity Goal | % of 1RM | Rep Range | Example (265 lb bench max) |
|---------------|----------|-----------|---------------------------|
| Strength/Power | 80-90% | 1-5 reps | 210-240 lbs |
| Hypertrophy | 65-80% | 6-12 reps | 170-210 lbs |
| Endurance | 50-65% | 12-20 reps | 130-170 lbs |
| Light/Recovery | 40-50% | 15-25 reps | 105-130 lbs |

**If member has a known max for the exercise:**
- Calculate: weight = max × (percentage / 100)
- Show your math: "185 lbs (70% of 265 lb max)"
- Include percentOfMax field

**If no known max for that specific exercise:**
- Estimate based on related exercises or fitness level
- Use RPE guidance instead: "RPE 7-8" or "moderate weight, leave 2-3 reps in reserve"
- Note: "Weight TBD - start light and work up"

### For BODYWEIGHT Exercises:
Consider each member's fitness level and body weight:
- **Beginner**: Assisted versions (band-assisted pull-ups, knee push-ups, box step-ups)
- **Intermediate**: Standard bodyweight
- **Advanced**: Weighted versions (+25 lbs vest, +45 lbs dip belt)
- **Adjustments**: "Elevated feet push-ups", "Deficit push-ups", "Archer pull-ups"

### For CARDIO MACHINES (Rower, Assault Bike, Ski Erg, Treadmill):
Prescribe specific targets based on fitness level:
- **Rower**: Distance (500m, 1000m) or calories (15 cal, 25 cal) or pace (/500m time)
- **Assault Bike**: Calories (10 cal, 20 cal) or distance (0.5 mi) or time (30 sec all-out)
- **Treadmill**: Distance (0.25 mi), pace (8:00/mile), or incline walk (15% incline, 3.0 mph)
- **Ski Erg**: Calories or meters

**Scaling by fitness level:**
| Level | Assault Bike Cals | Row Distance | Run Distance |
|-------|------------------|--------------|--------------|
| Beginner | 10-15 cal | 250-400m | 200m |
| Intermediate | 15-25 cal | 400-600m | 400m |
| Advanced | 25-40 cal | 600-1000m | 800m |

### For CARDIO/CONDITIONING (Jump Rope, Burpees, Mountain Climbers):
Prescribe time or reps appropriate for fitness level:
- Jump rope: 30 sec beginner, 60 sec intermediate, 90 sec advanced (or count: 50/100/150 skips)
- Burpees: 5-8 beginner, 10-15 intermediate, 15-25 advanced

${members.length > 1 ? `
### MULTI-PERSON WORKOUT RULES:
- **EACH member gets their own prescription** - don't give one weight for everyone
- Example for Bench Press with 2 members:
  - Sarah (165 lb max): "115 lbs (70% of 1RM)"
  - Mike (265 lb max): "185 lbs (70% of 1RM)"
- For cardio, scale to each person's ability
- For bodyweight, note modifications per person
` : `
### SOLO WORKOUT:
- Even for one person, fill out memberPrescriptions array with their specific weights/targets
- Calculate from their known maxes when available
`}

${equipmentSection}
## Available Exercise Database (${availableExercises.length} exercises)
Categories available: ${Object.keys(exercisesByCategory).join(", ")}

Key compound movements: Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Pull-up, Dip, Lunge
Plyometric options: Box Jump, Broad Jump, Sprint, Kettlebell Swing
Core exercises: Plank, Dead Bug, Pallof Press, Cable Rotation

## 🏗️ EXERCISE STRUCTURE TYPES (use structureType field)

You can use these structure types to create varied, interesting workouts:

| Structure | structureType | Description | Example |
|-----------|--------------|-------------|---------|
| Standard Sets | "standard" | Traditional sets with rest between | 4x8 Bench Press, 90s rest |
| Superset | "superset" | 2 exercises back-to-back, then rest | A1: Bench, A2: Row (same supersetGroup) |
| Circuit | "circuit" | 3+ exercises back-to-back as rounds | Round of: Squat, Push-up, Row, Plank |
| AMRAP | "amrap" | Max reps/rounds in set time | 10min AMRAP: 5 pull-ups, 10 push-ups, 15 squats |
| EMOM | "emom" | Exercise every minute on the minute | EMOM 10: 5 deadlifts at the top of each minute |
| Interval | "interval" | Work/rest sprints | 30s on/30s off x 8 rounds |
| Tabata | "tabata" | 20s work/10s rest x 8 | Tabata air squats |

**For AMRAP/EMOM/Intervals:**
- Set \`timeSeconds\` for total block duration (e.g., 600 for 10 minutes)
- For intervals, set \`workSeconds\` and \`restSecondsInterval\`
- Multiple exercises can share same amrap/circuit grouping

CRITICAL RULES:
1. **EXERCISE COUNT IS CRITICAL**: You MUST include ${recommendedExercises}-${maxExercises} exercises to fill ${effectiveDuration} minutes. 4 exercises is NOT enough for a 60-min workout!
2. **TIME MATH**: Calculate total time = (sets × ~${avgTimePerSet.toFixed(1)} min/set) + warmup (${warmupTime}min) + cooldown (${cooldownTime}min). estimatedDuration MUST equal ${effectiveDuration}.
3. **WEIGHT PRESCRIPTIONS ARE MANDATORY**: Every exercise MUST have memberPrescriptions for EACH member with calculated weights from their maxes, or cardio targets, or bodyweight modifications.
4. **🚨 SUPERSET VALIDATION**: If you use supersetGroup, that group MUST have AT LEAST 2 exercises with the same supersetGroup number! A single exercise cannot be a "superset". If you mention "paired with X" in notes, X MUST also be in the exercises array with the same supersetGroup.
5. **🚨 ALL EXERCISES MUST BE IN THE ARRAY**: Do NOT mention exercises in notes that aren't in the exercises array. If you say "paired with Lat Pulldown", Lat Pulldown MUST be an exercise in your output.
6. **CLASSIFY EACH EXERCISE**: Set exerciseType to 'weighted', 'bodyweight', 'cardio_machine', 'cardio_other', 'plyometric', 'sprint', 'flexibility', or 'skill'.
7. **SET STRUCTURE TYPE**: Every exercise needs structureType ('standard', 'superset', 'circuit', 'amrap', 'emom', 'interval', 'tabata').
8. PREFER exercises from this database: ${exerciseNames.slice(0, 100).join(", ")}${exerciseNames.length > 100 ? `... and ${exerciseNames.length - 100} more` : ""}
9. If you need an exercise NOT in the database, you CAN create it! Just provide: category, muscleGroups, exerciseDescription, instructions, equipment, difficulty, and mechanic fields.
10. For members with limitations, provide ALTERNATIVES or MODIFICATIONS - never prescribe exercises that could aggravate their condition
11. If designing for multiple people with different fitness levels, provide scaling options AND different weights per person
12. Compound movements should come first, isolation exercises last
13. Consider recovery - don't overload muscles worked in recent sessions
${hasEquipment ? "14. PRIORITIZE exercises that use the circle's available equipment" : "14. Focus on bodyweight and minimal equipment exercises"}
15. MATCH THE INTENSITY LEVEL (${effectiveIntensity}) - RPE ${intensityConfig.rpe_range[0]}-${intensityConfig.rpe_range[1]}
16. USE THE REST PREFERENCE (${effectiveRestPreference}) when setting rest between sets (${restConfig.between_sets[0]}-${restConfig.between_sets[1]}s)
17. **USE MEMBER'S LIFTING MAXES** to calculate working weights. If they have a 265 lb bench max and you want 70%, prescribe 185 lbs.
18. For cardio exercises, prescribe specific targets (calories, distance, time) scaled to each member's fitness level
19. For members learning skills, consider progressions and drills that help them achieve those skills
20. In your reasoning, SHOW YOUR MATH for both time AND weight calculations
21. **VARIETY**: Consider using different structure types (mix supersets with an AMRAP finisher, or EMOM strength work, etc.)
`;

    // Add programming rules from YAML schemas
    const programmingRules = getProgrammingRulesForPrompt();
    contextPrompt += `\n\n${programmingRules}\n`;

    // Add workout generation config based on provided parameters
    const workoutGenConfig = getWorkoutGenerationConfigForPrompt({
      intensity: effectiveIntensity,
      duration: effectiveDuration,
      preset,
      goal: volumeGoal,
      restPreference: effectiveRestPreference,
    });
    if (workoutGenConfig) {
      contextPrompt += `\n\n## Workout Generation Configuration\n${workoutGenConfig}\n`;
    }

    // Add periodization phase context if specified
    if (periodizationPhase) {
      const phaseDescriptions: Record<string, string> = {
        accumulation: `### Periodization Phase: ACCUMULATION (Volume Focus)
- Focus on building work capacity
- Higher rep ranges (8-15 reps)
- Moderate intensity (65-75% 1RM)
- Higher volume (more sets)
- Shorter rest periods OK`,
        intensification: `### Periodization Phase: INTENSIFICATION (Intensity Focus)
- Focus on strength and neural adaptations
- Lower rep ranges (3-8 reps)
- Higher intensity (75-90% 1RM)
- Moderate volume (fewer sets, heavier)
- Longer rest periods needed`,
        realization: `### Periodization Phase: REALIZATION (Peak/Testing)
- Testing maxes or peak performance
- Very low reps (1-3)
- Maximum intensity (90-100% 1RM)
- Low volume
- Full recovery between sets (3-5 min)`,
        deload: `### Periodization Phase: DELOAD (Recovery)
- Reduced volume by 40-50%
- Reduced intensity by 20-30%
- Focus on movement quality
- Allow full recovery
- Maintain training stimulus without fatigue`,
      };
      if (phaseDescriptions[periodizationPhase]) {
        contextPrompt += `\n\n${phaseDescriptions[periodizationPhase]}\n`;
      }
    }

    // Add tempo prescription instructions if enabled
    if (enableTempo) {
      contextPrompt += `\n\n### TEMPO PRESCRIPTIONS (ENABLED)
Include tempo notation for each exercise in the format: eccentric-pause_bottom-concentric-pause_top
- Standard: 2-0-2-0 (controlled movement)
- Controlled: 3-1-2-0 (slower eccentric with pause)
- Explosive: 1-0-X-0 (fast concentric)
- Time Under Tension: 4-2-4-0 (maximum TUT for hypertrophy)
Add tempo prescription in the notes field when relevant.\n`;
    }

    // Add training goal-specific context if provided
    const validTrainingGoals = ["aesthetics", "powerlifting", "calisthenics", "general_fitness", "strength", "hypertrophy"] as const;
    if (trainingGoal && validTrainingGoals.includes(trainingGoal as typeof validTrainingGoals[number])) {
      const goalContext = getTrainingGoalForPrompt(trainingGoal as typeof validTrainingGoals[number]);
      contextPrompt += `\n\n${goalContext}\n`;
    }

    // Add volume goal context for rep ranges
    if (volumeGoal && repRanges) {
      contextPrompt += `\n\n### Volume Goal: ${volumeGoal.toUpperCase()}
- Primary Rep Range: ${repRanges.primary[0]}-${repRanges.primary[1]}
- Secondary Rep Range: ${repRanges.secondary[0]}-${repRanges.secondary[1]}
- Adjust rest periods based on rep ranges (higher reps = shorter rest)\n`;
    }

    // Add sport-specific protocol if provided
    const validSports = ["sprinting", "cheerleading", "football", "baseball", "basketball", "soccer", "youth"] as const;
    if (sport && validSports.includes(sport as typeof validSports[number])) {
      const sportContext = getSportProtocolForPrompt(sport as typeof validSports[number]);
      contextPrompt += `\n\n${sportContext}\n`;
    }

    // Add workout structure template if provided
    if (workoutStructure) {
      const structureContext = getWorkoutStructureForPrompt(workoutStructure);
      contextPrompt += `\n\n${structureContext}\n`;
    }

    let workout;
    let planningResultObj = null;
    let cacheHit = false;

    // Generate cache key for this workout request
    const cacheKey = generateCacheKey("workout_generation", {
      memberIds: memberIdArray.sort(),
      focus: workoutFocus,
      intensity: effectiveIntensity,
      targetDuration: effectiveDuration,
      restPreference: effectiveRestPreference,
      includeWarmup,
      includeCooldown,
      preset,
      volumeGoal,
      periodizationPhase,
    });

    // Try to get cached response first
    const cachedWorkout = await getCachedResponse<typeof workoutSchema._output>(cacheKey);
    const generationStart = performance.now();
    if (cachedWorkout && !saveAsPlan) {
      workout = cachedWorkout.data;
      cacheHit = true;
    } else {
      // For quick/none reasoning, skip the planning step entirely for faster response
      const skipPlanning = reasoningLevel === "none" || reasoningLevel === "quick";

      if (skipPlanning) {
        // Single-step generation for faster response

      const workoutResult = await generateObject({
        model: aiModel,
        schema: workoutSchema,
        prompt: `${contextPrompt}

Generate a workout now. Be efficient - you must respond within 30 seconds.

⚠️⚠️⚠️ CRITICAL EXERCISE COUNT REQUIREMENT ⚠️⚠️⚠️
You MUST generate AT LEAST ${recommendedExercises} exercises (ideally ${recommendedExercises}-${maxExercises}).
A ${effectiveDuration}-minute workout CANNOT have only 3-4 exercises - that would only fill 15-20 minutes!
If you generate fewer than ${recommendedExercises} exercises, the workout will be REJECTED.

Requirements:
1. **MINIMUM ${recommendedExercises} EXERCISES** - this is non-negotiable
2. Exercise names should match available exercises when possible
3. All limitations are accommodated with alternatives
4. Rep schemes match the ${effectiveIntensity} intensity level (RPE ${intensityConfig.rpe_range[0]}-${intensityConfig.rpe_range[1]})
5. ${includeWarmup ? "Include a brief dynamic warmup (~5 min)" : "Skip the warmup section (set warmup to empty array)"}
6. ${includeCooldown ? "Include a brief cooldown (~5 min)" : "Skip the cooldown section (set cooldown to empty array)"}
7. Rest periods: ${restConfig.between_sets[0]}-${restConfig.between_sets[1]}s
8. Total workout: ${effectiveDuration} minutes
9. Use member's lifting maxes to calculate working weights
10. Provide memberPrescriptions for each exercise

Generate a cohesive, purposeful workout with ${recommendedExercises}+ exercises.`,
      });

      workout = workoutResult.object;
    } else {
      // Two-step generation for deeper reasoning (standard, deep, max)

      const planningResult = await generateObject({
        model: aiModel,
        schema: planningSchema,
        prompt: `${contextPrompt}

TASK: Analyze the members and plan the optimal workout.

⚠️⚠️⚠️ CRITICAL: EXERCISE COUNT REQUIREMENT ⚠️⚠️⚠️
A ${effectiveDuration}-minute workout REQUIRES ${recommendedExercises}-${maxExercises} exercises.
- 30-minute workout = minimum 5 exercises
- 45-minute workout = minimum 7 exercises
- 60-minute workout = minimum 8 exercises
3-4 exercises is NEVER acceptable - that only fills 15-20 minutes!

Think deeply about:
1. **EXERCISE COUNT**: You need ${recommendedExercises}+ exercises to fill ${effectiveDuration} minutes properly
2. Each member's current state, goals, limitations, lifting maxes, running times, and skills
3. How to design a workout that benefits everyone within the ${effectiveDuration}-minute timeframe
4. What exercises will give the best stimulus at ${effectiveIntensity} intensity (RPE ${intensityConfig.rpe_range[0]}-${intensityConfig.rpe_range[1]}) while respecting limitations
5. The optimal exercise order for this group
6. What modifications are needed for different fitness levels or limitations
7. How to incorporate skill progressions for members who are learning new skills
8. How to use their lifting maxes to prescribe appropriate weights (e.g., 70% of 1RM for 8-12 reps)
9. Rest periods: ${restConfig.between_sets[0]}-${restConfig.between_sets[1]}s between sets

Your exercisePlan array MUST have at least ${recommendedExercises} exercises!

Provide your detailed analysis and exercise plan.`,
      });

      planningResultObj = planningResult.object;

      // Step 2: Generate the final structured workout based on the plan

      const workoutResult = await generateObject({
        model: aiModel,
        schema: workoutSchema,
        prompt: `${contextPrompt}

Based on this analysis and plan:
${JSON.stringify(planningResultObj, null, 2)}

⚠️⚠️⚠️ CRITICAL EXERCISE COUNT REQUIREMENT ⚠️⚠️⚠️
You MUST generate AT LEAST ${recommendedExercises} exercises (ideally ${recommendedExercises}-${maxExercises}).
A ${effectiveDuration}-minute workout CANNOT have only 3-4 exercises - that would only fill 15-20 minutes!
If you generate fewer than ${recommendedExercises} exercises, the workout will be REJECTED.

Generate the final workout structure. Ensure:
1. **MINIMUM ${recommendedExercises} EXERCISES** - this is non-negotiable for a ${effectiveDuration}-min workout
2. Exercise names EXACTLY match available exercises
3. All limitations are accommodated with alternatives
4. Rep schemes match the ${effectiveIntensity} intensity level (RPE ${intensityConfig.rpe_range[0]}-${intensityConfig.rpe_range[1]})
5. ${includeWarmup ? "Include a dynamic warmup section" : "Skip the warmup section (set warmup to empty array)"}
6. ${includeCooldown ? "Include a cooldown/stretching section" : "Skip the cooldown section (set cooldown to empty array)"}
7. Rest periods: ${restConfig.between_sets[0]}-${restConfig.between_sets[1]}s between sets
8. Total workout fits within ${effectiveDuration} minutes (estimatedDuration should be close to ${effectiveDuration})
9. When members have lifting maxes, use them to suggest appropriate weights in the notes (e.g., "Use ~70% of 1RM")
10. Include time calculations in the reasoning field to verify the workout fits the target duration

The workout should feel cohesive and purposeful with ${recommendedExercises}+ exercises, not just a random collection.`,
      });

      workout = workoutResult.object;

      const generationTimeMs = Math.round(performance.now() - generationStart);

      // Cache the generated workout for future similar requests
      await setCachedResponse(cacheKey, "workout_generation", workout, {
        ttlSeconds: 3600, // 1 hour cache
        modelUsed: "gpt-5.2",
        reasoningLevel,
        generationTimeMs,
      });
    }
    }

    // Track AI usage (fire and forget)
    if (!cacheHit) {
      trackAIUsage({
        userId: session.user.id,
        memberId: memberIds?.[0],
        endpoint: "ai/generate-workout",
        modelUsed: "gpt-5.2",
        reasoningLevel,
        inputTokens: 0, // generateObject doesn't expose usage in the same way
        outputTokens: 0,
        durationMs: Math.round(performance.now() - generationStart),
        cacheHit: false,
        metadata: { exerciseCount: workout.exercises.length, duration: effectiveDuration },
      }).catch(() => {});
    }

    // Fix invalid supersets - supersets must have at least 2 exercises
    // Count exercises per supersetGroup
    const supersetCounts = new Map<number, number>();
    for (const ex of workout.exercises) {
      if (ex.supersetGroup !== null && ex.supersetGroup !== undefined) {
        supersetCounts.set(ex.supersetGroup, (supersetCounts.get(ex.supersetGroup) || 0) + 1);
      }
    }

    // Fix any superset groups with only 1 exercise
    let fixedSupersets = 0;
    for (const ex of workout.exercises) {
      if (ex.supersetGroup !== null && ex.supersetGroup !== undefined) {
        const count = supersetCounts.get(ex.supersetGroup) || 0;
        if (count < 2) {
          ex.supersetGroup = null;
          if (ex.structureType === "superset") {
            ex.structureType = "standard";
          }
          fixedSupersets++;
        }
      }
    }


    // Fix invalid circuits - circuits should have at least 2 exercises (ideally 3+)
    const circuitCounts = new Map<number, number>();
    for (const ex of workout.exercises) {
      if (ex.circuitGroup !== null && ex.circuitGroup !== undefined) {
        circuitCounts.set(ex.circuitGroup, (circuitCounts.get(ex.circuitGroup) || 0) + 1);
      }
    }

    let fixedCircuits = 0;
    for (const ex of workout.exercises) {
      if (ex.circuitGroup !== null && ex.circuitGroup !== undefined) {
        const count = circuitCounts.get(ex.circuitGroup) || 0;
        if (count < 2) {
          ex.circuitGroup = null;
          if (ex.structureType === "circuit") {
            ex.structureType = "standard";
          }
          fixedCircuits++;
        }
      }
    }

    // Validate exercise count - reject if too few
    // Use the config-derived minimum
    const minExercises = effectiveExerciseCountRange?.min || Math.max(5, Math.floor(effectiveDuration / 10));
    if (workout.exercises.length < minExercises) {
      console.error(`Workout rejected: only ${workout.exercises.length} exercises, need at least ${minExercises}`);
      return Response.json(
        {
          error: `Generated workout only has ${workout.exercises.length} exercises, but a ${effectiveDuration}-minute workout needs at least ${minExercises}. Please try again.`,
          details: "The AI generated too few exercises for the requested duration.",
        },
        { status: 400 }
      );
    }

    // Validate exercise count - reject if too many (prevents wasted tokens and unrealistic workouts)
    // Note: maxExercises is already defined above from effectiveExerciseCountRange
    if (workout.exercises.length > maxExercises) {
      console.error(`Workout rejected: ${workout.exercises.length} exercises exceeds maximum of ${maxExercises}`);
      return Response.json(
        {
          error: `Generated workout has ${workout.exercises.length} exercises, but a ${effectiveDuration}-minute workout should have at most ${maxExercises}. Please try again.`,
          details: "The AI generated too many exercises for the requested duration.",
        },
        { status: 400 }
      );
    }

    // If requested, save as a workout plan
    if (saveAsPlan) {
      const [plan] = await db
        .insert(workoutPlans)
        .values({
          circleId: session.circleId,
          name: workout.name,
          description: workout.description,
          category: workout.difficulty === "advanced" ? "strength" : "mixed",
          difficulty: workout.difficulty,
          estimatedDuration: workout.estimatedDuration,
          aiGenerated: true,
          createdByMemberId: memberIdArray[0],
        })
        .returning();

      // Match exercises to database and add to plan
      // Create a map for quick lookup (case-insensitive)
      const exerciseMap = new Map(
        availableExercises.map((e) => [e.name.toLowerCase(), e])
      );

      const planExercises = [];
      const createdExercises: string[] = [];

      for (let index = 0; index < workout.exercises.length; index++) {
        const ex = workout.exercises[index];
        let dbExercise = exerciseMap.get(ex.name.toLowerCase());

        // If exercise not found, try fuzzy match
        if (!dbExercise) {
          // Try partial match
          const partialMatch = availableExercises.find(
            (e) =>
              e.name.toLowerCase().includes(ex.name.toLowerCase()) ||
              ex.name.toLowerCase().includes(e.name.toLowerCase())
          );
          if (partialMatch) {
            dbExercise = partialMatch;
          }
        }

        // If still not found and AI provided enough details, create the exercise
        if (!dbExercise && ex.category && ex.muscleGroups) {
          try {
            const [newExercise] = await db
              .insert(exercises)
              .values({
                name: ex.name,
                description: ex.exerciseDescription || `AI-generated exercise for ${ex.muscleGroups?.join(", ")}`,
                instructions: ex.instructions,
                category: ex.category,
                muscleGroups: ex.muscleGroups,
                equipment: ex.equipment,
                difficulty: ex.difficulty || "intermediate",
                mechanic: ex.mechanic,
                isCustom: true,
              })
              .returning();

            dbExercise = newExercise;
            createdExercises.push(ex.name);
          } catch (createError) {
            console.error(`Failed to create exercise ${ex.name}:`, createError);
          }
        }

        if (!dbExercise) {
          console.warn(`Exercise not found and couldn't be created: ${ex.name}`);
          continue;
        }

        planExercises.push({
          planId: plan.id,
          exerciseId: dbExercise.id,
          order: index,
          sets: ex.sets,
          reps: ex.reps,
          restBetweenSets: ex.restSeconds,
          notes: ex.notes,
        });
      }

      if (planExercises.length > 0) {
        await db.insert(workoutPlanExercises).values(planExercises as any);
      }

      if (createdExercises.length > 0) {
      }

      return Response.json({
        success: true,
        workout,
        planId: plan.id,
        reasoning: planningResultObj,
        createdExercises: createdExercises.length > 0 ? createdExercises : undefined,
      });
    }

    return Response.json({
      success: true,
      workout,
      reasoning: planningResultObj,
    });
  } catch (error) {
    console.error("Error generating workout:", error);
    return new Response(`Failed to generate workout: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}
