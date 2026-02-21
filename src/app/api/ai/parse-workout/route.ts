import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { applyDistributedRateLimit as applyRateLimit, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit-redis";
import { aiModel, getReasoningOptions } from "@/lib/ai";
import { trackAIUsage } from "@/lib/ai/usage-tracking";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute for AI parsing

// ============================================================================
// Request/Response Schemas
// ============================================================================

const ParseWorkoutRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript is required").max(5000, "Transcript too long"),
  context: z.object({
    recentExercises: z.array(z.string()).optional(),
  }).optional(),
});

// Response schema for AI parsing
const ParsedExerciseSchema = z.object({
  name: z.string().describe("The standardized exercise name"),
  originalText: z.string().describe("The original text that mentioned this exercise"),
  sets: z.number().nullable().describe("Number of sets, null if not specified"),
  reps: z.string().nullable().describe("Rep count or range like '10', '8-12', 'to failure', 'AMRAP'. Null if not specified"),
  weight: z.number().nullable().describe("Weight used in the workout, null if not specified"),
  weightUnit: z.enum(["lbs", "kg"]).nullable().describe("Weight unit, null if not specified"),
  duration: z.number().nullable().describe("Duration in seconds for timed exercises, null if not applicable"),
  distance: z.number().nullable().describe("Distance covered, null if not applicable"),
  distanceUnit: z.enum(["miles", "km", "meters"]).nullable().describe("Distance unit, null if not applicable"),
  time: z.string().nullable().describe("Completion time for 'for time' workouts like '8:45'. Null if not applicable"),
  groupId: z.string().nullable().describe("Group identifier for supersets/circuits, like 'A' or 'circuit1'. Null if standalone"),
  groupType: z.enum(["superset", "circuit", "dropset"]).nullable().describe("Type of grouping, null if standalone"),
  order: z.number().describe("Order in which exercise was mentioned (1-based)"),
});

