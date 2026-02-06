import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { aiModel, aiModelFast, getMemberContext } from "./index";
import { db } from "@/lib/db";
import { workoutPlans, workoutPlanExercises, exercises } from "@/lib/db/schema";
import { eq, inArray, ilike } from "drizzle-orm";

// Agent decision schema - AI decides what action to take
const agentDecisionSchema = z.object({
  action: z.enum([
    "ask_clarification", // Need more info from user
    "generate_workout",  // Have enough info to generate
    "provide_advice",    // Answer a question (not workout generation)
    "use_tool",          // Need to query data first
  ]),
  reasoning: z.string().describe("Brief explanation of why this action was chosen"),
  confidence: z.number().min(0).max(1).describe("Confidence in this decision"),

  // If asking clarification
  clarification: z.object({
    question: z.string().describe("The question to ask the user"),
    context: z.enum(["duration", "energy", "location", "limitations", "focus", "intensity", "custom"]),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
    })).describe("2-4 selectable options"),
    allowCustom: z.boolean().describe("Whether to allow free-form input"),
    priority: z.enum(["critical", "important", "nice_to_have"]),
  }).optional(),

  // If generating workout
  workoutParams: z.object({
    duration: z.number().describe("Duration in minutes"),
    intensity: z.enum(["light", "moderate", "hard", "max"]),
    focus: z.string().nullable().describe("Muscle group or workout type focus"),
    location: z.enum(["gym", "home", "outdoor", "bodyweight"]).nullable(),
    avoidMuscles: z.array(z.string()).describe("Muscles to avoid due to limitations"),
  }).optional(),

  // If using a tool
  toolCall: z.object({
    tool: z.enum(["check_recovery", "check_schedule", "check_history", "check_goals"]),
    reason: z.string(),
  }).optional(),
});

export type AgentDecision = z.infer<typeof agentDecisionSchema>;

// Agent context - what the agent knows about the conversation
interface AgentContext {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  memberContext: Awaited<ReturnType<typeof getMemberContext>> | null;
  collectedInfo: {
    duration?: number;
    energy?: string;
    location?: string;
    limitations?: string[];
    focus?: string;
    intensity?: string;
  };
  previousDecisions: AgentDecision[];
}

/**
 * The Coach Agent - makes intelligent decisions about what to do next
 */
export async function runCoachAgent(context: AgentContext): Promise<AgentDecision> {
  const memberInfo = context.memberContext;

  // Build context summary for the agent
  const contextSummary = buildContextSummary(context);

  const systemPrompt = `You are an AI fitness coach agent. Your job is to analyze the user's request and decide the best action.

CURRENT CONTEXT:
${contextSummary}

AVAILABLE ACTIONS:
1. ask_clarification - Ask the user a question to gather missing information. Only ask questions that are CRITICAL for a good response. Don't over-ask.
2. generate_workout - You have enough info to generate a personalized workout.
3. provide_advice - The user is asking a question, not requesting a workout.
4. use_tool - You need to query data (recovery status, schedule, history) before responding.

DECISION RULES:
- If the user clearly wants a workout and you know duration + energy level, you can generate.
- If you're missing CRITICAL info (like duration for a workout request), ask ONE focused question.
- Don't ask about limitations unless they mention pain/injury or have known limitations.
- Prefer fewer clarifications - 1-2 max, not a long survey.
- If unsure about intent, ask_clarification with a simple "What would you like help with?"
- Use the user's profile data - don't ask things you already know.

SMART SUGGESTIONS:
- If they worked out yesterday, suggest different muscle groups
- If their energy is usually low in mornings, acknowledge that
- If they have equipment at home AND gym, ask where they'll be
- Reference their goals when relevant`;

  const { object: decision } = await generateObject({
    model: aiModelFast,
    schema: agentDecisionSchema,
    prompt: `User message: "${context.userMessage}"

Based on the context and rules above, decide what action to take.`,
    system: systemPrompt,
  });

  return decision;
}

/**
 * Build a summary of what the agent knows
 */
