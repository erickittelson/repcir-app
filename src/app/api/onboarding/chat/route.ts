/**
 * Onboarding Chat API
 *
 * Handles conversational AI onboarding flow using GPT-5.2.
 * Extracts user profile data from natural conversation.
 * Persists progress so users can resume where they left off.
 * Includes profanity filtering for user messages.
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
import { moderateText } from "@/lib/moderation";

export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================================================
// RATE LIMITING (Security)
// Simple in-memory rate limiter - replace with Redis for multi-instance
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (cleared on server restart - use Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT = {
  maxRequests: 30, // Max requests per window
  windowMs: 60 * 1000, // 1 minute window
};

// ============================================================================
// CONVERSATION HISTORY LIMITS (Performance & Cost)
// Limits history sent to AI to reduce token usage and improve response time
// ============================================================================

const HISTORY_LIMIT = {
  maxMessages: 20, // Max messages to send to AI (10 user + 10 assistant)
  maxTokensEstimate: 8000, // Rough token limit (~4 chars per token)
};

/**
 * Truncate conversation history to stay within limits
 * Keeps the most recent messages while preserving conversation flow
 */
function truncateHistory(
  history: Array<{ role: string; content: string; timestamp?: string }>
): Array<{ role: string; content: string; timestamp?: string }> {
  if (history.length <= HISTORY_LIMIT.maxMessages) {
    return history;
  }

  // Keep the most recent messages
  const truncated = history.slice(-HISTORY_LIMIT.maxMessages);

  // Ensure we start with an assistant message if possible (better context)
  if (truncated.length > 0 && truncated[0].role === "user") {
    // Try to find an assistant message to start with
    const firstAssistantIdx = truncated.findIndex(m => m.role === "assistant");
    if (firstAssistantIdx > 0) {
      return truncated.slice(firstAssistantIdx);
    }
  }

  return truncated;
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) rateLimitStore.delete(key);
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetIn: RATE_LIMIT.windowMs };
  }

  if (entry.count >= RATE_LIMIT.maxRequests) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  // Increment count
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - entry.count, resetIn: entry.resetAt - now };
}

