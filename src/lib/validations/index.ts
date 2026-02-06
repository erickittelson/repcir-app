import { z } from "zod";

// ============================================================================
// Common schemas
// ============================================================================

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

// ============================================================================
// Circle schemas
// ============================================================================

export const createCircleSchema = z.object({
  name: z
    .string()
    .min(1, "Circle name is required")
    .max(100, "Circle name must be less than 100 characters")
    .trim(),
  passkey: z
    .string()
    .min(4, "Passkey must be at least 4 characters")
    .max(50, "Passkey must be less than 50 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

// ============================================================================
// Member schemas
// ============================================================================

export const createMemberSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  avatar: z.string().max(10).optional(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  role: z.enum(["owner", "admin", "member"]).optional().default("member"),
});

export const updateMemberSchema = createMemberSchema.partial();

// ============================================================================
// Workout Plan schemas
// ============================================================================

export const workoutPlanExerciseSchema = z.object({
  exerciseId: uuidSchema,
  order: z.number().min(0),
  sets: z.number().min(1).max(100).optional(),
  reps: z.string().max(50).optional(),
  weight: z.string().max(50).optional(),
  duration: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  distanceUnit: z.enum(["miles", "meters", "km"]).optional(),
  restBetweenSets: z.number().min(0).max(600).optional(),
  notes: z.string().max(500).optional(),
});

export const createWorkoutPlanSchema = z.object({
  name: z
    .string()
    .min(1, "Workout name is required")
    .max(200, "Workout name must be less than 200 characters")
    .trim(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  estimatedDuration: z.number().min(1).max(480).optional(),
  exercises: z.array(workoutPlanExerciseSchema).optional().default([]),
});

export const updateWorkoutPlanSchema = createWorkoutPlanSchema.partial();

// ============================================================================
// Workout Session schemas
// ============================================================================

export const setLogSchema = z.object({
  setNumber: z.number().min(1),
  targetReps: z.number().min(0).optional(),
  actualReps: z.number().min(0).optional(),
  targetWeight: z.number().min(0).optional(),
  actualWeight: z.number().min(0).optional(),
  targetDuration: z.number().min(0).optional(),
  actualDuration: z.number().min(0).optional(),
  completed: z.boolean().optional().default(false),
});

export const exerciseLogSchema = z.object({
  exerciseId: uuidSchema,
  order: z.number().min(0),
  sets: z.array(setLogSchema).optional(),
});

export const createWorkoutSessionSchema = z.object({
  memberId: uuidSchema,
  planId: uuidSchema.optional().nullable(),
  name: z
    .string()
    .min(1, "Workout name is required")
    .max(200, "Workout name must be less than 200 characters")
    .trim(),
  date: z.string().datetime().optional(),
  exercises: z.array(exerciseLogSchema).optional(),
});

export const startWorkoutSessionSchema = z.object({
  memberId: uuidSchema.optional(),
  memberIds: z.array(uuidSchema).optional(),
  planId: uuidSchema.optional(),
  name: z.string().max(200).optional(),
}).refine((data) => data.memberId || (data.memberIds && data.memberIds.length > 0), {
  message: "At least one member is required",
});

export const updateWorkoutSessionSchema = z.object({
  status: z.enum(["planned", "in_progress", "completed"]).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const updateSetSchema = z.object({
  actualReps: z.number().min(0).optional(),
  actualWeight: z.number().min(0).optional(),
  actualDuration: z.number().min(0).optional(),
  actualDistance: z.number().min(0).optional(),
  completed: z.boolean().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

export const completeWorkoutSessionSchema = z.object({
  exercises: z.array(z.object({
    exerciseId: uuidSchema,
    completed: z.boolean(),
    notes: z.string().max(500).optional(),
    sets: z.array(setLogSchema),
  })).optional(),
  notes: z.string().max(2000).optional(),
  rating: z.number().min(1).max(5).optional(),
});

// ============================================================================
// Exercise schemas
// ============================================================================

export const createExerciseSchema = z.object({
  name: z
    .string()
    .min(1, "Exercise name is required")
    .max(200, "Exercise name must be less than 200 characters")
    .trim(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  category: z.enum([
    "strength",
    "cardio",
    "flexibility",
    "skill",
    "sport",
    "plyometric",
  ]),
  muscleGroups: z.array(z.string().max(50)).optional(),
  secondaryMuscles: z.array(z.string().max(50)).optional(),
  equipment: z.array(z.string().max(50)).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  force: z.enum(["push", "pull", "static", "dynamic"]).optional(),
  mechanic: z.enum(["compound", "isolation"]).optional(),
  benefits: z.array(z.string().max(50)).optional(),
  progressions: z.array(z.string().max(100)).optional(),
  videoUrl: z.string().url().max(500).optional(),
  imageUrl: z.string().url().max(500).optional(),
});

// ============================================================================
// Goal schemas
// ============================================================================

export const createGoalSchema = z.object({
  memberId: uuidSchema,
  title: z
    .string()
    .min(1, "Goal title is required")
    .max(200, "Goal title must be less than 200 characters")
    .trim(),
  description: z.string().max(1000).optional(),
  category: z.enum([
    "strength",
    "cardio",
    "skill",
    "weight",
    "flexibility",
    "endurance",
  ]),
  targetValue: z.number().optional(),
  targetUnit: z.string().max(50).optional(),
  currentValue: z.number().optional(),
  targetDate: z.string().datetime().optional(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(["active", "completed", "abandoned"]).optional(),
});

// ============================================================================
// Equipment schemas
// ============================================================================

export const createEquipmentSchema = z.object({
  name: z
    .string()
    .min(1, "Equipment name is required")
    .max(100, "Equipment name must be less than 100 characters")
    .trim(),
  category: z.enum(["cardio", "strength", "flexibility", "accessories"]),
  description: z.string().max(500).optional(),
  quantity: z.number().min(1).max(1000).optional().default(1),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
});

// ============================================================================
// AI Chat schemas
// ============================================================================

// Message part schema for AI SDK v4+ format
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
}).passthrough();

// Coaching modes available
export const coachingModes = [
  "general",
  "mental_block",
  "motivation",
  "life_balance",
  "goal_setting",
  "accountability",
  "confidence",
] as const;

export type CoachingMode = typeof coachingModes[number];

// Support both legacy (content string) and modern (parts array) AI SDK message formats
// Clarification context types for workout generation
const clarificationContextTypes = [
  "location",
  "duration",
  "limitations",
  "energy",
  "focus",
  "intensity",
] as const;

// Conversation state for multi-turn clarification
const conversationStateSchema = z.object({
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
}).optional();

export const aiChatSchema = z.object({
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system"]),
    // Legacy format: content as string
    content: z.string().max(50000).optional(),
    // Modern AI SDK format: parts array
    parts: z.array(messagePartSchema).optional(),
  }).refine(
    (msg) => msg.content !== undefined || msg.parts !== undefined,
    { message: "Message must have either content or parts" }
  )),
  memberId: uuidSchema,
  deepThinking: z.boolean().optional().default(false),
  // Conversation persistence
  conversationId: uuidSchema.nullish(), // accepts null, undefined, or valid UUID
  // Coaching mode
  mode: z.enum(coachingModes).optional().default("general"),
  // Clarification flow state
  clarificationState: conversationStateSchema,
  // User's answer to a clarification question
  clarificationAnswer: z.string().optional(),
  // Which context the answer is for
  clarificationContext: z.enum(clarificationContextTypes).optional(),
});

// ============================================================================
// User Profile schemas
// ============================================================================

// Social links schema
const socialLinkSchema = z.object({
  platform: z.string().max(50),
  url: z.string().url().max(500),
}).strict();

// Visibility options
const visibilityEnum = z.enum(["public", "connections", "private"]);

export const updateUserProfileSchema = z.object({
  // Basic info - all with length limits
  displayName: z.string().max(100).trim().optional(),
  handle: z.string()
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores")
    .trim()
    .optional(),
  bio: z.string().max(500).optional(),

  // Birth info - validated ranges
  birthMonth: z.number().int().min(1).max(12).optional().nullable(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional().nullable(),

  // Location - with length limits
  city: z.string().max(100).trim().optional().nullable(),
  state: z.string().max(100).trim().optional().nullable(),
  country: z.string().max(100).trim().optional().nullable(),

  // Workout location
  workoutLocation: z.string().max(200).trim().optional().nullable(),
  workoutLocationAddress: z.string().max(500).trim().optional().nullable(),
  workoutLocationLat: z.number().min(-90).max(90).optional().nullable(),
  workoutLocationLng: z.number().min(-180).max(180).optional().nullable(),
  workoutLocationType: z.enum(["home", "gym", "outdoor", "studio", "other"]).optional().nullable(),
  locationVisibility: visibilityEnum.optional(),

  // Profile picture (URL)
  profilePicture: z.string().url().max(1000).optional().nullable(),

  // Gallery photos - max 5
  galleryPhotos: z.array(z.string().url().max(1000)).max(5).optional(),

  // Visibility settings
  visibility: visibilityEnum.optional(),
  fieldVisibility: z.record(z.string(), visibilityEnum).optional(),

  // Social links - max 10
  socialLinks: z.array(socialLinkSchema).max(10).optional(),

  // Featured items - max 5 each
  featuredGoals: z.array(uuidSchema).max(5).optional(),
  featuredAchievements: z.array(uuidSchema).max(5).optional(),

  // Gender (if updatable)
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
}).strict(); // strict() prevents extra fields (mass assignment protection)

// Partial schema for PATCH updates (all fields optional)
export const patchUserProfileSchema = updateUserProfileSchema.partial();

// ============================================================================
// Circle Post schemas
// ============================================================================

export const createCirclePostSchema = z.object({
  content: z.string()
    .min(1, "Post content is required")
    .max(5000, "Post content must be less than 5000 characters")
    .trim(),
  mediaUrls: z.array(z.string().url().max(1000)).max(10).optional(),
  type: z.enum(["text", "workout", "achievement", "question"]).optional().default("text"),
  workoutSessionId: uuidSchema.optional().nullable(),
  visibility: visibilityEnum.optional().default("public"),
}).strict();

export const createCircleCommentSchema = z.object({
  content: z.string()
    .min(1, "Comment is required")
    .max(2000, "Comment must be less than 2000 characters")
    .trim(),
  parentId: uuidSchema.optional().nullable(),
}).strict();

// ============================================================================
// Helper function to validate request body
// ============================================================================

export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => e.message).join(", ");
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
}