function buildContextSummary(context: AgentContext): string {
  const parts: string[] = [];
  const m = context.memberContext;

  // User profile
  if (m) {
    parts.push(`USER PROFILE:
- Name: ${m.member?.name || "Unknown"}
- Fitness level: ${m.currentMetrics?.fitnessLevel || "Unknown"}
- Active goals: ${m.goals?.map(g => g.title).join(", ") || "None specified"}`);

    // Equipment
    if (m.equipment && m.equipment.length > 0) {
      const equipmentNames = m.equipment.map((e: { name: string }) => e.name).slice(0, 10);
      parts.push(`- Available equipment: ${equipmentNames.join(", ")}`);
    }

    // Limitations
    if (m.limitations && m.limitations.length > 0) {
      const limitationSummary = m.limitations.map((l) =>
        `${l.type} (${l.affectedAreas?.join(", ") || "general"} - ${l.severity || "moderate"})`
      ).join("; ");
      parts.push(`- Active limitations: ${limitationSummary}`);
    }

    // Recent training
    if (m.trainingAnalysis) {
      const recovery = m.trainingAnalysis.muscleRecoveryStatus;
      if (recovery) {
        const readyMuscles: string[] = [];
        const recoveringMuscles: string[] = [];
        for (const [muscle, status] of Object.entries(recovery)) {
          const s = status as { readyToTrain?: boolean };
          if (s.readyToTrain) readyMuscles.push(muscle);
          else recoveringMuscles.push(muscle);
        }
        if (readyMuscles.length > 0) {
          parts.push(`- Muscles ready to train: ${readyMuscles.join(", ")}`);
        }
        if (recoveringMuscles.length > 0) {
          parts.push(`- Muscles still recovering: ${recoveringMuscles.join(", ")}`);
        }
      }
      parts.push(`- Days since last workout: ${m.trainingAnalysis.daysSinceLastWorkout || "Unknown"}`);
    }

    // Mood/energy patterns
    if (m.contextNotes) {
      parts.push(`- Average energy level: ${m.contextNotes.avgEnergy?.toFixed(1) || "Unknown"}/5`);
    }
  }

  // What we've collected so far
  const collected = context.collectedInfo;
  if (Object.keys(collected).length > 0) {
    parts.push(`\nCOLLECTED FROM USER:`);
    if (collected.duration) parts.push(`- Duration: ${collected.duration} minutes`);
    if (collected.energy) parts.push(`- Energy today: ${collected.energy}`);
    if (collected.location) parts.push(`- Location: ${collected.location}`);
    if (collected.focus) parts.push(`- Focus: ${collected.focus}`);
    if (collected.intensity) parts.push(`- Intensity: ${collected.intensity}`);
    if (collected.limitations?.length) parts.push(`- Today's limitations: ${collected.limitations.join(", ")}`);
  }

  // Conversation so far
  if (context.conversationHistory.length > 0) {
    const recentMessages = context.conversationHistory.slice(-4);
    parts.push(`\nRECENT CONVERSATION:`);
    for (const msg of recentMessages) {
      parts.push(`${msg.role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? "..." : ""}`);
    }
  }

  return parts.join("\n");
}

/**
 * Generate a workout using the agent's parameters
 */
export async function generateWorkoutFromAgentParams(
  memberId: string,
  params: NonNullable<AgentDecision["workoutParams"]>,
  memberContext: Awaited<ReturnType<typeof getMemberContext>> | null
): Promise<{ workout: GeneratedWorkout; planId?: string }> {
  // Use the existing workout generation logic but with agent-determined params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/ai/generate-workout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      memberIds: [memberId],
      focus: params.focus || undefined,
      intensity: params.intensity,
      targetDuration: params.duration,
      restPreference: params.intensity === "light" ? "long" : "standard",
      includeWarmup: true,
      includeCooldown: true,
      saveAsPlan: true,
      equipmentFilter: params.location,
    }),
  });

  if (!response.ok) {
    throw new Error(`Workout generation failed: ${response.status}`);
  }

  const result = await response.json();

  return {
    workout: {
      name: result.workout?.name || result.name || "Custom Workout",
      description: result.workout?.description || result.description,
      exercises: (result.workout?.exercises || result.exercises || []).map((ex: Record<string, unknown>) => ({
        name: ex.name as string,
        sets: ex.sets as number,
        reps: ex.reps as string,
        restSeconds: ex.restSeconds as number | undefined,
        structureType: ex.structureType as string | undefined,
        notes: ex.notes as string | null | undefined,
        memberPrescriptions: ex.memberPrescriptions as Array<{
          memberName: string;
          weight: string | null;
          bodyweightMod: string | null;
          cardioTarget: string | null;
          rpeTarget: number | null;
          memberNotes: string | null;
        }> | undefined,
        supersetGroup: ex.supersetGroup as number | null | undefined,
        circuitGroup: ex.circuitGroup as number | null | undefined,
      })),
      warmup: result.workout?.warmup || result.warmup,
      cooldown: result.workout?.cooldown || result.cooldown,
      estimatedDuration: result.workout?.estimatedDuration || result.estimatedDuration || params.duration,
      difficulty: result.workout?.difficulty || result.difficulty || "intermediate",
      structure: result.workout?.structure || result.structure,
    },
    planId: result.planId,
  };
}

