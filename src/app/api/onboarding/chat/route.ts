/**
 * Onboarding Chat API
 *
 * Handles conversational AI onboarding flow using GPT-5.2.
 * Extracts user profile data from natural conversation.
 * Persists progress so users can resume where they left off.
 */

import { streamText, generateObject } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { aiModel, aiModelFast } from "@/lib/ai";
import {
  getOnboardingSchema,
  getOnboardingPhaseOrder,
  getOnboardingPersonaPrompt,
} from "@/lib/ai/schemas/loader";

export const runtime = "nodejs";
export const maxDuration = 60;

// Schema for extracted profile data
// Note: Using nullable instead of optional for nested objects to satisfy OpenAI's structured output requirements
const extractedDataSchema = z.object({
  name: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  heightFeet: z.number().nullable(),
  heightInches: z.number().nullable(),
  weight: z.number().nullable(),
  bodyFatPercentage: z.number().nullable(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).nullable(),
  primaryMotivation: z.string().nullable(),
  primaryGoalType: z.string().nullable(),
  primaryGoalDescription: z.string().nullable(),
  secondaryGoals: z.array(z.string()).nullable(),
  timeline: z.string().nullable(),
  targetWeight: z.number().nullable(),
  limitationBodyPart: z.string().nullable(),
  limitationCondition: z.string().nullable(),
  limitationSeverity: z.enum(["mild", "moderate", "severe"]).nullable(),
  personalRecordExercise: z.string().nullable(),
  personalRecordValue: z.number().nullable(),
  personalRecordUnit: z.string().nullable(),
  workoutDuration: z.number().nullable(),
  equipmentAccess: z.array(z.string()).nullable(),
  workoutDays: z.array(z.string()).nullable(),
  trainingFrequency: z.number().nullable(),
  currentActivity: z.string().nullable(),
});

type RawExtractedData = z.infer<typeof extractedDataSchema>;

// The format we store and send to frontend (nested structure)
interface ExtractedData {
  name?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  bodyFatPercentage?: number;
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  primaryMotivation?: string;
  primaryGoal?: {
    type: string;
    description: string;
  };
  secondaryGoals?: string[];
  timeline?: string;
  targetWeight?: number;
  limitations?: Array<{
    bodyPart: string;
    condition: string;
    severity?: "mild" | "moderate" | "severe";
  }>;
  personalRecords?: Array<{
    exercise: string;
    value: number;
    unit: string;
  }>;
  workoutDuration?: number;
  equipmentAccess?: string[];
  workoutDays?: string[];
  trainingFrequency?: number;
  currentActivity?: string;
}