// Schema for extracted profile data
// Note: Using nullable instead of optional for nested objects to satisfy OpenAI's structured output requirements
// v2.0: Added birth_month/birth_year (replacing age), city, profile_visibility
const extractedDataSchema = z.object({
  name: z.string().nullable(),
  // Birthday (replaces age)
  birth_month: z.number().min(1).max(12).nullable(),
  birth_year: z.number().min(1920).max(2020).nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  heightFeet: z.number().nullable(),
  heightInches: z.number().nullable(),
  weight: z.number().nullable(),
  // Optional location
  city: z.string().nullable(),
  // Profile visibility
  profile_visibility: z.enum(["public", "private"]).nullable(),
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

// Field status tracking - knows what's been asked, collected, skipped, or corrected
type FieldStatus = "pending" | "active" | "collected" | "skipped" | "corrected";

interface FieldTracking {
  [fieldName: string]: {
    status: FieldStatus;
    askedAt?: string; // ISO timestamp when first asked
    answeredAt?: string; // ISO timestamp when answered/skipped
    previousValue?: unknown; // For corrections, stores the old value
  };
}

// All trackable fields in order (matches phase order in YAML v2.0)
// Order: welcome -> profile_setup -> motivation -> basics -> location -> body_composition -> fitness_background -> goals -> limitations -> personal_records -> preferences -> privacy -> wrap_up
// v2.2: Standardized on camelCase only
const ALL_FIELDS = [
  "name",
  "profilePicture",
  "primaryMotivation",
  "birthMonth", "birthYear", "gender", "heightFeet", "weight",
  "city",
  "bodyFatPercentage", "targetWeight",
  "fitnessLevel", "trainingFrequency", "currentActivity",
  "primaryGoal", "timeline",
  "limitations",
  "personalRecords",
  "workoutDuration", "equipmentAccess", "workoutDays",
  "profileVisibility",
] as const;

type TrackableField = typeof ALL_FIELDS[number];

// Correction detection patterns from onboarding.yaml
const CORRECTION_PATTERNS = [
  /actually,?\s*(my|i'm|i am)/i,
  /correction:/i,
  /i meant to say/i,
  /let me fix/i,
  /that'?s wrong/i,
  /change that to/i,
  /wait,?\s*i'?m/i,
  /no,?\s*(my|i'm|i am|it'?s)/i,
];

// Go-back detection patterns from onboarding.yaml
const GO_BACK_PATTERNS = [
  /go back/i,
  /previous/i,
  /wait,?\s*let me/i,
  /back to/i,
  /can we go back/i,
];

// Detect if user wants to correct a previous answer
function isCorrection(message: string): boolean {
  return CORRECTION_PATTERNS.some(pattern => pattern.test(message));
}

// Detect if user wants to go back to a previous phase
function isGoBack(message: string): boolean {
  return GO_BACK_PATTERNS.some(pattern => pattern.test(message));
}

// ============================================================================
// REGEX-BASED EXTRACTION (Cost Optimization)
// Handles simple patterns without AI calls - reduces API costs by ~50%
// ============================================================================

interface RegexExtraction {
  name?: string;
  birth_month?: number;
  birth_year?: number;
  gender?: "male" | "female" | "other";
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  city?: string;
  profile_visibility?: "public" | "private";
  bodyFatPercentage?: number;
  targetWeight?: number;
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  trainingFrequency?: number;
  workoutDuration?: number;
  primaryMotivation?: string;
}

// Month name to number mapping
const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

/**
 * Fast regex-based extraction for common fields
 * Returns extracted data or null if patterns don't match
 * This avoids expensive AI calls for simple inputs
 */
function regexExtractData(message: string, currentPhase: string): RegexExtraction | null {
  const result: RegexExtraction = {};
  const lowerMessage = message.toLowerCase().trim();
  let extracted = false;

  // NAME extraction (welcome phase)
  // Patterns: "I'm Eric", "My name is Eric", "Call me Eric", "Eric", "It's Eric"
  if (currentPhase === "welcome") {
    const namePatterns = [
      /(?:i'?m|i am|my name is|call me|it'?s|hey,?\s*i'?m)\s+([a-z]+)/i,
      /^([a-z]+)$/i, // Single word response
    ];
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length >= 2 && match[1].length <= 20) {
        result.name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        extracted = true;
        break;
      }
    }
  }

  // BIRTHDAY extraction (basics phase)
  // Patterns: "March 1990", "3/1990", "born in 1990", "I was born March 85"
  if (currentPhase === "basics") {
    // Month name + year pattern: "March 1990", "march 90"
    const monthYearPattern = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s*,?\s*(?:of\s+)?'?(\d{2,4})\b/i;
    const monthYearMatch = message.match(monthYearPattern);
    if (monthYearMatch) {
      result.birth_month = MONTH_MAP[monthYearMatch[1].toLowerCase()];
      let year = parseInt(monthYearMatch[2], 10);
      if (year < 100) year += year > 30 ? 1900 : 2000; // Convert 2-digit year
      result.birth_year = year;
      extracted = true;
    }

    // Numeric month/year: "3/1990", "03/90"
    const numericPattern = /\b(\d{1,2})\s*[\/\-]\s*(\d{2,4})\b/;
    const numericMatch = message.match(numericPattern);
    if (numericMatch && !result.birth_month) {
      const month = parseInt(numericMatch[1], 10);
      if (month >= 1 && month <= 12) {
        result.birth_month = month;
        let year = parseInt(numericMatch[2], 10);
        if (year < 100) year += year > 30 ? 1900 : 2000;
        result.birth_year = year;
        extracted = true;
      }
    }

    // GENDER extraction
    if (/\b(male|man|guy|dude)\b/i.test(lowerMessage)) {
      result.gender = "male";
      extracted = true;
    } else if (/\b(female|woman|girl|gal)\b/i.test(lowerMessage)) {
      result.gender = "female";
      extracted = true;
    } else if (/\b(other|non-?binary|prefer not)\b/i.test(lowerMessage)) {
      result.gender = "other";
      extracted = true;
    }

    // HEIGHT extraction: "5'10", "5 foot 10", "5ft 10in", "5'10""
    const heightPattern = /\b(\d)'?\s*(?:foot|ft|')?\s*(\d{1,2})?\s*(?:inches?|in|")?\b/i;
    const heightMatch = message.match(heightPattern);
    if (heightMatch) {
      result.heightFeet = parseInt(heightMatch[1], 10);
      result.heightInches = heightMatch[2] ? parseInt(heightMatch[2], 10) : 0;
      extracted = true;
    }

    // WEIGHT extraction: "180 lbs", "180 pounds", "180"
    const weightPattern = /\b(\d{2,3})\s*(?:lbs?|pounds?|kg)?\b/i;
    const weightMatch = message.match(weightPattern);
    if (weightMatch && !heightMatch) { // Avoid confusing height numbers
      const weight = parseInt(weightMatch[1], 10);
      if (weight >= 80 && weight <= 400) { // Reasonable weight range
        result.weight = weight;
        extracted = true;
      }
    }
  }

  // FITNESS LEVEL extraction (fitness_background phase)
  if (currentPhase === "fitness_background") {
    if (/\b(beginner|newbie|just start|new to|never)\b/i.test(lowerMessage)) {
      result.fitnessLevel = "beginner";
      extracted = true;
    } else if (/\b(intermediate|some experience|been working out|regular)\b/i.test(lowerMessage)) {
      result.fitnessLevel = "intermediate";
      extracted = true;
    } else if (/\b(advanced|experienced|years of|serious)\b/i.test(lowerMessage)) {
      result.fitnessLevel = "advanced";
      extracted = true;
    } else if (/\b(elite|competitive|athlete|professional)\b/i.test(lowerMessage)) {
      result.fitnessLevel = "elite";
      extracted = true;
    }

    // TRAINING FREQUENCY: "3 days", "3-4 times", "3x per week"
    const freqPattern = /\b(\d)\s*(?:-\s*\d\s*)?(?:days?|times?|x)\b/i;
    const freqMatch = message.match(freqPattern);
    if (freqMatch) {
      result.trainingFrequency = parseInt(freqMatch[1], 10);
      extracted = true;
    }
  }

  // WORKOUT DURATION extraction (preferences phase)
  if (currentPhase === "preferences") {
    const durationPattern = /\b(\d{2,3})\s*(?:min(?:utes?)?|mins?)?\b/i;
    const durationMatch = message.match(durationPattern);
    if (durationMatch) {
      const duration = parseInt(durationMatch[1], 10);
      if (duration >= 15 && duration <= 180) {
        result.workoutDuration = duration;
        extracted = true;
      }
    }
  }

  // PRIVACY extraction (privacy phase)
  if (currentPhase === "privacy") {
    if (/\b(public|open|find me|discover)\b/i.test(lowerMessage)) {
      result.profile_visibility = "public";
      extracted = true;
    } else if (/\b(private|hidden|invite|invitation)\b/i.test(lowerMessage)) {
      result.profile_visibility = "private";
      extracted = true;
    }
  }

  // MOTIVATION extraction (motivation phase) - simple keyword matching
  if (currentPhase === "motivation") {
    const motivations = [
      { pattern: /\b(stronger|strength|power)\b/i, value: "Get stronger" },
      { pattern: /\b(lose weight|weight loss|slim|lean)\b/i, value: "Lose weight" },
      { pattern: /\b(muscle|bulk|mass|bigger)\b/i, value: "Build muscle" },
      { pattern: /\b(health|healthy|feel better)\b/i, value: "Improve health" },
      { pattern: /\b(energy|energetic|active)\b/i, value: "More energy" },
    ];
    for (const { pattern, value } of motivations) {
      if (pattern.test(lowerMessage)) {
        result.primaryMotivation = value;
        extracted = true;
        break;
      }
    }
  }

  return extracted ? result : null;
}

// The format we store and send to frontend (nested structure)
// v2.0: Added birthMonth/birthYear (replacing age), profilePicture, city, profileVisibility
// v2.1: Added frontend-only complex fields (currentMaxes, specificGoals, activityLevel)
// v2.2: Standardized on camelCase only - no more duplicate snake_case storage
interface ExtractedData {
  name?: string;
  profilePicture?: string; // Vercel Blob URL
  // Birthday (replaces age) - camelCase only
  birthMonth?: number;
  birthYear?: number;
  gender?: "male" | "female" | "other";
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  // Optional location
  city?: string;
  // Profile visibility - camelCase only
  profileVisibility?: "public" | "private";
  bodyFatPercentage?: number;
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  primaryMotivation?: string | string[]; // Can be string (backend) or array (frontend)
  primaryGoal?: {
    type: string;
    description: string;
    targetValue?: number;
    targetUnit?: string;
  };
  secondaryGoals?: string[];
  timeline?: string;
  targetWeight?: number;
  // Activity level - frontend structured data
  activityLevel?: {
    jobType: "sedentary" | "light" | "moderate" | "active" | "very_active";
    dailySteps?: number;
    description?: string;
  };
  limitations?: Array<{
    bodyPart: string;
    condition: string;
    severity?: "mild" | "moderate" | "severe";
    avoidMovements?: string[];
  }>;
  // Current maxes - frontend structured data for workout programming
  currentMaxes?: Array<{
    exercise: string;
    value: number | "working_on" | "mastered" | "consistent";
    unit: "lbs" | "reps" | "seconds" | "min:sec" | "skill";
    isCustom?: boolean;
  }>;
  // Specific goals - frontend structured data
  specificGoals?: Array<{
    type: "pr" | "skill" | "time" | "other";
    exercise?: string;
    targetValue?: number;
    targetUnit?: string;
    description?: string;
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
  // UI state flags
  seenIntro?: boolean; // Has user seen the welcome modal
  // Field status tracking
  _fieldTracking?: FieldTracking;
}

// Normalize frontend data to camelCase (standard internal format)
// Converts any snake_case keys from legacy data to camelCase
function normalizeFrontendData(frontendData: Record<string, unknown>): ExtractedData {
  const result: ExtractedData = {};

  // Copy all camelCase fields directly
  for (const [key, value] of Object.entries(frontendData)) {
    if (value === undefined) continue;

    // Convert snake_case to camelCase for known fields
    if (key === "birth_month") {
      result.birthMonth = value as number;
    } else if (key === "birth_year") {
      result.birthYear = value as number;
    } else if (key === "profile_picture") {
      result.profilePicture = value as string;
    } else if (key === "profile_visibility") {
      result.profileVisibility = value as "public" | "private";
    } else {
      // Copy other fields as-is (already camelCase)
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

// Normalize data for frontend response (already camelCase, just return as-is)
// This function is now mostly a pass-through since we standardized on camelCase
function normalizeForFrontend(data: ExtractedData): Record<string, unknown> {
  // Data is already in camelCase format, just return a copy
  return { ...data };
}

// Request schema - uses passthrough for extractedData since it's the nested format from frontend
const requestSchema = z.object({
  message: z.string(),
  displayMessage: z.string().optional(), // Clean user message for conversation history
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.string().optional(),
    contentType: z.enum(["text", "image"]).optional(),
    componentType: z.string().optional(),
    componentValue: z.unknown().optional(),
  })).default([]),
  currentPhase: z.string(),
  extractedData: z.any().optional(),
  skipAIResponse: z.boolean().optional(), // Just save data without AI response
  isLinearFlow: z.boolean().optional(), // Using linear flow mode
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(session.user.id);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: "Too many requests",
        retryAfter: Math.ceil(rateLimit.resetIn / 1000),
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      });
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

    const { message, displayMessage, conversationHistory, currentPhase, extractedData: rawExtractedData = {}, skipAIResponse } = validation.data;

    // Moderate user message for profanity (only check message content, not system data)
    const moderationResult = moderateText(message);
    if (!moderationResult.isClean && moderationResult.severity !== "mild") {
      // Only block moderate/severe profanity to avoid false positives
      console.warn(`[Onboarding] Message rejected from user ${session.user.id}: ${moderationResult.flaggedWords.join(", ")}`);

      return new Response(JSON.stringify({
        error: "Please keep your responses appropriate. Let's continue with the onboarding.",
        code: "CONTENT_MODERATION_FAILED",
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalize frontend camelCase data to include both naming conventions
    // This ensures frontend structured data (currentMaxes, limitations, etc.) is preserved
    const extractedData = normalizeFrontendData(rawExtractedData as Record<string, unknown>);

    // Handle skipAIResponse - just save the data without generating AI response
    if (skipAIResponse) {

      // Save progress to database with proper error handling
      try {
        // First, get existing progress to merge data properly
        const existingProgress = await db.query.onboardingProgress.findFirst({
          where: eq(onboardingProgress.userId, session.user.id),
        });

        // Merge extractedData with existing data (new values override old values)
        const mergedExtractedData = existingProgress
          ? { ...(existingProgress.extractedData || {}), ...extractedData }
          : extractedData;

        // Only update conversation history if we have messages to save
        // This prevents overwriting with empty array from welcome modal
        const historyToSave = conversationHistory.length > 0
          ? conversationHistory.map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || new Date().toISOString(),
            }))
          : existingProgress?.conversationHistory || [];


        await db
          .insert(onboardingProgress)
          .values({
            userId: session.user.id,
            currentPhase,
            phaseIndex: 0,
            extractedData: mergedExtractedData as Record<string, unknown>,
            conversationHistory: historyToSave,
          })
          .onConflictDoUpdate({
            target: onboardingProgress.userId,
            set: {
              currentPhase,
              extractedData: mergedExtractedData as Record<string, unknown>,
              conversationHistory: historyToSave,
              updatedAt: new Date(),
            },
          });


        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (dbError) {
        console.error("[Onboarding] skipAIResponse - database error:", dbError);
        return new Response(JSON.stringify({ error: "Failed to save data", details: String(dbError) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Use displayMessage for conversation history (clean user message without internal context)
    const userMessageForHistory = displayMessage || message;

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

    // Check for correction or go-back intent
    const isCorrectionIntent = isCorrection(message);
    const isGoBackIntent = isGoBack(message);

    // Extract data from the user's message FIRST (before streaming)
    let newExtractedData = await extractDataFromMessage(
      message,
      currentPhase,
      currentPhaseConfig,
      extractedData
    );

    // Handle corrections - mark the corrected field
    if (isCorrectionIntent) {
      const tracking = newExtractedData._fieldTracking || {};
      // Find which field was corrected (compare old vs new values)
      for (const [field, value] of Object.entries(newExtractedData)) {
        if (field.startsWith("_")) continue;
        const oldValue = extractedData[field as keyof ExtractedData];
        if (value !== undefined && value !== null && oldValue !== undefined && value !== oldValue) {
          tracking[field] = {
            ...tracking[field],
            status: "corrected",
            previousValue: oldValue,
            answeredAt: new Date().toISOString(),
          };
        }
      }
      newExtractedData._fieldTracking = tracking;
    }

    // Handle go-back - don't advance phase, allow re-answering
    let effectivePhase = currentPhase;
    if (isGoBackIntent && phaseIndex > 0) {
      // Go back to previous phase
      effectivePhase = phaseOrder[phaseIndex - 1];
    }

    // Determine next phase based on extracted data
    const shouldAdvance = !isGoBackIntent && shouldAdvancePhase(currentPhase, extractedData, newExtractedData);
    const nextPhase = shouldAdvance && phaseIndex < totalPhases - 1
      ? phaseOrder[phaseIndex + 1]
      : isGoBackIntent ? effectivePhase : currentPhase;

    // Get quick replies for the current/next phase (context-aware)
    const quickReplies = getQuickRepliesForContext(
      shouldAdvance ? nextPhase : currentPhase,
      newExtractedData,
      schema
    );

    // Check if onboarding is complete
    const isComplete = nextPhase === "wrap_up" && shouldAdvance;

    // Build the system prompt with the NEW extracted data
    // Pass transition context if we're advancing phases
    const transitionContext = shouldAdvance ? {
      fromPhase: currentPhase,
      toPhase: nextPhase,
      justCollected: getJustCollectedFields(extractedData, newExtractedData),
    } : undefined;

    const systemPrompt = buildSystemPrompt(
      personaPrompt,
      shouldAdvance ? nextPhase : currentPhase, // Use next phase if advancing
      shouldAdvance ? schema.onboarding.phases[nextPhase] : currentPhaseConfig,
      newExtractedData, // Use updated data
      session.user.name,
      transitionContext
    );

    // Add user message to conversation (truncate history for AI to reduce tokens/cost)
    const truncatedHistory = truncateHistory(conversationHistory);
    const messages = [
      ...truncatedHistory.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Variables to capture for database save
    const userId = session.user.id;

    // Stream the AI response
    const result = streamText({
      model: aiModelFast,
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        // Debug logging for AI response
        if (text.length === 0) {
          console.warn("[Onboarding] WARNING: Empty AI response!");
        }
        // Save progress to database after stream completes
        try {
          // Frontend now includes the new user message in conversationHistory with component metadata
          // So we only need to add the assistant message here
          const updatedHistory = [
            ...conversationHistory.map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: m.timestamp || new Date().toISOString(),
              contentType: m.contentType,
              componentType: m.componentType,
              componentValue: m.componentValue,
            })),
            {
              role: "assistant" as const,
              content: text,
              timestamp: new Date().toISOString(),
            },
          ];


          // Use upsert to ensure data is saved even if initial record creation failed
          await db
            .insert(onboardingProgress)
            .values({
              userId,
              currentPhase: nextPhase,
              phaseIndex: phaseOrder.indexOf(nextPhase),
              extractedData: newExtractedData as Record<string, unknown>,
              conversationHistory: updatedHistory,
              completedAt: isComplete ? new Date() : null,
            })
            .onConflictDoUpdate({
              target: onboardingProgress.userId,
              set: {
                currentPhase: nextPhase,
                phaseIndex: phaseOrder.indexOf(nextPhase),
                extractedData: newExtractedData as Record<string, unknown>,
                conversationHistory: updatedHistory,
                completedAt: isComplete ? new Date() : null,
                updatedAt: new Date(),
              },
            });

        } catch (err) {
          console.error("[Onboarding] onFinish - Failed to save progress:", err);
        }
      },
    });

    // Return streaming response with metadata
    // Security: Sensitive data (extractedData) moved from headers to end of stream
    // Non-sensitive metadata kept in headers for immediate access
    const textStream = result.textStream;
    const encoder = new TextEncoder();

    // Create a stream that appends metadata at the end
    const metadataDelimiter = "\n\n__ONBOARDING_METADATA__\n";
    const metadata = {
      extractedData: normalizeForFrontend(newExtractedData),
    };

    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          // Append metadata delimiter and JSON at the end of stream
          controller.enqueue(encoder.encode(metadataDelimiter + JSON.stringify(metadata)));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Onboarding-Phase": nextPhase,
        "X-Onboarding-Phase-Index": String(phaseOrder.indexOf(nextPhase)),
        "X-Onboarding-Total-Phases": String(totalPhases),
        "X-Onboarding-Complete": String(isComplete),
        "X-Onboarding-Quick-Replies": JSON.stringify(quickReplies),
        // Removed X-Onboarding-Extracted-Data from headers for security
      },
    });
  } catch (error) {
    console.error("Error in onboarding chat:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Build system prompt for the current onboarding phase
 *
 * PROMPT CACHING OPTIMIZATION (OpenAI 2026):
 * - Static content (persona, rules) placed FIRST for cache hits
 * - Dynamic content (user data, phase status) placed LAST
 * - This maximizes cache reuse across different users/phases
 */
interface TransitionContext {
  fromPhase: string;
  toPhase: string;
  justCollected: Record<string, unknown>;
}

function buildSystemPrompt(
  personaPrompt: string,
  currentPhaseName: string,
  phaseConfig: ReturnType<typeof getOnboardingSchema>["onboarding"]["phases"][string],
  extractedData: ExtractedData,
  userName: string,
  transitionContext?: TransitionContext
): string {
  const name = extractedData.name || userName || "there";

  // =========================================================================
  // STATIC CONTENT (CACHEABLE) - Placed first for prompt caching optimization
  // =========================================================================

  const staticInstructions = `${personaPrompt}

# Onboarding Guidelines (v2.0)

You are helping a new user set up their fitness profile through natural conversation.

## Core Rules
- Ask questions in sequential order within each phase
- DO NOT skip ahead or ask about topics from later phases
- Ask ONE question at a time
- Keep responses SHORT (2-3 sentences max)
- Be conversational but efficient
- NEVER re-ask about fields already collected or skipped
- Handle corrections gracefully - update the data and acknowledge the change
- If user wants to go back, acknowledge and let them correct previous answers

## Response Format
1. Acknowledge what the user said (one sentence max)
2. Ask the next required question OR summarize and transition if phase complete
3. If user skips or says "not sure", say "No worries!" and move to next field
4. NEVER use markdown headers (###, ##, #) in responses - use plain text only
5. Use simple line breaks and dashes for lists, NOT markdown formatting

## Correction Handling
If user says things like "actually, my name is..." or "wait, I meant...":
- Acknowledge the correction warmly
- Update the field with the new value
- Continue from where you were

## Go-Back Handling
If user says "go back" or "can we change...":
- Ask what they'd like to change
- Let them provide the new value
- Continue onboarding from current position

## Phase Field Requirements (13 phases total)

<phase name="welcome" order="1">
  <field>name (what they want to be called)</field>
</phase>

<phase name="profile_setup" order="2" optional="true">
  <field>profile picture (handled by UI component, not conversation)</field>
  <note>This phase uses a UI component. Just acknowledge if they added/skipped a photo and move on.</note>
</phase>

<phase name="motivation" order="3">
  <field>why they want to work out</field>
</phase>

<phase name="basics" order="4">
  <field>their birthday (month and year only, NOT full date)</field>
  <field>their gender</field>
  <field>their height (in feet and inches)</field>
  <field>their weight (in lbs)</field>
</phase>

<phase name="location" order="5" optional="true">
  <field>city (optional - helps find workout partners nearby)</field>
</phase>

<phase name="body_composition" order="6" optional="true">
  <field>body fat percentage (can skip)</field>
  <field>target weight (can skip)</field>
</phase>

<phase name="fitness_background" order="7">
  <field>fitness/experience level (beginner/intermediate/advanced)</field>
  <field>how many days per week they train</field>
  <field>what activities they currently do</field>
</phase>

<phase name="goals" order="8">
  <field>their primary fitness goal (specific)</field>
  <field>timeline for achieving their goal</field>
</phase>

<phase name="limitations" order="9" optional="true">
  <field>any injuries or physical limitations (can skip if none)</field>
</phase>

<phase name="personal_records" order="10" optional="true">
  <field>any known maxes or PRs (can skip if unsure)</field>
</phase>

<phase name="preferences" order="11">
  <field>preferred workout duration in minutes</field>
  <field>what equipment they have access to</field>
  <field>which days they prefer to workout</field>
</phase>

<phase name="privacy" order="12">
  <field>profile visibility (public or private)</field>
  <note>Explain: Public = others can find you for workout partnerships. Private = invite-only circles.</note>
</phase>

<phase name="wrap_up" order="13">
  <note>Summarize their profile and welcome them to the app!</note>
</phase>`;

  // =========================================================================
  // DYNAMIC CONTENT (USER-SPECIFIC) - Placed last for cache optimization
  // =========================================================================

  // Map of what data fields to check for each phase (v2.2 - camelCase only)
  const phaseFieldMapping: Record<string, { field: keyof ExtractedData; label: string }[]> = {
    welcome: [{ field: "name", label: "name (what they want to be called)" }],
    profile_setup: [{ field: "profilePicture", label: "profile picture (optional)" }],
    motivation: [{ field: "primaryMotivation", label: "why they want to work out" }],
    basics: [
      { field: "birthMonth", label: "their birthday month" },
      { field: "birthYear", label: "their birthday year" },
      { field: "gender", label: "their gender" },
      { field: "heightFeet", label: "their height (in feet and inches)" },
      { field: "weight", label: "their weight (in lbs)" },
    ],
    location: [
      { field: "city", label: "city (optional, helps find workout partners)" },
    ],
    body_composition: [
      { field: "bodyFatPercentage", label: "body fat percentage (optional, can skip)" },
      { field: "targetWeight", label: "target weight (optional, can skip)" },
    ],
    fitness_background: [
      { field: "fitnessLevel", label: "fitness/experience level (beginner/intermediate/advanced)" },
      { field: "trainingFrequency", label: "how many days per week they train" },
      { field: "currentActivity", label: "what activities they currently do" },
    ],
    goals: [
      { field: "primaryGoal", label: "their primary fitness goal (specific)" },
      { field: "timeline", label: "timeline for achieving their goal" },
    ],
    limitations: [
      { field: "limitations", label: "any injuries or physical limitations (can skip if none)" },
    ],
    personal_records: [
      { field: "personalRecords", label: "any known maxes or PRs (can skip if unsure)" },
    ],
    preferences: [
      { field: "workoutDuration", label: "preferred workout duration in minutes" },
      { field: "equipmentAccess", label: "what equipment they have access to" },
      { field: "workoutDays", label: "which days they prefer to workout" },
    ],
    privacy: [
      { field: "profileVisibility", label: "profile visibility (public or private)" },
    ],
    wrap_up: [],
  };

  const currentPhaseFields = phaseFieldMapping[currentPhaseName] || [];
  const tracking = extractedData._fieldTracking || {};

  // Categorize fields by status: collected, skipped, or pending
  const collectedFields: string[] = [];
  const skippedFields: string[] = [];
  const pendingFields: string[] = [];

  for (const { field, label } of currentPhaseFields) {
    const status = tracking[field]?.status;
    const value = extractedData[field as keyof ExtractedData];
    const isArray = field === "limitations" || field === "personalRecords";
    const hasValue = isArray
      ? Array.isArray(value) && value.length > 0
      : value !== undefined && value !== null;

    if (status === "skipped") {
      skippedFields.push(label);
    } else if (status === "collected" || hasValue) {
      collectedFields.push(label);
    } else {
      pendingFields.push(label);
    }
  }

  // The next thing to ask about
  const nextToAsk = pendingFields[0] || "nothing - phase is complete";
  const isPhaseComplete = pendingFields.length === 0;

  // Build transition context if we just changed phases
  let transitionSection = "";
  if (transitionContext && Object.keys(transitionContext.justCollected).length > 0) {
    const justCollectedStr = Object.entries(transitionContext.justCollected)
      .map(([k, v]) => `    <${k}>${typeof v === "object" ? JSON.stringify(v) : v}</${k}>`)
      .join("\n");

    transitionSection = `
<phase_transition>
  <from_phase>${transitionContext.fromPhase}</from_phase>
  <to_phase>${transitionContext.toPhase}</to_phase>
  <user_just_provided>
${justCollectedStr}
  </user_just_provided>
  <instruction>
    IMPORTANT: The user's last message provided data for the "${transitionContext.fromPhase}" phase.
    You MUST first acknowledge what they provided (e.g., "Nice to meet you, ${name}!" for a name),
    then natucircle transition to the "${transitionContext.toPhase}" phase and ask about its first field.
    Do NOT skip the acknowledgment - the user needs to know their input was received.
  </instruction>
</phase_transition>
`;
  }

  // Build dynamic content section
  let dynamicContent = `

# Current Session
${transitionSection}
<current_phase name="${currentPhaseName}" goal="${phaseConfig.goal}">
  <data_to_collect>
${phaseConfig.data_collected.map(d => `    <item>${d}</item>`).join("\n")}
  </data_to_collect>
  ${phaseConfig.feature_intro ? `<feature_intro>${phaseConfig.feature_intro}</feature_intro>` : ""}
</current_phase>

<field_status>
${collectedFields.length > 0 ? `  <collected>\n${collectedFields.map(c => `    <field>${c}</field>`).join("\n")}\n  </collected>` : ""}
${skippedFields.length > 0 ? `  <skipped>\n${skippedFields.map(s => `    <field>${s}</field>`).join("\n")}\n  </skipped>` : ""}
${pendingFields.length > 0 ? `  <pending>\n${pendingFields.map((p, i) => `    <field priority="${i + 1}">${p}</field>`).join("\n")}\n  </pending>` : ""}
  <phase_complete>${isPhaseComplete}</phase_complete>
</field_status>

<user name="${name}"/>

<next_action>
${transitionContext ? `First acknowledge the user's input ("${Object.keys(transitionContext.justCollected).join(", ")}"), then ask about: "${nextToAsk}"` : (!isPhaseComplete ? `Ask about: "${nextToAsk}"` : "Summarize what you learned and transition to the next phase.")}
</next_action>`;

  return staticInstructions + dynamicContent;
}

// Transform flat extracted data (from AI with snake_case) to nested format (camelCase)
function transformToNestedFormat(raw: RawExtractedData, existing: ExtractedData): ExtractedData {
  const result: ExtractedData = { ...existing };

  // Simple fields
  if (raw.name) result.name = raw.name;
  // Birthday fields - convert snake_case from AI to camelCase
  if (raw.birth_month) result.birthMonth = raw.birth_month;
  if (raw.birth_year) result.birthYear = raw.birth_year;
  if (raw.gender) result.gender = raw.gender;
  if (raw.heightFeet) result.heightFeet = raw.heightFeet;
  if (raw.heightInches) result.heightInches = raw.heightInches;
  if (raw.weight) result.weight = raw.weight;
  // Location
  if (raw.city) result.city = raw.city;
  // Profile visibility - convert snake_case from AI to camelCase
  if (raw.profile_visibility) result.profileVisibility = raw.profile_visibility;
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

  // Preserve frontend-only structured data (not extracted by AI)
  if (existing.currentMaxes) result.currentMaxes = existing.currentMaxes;
  if (existing.specificGoals) result.specificGoals = existing.specificGoals;
  if (existing.activityLevel) result.activityLevel = existing.activityLevel;
  if (existing.profilePicture) result.profilePicture = existing.profilePicture;

  // Preserve field tracking from existing data
  result._fieldTracking = existing._fieldTracking;

  return result;
}

// Detect if user is skipping/declining to answer
function isSkipResponse(message: string): boolean {
  const skipPatterns = [
    /\b(skip|pass|next|move on|don'?t know|not sure|no idea|idk|unsure)\b/i,
    /\b(rather not|prefer not|don'?t want to)\b/i,
    /\b(let'?s skip|can we skip|skip this|skip that)\b/i,
    /\b(no thanks|nope|nah|none)\b/i,
  ];
  return skipPatterns.some(pattern => pattern.test(message));
}

// Map phases to their fields in order (v2.2 - camelCase only)
const PHASE_FIELDS: Record<string, TrackableField[]> = {
  welcome: ["name"],
  profile_setup: ["profilePicture"],
  motivation: ["primaryMotivation"],
  basics: ["birthMonth", "birthYear", "gender", "heightFeet", "weight"],
  location: ["city"],
  body_composition: ["bodyFatPercentage", "targetWeight"],
  fitness_background: ["fitnessLevel", "trainingFrequency", "currentActivity"],
  goals: ["primaryGoal", "timeline"],
  limitations: ["limitations"],
  personal_records: ["personalRecords"],
  preferences: ["workoutDuration", "equipmentAccess", "workoutDays"],
  privacy: ["profileVisibility"],
  wrap_up: [],
};

// Get the next field that needs to be asked in a phase
function getNextPendingField(
  phase: string,
  extractedData: ExtractedData
): TrackableField | null {
  const fields = PHASE_FIELDS[phase] || [];
  const tracking = extractedData._fieldTracking || {};

  for (const field of fields) {
    const status = tracking[field]?.status;
    // Skip if already collected or skipped
    if (status === "collected" || status === "skipped") continue;

    // Check if field has a value (might have been collected without tracking)
    const value = extractedData[field as keyof ExtractedData];
    const isArray = field === "limitations" || field === "personalRecords";
    const hasValue = isArray
      ? Array.isArray(value) && value.length > 0
      : value !== undefined && value !== null;

    if (!hasValue) {
      return field;
    }
  }

  return null;
}

// Update field tracking based on extraction results and user message
function updateFieldTracking(
  existingData: ExtractedData,
  newData: ExtractedData,
  currentPhase: string,
  userMessage: string
): FieldTracking {
  const tracking: FieldTracking = { ...(existingData._fieldTracking || {}) };
  const now = new Date().toISOString();

  // Get the field we were asking about
  const pendingField = getNextPendingField(currentPhase, existingData);

  // Check what was newly collected
  const phaseFields = PHASE_FIELDS[currentPhase] || [];
  for (const field of phaseFields) {
    const oldValue = existingData[field as keyof ExtractedData];
    const newValue = newData[field as keyof ExtractedData];

    const isArray = field === "limitations" || field === "personalRecords";
    const hadValue = isArray
      ? Array.isArray(oldValue) && oldValue.length > 0
      : oldValue !== undefined && oldValue !== null;
    const hasValue = isArray
      ? Array.isArray(newValue) && newValue.length > 0
      : newValue !== undefined && newValue !== null;

    // If we just got a value, mark as collected
    if (!hadValue && hasValue) {
      tracking[field] = {
        status: "collected",
        askedAt: tracking[field]?.askedAt || now,
        answeredAt: now,
      };
    }
  }

  // If this was a skip response and we had a pending field, mark it as skipped
  if (pendingField && isSkipResponse(userMessage)) {
    const oldValue = existingData[pendingField as keyof ExtractedData];
    const newValue = newData[pendingField as keyof ExtractedData];

    const isArray = pendingField === "limitations" || pendingField === "personalRecords";
    const hasNewValue = isArray
      ? Array.isArray(newValue) && newValue.length > 0
      : newValue !== undefined && newValue !== null;

    // Only mark as skipped if we didn't actually extract a value
    if (!hasNewValue) {
      tracking[pendingField] = {
        status: "skipped",
        askedAt: tracking[pendingField]?.askedAt || now,
        answeredAt: now,
      };
    }
  }

  return tracking;
}

// Extract structured data from user message
async function extractDataFromMessage(
  message: string,
  currentPhase: string,
  phaseConfig: ReturnType<typeof getOnboardingSchema>["onboarding"]["phases"][string],
  existingData: ExtractedData
): Promise<ExtractedData> {
  // OPTIMIZATION: Try fast regex extraction first (saves ~50% of AI API costs)
  const regexResult = regexExtractData(message, currentPhase);

  if (regexResult && Object.keys(regexResult).length > 0) {

    // Merge regex results with existing data (convert snake_case to camelCase)
    const mergedData: ExtractedData = { ...existingData };

    // Apply regex extractions - convert snake_case to camelCase
    if (regexResult.name) mergedData.name = regexResult.name;
    if (regexResult.birth_month) mergedData.birthMonth = regexResult.birth_month;
    if (regexResult.birth_year) mergedData.birthYear = regexResult.birth_year;
    if (regexResult.gender) mergedData.gender = regexResult.gender;
    if (regexResult.heightFeet) mergedData.heightFeet = regexResult.heightFeet;
    if (regexResult.heightInches !== undefined) mergedData.heightInches = regexResult.heightInches;
    if (regexResult.weight) mergedData.weight = regexResult.weight;
    if (regexResult.fitnessLevel) mergedData.fitnessLevel = regexResult.fitnessLevel;
    if (regexResult.trainingFrequency) mergedData.trainingFrequency = regexResult.trainingFrequency;
    if (regexResult.workoutDuration) mergedData.workoutDuration = regexResult.workoutDuration;
    if (regexResult.profile_visibility) mergedData.profileVisibility = regexResult.profile_visibility;
    if (regexResult.primaryMotivation) mergedData.primaryMotivation = regexResult.primaryMotivation;

    // Update field tracking
    mergedData._fieldTracking = updateFieldTracking(
      existingData,
      mergedData,
      currentPhase,
      message
    );

    return mergedData;
  }

  // FALLBACK: Use AI for complex extractions (limitations, PRs, goals, cities, etc.)

  try {
    const extractionPrompt = `Extract any relevant fitness profile data from this user message.

Current phase: ${currentPhase}
Looking for: ${phaseConfig.data_collected.join(", ")}

User message: "${message}"

Extract ONLY data that is clearly stated. Don't guess or infer beyond what's explicit.

Extraction rules:
- For names, extract what the user wants to be called.
- For birthdays, extract birth_month (1-12) and birth_year (4-digit year like 1990).
  Parse things like "March 1990" into birth_month=3, birth_year=1990.
  Parse "I was born in January 85" as birth_month=1, birth_year=1985.
- For heights, parse "5'10" or "5 foot 10" into feet and inches.
- For weights, extract the number in lbs.
- For fitness level, map casual descriptions to: beginner/intermediate/advanced/elite.
- For cities, extract the city name (e.g., "I live in Austin" -> city="Austin").
- For profile visibility, extract "public" or "private".

Return null for any field you cannot extract from the message.`;

    const result = await generateObject({
      model: aiModelFast,
      schema: extractedDataSchema,
      prompt: extractionPrompt,
    });

    // Transform flat schema to nested format and merge with existing
    const transformedData = transformToNestedFormat(result.object, existingData);

    // Update field tracking
    transformedData._fieldTracking = updateFieldTracking(
      existingData,
      transformedData,
      currentPhase,
      message
    );

    return transformedData;
  } catch (error) {
    console.error("Data extraction error:", error);
    return existingData;
  }
}

// Check if a field is complete (collected or skipped)
function isFieldComplete(field: TrackableField, data: ExtractedData): boolean {
  const tracking = data._fieldTracking || {};
  const status = tracking[field]?.status;

  // If explicitly tracked as collected or skipped, it's complete
  if (status === "collected" || status === "skipped") return true;

  // Also check if we have a value (legacy data without tracking)
  const value = data[field as keyof ExtractedData];
  const isArray = field === "limitations" || field === "personalRecords";
  return isArray
    ? Array.isArray(value) && value.length > 0
    : value !== undefined && value !== null;
}

// Check if all fields in a phase are complete (collected or skipped)
function isPhaseComplete(phase: string, data: ExtractedData): boolean {
  const fields = PHASE_FIELDS[phase] || [];
  return fields.every(field => isFieldComplete(field, data));
}

// Determine if we should advance to next phase
function shouldAdvancePhase(
  currentPhase: string,
  oldData: ExtractedData,
  newData: ExtractedData
): boolean {
  // For optional phases, check if all fields are addressed (collected or skipped)
  const optionalPhases = ["profile_setup", "location", "body_composition", "limitations", "personal_records"];

  if (optionalPhases.includes(currentPhase)) {
    // Advance if all fields in phase are either collected or skipped
    return isPhaseComplete(currentPhase, newData) && !isPhaseComplete(currentPhase, oldData);
  }

  // For required phases, check if we have all required data OR all fields addressed
  // v2.2: Using camelCase field names only
  const phaseRequirements: Record<string, (data: ExtractedData) => boolean> = {
    welcome: (d) => !!d.name,
    // profile_setup is optional, handled above
    motivation: (d) => !!d.primaryMotivation,
    // All basics must be collected (camelCase: birthMonth, birthYear)
    basics: (d) => !!(d.birthMonth && d.birthYear && d.gender && d.heightFeet && d.weight),
    // location is optional, handled above
    // Both fitness background fields required
    fitness_background: (d) => !!(d.fitnessLevel && d.trainingFrequency !== undefined),
    // Primary goal required
    goals: (d) => !!d.primaryGoal,
    // At least duration and equipment (days can be skipped)
    preferences: (d) => !!(d.workoutDuration && d.equipmentAccess) || isPhaseComplete("preferences", d),
    // Privacy setting required (camelCase: profileVisibility)
    privacy: (d) => !!d.profileVisibility,
    wrap_up: () => true,
  };

  const check = phaseRequirements[currentPhase];
  if (!check) return false;

  const hadData = check(oldData);
  const hasData = check(newData);

  return !hadData && hasData;
}

// Get fields that were just collected (comparing old vs new data)
function getJustCollectedFields(
  oldData: ExtractedData,
  newData: ExtractedData
): Record<string, unknown> {
  const justCollected: Record<string, unknown> = {};

  // Check each field for changes (v2.2: camelCase only)
  const fieldsToCheck: (keyof ExtractedData)[] = [
    "name", "birthMonth", "birthYear", "gender", "heightFeet", "heightInches",
    "weight", "city", "profileVisibility", "bodyFatPercentage", "fitnessLevel",
    "primaryMotivation", "primaryGoal", "timeline", "targetWeight",
    "workoutDuration", "trainingFrequency", "currentActivity",
  ];

  for (const field of fieldsToCheck) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    if (newValue !== undefined && newValue !== null && oldValue !== newValue) {
      justCollected[field] = newValue;
    }
  }

  // Check arrays (limitations, personalRecords, etc.)
  if (newData.limitations && newData.limitations.length > (oldData.limitations?.length || 0)) {
    justCollected["limitations"] = newData.limitations;
  }
  if (newData.personalRecords && newData.personalRecords.length > (oldData.personalRecords?.length || 0)) {
    justCollected["personalRecords"] = newData.personalRecords;
  }
  if (newData.equipmentAccess && !oldData.equipmentAccess) {
    justCollected["equipmentAccess"] = newData.equipmentAccess;
  }
  if (newData.workoutDays && !oldData.workoutDays) {
    justCollected["workoutDays"] = newData.workoutDays;
  }

  return justCollected;
}

// Get context-aware quick reply suggestions based on what's being asked
function getQuickRepliesForContext(
  phase: string,
  extractedData: ExtractedData,
  schema: ReturnType<typeof getOnboardingSchema>
): string[] {
  // Define question-specific quick replies (v2.2: camelCase field names)
  const contextualReplies: Record<string, Record<string, string[]>> = {
    profile_setup: {
      profilePicture: ["Add a photo", "Skip for now"],
    },
    basics: {
      gender: ["Male", "Female", "Prefer not to say"],
      birthMonth: [], // No quick replies for birthday - user types it
      birthYear: [],
      height: [], // No quick replies for height
      weight: [], // No quick replies for weight
    },
    location: {
      city: ["Skip this"],
    },
    fitness_background: {
      fitnessLevel: ["Complete beginner", "Some experience", "Regular gym-goer", "Advanced"],
      trainingFrequency: ["Not currently", "1-2 days", "3-4 days", "5+ days"],
      currentActivity: ["Weights", "Cardio", "Sports", "Mix of everything"],
    },
    motivation: {
      primaryMotivation: ["Get stronger", "Lose weight", "Build muscle", "Feel healthier"],
    },
    goals: {
      primaryGoal: ["Lose 20 pounds", "Build muscle", "Get stronger", "Run a 5K"],
    },
    body_composition: {
      bodyFatPercentage: ["Not sure", "Around 15-20%", "Around 20-25%", "Over 25%"],
      targetWeight: [], // No quick replies
    },
    limitations: {
      limitations: ["Nope, all good!", "Bad back", "Knee issues", "Shoulder problems"],
    },
    personal_records: {
      personalRecords: ["I don't know my maxes", "I have some numbers", "Mostly cardio focused"],
    },
    preferences: {
      workoutDuration: ["30 minutes", "45 minutes", "60 minutes", "90+ minutes"],
      equipmentAccess: ["Full gym", "Home gym", "Bodyweight only", "Minimal equipment"],
    },
    privacy: {
      profileVisibility: ["Public - I want to meet people", "Private - invitation only"],
    },
  };

  // Determine what question we're likely asking based on field tracking
  const phaseReplies = contextualReplies[phase];
  if (!phaseReplies) {
    // Fall back to phase config
    const phaseConfig = schema.onboarding.phases[phase];
    if (!phaseConfig?.quick_replies) return [];
    return phaseConfig.quick_replies.filter((r): r is string => r !== null);
  }

  // Find the first pending field (not collected, not skipped) and return its quick replies
  const fields = PHASE_FIELDS[phase] || [];
  for (const field of fields) {
    // Use field tracking to check status - skip if collected or skipped
    if (isFieldComplete(field, extractedData)) continue;

    // This field is pending - return its quick replies if any
    if (phaseReplies[field]) {
      return phaseReplies[field];
    }
  }

  return [];
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

    if (existingProgress) {
    }

    if (existingProgress && !existingProgress.completedAt) {
      // Resume from where they left off
      const conversationHistory = existingProgress.conversationHistory as Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        contentType?: "text" | "image";
        componentType?: string;
        componentValue?: unknown;
      }>;

      const quickReplies = getQuickRepliesForContext(
        existingProgress.currentPhase,
        existingProgress.extractedData as ExtractedData || {},
        schema
      );

      // Normalize extracted data to frontend format (camelCase)
      const normalizedData = normalizeForFrontend(existingProgress.extractedData as ExtractedData || {});

      return new Response(JSON.stringify({
        message: null, // No new message, we're restoring
        phase: existingProgress.currentPhase,
        phaseIndex: existingProgress.phaseIndex,
        totalPhases: phaseOrder.length,
        quickReplies,
        extractedData: normalizedData,
        conversationHistory, // Send back the full conversation
        isResuming: true,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // New user - create progress record and send welcome
    const welcomePhase = schema.onboarding.phases.welcome;
    const welcomeMessage = welcomePhase.opening_message || `I'm your AI coach at Repcir.

Before we build your training program, I need to know who I'm working with.

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
