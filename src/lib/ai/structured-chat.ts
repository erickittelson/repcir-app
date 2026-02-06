import { z } from "zod";

// Clarification option schema
export const clarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export type ClarificationOption = z.infer<typeof clarificationOptionSchema>;

// Clarification question schema
export const clarificationSchema = z.object({
  question: z.string(),
  options: z.array(clarificationOptionSchema),
  allowCustom: z.boolean(),
  context: z.enum(["location", "duration", "limitations", "energy", "focus", "intensity"]),
});

export type ClarificationData = z.infer<typeof clarificationSchema>;

// Action button schema
export const actionSchema = z.object({
  id: z.string(),
  label: z.string(),
  action: z.enum(["start_workout", "save_plan", "modify", "regenerate"]),
  variant: z.enum(["primary", "secondary", "outline"]),
});

export type ActionData = z.infer<typeof actionSchema>;

// Workout exercise prescription for display
export const workoutExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  restSeconds: z.number().optional(),
  structureType: z.string().optional(),
  notes: z.string().nullable().optional(),
  memberPrescriptions: z.array(z.object({
    memberName: z.string(),
    weight: z.string().nullable(),
    bodyweightMod: z.string().nullable(),
    cardioTarget: z.string().nullable(),
    rpeTarget: z.number().nullable(),
    memberNotes: z.string().nullable(),
  })).optional(),
  supersetGroup: z.number().nullable().optional(),
  circuitGroup: z.number().nullable().optional(),
});

export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

// Generated workout schema for chat display
export const generatedWorkoutSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  exercises: z.array(workoutExerciseSchema),
  warmup: z.array(z.string()).optional(),
  cooldown: z.array(z.string()).optional(),
  estimatedDuration: z.number(),
  difficulty: z.string(),
  structure: z.string().nullable().optional(),
});

export type GeneratedWorkout = z.infer<typeof generatedWorkoutSchema>;

// Workout data in chat response
export const workoutDataSchema = z.object({
  data: generatedWorkoutSchema,
  planId: z.string().optional(),
});

export type WorkoutData = z.infer<typeof workoutDataSchema>;

// Conversation state for multi-turn clarification
export const conversationStateSchema = z.object({
  active: z.boolean(),
  context: z.object({
    location: z.string().optional(),
    duration: z.number().optional(),
    energy: z.string().optional(),
    limitations: z.array(z.string()).optional(),
    focus: z.string().optional(),
    intensity: z.string().optional(),
  }),
  pendingQuestions: z.array(z.string()),
  answeredQuestions: z.array(z.string()),
});

export type ConversationState = z.infer<typeof conversationStateSchema>;

// Full structured chat response schema
export const structuredChatResponseSchema = z.object({
  type: z.enum(["text", "clarification", "workout", "mixed"]),
  textContent: z.string().optional(),
  clarification: clarificationSchema.optional(),
  workout: workoutDataSchema.optional(),
  actions: z.array(actionSchema).optional(),
  conversationState: conversationStateSchema.optional(),
});

export type StructuredChatResponse = z.infer<typeof structuredChatResponseSchema>;

// Helper to create a clarification response
export function createClarificationResponse(
  textContent: string,
  clarification: ClarificationData,
  conversationState: ConversationState
): StructuredChatResponse {
  return {
    type: "clarification",
    textContent,
    clarification,
    conversationState,
  };
}

// Helper to create a workout response
export function createWorkoutResponse(
  textContent: string,
  workout: WorkoutData,
  actions: ActionData[]
): StructuredChatResponse {
  return {
    type: "workout",
    textContent,
    workout,
    actions,
    conversationState: {
      active: false,
      context: {},
      pendingQuestions: [],
      answeredQuestions: [],
    },
  };
}

// Default actions for workout responses
export const DEFAULT_WORKOUT_ACTIONS: ActionData[] = [
  { id: "start", label: "Start Workout", action: "start_workout", variant: "primary" },
  { id: "save", label: "Save to Profile", action: "save_plan", variant: "secondary" },
  { id: "modify", label: "Modify", action: "modify", variant: "outline" },
];

// Initial conversation state
export const INITIAL_CONVERSATION_STATE: ConversationState = {
  active: false,
  context: {},
  pendingQuestions: [],
  answeredQuestions: [],
};