const ParsedWorkoutSchema = z.object({
  exercises: z.array(ParsedExerciseSchema).describe("Array of parsed exercises from the transcript"),
  workoutType: z.enum(["strength", "cardio", "hiit", "mixed"]).nullable().describe("Overall workout type, null if unclear"),
  totalDuration: z.number().nullable().describe("Total workout duration in minutes if mentioned, null otherwise"),
  feeling: z.string().nullable().describe("How the person felt during the workout (e.g., 'strong', 'exhausted', 'good'). Null if not mentioned"),
  rpe: z.number().min(1).max(10).nullable().describe("Rate of Perceived Exertion (1-10) if mentioned, null otherwise"),
  notes: z.string().nullable().describe("Any additional context or notes from the transcript. Null if none"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1 for how well the transcript was understood"),
  clarificationNeeded: z.array(z.string()).describe("Questions for anything unclear in the transcript. Empty array if everything is clear"),
});

// Extended response with exercise matching
const ParsedWorkoutResponseSchema = ParsedWorkoutSchema.extend({
  exercises: z.array(ParsedExerciseSchema.extend({
    exerciseId: z.string().uuid().nullable().describe("Matched exercise ID from database, null if no match"),
    matchedName: z.string().nullable().describe("The canonical exercise name from database, null if no match"),
    matchConfidence: z.number().min(0).max(1).describe("Confidence in the exercise match (0-1)"),
  })),
});

type ParsedWorkout = z.infer<typeof ParsedWorkoutSchema>;
type ParsedWorkoutResponse = z.infer<typeof ParsedWorkoutResponseSchema>;

// ============================================================================
// Exercise Matching
// ============================================================================

interface ExerciseMatch {
  id: string;
  name: string;
  synonyms: string[] | null;
  category: string;
}

/**
 * Match a spoken exercise name to exercises in the database
 */
async function matchExerciseToDatabase(
  spokenName: string,
  availableExercises: ExerciseMatch[]
): Promise<{ exerciseId: string | null; matchedName: string | null; confidence: number }> {
  const normalizedSpoken = spokenName.toLowerCase().trim();

  // Common synonyms/abbreviations mapping
  const commonSynonyms: Record<string, string[]> = {
    "bench": ["bench press", "barbell bench press", "flat bench press"],
    "squat": ["barbell squat", "back squat", "barbell back squat"],
    "deadlift": ["barbell deadlift", "conventional deadlift"],
    "ohp": ["overhead press", "shoulder press", "military press"],
    "press": ["overhead press", "shoulder press"],
    "rows": ["barbell row", "bent over row"],
    "pull-ups": ["pull up", "pullup", "pull-up"],
    "push-ups": ["push up", "pushup", "push-up"],
    "curls": ["bicep curl", "barbell curl", "dumbbell curl"],
    "tricep pushdowns": ["tricep pushdown", "cable pushdown", "triceps pushdown"],
    "lat pulldowns": ["lat pulldown", "cable pulldown"],
    "run": ["running", "jog", "jogging"],
    "5k": ["5k run", "5 kilometer run"],
    "10k": ["10k run", "10 kilometer run"],
  };

  // Check for exact match first
  for (const exercise of availableExercises) {
    if (exercise.name.toLowerCase() === normalizedSpoken) {
      return { exerciseId: exercise.id, matchedName: exercise.name, confidence: 1.0 };
    }
  }

  // Check synonyms in database
  for (const exercise of availableExercises) {
    if (exercise.synonyms) {
      for (const synonym of exercise.synonyms) {
        if (synonym.toLowerCase() === normalizedSpoken) {
          return { exerciseId: exercise.id, matchedName: exercise.name, confidence: 0.95 };
        }
      }
    }
  }

  // Check our common synonyms mapping
  for (const [shortName, fullNames] of Object.entries(commonSynonyms)) {
    if (normalizedSpoken.includes(shortName)) {
      for (const fullName of fullNames) {
        const match = availableExercises.find(e =>
          e.name.toLowerCase() === fullName.toLowerCase() ||
          e.name.toLowerCase().includes(fullName.toLowerCase())
        );
        if (match) {
          return { exerciseId: match.id, matchedName: match.name, confidence: 0.85 };
        }
      }
    }
  }

  // Partial match - spoken name is contained in exercise name
  for (const exercise of availableExercises) {
    if (exercise.name.toLowerCase().includes(normalizedSpoken)) {
      return { exerciseId: exercise.id, matchedName: exercise.name, confidence: 0.7 };
    }
  }

  // Partial match - exercise name is contained in spoken name
  for (const exercise of availableExercises) {
    const exerciseWords = exercise.name.toLowerCase().split(" ");
    const spokenWords = normalizedSpoken.split(" ");
    const matchingWords = exerciseWords.filter(w => spokenWords.includes(w));
    if (matchingWords.length >= 2 || (matchingWords.length === 1 && exerciseWords.length === 1)) {
      return { exerciseId: exercise.id, matchedName: exercise.name, confidence: 0.6 };
    }
  }

  // No match found
  return { exerciseId: null, matchedName: null, confidence: 0 };
}

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are an expert fitness coach AI that parses natural language workout descriptions into structured data.

## Your Task
Parse the user's workout transcript and extract structured exercise data. People describe workouts in many different ways - be flexible and understand fitness terminology.

## Common Workout Description Patterns

### Strength Training
- "bench 4x10 at 135" = Bench Press, 4 sets, 10 reps, 135 lbs
- "squat 5x5 at 225" = Squat, 5 sets, 5 reps, 225 lbs
- "deadlifts, worked up to 315 for 3" = Deadlift, 1 set, 3 reps, 315 lbs
- "3 sets of curls, 12 reps each with 30s" = Bicep Curl, 3 sets, 12 reps, 30 lbs
- "bench press: 135x10, 155x8, 175x6" = 3 separate entries (same exercise, different weights)

### Cardio/Running
- "ran a 5k in 28 minutes" = Running, 5 km distance, 28:00 time
- "2 mile run, 16 minute pace" = Running, 2 miles, ~32 min duration
- "30 minutes on the treadmill" = Treadmill, 30 min duration
- "rowed 2000m in 7:30" = Rowing, 2000 meters, 7:30 time

### CrossFit/HIIT Style
- "did 100 burpees for time, got 8:45" = Burpees, 100 reps, 8:45 completion time
- "21-15-9 thrusters and pull-ups" = Circuit with decreasing reps
- "AMRAP 10 min: 5 pull-ups, 10 push-ups, 15 squats" = Circuit, AMRAP format

### Supersets and Circuits
- "superset of curls and tricep pushdowns, 3 sets each" = Both exercises get groupId "A", groupType "superset"
- "circuit: squats, lunges, jump squats, 4 rounds" = All exercises get same groupId, groupType "circuit"
- "drop set on bench: 185, 155, 135" = groupType "dropset"

### Feelings and RPE
- "felt strong today" = feeling: "strong"
- "was exhausted" = feeling: "exhausted"
- "RPE 8" or "about an 8 out of 10" = rpe: 8
- "pretty easy" = rpe: ~4-5
- "really hard" or "pushed to failure" = rpe: ~9-10

## Rules
1. Extract ALL exercises mentioned, even if details are incomplete
2. Use null for any fields not clearly specified (don't guess)
3. For weight, default to "lbs" unless "kg" or "kilos" is mentioned
4. For "for time" workouts, put completion time in the "time" field
5. If transcript is vague like "did some chest stuff", add to clarificationNeeded
6. Set confidence based on how clear and complete the transcript was
7. Group exercises together when described as supersets, circuits, or drop sets
8. Parse rep ranges like "8-12" as the reps string, don't convert to single number
9. "to failure" or "AMRAP" are valid reps values
10. Order exercises by the sequence they were mentioned`;

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await applyRateLimit(
      `ai-parse-workout:${session.user.id}`,
      RATE_LIMITS.aiGeneration
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = ParseWorkoutRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => e.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { transcript, context } = validation.data;

    // Fetch exercises from database for matching
    const availableExercises = await db.query.exercises.findMany({
      columns: {
        id: true,
        name: true,
        synonyms: true,
        category: true,
      },
      where: sql`${exercises.isActive} = true`,
    }) as ExerciseMatch[];

    // Build context for AI
    let contextPrompt = "";
    if (context?.recentExercises && context.recentExercises.length > 0) {
      contextPrompt = `\n\nRecent exercises the user has done (may be referenced): ${context.recentExercises.join(", ")}`;
    }

    // Generate parsed workout using AI
    const startTime = Date.now();
    const result = await generateObject({
      model: aiModel,
      schema: ParsedWorkoutSchema,
      prompt: `${SYSTEM_PROMPT}${contextPrompt}

## Transcript to Parse
"${transcript}"

Parse this workout description into structured data. Be thorough and extract all exercises mentioned.`,
      providerOptions: getReasoningOptions("quick", { cacheKey: "parse-workout" }) as any,
    });

    trackAIUsage({
      userId: session.user.id,
      endpoint: "/api/ai/parse-workout",
      feature: "parse_workout",
      modelUsed: "gpt-5.2",
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheHit: (result.usage?.inputTokenDetails?.cacheReadTokens ?? 0) > 0,
      durationMs: Date.now() - startTime,
    }).catch(() => {});

    const parsedWorkout = result.object as ParsedWorkout;

    // Match exercises to database
    const exercisesWithMatches = await Promise.all(
      parsedWorkout.exercises.map(async (exercise) => {
        const match = await matchExerciseToDatabase(exercise.name, availableExercises);
        return {
          ...exercise,
          exerciseId: match.exerciseId,
          matchedName: match.matchedName,
          matchConfidence: match.confidence,
        };
      })
    );

    // Build final response
    const response: ParsedWorkoutResponse = {
      ...parsedWorkout,
      exercises: exercisesWithMatches,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error parsing workout:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("rate limit")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (errorMessage.includes("timeout")) {
      return NextResponse.json(
        { error: "Request timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to parse workout description" },
      { status: 500 }
    );
  }
}