// Request schema - uses passthrough for extractedData since it's the nested format from frontend
const requestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).default([]),
  currentPhase: z.string(),
  extractedData: z.any().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure body is a plain object before parsing
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Request body must be an object" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { message, conversationHistory, currentPhase, extractedData = {} } = validation.data;

    // Load onboarding schema
    const schema = getOnboardingSchema();
    const phaseOrder = getOnboardingPhaseOrder();
    const currentPhaseConfig = schema.onboarding.phases[currentPhase];
    const personaPrompt = getOnboardingPersonaPrompt();

    if (!currentPhaseConfig) {
      return new Response(JSON.stringify({ error: "Invalid phase" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine phase index for progress tracking
    const phaseIndex = phaseOrder.indexOf(currentPhase);
    const totalPhases = phaseOrder.length;

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(
      personaPrompt,
      currentPhaseConfig,
      extractedData,
      session.user.name
    );

    // Add user message to conversation
    const messages = [
      ...conversationHistory.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Extract data from the user's message (non-blocking)
    const extractionPromise = extractDataFromMessage(
      message,
      currentPhase,
      currentPhaseConfig,
      extractedData
    );

    // Stream the AI response
    const result = streamText({
      model: aiModelFast,
      system: systemPrompt,
      messages,
    });

    // Get the stream response
    const response = result.toTextStreamResponse();

    // Wait for extraction to complete
    const newExtractedData = await extractionPromise;

    // Determine next phase
    const shouldAdvance = shouldAdvancePhase(currentPhase, extractedData, newExtractedData);
    const nextPhase = shouldAdvance && phaseIndex < totalPhases - 1
      ? phaseOrder[phaseIndex + 1]
      : currentPhase;

    // Get quick replies for the current/next phase
    const quickReplies = getQuickRepliesForPhase(
      shouldAdvance ? nextPhase : currentPhase,
      schema
    );

    // Check if onboarding is complete
    const isComplete = nextPhase === "wrap_up" && shouldAdvance;

    // Save progress to database (don't await - do it in background)
    // We'll save once we get the full AI response
    const saveProgressPromise = (async () => {
      // Wait for the full response to be generated
      const fullText = await result.text;

      // Build updated conversation history
      const updatedHistory = [
        ...conversationHistory.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date().toISOString(),
        })),
        {
          role: "user" as const,
          content: message,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant" as const,
          content: fullText,
          timestamp: new Date().toISOString(),
        },
      ];

      // Update progress in database
      await db.update(onboardingProgress)
        .set({
          currentPhase: nextPhase,
          phaseIndex: phaseOrder.indexOf(nextPhase),
          extractedData: newExtractedData,
          conversationHistory: updatedHistory,
          completedAt: isComplete ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.userId, session.user.id));
    })();

    // Don't block on saving - let it happen in background
    saveProgressPromise.catch(err => console.error("Failed to save onboarding progress:", err));

    // Add metadata headers
    response.headers.set("X-Phase", nextPhase);
    response.headers.set("X-Phase-Index", String(phaseOrder.indexOf(nextPhase)));
    response.headers.set("X-Total-Phases", String(totalPhases));
    response.headers.set("X-Is-Complete", String(isComplete));
    response.headers.set("X-Quick-Replies", JSON.stringify(quickReplies));
    response.headers.set("X-Extracted-Data", JSON.stringify(newExtractedData));

    return response;
  } catch (error) {
    console.error("Error in onboarding chat:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Build system prompt for the current phase
function buildSystemPrompt(
  personaPrompt: string,
  phaseConfig: ReturnType<typeof getOnboardingSchema>["onboarding"]["phases"][string],
  extractedData: ExtractedData,
  userName: string
): string {
  const name = extractedData.name || userName || "there";

  // Determine what's still missing in the current phase
  const phaseDataNeeds: Record<string, string[]> = {
    welcome: ["name"],
    motivation: ["primaryMotivation (why they want to work out)"],
    basics: ["age", "gender", "height (feet and inches)", "weight (in lbs)"],
    fitness_background: ["fitness level (beginner/intermediate/advanced)", "how many days per week they train", "what activities they currently do"],
    goals: ["primary fitness goal (specific and measurable)", "timeline for achieving it"],
    body_composition: ["body fat percentage (can skip)", "target weight (can skip)"],
    limitations: ["any injuries or physical limitations (can skip)"],
    personal_records: ["any known maxes or PRs (can skip)"],
    preferences: ["preferred workout duration", "equipment available", "preferred workout days"],
    wrap_up: [],
  };

  // Figure out what's already collected vs what's still needed
  const collected: string[] = [];
  const stillNeeded: string[] = [];

  if (extractedData.name) collected.push("name");
  if (extractedData.primaryMotivation) collected.push("motivation");
  if (extractedData.age) collected.push("age");
  if (extractedData.gender) collected.push("gender");
  if (extractedData.heightFeet) collected.push("height");
  if (extractedData.weight) collected.push("weight");
  if (extractedData.fitnessLevel) collected.push("fitness level");
  if (extractedData.trainingFrequency) collected.push("training frequency");
  if (extractedData.primaryGoal) collected.push("primary goal");
  if (extractedData.timeline) collected.push("timeline");

  // Get what we still need for this phase
  const phaseNeeds = phaseDataNeeds[phaseConfig.goal] || phaseConfig.data_collected;

  let prompt = `${personaPrompt}

## Current Onboarding Phase: ${phaseConfig.goal}

You are helping a new user set up their fitness profile through natural conversation.
You MUST ask questions in a sequential order. DO NOT skip ahead or ask about topics from later phases.

### Data You're Collecting This Phase (in order)
${phaseConfig.data_collected.map(d => `- ${d}`).join("\n")}

### What You Already Know About This User
${collected.length > 0 ? collected.map(c => `✓ ${c}`).join("\n") : "- Nothing yet, this is a new user"}

### Your Next Question Should Be About
${phaseConfig.data_collected[0]} - Focus on collecting this data point first before moving on.

### Guidelines For This Response
1. Acknowledge what the user just said (briefly!)
2. Ask about the NEXT uncollected data point for THIS phase only
3. Keep responses SHORT (2-3 sentences max)
4. Use their name "${name}" occasionally
5. If they skip, say "No worries!" and move to the next data point

### IMPORTANT RULES
- Ask ONE question at a time
- Stay focused on the current phase - don't skip ahead
- Don't ask about goals if you're still in basics phase
- Don't ask about limitations if you're still collecting fitness background
- Be conversational but efficient
- ${phaseConfig.feature_intro ? `You can mention: "${phaseConfig.feature_intro}"` : ""}`;

  return prompt;
}

// Transform flat extracted data to nested format
function transformToNestedFormat(raw: RawExtractedData, existing: ExtractedData): ExtractedData {
  const result: ExtractedData = { ...existing };

  // Simple fields
  if (raw.name) result.name = raw.name;
  if (raw.age) result.age = raw.age;
  if (raw.gender) result.gender = raw.gender;
  if (raw.heightFeet) result.heightFeet = raw.heightFeet;
  if (raw.heightInches) result.heightInches = raw.heightInches;
  if (raw.weight) result.weight = raw.weight;
  if (raw.bodyFatPercentage) result.bodyFatPercentage = raw.bodyFatPercentage;
  if (raw.fitnessLevel) result.fitnessLevel = raw.fitnessLevel;
  if (raw.primaryMotivation) result.primaryMotivation = raw.primaryMotivation;
  if (raw.timeline) result.timeline = raw.timeline;
  if (raw.targetWeight) result.targetWeight = raw.targetWeight;
  if (raw.workoutDuration) result.workoutDuration = raw.workoutDuration;
  if (raw.trainingFrequency) result.trainingFrequency = raw.trainingFrequency;
  if (raw.currentActivity) result.currentActivity = raw.currentActivity;
  if (raw.secondaryGoals) result.secondaryGoals = raw.secondaryGoals;
  if (raw.equipmentAccess) result.equipmentAccess = raw.equipmentAccess;
  if (raw.workoutDays) result.workoutDays = raw.workoutDays;

  // Nested: primaryGoal
  if (raw.primaryGoalType || raw.primaryGoalDescription) {
    result.primaryGoal = {
      type: raw.primaryGoalType || existing.primaryGoal?.type || "",
      description: raw.primaryGoalDescription || existing.primaryGoal?.description || "",
    };
  }

  // Nested: limitations (add to array)
  if (raw.limitationBodyPart && raw.limitationCondition) {
    const newLimitation = {
      bodyPart: raw.limitationBodyPart,
      condition: raw.limitationCondition,
      severity: raw.limitationSeverity || undefined,
    };
    result.limitations = [...(existing.limitations || []), newLimitation];
  }

  // Nested: personalRecords (add to array)
  if (raw.personalRecordExercise && raw.personalRecordValue && raw.personalRecordUnit) {
    const newRecord = {
      exercise: raw.personalRecordExercise,
      value: raw.personalRecordValue,
      unit: raw.personalRecordUnit,
    };
    result.personalRecords = [...(existing.personalRecords || []), newRecord];
  }

  return result;
}

// Extract structured data from user message
async function extractDataFromMessage(
  message: string,
  currentPhase: string,
  phaseConfig: ReturnType<typeof getOnboardingSchema>["onboarding"]["phases"][string],
  existingData: ExtractedData
): Promise<ExtractedData> {
  try {
    const extractionPrompt = `Extract any relevant fitness profile data from this user message.

Current phase: ${currentPhase}
Looking for: ${phaseConfig.data_collected.join(", ")}

User message: "${message}"

Extract ONLY data that is clearly stated. Don't guess or infer beyond what's explicit.
For ages, extract the number.
For heights, parse "5'10" or "5 foot 10" into feet and inches.
For weights, extract the number in lbs.
For fitness level, map casual descriptions to: beginner/intermediate/advanced/elite.
For names, extract what the user wants to be called.

Return null for any field you cannot extract from the message.`;

    const result = await generateObject({
      model: aiModelFast,
      schema: extractedDataSchema,
      prompt: extractionPrompt,
    });

    // Transform flat schema to nested format and merge with existing
    return transformToNestedFormat(result.object, existingData);
  } catch (error) {
    console.error("Data extraction error:", error);
    return existingData;
  }
}

// Determine if we should advance to next phase
function shouldAdvancePhase(
  currentPhase: string,
  oldData: ExtractedData,
  newData: ExtractedData
): boolean {
  // Define required data for each phase to be considered "complete"
  const phaseRequirements: Record<string, (data: ExtractedData) => boolean> = {
    welcome: (d) => !!d.name,
    motivation: (d) => !!d.primaryMotivation,
    basics: (d) => !!(d.age || d.gender || d.heightFeet || d.weight),
    fitness_background: (d) => !!(d.fitnessLevel || d.trainingFrequency),
    goals: (d) => !!d.primaryGoal,
    body_composition: () => true, // Optional phase
    limitations: () => true, // Optional phase
    personal_records: () => true, // Optional phase
    preferences: (d) => !!(d.workoutDuration || d.equipmentAccess),
    wrap_up: () => true,
  };

  const check = phaseRequirements[currentPhase];
  if (!check) return false;

  // Only advance if we just collected new data for this phase
  const hadData = check(oldData);
  const hasData = check(newData);

  return !hadData && hasData;
}

// Get quick reply suggestions for a phase
function getQuickRepliesForPhase(
  phase: string,
  schema: ReturnType<typeof getOnboardingSchema>
): string[] {
  const phaseConfig = schema.onboarding.phases[phase];
  if (!phaseConfig?.quick_replies) return [];

  return phaseConfig.quick_replies.filter((r): r is string => r !== null);
}

// GET endpoint to get initial welcome message or restore saved progress
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const schema = getOnboardingSchema();
    const phaseOrder = getOnboardingPhaseOrder();

    // Check for existing progress
    const existingProgress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, session.user.id),
    });

    if (existingProgress && !existingProgress.completedAt) {
      // Resume from where they left off
      const conversationHistory = existingProgress.conversationHistory as Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: string;
      }>;

      const quickReplies = getQuickRepliesForPhase(existingProgress.currentPhase, schema);

      return new Response(JSON.stringify({
        message: null, // No new message, we're restoring
        phase: existingProgress.currentPhase,
        phaseIndex: existingProgress.phaseIndex,
        totalPhases: phaseOrder.length,
        quickReplies,
        extractedData: existingProgress.extractedData,
        conversationHistory, // Send back the full conversation
        isResuming: true,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // New user - create progress record and send welcome
    const welcomePhase = schema.onboarding.phases.welcome;
    const welcomeMessage = welcomePhase.opening_message || `Hey! I'm your AI coach here at Workout Circle.

Before we start building workouts together, I'd love to get to know you a bit.

What should I call you?`;

    // Create initial progress record
    await db.insert(onboardingProgress).values({
      userId: session.user.id,
      currentPhase: "welcome",
      phaseIndex: 0,
      extractedData: {},
      conversationHistory: [{
        role: "assistant" as const,
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      }],
    }).onConflictDoNothing();

    return new Response(JSON.stringify({
      message: welcomeMessage,
      phase: "welcome",
      phaseIndex: 0,
      totalPhases: phaseOrder.length,
      quickReplies: [],
      extractedData: {},
      conversationHistory: [],
      isResuming: false,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting welcome message:", error);
    return new Response(JSON.stringify({ error: "Failed to get welcome message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