// Re-export the GeneratedWorkout type
export interface GeneratedWorkout {
  name: string;
  description?: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    restSeconds?: number;
    structureType?: string;
    notes?: string | null;
    memberPrescriptions?: Array<{
      memberName: string;
      weight: string | null;
      bodyweightMod: string | null;
      cardioTarget: string | null;
      rpeTarget: number | null;
      memberNotes: string | null;
    }>;
    supersetGroup?: number | null;
    circuitGroup?: number | null;
  }>;
  warmup?: string[];
  cooldown?: string[];
  estimatedDuration: number;
  difficulty: string;
  structure?: string | null;
}

/**
 * Parse user message to extract any implicit context
 */
export function extractImplicitContext(message: string): Partial<AgentContext["collectedInfo"]> {
  const context: Partial<AgentContext["collectedInfo"]> = {};
  const lower = message.toLowerCase();

  // Duration
  const durationMatch = lower.match(/(\d+)\s*(min|minute)/);
  if (durationMatch) {
    context.duration = parseInt(durationMatch[1], 10);
  }

  // Energy
  if (/tired|exhausted|low energy|didn't sleep/i.test(lower)) {
    context.energy = "low";
  } else if (/energized|pumped|ready|let's go|crush it/i.test(lower)) {
    context.energy = "high";
  }

  // Location
  if (/at (the )?gym|going to (the )?gym/i.test(lower)) {
    context.location = "gym";
  } else if (/at home|home workout/i.test(lower)) {
    context.location = "home";
  } else if (/no equipment|bodyweight/i.test(lower)) {
    context.location = "bodyweight";
  }

  // Focus
  const focusPatterns: Record<string, RegExp> = {
    "legs": /leg|lower body|squat|deadlift/i,
    "upper": /upper body|chest and back/i,
    "chest": /chest|bench|pec/i,
    "back": /back|row|lat|pull/i,
    "shoulders": /shoulder|delt|overhead/i,
    "arms": /arm|bicep|tricep/i,
    "core": /core|ab|abs/i,
    "full_body": /full body|total body|whole body/i,
    "cardio": /cardio|conditioning|hiit/i,
  };

  for (const [focus, pattern] of Object.entries(focusPatterns)) {
    if (pattern.test(lower)) {
      context.focus = focus;
      break;
    }
  }

  // Intensity
  if (/light|easy|recovery|deload/i.test(lower)) {
    context.intensity = "light";
  } else if (/hard|intense|challenging|push/i.test(lower)) {
    context.intensity = "hard";
  } else if (/max|all out|pr/i.test(lower)) {
    context.intensity = "max";
  }

  return context;
}

/**
 * Detect if message is a workout request
 */
export function isWorkoutRequest(message: string): boolean {
  const patterns = [
    /\b(create|make|generate|give me|design|build|plan)\b.*\b(workout|session|routine|exercise)\b/i,
    /\b(want|need|looking for)\s+(a|some)?\s*(workout|training|exercise)/i,
    /\bworkout\b.*\b(for today|for me|right now|quick)\b/i,
    /\b(let's|lets)\s+(do|train|workout|exercise)\b/i,
    /\b(leg|arm|chest|back|shoulder|core|upper|lower|full body|push|pull)\s*(day|workout)?\b/i,
    /\b(\d+)\s*(min|minute)\s*(workout|session|hiit)?\b/i,
  ];

  return patterns.some(p => p.test(message));
}
