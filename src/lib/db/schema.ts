/**
 * Consolidated Database Schema - January 2026
 *
 * Clean schema with:
 * - Neon Auth integration (individual user authentication)
 * - Multi-circle support (users can belong to multiple circles)
 * - Vector embeddings for AI similarity search
 * - Optimized for AI/OpenAI API performance
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  vector,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// ONBOARDING PROGRESS (persisted conversation state)
// ============================================================================

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(), // Neon Auth user ID
    currentPhase: text("current_phase").default("welcome").notNull(),
    phaseIndex: integer("phase_index").default(0).notNull(),
    extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().default({}).notNull(),
    conversationHistory: jsonb("conversation_history").$type<Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>>().default([]).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (progress) => [
    uniqueIndex("onboarding_progress_user_idx").on(progress.userId),
  ]
);

// ============================================================================
// CIRCLES & MEMBERS
// ============================================================================

export const circles = pgTable(
  "circles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    visibility: text("visibility").default("private").notNull(), // public, private
    category: text("category"), // fitness, strength, running, yoga, crossfit, etc.
    memberCount: integer("member_count").default(0).notNull(), // Cached count for discovery
    imageUrl: text("image_url"), // Circle cover image
    // Enhanced circle metadata
    focusArea: text("focus_area"), // strength, weight_loss, endurance, flexibility, general
    targetDemographic: text("target_demographic"), // beginners, intermediate, advanced, seniors, women, teens, etc.
    activityType: text("activity_type"), // challenges, workout_plans, accountability, social
    scheduleType: text("schedule_type"), // daily_challenges, weekly_workouts, self_paced
    maxMembers: integer("max_members"), // null = unlimited
    joinType: text("join_type").default("request"), // open, request, invite_only
    rules: jsonb("rules").$type<string[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),
    circleGoals: jsonb("circle_goals").$type<Array<{
      type: string;
      target?: number;
      unit?: string;
      description?: string;
    }>>().default([]),
    // System circle for official content management
    isSystemCircle: boolean("is_system_circle").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (circle) => [
    index("circles_visibility_idx").on(circle.visibility),
    index("circles_category_idx").on(circle.category),
    index("circles_focus_area_idx").on(circle.focusArea),
    index("circles_system_idx").on(circle.isSystemCircle),
    index("circles_target_demographic_idx").on(circle.targetDemographic),
    index("circles_join_type_idx").on(circle.joinType),
  ]
);

/**
 * Circle Invitations - Invite links for joining circles
 */
export const circleInvitations = pgTable(
  "circle_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(), // Short invite code (e.g., "ABC123")
    createdBy: uuid("created_by").notNull(), // Member ID who created the invite
    email: text("email"), // Optional: specific email to invite
    role: text("role").default("member").notNull(), // Role to assign on join
    maxUses: integer("max_uses"), // null = unlimited
    uses: integer("uses").default(0).notNull(),
    expiresAt: timestamp("expires_at"), // null = never expires
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (invitation) => [
    index("invitation_circle_idx").on(invitation.circleId),
    uniqueIndex("invitation_code_idx").on(invitation.code),
  ]
);

/**
 * Circle Members - Links Neon Auth users to circles
 * Users can belong to multiple circles with different roles
 *
 * NOTE: User-level data like profilePicture and birthday are now stored in user_profiles.
 * The fields here are kept for backward compatibility but should not be used for new code.
 */
export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    // Links to neon_auth.user - the authenticated user
    userId: text("user_id"), // Neon Auth user ID (text, not uuid)
    name: text("name").notNull(),
    // @deprecated - Use user_profiles.profile_picture instead
    profilePicture: text("profile_picture"),
    // @deprecated - Use user_profiles.birth_month/birth_year instead
    dateOfBirth: timestamp("date_of_birth"),
    gender: text("gender"), // male, female, other
    role: text("role").default("member").notNull(), // owner, admin, member
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (member) => [
    index("circle_member_circle_idx").on(member.circleId),
    index("circle_member_user_idx").on(member.userId),
  ]
);

// ============================================================================
// CIRCLE EQUIPMENT
// ============================================================================

export const circleEquipment = pgTable(
  "circle_equipment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(), // cardio, strength, flexibility, accessories
    description: text("description"),
    quantity: integer("quantity").default(1),
    brand: text("brand"),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (equipment) => [index("circle_equipment_circle_idx").on(equipment.circleId)]
);

// ============================================================================
// MEMBER METRICS (tracked over time)
// ============================================================================

export const memberMetrics = pgTable(
  "member_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    date: timestamp("date").defaultNow().notNull(),
    weight: real("weight"), // in lbs
    height: real("height"), // in inches
    bodyFatPercentage: real("body_fat_percentage"),
    fitnessLevel: text("fitness_level"), // beginner, intermediate, advanced, elite
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (metric) => [
    index("member_metrics_member_idx").on(metric.memberId),
    index("member_metrics_date_idx").on(metric.date),
  ]
);

// ============================================================================
// MEMBER LIMITATIONS
// ============================================================================

export const memberLimitations = pgTable(
  "member_limitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // injury, condition, preference
    description: text("description").notNull(),
    affectedAreas: jsonb("affected_areas").$type<string[]>(), // body parts affected
    severity: text("severity"), // mild, moderate, severe
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"), // null if ongoing
    active: boolean("active").default(true).notNull(),
    notes: text("notes"), // Additional user notes about the limitation
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (limitation) => [index("member_limitations_member_idx").on(limitation.memberId)]
);

// ============================================================================
// GOALS & MILESTONES
// ============================================================================

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(), // strength, cardio, skill, weight, flexibility, endurance
    targetValue: real("target_value"), // e.g., 225 for bench press
    targetUnit: text("target_unit"), // lbs, seconds, reps, miles, etc.
    currentValue: real("current_value"),
    targetDate: timestamp("target_date"),
    status: text("status").default("active").notNull(), // active, completed, abandoned
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (goal) => [
    index("goals_member_idx").on(goal.memberId),
    index("goals_status_idx").on(goal.status),
  ]
);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    targetValue: real("target_value"),
    targetDate: timestamp("target_date"),
    status: text("status").default("pending").notNull(), // pending, completed
    order: integer("order").notNull(),
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (milestone) => [index("milestones_goal_idx").on(milestone.goalId)]
);

// ============================================================================
// EXERCISE LIBRARY (with AI embeddings)
// ============================================================================

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    category: text("category").notNull(), // strength, cardio, flexibility, skill, sport, plyometric
    muscleGroups: jsonb("muscle_groups").$type<string[]>(), // primary muscles targeted
    secondaryMuscles: jsonb("secondary_muscles").$type<string[]>(), // secondary muscles
    equipment: jsonb("equipment").$type<string[]>(), // barbell, dumbbell, machine, bodyweight
    equipmentAlternatives: jsonb("equipment_alternatives").$type<string[]>(),
    difficulty: text("difficulty"), // beginner, intermediate, advanced
    force: text("force"), // push, pull, static, dynamic
    mechanic: text("mechanic"), // compound, isolation
    benefits: jsonb("benefits").$type<string[]>(), // strength, speed, power, flexibility, endurance, balance, coordination
    contraindications: jsonb("contraindications").$type<string[]>(),
    progressions: jsonb("progressions").$type<string[]>(), // pull-up, muscle-up, back-tuck, faster-sprint, etc.
    regressions: jsonb("regressions").$type<string[]>(),
    prerequisites: jsonb("prerequisites").$type<string[]>(),
    // Media URLs
    videoUrl: text("video_url"),
    imageUrl: text("image_url"),
    // AI/ML features
    embedding: vector("embedding", { dimensions: 1536 }), // For similarity search
    tags: jsonb("tags").$type<string[]>(),
    synonyms: jsonb("synonyms").$type<string[]>(), // Alternative names
    // Sport applications
    sportApplications: jsonb("sport_applications").$type<string[]>(),
    // Safety and progression
    safetyNotes: text("safety_notes"), // Common mistakes and injury prevention
    scalingOptions: jsonb("scaling_options").$type<Array<{ level: string; modification: string }>>().default([]),
    commonMistakes: jsonb("common_mistakes").$type<string[]>().default([]),
    // Metadata
    isActive: boolean("is_active").default(true).notNull(),
    isCustom: boolean("is_custom").default(false).notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => circleMembers.id,
      { onDelete: "set null" }
    ),
    source: text("source").default("system"), // system, free_exercise_db, custom
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (exercise) => [
    index("exercises_category_idx").on(exercise.category),
    index("exercises_name_idx").on(exercise.name),
    index("exercises_difficulty_idx").on(exercise.difficulty),
    index("exercises_active_idx").on(exercise.isActive),
    index("exercises_primary_muscles_idx").using("gin", exercise.muscleGroups),
    index("exercises_equipment_idx").using("gin", exercise.equipment),
    index("exercises_tags_idx").using("gin", exercise.tags),
  ]
);

// ============================================================================
// WORKOUT PLANS (templates)
// ============================================================================

export const workoutPlans = pgTable(
  "workout_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"), // strength, cardio, hiit, mixed, etc.
    difficulty: text("difficulty"),
    estimatedDuration: integer("estimated_duration"), // in minutes
    // Workout structure fields
    structureType: text("structure_type").default("standard"), // standard, emom, amrap, for_time, tabata, chipper, ladder, intervals
    timeCapSeconds: integer("time_cap_seconds"), // Time limit for timed workouts
    scoringType: text("scoring_type"), // reps, rounds, time, weight, distance, none
    roundsTarget: integer("rounds_target"), // Target rounds for AMRAP or For Time
    emomIntervalSeconds: integer("emom_interval_seconds").default(60), // Interval for EMOM workouts
    isOfficial: boolean("is_official").default(false).notNull(), // Official/curated workouts
    tags: jsonb("tags").$type<string[]>().default([]), // Tags for categorization
    // Content enhancement fields
    warmupNotes: text("warmup_notes"), // Recommended warmup routine
    cooldownNotes: text("cooldown_notes"), // Recommended cooldown routine
    scalingNotes: jsonb("scaling_notes").$type<{ beginner?: string; intermediate?: string; advanced?: string }>().default({}),
    prerequisites: jsonb("prerequisites").$type<string[]>().default([]), // Required skills or fitness level
    intensityLevel: integer("intensity_level"), // 1-10 scale
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => circleMembers.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (plan) => [
    index("workout_plans_circle_idx").on(plan.circleId),
    index("workout_plans_structure_idx").on(plan.structureType),
    index("workout_plans_official_idx").on(plan.isOfficial),
  ]
);

export const workoutPlanExercises = pgTable(
  "workout_plan_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => workoutPlans.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    sets: integer("sets"),
    reps: text("reps"), // can be "8-12" or "to failure"
    weight: text("weight"), // can be percentage "80%" or specific
    duration: integer("duration"), // in seconds for timed exercises
    distance: real("distance"), // for cardio
    distanceUnit: text("distance_unit"), // miles, meters, km
    restBetweenSets: integer("rest_between_sets"), // in seconds
    // Grouping for supersets/circuits
    groupId: text("group_id"), // e.g., "A1", "A2" for supersets, "circuit1" for circuits
    groupType: text("group_type"), // superset, circuit, triset, giant_set, drop_set
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (exercise) => [index("workout_plan_exercises_plan_idx").on(exercise.planId)]
);

// ============================================================================
// WORKOUT SESSIONS (actual workouts performed)
// ============================================================================

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => workoutPlans.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    date: timestamp("date").defaultNow().notNull(),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    status: text("status").default("planned").notNull(), // planned, in_progress, completed
    notes: text("notes"),
    rating: integer("rating"), // 1-5 self rating
    aiFeedback: text("ai_feedback"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (session) => [
    index("workout_sessions_member_idx").on(session.memberId),
    index("workout_sessions_date_idx").on(session.date),
    index("workout_sessions_status_idx").on(session.status),
  ]
);

export const workoutSessionExercises = pgTable(
  "workout_session_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    completed: boolean("completed").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (exercise) => [
    index("workout_session_exercises_session_idx").on(exercise.sessionId),
  ]
);

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionExerciseId: uuid("session_exercise_id")
      .notNull()
      .references(() => workoutSessionExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    targetReps: integer("target_reps"),
    actualReps: integer("actual_reps"),
    targetWeight: real("target_weight"),
    actualWeight: real("actual_weight"),
    targetDuration: integer("target_duration"), // in seconds
    actualDuration: integer("actual_duration"),
    targetDistance: real("target_distance"),
    actualDistance: real("actual_distance"),
    distanceUnit: text("distance_unit"),
    completed: boolean("completed").default(false).notNull(),
    rpe: integer("rpe"), // rate of perceived exertion 1-10
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (set) => [index("exercise_sets_session_exercise_idx").on(set.sessionExerciseId)]
);

// ============================================================================
// MEMBER SKILLS (gymnastics, athletic skills, etc.)
// ============================================================================

export const memberSkills = pgTable(
  "member_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // back tuck, back handspring, muscle-up, etc.
    category: text("category").notNull(), // gymnastics, calisthenics, sport, other
    // Current assessed status
    currentStatus: text("current_status").default("learning").notNull(), // learning, achieved, mastered
    currentStatusDate: timestamp("current_status_date").defaultNow(),
    // All-time best status
    allTimeBestStatus: text("all_time_best_status").default("learning").notNull(),
    allTimeBestDate: timestamp("all_time_best_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (skill) => [
    index("member_skills_member_idx").on(skill.memberId),
    index("member_skills_current_status_idx").on(skill.currentStatus),
  ]
);

// ============================================================================
// PERSONAL RECORDS
// ============================================================================

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    // Record type: all_time = best ever, current = current assessed ability
    recordType: text("record_type").default("current").notNull(), // "all_time" | "current"
    value: real("value").notNull(),
    unit: text("unit").notNull(), // lbs, kg, reps, seconds, meters, etc.
    repMax: integer("rep_max"), // 1RM, 3RM, 5RM, etc.
    date: timestamp("date").defaultNow().notNull(),
    sessionId: uuid("session_id").references(() => workoutSessions.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (pr) => [
    index("personal_records_member_idx").on(pr.memberId),
    index("personal_records_exercise_idx").on(pr.exerciseId),
    index("personal_records_type_idx").on(pr.recordType),
    index("personal_records_date_idx").on(pr.date),
  ]
);

// ============================================================================
// CONTEXT NOTES (for AI learning and personalization)
// ============================================================================

export const contextNotes = pgTable(
  "context_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // workout_session, goal, exercise, general, limitation
    entityId: uuid("entity_id"),
    mood: text("mood"), // great, good, okay, tired, stressed, motivated, frustrated
    energyLevel: integer("energy_level"), // 1-5
    painLevel: integer("pain_level"), // 0-10 (0 = no pain)
    difficulty: text("difficulty"), // too_easy, just_right, challenging, too_hard
    content: text("content"),
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (note) => [
    index("context_notes_member_idx").on(note.memberId),
    index("context_notes_entity_idx").on(note.entityType, note.entityId),
    index("context_notes_created_idx").on(note.createdAt),
  ]
);

// ============================================================================
// AI EMBEDDINGS (for personalized recommendations)
// ============================================================================

export const memberEmbeddings = pgTable(
  "member_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // profile, workout_history, goals, preferences
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (emb) => [index("member_embeddings_member_idx").on(emb.memberId)]
);

// ============================================================================
// AI COACH CONVERSATIONS & MESSAGES
// ============================================================================

export const coachConversations = pgTable(
  "coach_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    // OpenAI Conversations API ID for persistent state management
    // Items in conversations are not subject to 30-day TTL
    openaiConversationId: text("openai_conversation_id"),
    // Last OpenAI response ID for chaining responses within a conversation
    lastOpenaiResponseId: text("last_openai_response_id"),
    mode: text("mode").default("general").notNull(), // general, mental_block, motivation, life_balance, goal_setting, accountability, confidence
    title: text("title"),
    context: jsonb("context").$type<{
      initialTopic?: string;
      resolvedIssues?: string[];
      ongoingConcerns?: string[];
      breakthroughs?: string[];
      actionItems?: string[];
    }>(),
    status: text("status").default("active").notNull(), // active, resolved, archived
    insights: text("insights"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  },
  (conv) => [
    index("coach_conversations_member_idx").on(conv.memberId),
    index("coach_conversations_mode_idx").on(conv.mode),
    index("coach_conversations_status_idx").on(conv.status),
    index("coach_conversations_last_msg_idx").on(conv.lastMessageAt),
    index("coach_conversations_openai_conv_idx").on(conv.openaiConversationId),
  ]
);

export const coachMessages = pgTable(
  "coach_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => coachConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user, assistant
    content: text("content").notNull(),
    // OpenAI response ID for this message (for assistant messages)
    openaiResponseId: text("openai_response_id"),
    metadata: jsonb("metadata").$type<{
      sentiment?: string;
      topics?: string[];
      emotionalState?: string;
      actionableInsights?: string[];
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (msg) => [
    index("coach_messages_conversation_idx").on(msg.conversationId),
    index("coach_messages_created_idx").on(msg.createdAt),
  ]
);

// ============================================================================
// AI CACHING & SNAPSHOTS (for performance)
// ============================================================================

/**
 * Pre-computed AI context for fast loading (<100ms target)
 */
export const memberContextSnapshot = pgTable(
  "member_context_snapshot",
  {
    memberId: uuid("member_id").primaryKey(),
    currentWeight: decimal("current_weight", { precision: 5, scale: 2 }),
    currentBodyFat: decimal("current_body_fat", { precision: 4, scale: 2 }),
    fitnessLevel: text("fitness_level"),
    trainingAge: text("training_age"), // beginner, intermediate, advanced
    activeLimitations: jsonb("active_limitations").$type<
      Array<{
        type: string;
        description: string;
        severity: string;
        affectedAreas: string[];
      }>
    >(),
    activeGoals: jsonb("active_goals").$type<
      Array<{
        id: string;
        title: string;
        category: string;
        targetValue: number;
        currentValue: number;
        progressPercent: number;
        targetDate: string;
      }>
    >(),
    personalRecords: jsonb("personal_records").$type<
      Array<{
        exercise: string;
        value: number;
        unit: string;
        repMax?: number;
        date: string;
      }>
    >(),
    skills: jsonb("skills").$type<
      Array<{
        name: string;
        status: string;
        category: string;
      }>
    >(),
    muscleRecoveryStatus: jsonb("muscle_recovery_status").$type<
      Record<
        string,
        {
          status: string;
          hoursSinceWorked: number;
          readyToTrain: boolean;
        }
      >
    >(),
    weeklyWorkoutAvg: decimal("weekly_workout_avg", { precision: 3, scale: 1 }),
    preferredWorkoutTime: text("preferred_workout_time"),
    avgWorkoutDuration: integer("avg_workout_duration"),
    consecutiveTrainingWeeks: integer("consecutive_training_weeks"),
    needsDeload: boolean("needs_deload").default(false),
    avgMood: text("avg_mood"),
    avgEnergyLevel: decimal("avg_energy_level", { precision: 3, scale: 2 }),
    avgPainLevel: decimal("avg_pain_level", { precision: 3, scale: 2 }),
    availableEquipment: jsonb("available_equipment").$type<string[]>(),
    profileEmbedding: vector("profile_embedding", { dimensions: 1536 }),
    lastWorkoutDate: timestamp("last_workout_date", { withTimezone: true }),
    snapshotVersion: integer("snapshot_version").default(1),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("member_context_updated_idx").on(table.lastUpdated)]
);

/**
 * AI Response Cache - for caching expensive AI operations
 */
export const aiResponseCache = pgTable(
  "ai_response_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cacheKey: text("cache_key").notNull(),
    cacheType: text("cache_type").notNull(), // workout_plan, coaching, analysis, exercise_recommendations
    contextHash: text("context_hash").notNull(),
    response: jsonb("response").notNull(),
    responseText: text("response_text"),
    modelUsed: text("model_used"),
    reasoningLevel: text("reasoning_level"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalCost: decimal("total_cost", { precision: 8, scale: 6 }),
    generationTimeMs: integer("generation_time_ms"),
    hitCount: integer("hit_count").default(0),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_cache_key_idx").on(table.cacheKey),
    index("ai_cache_type_idx").on(table.cacheType),
    index("ai_cache_expires_idx").on(table.expiresAt),
  ]
);

// ============================================================================
// USER PROFILES (user-level settings, independent of circles)
// ============================================================================

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(), // Neon Auth user ID
    handle: text("handle").unique(), // Unique username like @fitjohn - for sharing/invites
    displayName: text("display_name"),
    profilePicture: text("profile_picture"), // Vercel Blob Storage URL
    birthMonth: integer("birth_month"), // 1-12
    birthYear: integer("birth_year"), // e.g., 1990
    city: text("city"),
    country: text("country"),
    visibility: text("visibility").default("private").notNull(), // 'public' | 'private'
    notificationPreferences: jsonb("notification_preferences")
      .$type<{
        messages?: boolean;
        workouts?: boolean;
        goals?: boolean;
        circles?: boolean;
      }>()
      .default({ messages: true, workouts: true, goals: true, circles: true })
      .notNull(),
    pushSubscription: jsonb("push_subscription").$type<{
      endpoint: string;
      keys: { p256dh: string; auth: string };
    } | null>(),
    socialLinks: jsonb("social_links")
      .$type<{
        instagram?: string;
        tiktok?: string;
        youtube?: string;
        twitter?: string;
        linkedin?: string;
      }>()
      .default({}),
    // Gallery photos (max 5) with per-photo visibility
    galleryPhotos: jsonb("gallery_photos")
      .$type<Array<{
        id: string;
        url: string;
        visibility: "public" | "circles" | "private";
        visibleToCircles?: string[]; // Circle IDs that can see this photo
        caption?: string;
        uploadedAt: string;
      }>>()
      .default([]),
    // Bio/description
    bio: text("bio"),
    // Featured items for public profile (max 3 each)
    featuredGoals: jsonb("featured_goals").$type<string[]>().default([]), // Goal IDs
    featuredAchievements: jsonb("featured_achievements").$type<string[]>().default([]), // Badge IDs
    // Per-field visibility settings
    fieldVisibility: jsonb("field_visibility")
      .$type<{
        name?: "public" | "circles" | "private";
        profilePicture?: "public" | "circles" | "private";
        gallery?: "public" | "circles" | "private";
        bio?: "public" | "circles" | "private";
        location?: "public" | "circles" | "private";
        age?: "public" | "circles" | "private";
        goals?: "public" | "circles" | "private";
        achievements?: "public" | "circles" | "private";
      }>()
      .default({}),
    // GDPR/CCPA Consent tracking
    consentGiven: boolean("consent_given").default(false),
    consentDate: timestamp("consent_date", { withTimezone: true }),
    consentVersion: text("consent_version").default("1.0.0"),
    consentPreferences: jsonb("consent_preferences")
      .$type<{
        analytics: boolean;
        marketing: boolean;
        personalization: boolean;
        doNotSell: boolean;
        region?: "eu" | "california" | "other";
      }>()
      .default({
        analytics: false,
        marketing: false,
        personalization: false,
        doNotSell: false,
      }),
    // Workout preferences (collected during onboarding)
    workoutPreferences: jsonb("workout_preferences")
      .$type<{
        workoutDays?: string[]; // ["monday", "wednesday", "friday"]
        workoutDuration?: number; // minutes
        trainingFrequency?: number; // days per week
        activityLevel?: {
          jobType?: "sedentary" | "light" | "moderate" | "active" | "very_active";
          dailySteps?: number;
          description?: string;
        };
        currentActivity?: string;
        secondaryGoals?: string[];
      }>()
      .default({}),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (profile) => [
    index("user_profiles_user_idx").on(profile.userId),
    index("user_profiles_visibility_idx").on(profile.visibility),
    index("user_profiles_city_idx").on(profile.city),
  ]
);

// ============================================================================
// MESSAGES (circle member direct messaging)
// ============================================================================

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(), // Neon Auth user ID
    recipientId: text("recipient_id").notNull(), // Neon Auth user ID
    content: text("content").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    deletedBySender: boolean("deleted_by_sender").default(false).notNull(),
    deletedByRecipient: boolean("deleted_by_recipient").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (message) => [
    index("messages_circle_idx").on(message.circleId),
    index("messages_recipient_idx").on(message.recipientId, message.createdAt),
    index("messages_sender_idx").on(message.senderId, message.createdAt),
    index("messages_thread_idx").on(message.senderId, message.recipientId, message.createdAt),
  ]
);

// ============================================================================
// NOTIFICATIONS (in-app and push)
// ============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    type: text("type").notNull(), // 'message', 'workout_reminder', 'goal_achieved', 'circle_invite', etc.
    title: text("title").notNull(),
    body: text("body"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    actionUrl: text("action_url"), // Deep link
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (notification) => [
    index("notifications_user_idx").on(notification.userId, notification.createdAt),
    index("notifications_type_idx").on(notification.type, notification.createdAt),
  ]
);

// ============================================================================
// SOCIAL FEATURES - User Follows
// ============================================================================

/**
 * User follows - social connections between users
 */
export const userFollows = pgTable(
  "user_follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: text("follower_id").notNull(), // Who is following
    followingId: text("following_id").notNull(), // Who is being followed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (follow) => [
    index("user_follows_follower_idx").on(follow.followerId),
    index("user_follows_following_idx").on(follow.followingId),
    uniqueIndex("user_follows_unique_idx").on(follow.followerId, follow.followingId),
  ]
);

/**
 * User connections/friendships - bidirectional connections with status
 * Unlike follows, connections require mutual acceptance
 */
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: text("requester_id").notNull(), // Neon Auth user ID - who sent the request
    addresseeId: text("addressee_id").notNull(), // Neon Auth user ID - who received the request
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected' | 'blocked'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (connection) => [
    index("connections_requester_idx").on(connection.requesterId),
    index("connections_addressee_idx").on(connection.addresseeId),
    index("connections_status_idx").on(connection.status),
    index("connections_requester_status_idx").on(connection.requesterId, connection.status),
    index("connections_addressee_status_idx").on(connection.addresseeId, connection.status),
    uniqueIndex("connections_unique_pair_idx").on(connection.requesterId, connection.addresseeId),
  ]
);

// ============================================================================
// SOCIAL FEATURES - Activity Feed
// ============================================================================

/**
 * Activity Feed - tracks user activities for social feed
 */
export const activityFeed = pgTable(
  "activity_feed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    activityType: text("activity_type").notNull(), // workout_completed, goal_achieved, pr_set, joined_circle, etc.
    entityType: text("entity_type"), // workout, goal, circle, etc.
    entityId: uuid("entity_id"), // ID of the related entity
    metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Additional context
    visibility: text("visibility").default("followers").notNull(), // public, followers, circles
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (activity) => [
    index("activity_feed_user_idx").on(activity.userId, activity.createdAt),
    index("activity_feed_type_idx").on(activity.activityType),
    index("activity_feed_visibility_idx").on(activity.visibility, activity.createdAt),
  ]
);

// ============================================================================
// SOCIAL FEATURES - Circle Join Requests
// ============================================================================

/**
 * Circle Join Requests - for public/private circles
 */
export const circleJoinRequests = pgTable(
  "circle_join_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Neon Auth user ID
    message: text("message"), // Optional message with request
    status: text("status").default("pending").notNull(), // pending, approved, rejected
    respondedBy: text("responded_by"), // User ID of who responded
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (request) => [
    index("circle_join_requests_circle_idx").on(request.circleId, request.status),
    index("circle_join_requests_user_idx").on(request.userId, request.status),
  ]
);

// ============================================================================
// CHALLENGES (Star Schema Fact Table)
// Community fitness challenges like "75 Hard", "30-Day Squat Challenge"
// ============================================================================

/**
 * Challenge definitions - templates for fitness challenges
 * This is a dimension table in star schema terminology
 */
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    shortDescription: text("short_description"), // For cards/previews
    coverImage: text("cover_image"), // Hero image URL
    category: text("category").notNull(), // strength, cardio, wellness, hybrid, transformation
    difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced, extreme
    durationDays: integer("duration_days").notNull(), // e.g., 30, 75, 100
    // Rules and requirements
    rules: jsonb("rules").$type<string[]>().default([]).notNull(),
    dailyTasks: jsonb("daily_tasks").$type<{
      name: string;
      description?: string;
      type: "workout" | "nutrition" | "mindset" | "recovery" | "custom" | "pr_check" | "hydration";
      isRequired: boolean;
      exercise?: string;
      targetValue?: number;
      targetUnit?: string;
    }[]>().default([]).notNull(),
    // Challenge behavior
    progressionType: text("progression_type").default("linear"), // linear, pyramid, random, custom
    restartOnFail: boolean("restart_on_fail").default(false), // If true, missing a day resets to day 1 (like 75 Hard)
    unlockMessage: text("unlock_message"), // Celebration message on completion
    weeklyStructure: jsonb("weekly_structure").$type<Array<{ week: number; focus: string; notes?: string }>>().default([]),
    // Visibility and discovery
    visibility: text("visibility").default("public").notNull(), // public, private, circle
    isOfficial: boolean("is_official").default(false).notNull(), // Featured/verified challenges
    isFeatured: boolean("is_featured").default(false).notNull(),
    // Stats (denormalized for performance)
    participantCount: integer("participant_count").default(0).notNull(),
    completionCount: integer("completion_count").default(0).notNull(),
    avgCompletionRate: real("avg_completion_rate"), // percentage
    // Rating & Reviews
    avgRating: real("avg_rating"),
    ratingCount: integer("rating_count").default(0).notNull(),
    // Popularity & Trending
    popularityScore: real("popularity_score").default(0).notNull(),
    trendingScore: real("trending_score").default(0).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow(),
    commentCount: integer("comment_count").default(0).notNull(),
    // Creator info
    createdByUserId: text("created_by_user_id"), // null for official challenges
    circleId: uuid("circle_id").references(() => circles.id, { onDelete: "set null" }), // if circle-specific
    
    // Fun branding
    difficultyLabel: text("difficulty_label"), // "Insane", "Beast Mode", "Getting Started"
    brandingTheme: text("branding_theme"), // "fire", "zen", "military", "playful"
    
    // Linked program (optional - for challenges that follow a program structure)
    programId: uuid("program_id").references(() => communityPrograms.id, { onDelete: "set null" }),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (challenge) => [
    index("challenges_category_idx").on(challenge.category),
    index("challenges_visibility_idx").on(challenge.visibility),
    index("challenges_featured_idx").on(challenge.isFeatured),
    index("challenges_official_idx").on(challenge.isOfficial),
    index("challenges_popularity_idx").on(challenge.popularityScore),
    index("challenges_trending_idx").on(challenge.trendingScore),
    index("challenges_program_idx").on(challenge.programId),
  ]
);

/**
 * Challenge participants - users who have joined a challenge
 * Junction/bridge table linking users to challenges
 */
export const challengeParticipants = pgTable(
  "challenge_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Neon Auth user ID
    status: text("status").default("active").notNull(), // active, completed, failed, quit
    startDate: timestamp("start_date", { withTimezone: true }).defaultNow().notNull(),
    endDate: timestamp("end_date", { withTimezone: true }), // calculated from start + duration
    completedDate: timestamp("completed_date", { withTimezone: true }),
    currentDay: integer("current_day").default(1).notNull(),
    currentStreak: integer("current_streak").default(0).notNull(),
    longestStreak: integer("longest_streak").default(0).notNull(),
    daysCompleted: integer("days_completed").default(0).notNull(),
    daysFailed: integer("days_failed").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (participant) => [
    index("challenge_participants_challenge_idx").on(participant.challengeId),
    index("challenge_participants_user_idx").on(participant.userId),
    index("challenge_participants_status_idx").on(participant.status),
    uniqueIndex("challenge_participants_unique_idx").on(participant.challengeId, participant.userId),
  ]
);

/**
 * Challenge daily progress - FACT TABLE
 * Records daily check-ins for challenge participants
 */
export const challengeProgress = pgTable(
  "challenge_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => challengeParticipants.id, { onDelete: "cascade" }),
    day: integer("day").notNull(), // Day number (1, 2, 3... up to duration)
    date: timestamp("date", { withTimezone: true }).notNull(), // Actual date
    completed: boolean("completed").default(false).notNull(),
    // Task completion tracking
    tasksCompleted: jsonb("tasks_completed").$type<{
      taskName: string;
      completed: boolean;
      notes?: string;
    }[]>().default([]).notNull(),
    // Optional evidence/proof
    proofImageUrl: text("proof_image_url"),
    notes: text("notes"),
    // Mood/energy tracking
    mood: text("mood"), // great, good, okay, struggling
    energyLevel: integer("energy_level"), // 1-5
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (progress) => [
    index("challenge_progress_participant_idx").on(progress.participantId),
    index("challenge_progress_date_idx").on(progress.date),
    uniqueIndex("challenge_progress_unique_idx").on(progress.participantId, progress.day),
  ]
);

// ============================================================================
// COMMUNITY PROGRAMS (Star Schema)
// Multi-week workout programs users can follow
// ============================================================================

/**
 * Community workout programs - structured multi-week training plans
 * Dimension table
 */
export const communityPrograms = pgTable(
  "community_programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    coverImage: text("cover_image"),
    category: text("category").notNull(), // strength, hypertrophy, powerlifting, bodybuilding, functional, sport_specific
    difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
    durationWeeks: integer("duration_weeks").notNull(), // 4, 8, 12, 16 weeks
    daysPerWeek: integer("days_per_week").notNull(), // 3, 4, 5, 6
    avgWorkoutDuration: integer("avg_workout_duration"), // minutes
    // Goals and targets
    primaryGoal: text("primary_goal"), // strength, muscle_gain, fat_loss, endurance, athletic_performance
    targetMuscles: jsonb("target_muscles").$type<string[]>(), // full_body, upper, lower, push_pull_legs
    equipmentRequired: jsonb("equipment_required").$type<string[]>().default([]).notNull(),
    // Visibility
    visibility: text("visibility").default("public").notNull(),
    isOfficial: boolean("is_official").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    // Stats
    enrollmentCount: integer("enrollment_count").default(0).notNull(),
    completionCount: integer("completion_count").default(0).notNull(),
    avgRating: real("avg_rating"),
    reviewCount: integer("review_count").default(0).notNull(),
    // Popularity & Trending
    popularityScore: real("popularity_score").default(0).notNull(),
    trendingScore: real("trending_score").default(0).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow(),
    commentCount: integer("comment_count").default(0).notNull(),
    // Creator
    createdByUserId: text("created_by_user_id"),
    circleId: uuid("circle_id").references(() => circles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (program) => [
    index("community_programs_category_idx").on(program.category),
    index("community_programs_visibility_idx").on(program.visibility),
    index("community_programs_featured_idx").on(program.isFeatured),
    index("community_programs_difficulty_idx").on(program.difficulty),
    index("community_programs_popularity_idx").on(program.popularityScore),
    index("community_programs_trending_idx").on(program.trendingScore),
  ]
);

/**
 * Program weeks - structure for multi-week programs
 */
export const programWeeks = pgTable(
  "program_weeks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => communityPrograms.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    name: text("name"), // e.g., "Deload Week", "Peak Week"
    focus: text("focus"), // e.g., "Volume", "Intensity", "Recovery"
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (week) => [
    index("program_weeks_program_idx").on(week.programId),
    uniqueIndex("program_weeks_unique_idx").on(week.programId, week.weekNumber),
  ]
);

/**
 * Program workouts - scheduled workouts within a program
 */
export const programWorkouts = pgTable(
  "program_workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => communityPrograms.id, { onDelete: "cascade" }),
    weekId: uuid("week_id").references(() => programWeeks.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    dayNumber: integer("day_number").notNull(), // 1-7 within the week
    name: text("name").notNull(), // e.g., "Push Day A", "Legs"
    focus: text("focus"), // chest_shoulders, back_biceps, legs, full_body
    estimatedDuration: integer("estimated_duration"), // minutes
    // Link to workout plan template
    workoutPlanId: uuid("workout_plan_id").references(() => workoutPlans.id, { onDelete: "set null" }),
    // Or inline exercise structure
    exercises: jsonb("exercises").$type<{
      exerciseId?: string;
      exerciseName: string;
      sets: number;
      reps: string; // "8-12" or "5"
      restSeconds?: number;
      notes?: string;
    }[]>().default([]).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (workout) => [
    index("program_workouts_program_idx").on(workout.programId),
    index("program_workouts_week_idx").on(workout.weekId),
  ]
);

/**
 * Program enrollments - users enrolled in programs
 */
export const programEnrollments = pgTable(
  "program_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => communityPrograms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: text("status").default("active").notNull(), // active, completed, paused, quit
    startDate: timestamp("start_date", { withTimezone: true }).defaultNow().notNull(),
    currentWeek: integer("current_week").default(1).notNull(),
    currentDay: integer("current_day").default(1).notNull(),
    workoutsCompleted: integer("workouts_completed").default(0).notNull(),
    totalWorkouts: integer("total_workouts").notNull(), // calculated from program
    completedDate: timestamp("completed_date", { withTimezone: true }),
    rating: integer("rating"), // 1-5 stars
    review: text("review"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (enrollment) => [
    index("program_enrollments_program_idx").on(enrollment.programId),
    index("program_enrollments_user_idx").on(enrollment.userId),
    index("program_enrollments_status_idx").on(enrollment.status),
    uniqueIndex("program_enrollments_unique_idx").on(enrollment.programId, enrollment.userId),
  ]
);

/**
 * Program workout progress - FACT TABLE
 * Tracks completion of individual workouts within a program
 */
export const programWorkoutProgress = pgTable(
  "program_workout_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => programEnrollments.id, { onDelete: "cascade" }),
    programWorkoutId: uuid("program_workout_id")
      .notNull()
      .references(() => programWorkouts.id, { onDelete: "cascade" }),
    workoutSessionId: uuid("workout_session_id").references(() => workoutSessions.id, { onDelete: "set null" }),
    completed: boolean("completed").default(false).notNull(),
    completedDate: timestamp("completed_date", { withTimezone: true }),
    skipped: boolean("skipped").default(false).notNull(),
    notes: text("notes"),
    rating: integer("rating"), // 1-5
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (progress) => [
    index("program_workout_progress_enrollment_idx").on(progress.enrollmentId),
    index("program_workout_progress_workout_idx").on(progress.programWorkoutId),
  ]
);

// ============================================================================
// USER PROGRAM SCHEDULES (Advanced scheduling system)
// ============================================================================

/**
 * User Program Schedules - Custom scheduling preferences for enrolled programs
 * Allows users to customize which days they do workouts within a program
 */
export const userProgramSchedules = pgTable(
  "user_program_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => programEnrollments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    
    // Day preferences (which days of the week user prefers to workout)
    preferredDays: jsonb("preferred_days").$type<number[]>().default([1, 3, 5]).notNull(), // 0=Sun, 1=Mon, etc.
    
    // Time preferences
    preferredTimeSlot: text("preferred_time_slot"), // morning, afternoon, evening, late_night
    reminderTime: text("reminder_time"), // HH:MM format
    
    // Auto-reschedule settings
    autoReschedule: boolean("auto_reschedule").default(true).notNull(), // Automatically move missed workouts
    rescheduleWindowDays: integer("reschedule_window_days").default(2).notNull(), // How many days to look ahead for rescheduling
    
    // Rest day preferences
    minRestDays: integer("min_rest_days").default(1).notNull(), // Minimum rest days between workouts
    maxConsecutiveWorkoutDays: integer("max_consecutive_workout_days").default(3).notNull(),
    
    // Vacation/skip mode
    pausedUntil: timestamp("paused_until", { withTimezone: true }), // If set, schedule is paused until this date
    pauseReason: text("pause_reason"),
    
    // Metadata
    lastScheduleGeneratedAt: timestamp("last_schedule_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (schedule) => [
    index("user_program_schedules_enrollment_idx").on(schedule.enrollmentId),
    index("user_program_schedules_user_idx").on(schedule.userId),
    uniqueIndex("user_program_schedules_unique_idx").on(schedule.enrollmentId),
  ]
);

/**
 * Scheduled Workouts - Individual workout instances on the calendar
 * Represents the actual scheduled occurrence of a program workout
 */
export const scheduledWorkouts = pgTable(
  "scheduled_workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => userProgramSchedules.id, { onDelete: "cascade" }),
    programWorkoutId: uuid("program_workout_id")
      .notNull()
      .references(() => programWorkouts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    
    // Scheduling
    scheduledDate: date("scheduled_date").notNull(), // The date this workout is scheduled for
    scheduledTime: text("scheduled_time"), // Optional preferred time (HH:MM)
    originalDate: date("original_date"), // If rescheduled, the original date it was scheduled for
    
    // Status tracking
    status: text("status").default("scheduled").notNull(), // scheduled, completed, skipped, missed, rescheduled
    completedAt: timestamp("completed_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    skippedReason: text("skipped_reason"),
    
    // Rescheduling info
    rescheduledCount: integer("rescheduled_count").default(0).notNull(),
    rescheduledFrom: date("rescheduled_from"), // Previous date if this is a rescheduled workout
    rescheduledReason: text("rescheduled_reason"),
    
    // Link to actual workout session when completed
    workoutSessionId: uuid("workout_session_id").references(() => workoutSessions.id, { onDelete: "set null" }),
    
    // User notes
    notes: text("notes"),
    
    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (workout) => [
    index("scheduled_workouts_schedule_idx").on(workout.scheduleId),
    index("scheduled_workouts_user_idx").on(workout.userId),
    index("scheduled_workouts_date_idx").on(workout.scheduledDate),
    index("scheduled_workouts_status_idx").on(workout.status),
    index("scheduled_workouts_user_date_idx").on(workout.userId, workout.scheduledDate),
    uniqueIndex("scheduled_workouts_unique_idx").on(workout.scheduleId, workout.programWorkoutId, workout.scheduledDate),
  ]
);

// Relations for scheduling tables
export const userProgramSchedulesRelations = relations(userProgramSchedules, ({ one, many }) => ({
  enrollment: one(programEnrollments, {
    fields: [userProgramSchedules.enrollmentId],
    references: [programEnrollments.id],
  }),
  scheduledWorkouts: many(scheduledWorkouts),
}));

export const scheduledWorkoutsRelations = relations(scheduledWorkouts, ({ one }) => ({
  schedule: one(userProgramSchedules, {
    fields: [scheduledWorkouts.scheduleId],
    references: [userProgramSchedules.id],
  }),
  programWorkout: one(programWorkouts, {
    fields: [scheduledWorkouts.programWorkoutId],
    references: [programWorkouts.id],
  }),
  workoutSession: one(workoutSessions, {
    fields: [scheduledWorkouts.workoutSessionId],
    references: [workoutSessions.id],
  }),
}));

// ============================================================================
// SHARED WORKOUTS (Community discoverable workouts)
// ============================================================================

/**
 * Shared workouts - workouts published for community discovery
 */
export const sharedWorkouts = pgTable(
  "shared_workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workoutPlanId: uuid("workout_plan_id")
      .notNull()
      .references(() => workoutPlans.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Who shared it
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"), // strength, cardio, hiit, flexibility
    difficulty: text("difficulty"), // beginner, intermediate, advanced
    estimatedDuration: integer("estimated_duration"),
    targetMuscles: jsonb("target_muscles").$type<string[]>(),
    equipmentRequired: jsonb("equipment_required").$type<string[]>(),
    // Discovery
    visibility: text("visibility").default("public").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    // Stats
    saveCount: integer("save_count").default(0).notNull(),
    useCount: integer("use_count").default(0).notNull(), // Times added to someone's plan
    avgRating: real("avg_rating"),
    reviewCount: integer("review_count").default(0).notNull(),
    // Popularity & Trending
    popularityScore: real("popularity_score").default(0).notNull(),
    trendingScore: real("trending_score").default(0).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow(),
    commentCount: integer("comment_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (shared) => [
    index("shared_workouts_user_idx").on(shared.userId),
    index("shared_workouts_category_idx").on(shared.category),
    index("shared_workouts_visibility_idx").on(shared.visibility),
    index("shared_workouts_featured_idx").on(shared.isFeatured),
    index("shared_workouts_popularity_idx").on(shared.popularityScore),
    index("shared_workouts_trending_idx").on(shared.trendingScore),
  ]
);

/**
 * Saved workouts - user's bookmarked community workouts
 */
export const savedWorkouts = pgTable(
  "saved_workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    sharedWorkoutId: uuid("shared_workout_id")
      .notNull()
      .references(() => sharedWorkouts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (saved) => [
    index("saved_workouts_user_idx").on(saved.userId),
    uniqueIndex("saved_workouts_unique_idx").on(saved.userId, saved.sharedWorkoutId),
  ]
);

// ============================================================================
// USER METRICS (user-level, not circle-scoped)
// ============================================================================

/**
 * User metrics tracked over time - weight, height, body composition
 * User-level data that doesn't change based on which circle they're in
 */
export const userMetrics = pgTable(
  "user_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
    weight: real("weight"), // in lbs
    height: real("height"), // in inches
    bodyFatPercentage: real("body_fat_percentage"),
    fitnessLevel: text("fitness_level"), // beginner, intermediate, advanced, elite
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (metric) => [
    index("user_metrics_user_idx").on(metric.userId),
    index("user_metrics_date_idx").on(metric.date),
  ]
);

// ============================================================================
// USER LIMITATIONS (user-level injuries/conditions)
// ============================================================================

/**
 * User limitations - injuries, conditions, preferences
 * User-level data - an injury doesn't change based on which circle you're viewing
 */
export const userLimitations = pgTable(
  "user_limitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    type: text("type").notNull(), // injury, condition, preference
    bodyPart: text("body_part"), // knee, shoulder, back, etc.
    condition: text("condition"), // arthritis, tendinitis, strain, etc.
    description: text("description"),
    affectedAreas: jsonb("affected_areas").$type<string[]>(), // body parts affected
    severity: text("severity"), // mild, moderate, severe
    painLevel: integer("pain_level"), // 1-10
    duration: text("duration"), // how long they've had it
    avoidsMovements: jsonb("avoids_movements").$type<string[]>(), // movements to avoid
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }), // null if ongoing
    active: boolean("active").default(true).notNull(),
    notes: text("notes"),
    // Enhanced limitation fields
    isHealed: boolean("is_healed").default(false).notNull(),
    isChronicPermanent: boolean("is_chronic_permanent").default(false).notNull(),
    healingTimeline: text("healing_timeline"), // weeks, months, years, unknown
    injuryDate: timestamp("injury_date", { withTimezone: true }),
    causeType: text("cause_type"), // sports, accident, overuse, surgery, congenital, age_related
    medicalDiagnosis: text("medical_diagnosis"),
    treatingWithPT: boolean("treating_with_pt").default(false).notNull(),
    functionalImpact: jsonb("functional_impact").$type<{
      squatDepth?: "full" | "parallel" | "quarter" | "none";
      bendingCapacity?: "full" | "limited" | "none";
      overheadReach?: "full" | "limited" | "painful" | "none";
      loadingCapacity?: "normal" | "reduced" | "minimal" | "none";
      impactTolerance?: "full" | "limited" | "none";
    }>().default({}),
    modificationNotes: text("modification_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (limitation) => [
    index("user_limitations_user_idx").on(limitation.userId),
    index("user_limitations_active_idx").on(limitation.userId, limitation.active),
  ]
);

// ============================================================================
// USER SKILLS (user-level athletic skills)
// ============================================================================

/**
 * User skills - gymnastics, calisthenics, athletic abilities
 * User-level data - skills are personal achievements, not circle-specific
 */
export const userSkills = pgTable(
  "user_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    name: text("name").notNull(), // back tuck, muscle-up, handstand, etc.
    category: text("category").notNull(), // gymnastics, calisthenics, sport, other
    currentStatus: text("current_status").default("learning").notNull(), // learning, achieved, mastered
    currentStatusDate: timestamp("current_status_date", { withTimezone: true }).defaultNow(),
    allTimeBestStatus: text("all_time_best_status").default("learning").notNull(),
    allTimeBestDate: timestamp("all_time_best_date", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (skill) => [
    index("user_skills_user_idx").on(skill.userId),
    index("user_skills_status_idx").on(skill.userId, skill.currentStatus),
  ]
);

// ============================================================================
// USER LOCATIONS & EQUIPMENT
// ============================================================================

/**
 * User gym/workout locations with equipment
 */
export const userLocations = pgTable(
  "user_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    name: text("name").notNull(), // e.g., "Home Gym", "Planet Fitness"
    type: text("type").notNull(), // home, commercial, school, outdoor, travel
    address: text("address"),
    isActive: boolean("is_active").default(false).notNull(), // Currently selected location
    equipment: jsonb("equipment").$type<string[]>().default([]).notNull(), // Array of equipment IDs
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (location) => [
    index("user_locations_user_idx").on(location.userId),
    index("user_locations_active_idx").on(location.userId, location.isActive),
  ]
);

/**
 * Location type defaults - default equipment for each gym type
 */
export const locationTypeDefaults = pgTable("location_type_defaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationType: text("location_type").notNull().unique(),
  defaultEquipment: jsonb("default_equipment").$type<string[]>().default([]).notNull(),
  description: text("description"),
  typicalEquipmentCount: integer("typical_equipment_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Equipment catalog - predefined and custom equipment
 */
export const equipmentCatalog = pgTable(
  "equipment_catalog",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(), // cardio, strength, flexibility, accessories
    isStandard: boolean("is_standard").default(true).notNull(), // false for user-created
    userId: text("user_id"), // null for standard equipment
    icon: text("icon"), // Icon name or URL
    details: jsonb("details").$type<{
      weightRange?: { min: number; max: number };
      adjustable?: boolean;
      brands?: string[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (equipment) => [
    index("equipment_catalog_category_idx").on(equipment.category),
    index("equipment_catalog_standard_idx").on(equipment.isStandard),
  ]
);

// ============================================================================
// CIRCLE REQUESTS (for public profile discovery)
// ============================================================================

export const circleRequests = pgTable(
  "circle_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    requesterId: text("requester_id").notNull(), // Who is sending the request
    targetUserId: text("target_user_id").notNull(), // Who is receiving the request
    message: text("message"), // Optional message with the request
    status: text("status").default("pending").notNull(), // 'pending' | 'accepted' | 'declined' | 'expired'
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (request) => [
    index("circle_requests_target_idx").on(request.targetUserId, request.status),
    index("circle_requests_requester_idx").on(request.requesterId, request.createdAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const circlesRelations = relations(circles, ({ many }) => ({
  members: many(circleMembers),
  workoutPlans: many(workoutPlans),
  equipment: many(circleEquipment),
  invitations: many(circleInvitations),
  messages: many(messages),
  circleRequests: many(circleRequests),
}));

export const circleInvitationsRelations = relations(circleInvitations, ({ one }) => ({
  circle: one(circles, {
    fields: [circleInvitations.circleId],
    references: [circles.id],
  }),
}));

export const circleMembersRelations = relations(circleMembers, ({ one, many }) => ({
  circle: one(circles, {
    fields: [circleMembers.circleId],
    references: [circles.id],
  }),
  metrics: many(memberMetrics),
  limitations: many(memberLimitations),
  goals: many(goals),
  workoutSessions: many(workoutSessions),
  personalRecords: many(personalRecords),
  skills: many(memberSkills),
  embeddings: many(memberEmbeddings),
  contextNotes: many(contextNotes),
  coachConversations: many(coachConversations),
}));

export const contextNotesRelations = relations(contextNotes, ({ one }) => ({
  member: one(circleMembers, {
    fields: [contextNotes.memberId],
    references: [circleMembers.id],
  }),
}));

export const circleEquipmentRelations = relations(circleEquipment, ({ one }) => ({
  circle: one(circles, {
    fields: [circleEquipment.circleId],
    references: [circles.id],
  }),
}));

export const memberMetricsRelations = relations(memberMetrics, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberMetrics.memberId],
    references: [circleMembers.id],
  }),
}));

export const memberLimitationsRelations = relations(memberLimitations, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberLimitations.memberId],
    references: [circleMembers.id],
  }),
}));

export const memberSkillsRelations = relations(memberSkills, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberSkills.memberId],
    references: [circleMembers.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  member: one(circleMembers, {
    fields: [goals.memberId],
    references: [circleMembers.id],
  }),
  milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  goal: one(goals, {
    fields: [milestones.goalId],
    references: [goals.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  createdBy: one(circleMembers, {
    fields: [exercises.createdByMemberId],
    references: [circleMembers.id],
  }),
  workoutPlanExercises: many(workoutPlanExercises),
  workoutSessionExercises: many(workoutSessionExercises),
  personalRecords: many(personalRecords),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  circle: one(circles, {
    fields: [workoutPlans.circleId],
    references: [circles.id],
  }),
  createdBy: one(circleMembers, {
    fields: [workoutPlans.createdByMemberId],
    references: [circleMembers.id],
  }),
  exercises: many(workoutPlanExercises),
  sessions: many(workoutSessions),
}));

export const workoutPlanExercisesRelations = relations(
  workoutPlanExercises,
  ({ one }) => ({
    plan: one(workoutPlans, {
      fields: [workoutPlanExercises.planId],
      references: [workoutPlans.id],
    }),
    exercise: one(exercises, {
      fields: [workoutPlanExercises.exerciseId],
      references: [exercises.id],
    }),
  })
);

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    member: one(circleMembers, {
      fields: [workoutSessions.memberId],
      references: [circleMembers.id],
    }),
    plan: one(workoutPlans, {
      fields: [workoutSessions.planId],
      references: [workoutPlans.id],
    }),
    exercises: many(workoutSessionExercises),
    personalRecords: many(personalRecords),
  })
);

export const workoutSessionExercisesRelations = relations(
  workoutSessionExercises,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [workoutSessionExercises.sessionId],
      references: [workoutSessions.id],
    }),
    exercise: one(exercises, {
      fields: [workoutSessionExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(exerciseSets),
  })
);

export const exerciseSetsRelations = relations(exerciseSets, ({ one }) => ({
  sessionExercise: one(workoutSessionExercises, {
    fields: [exerciseSets.sessionExerciseId],
    references: [workoutSessionExercises.id],
  }),
}));

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  member: one(circleMembers, {
    fields: [personalRecords.memberId],
    references: [circleMembers.id],
  }),
  exercise: one(exercises, {
    fields: [personalRecords.exerciseId],
    references: [exercises.id],
  }),
  session: one(workoutSessions, {
    fields: [personalRecords.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const memberEmbeddingsRelations = relations(memberEmbeddings, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberEmbeddings.memberId],
    references: [circleMembers.id],
  }),
}));

export const coachConversationsRelations = relations(coachConversations, ({ one, many }) => ({
  member: one(circleMembers, {
    fields: [coachConversations.memberId],
    references: [circleMembers.id],
  }),
  messages: many(coachMessages),
}));

export const coachMessagesRelations = relations(coachMessages, ({ one }) => ({
  conversation: one(coachConversations, {
    fields: [coachMessages.conversationId],
    references: [coachConversations.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  // User profiles don't have direct relations to circleMembers
  // since they're user-level, not circle-level
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  circle: one(circles, {
    fields: [messages.circleId],
    references: [circles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  // Notifications are user-level, linked via userId text field
}));

export const circleRequestsRelations = relations(circleRequests, ({ one }) => ({
  circle: one(circles, {
    fields: [circleRequests.circleId],
    references: [circles.id],
  }),
}));

export const userFollowsRelations = relations(userFollows, ({ }) => ({
  // Relations are via userId text fields, not foreign keys
}));

export const connectionsRelations = relations(connections, ({ }) => ({
  // Relations are via userId text fields (Neon Auth), not foreign keys
  // Requester and addressee reference neon_auth.users.id
}));

export const activityFeedRelations = relations(activityFeed, ({ }) => ({
  // Relations are via userId text field
}));

export const circleJoinRequestsRelations = relations(circleJoinRequests, ({ one }) => ({
  circle: one(circles, {
    fields: [circleJoinRequests.circleId],
    references: [circles.id],
  }),
}));

export const userLocationsRelations = relations(userLocations, ({ }) => ({
  // Relations are via userId text field
}));

export const locationTypeDefaultsRelations = relations(locationTypeDefaults, ({ }) => ({
  // No direct relations - stores default equipment names as JSON
}));

export const equipmentCatalogRelations = relations(equipmentCatalog, ({ }) => ({
  // No direct relations
}));

export const userMetricsRelations = relations(userMetrics, ({ }) => ({
  // Relations are via userId text field
}));

export const userLimitationsRelations = relations(userLimitations, ({ }) => ({
  // Relations are via userId text field
}));

export const userSkillsRelations = relations(userSkills, ({ }) => ({
  // Relations are via userId text field
}));

// ============================================================================
// CHALLENGES & PROGRAMS RELATIONS
// ============================================================================

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  circle: one(circles, {
    fields: [challenges.circleId],
    references: [circles.id],
  }),
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one, many }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  progress: many(challengeProgress),
}));

export const challengeProgressRelations = relations(challengeProgress, ({ one }) => ({
  participant: one(challengeParticipants, {
    fields: [challengeProgress.participantId],
    references: [challengeParticipants.id],
  }),
}));

export const communityProgramsRelations = relations(communityPrograms, ({ one, many }) => ({
  circle: one(circles, {
    fields: [communityPrograms.circleId],
    references: [circles.id],
  }),
  weeks: many(programWeeks),
  workouts: many(programWorkouts),
  enrollments: many(programEnrollments),
}));

export const programWeeksRelations = relations(programWeeks, ({ one, many }) => ({
  program: one(communityPrograms, {
    fields: [programWeeks.programId],
    references: [communityPrograms.id],
  }),
  workouts: many(programWorkouts),
}));

export const programWorkoutsRelations = relations(programWorkouts, ({ one, many }) => ({
  program: one(communityPrograms, {
    fields: [programWorkouts.programId],
    references: [communityPrograms.id],
  }),
  week: one(programWeeks, {
    fields: [programWorkouts.weekId],
    references: [programWeeks.id],
  }),
  workoutPlan: one(workoutPlans, {
    fields: [programWorkouts.workoutPlanId],
    references: [workoutPlans.id],
  }),
  progress: many(programWorkoutProgress),
}));

export const programEnrollmentsRelations = relations(programEnrollments, ({ one, many }) => ({
  program: one(communityPrograms, {
    fields: [programEnrollments.programId],
    references: [communityPrograms.id],
  }),
  workoutProgress: many(programWorkoutProgress),
}));

export const programWorkoutProgressRelations = relations(programWorkoutProgress, ({ one }) => ({
  enrollment: one(programEnrollments, {
    fields: [programWorkoutProgress.enrollmentId],
    references: [programEnrollments.id],
  }),
  programWorkout: one(programWorkouts, {
    fields: [programWorkoutProgress.programWorkoutId],
    references: [programWorkouts.id],
  }),
  workoutSession: one(workoutSessions, {
    fields: [programWorkoutProgress.workoutSessionId],
    references: [workoutSessions.id],
  }),
}));

export const sharedWorkoutsRelations = relations(sharedWorkouts, ({ one, many }) => ({
  workoutPlan: one(workoutPlans, {
    fields: [sharedWorkouts.workoutPlanId],
    references: [workoutPlans.id],
  }),
  savedBy: many(savedWorkouts),
}));

export const savedWorkoutsRelations = relations(savedWorkouts, ({ one }) => ({
  sharedWorkout: one(sharedWorkouts, {
    fields: [savedWorkouts.sharedWorkoutId],
    references: [sharedWorkouts.id],
  }),
}));

// ============================================================================
// BADGES & ACHIEVEMENTS
// ============================================================================

/**
 * Badge Definitions - Catalog of all available badges
 */
export const badgeDefinitions = pgTable(
  "badge_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"), // Icon name or emoji
    imageUrl: text("image_url"), // Optional badge image
    category: text("category").notNull(), // strength, skill, sport, consistency, challenge, program, social, track
    tier: text("tier").default("bronze").notNull(), // bronze, silver, gold, platinum
    criteria: jsonb("criteria").$type<{
      type?: string; // "pr_total" | "pr_single" | "skill_achieved" | "sport" | "streak" | "workout_count" | "challenge" | "program" | "followers" | "circles"
      exercises?: string[]; // For PR-based badges
      totalValue?: number; // For combined PR badges (1000lb club)
      singleValue?: number; // For single exercise PR badges
      skillName?: string; // For skill badges
      sport?: string; // For sport badges
      streakDays?: number; // For streak badges
      workoutCount?: number; // For workout count badges
      challengeId?: string; // For specific challenge badges
      programId?: string; // For specific program badges
      followerCount?: number; // For follower badges
      circleCount?: number; // For circle badges
      trackTime?: number; // For track time badges (in seconds)
      trackDistance?: number; // For track distance (in meters)
    }>().default({}).notNull(),
    criteriaDescription: text("criteria_description"), // Human-readable criteria
    // Enhancement fields
    rarity: text("rarity").default("common"), // common, uncommon, rare, epic, legendary
    unlockMessage: text("unlock_message"), // Personalized celebration message
    iconUrl: text("icon_url"), // Custom badge image URL
    achievementRate: real("achievement_rate"), // % of users who have earned this badge
    isAutomatic: boolean("is_automatic").default(true).notNull(), // Auto-award or manual claim
    isActive: boolean("is_active").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (badge) => [
    index("badge_definitions_category_idx").on(badge.category),
    index("badge_definitions_tier_idx").on(badge.tier),
    index("badge_definitions_active_idx").on(badge.isActive),
  ]
);

/**
 * User Badges - Badges earned by users
 */
export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badgeDefinitions.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).defaultNow().notNull(),
    displayOrder: integer("display_order").default(0).notNull(), // User can reorder featured badges
    isFeatured: boolean("is_featured").default(false).notNull(), // Show on profile
    metadata: jsonb("metadata").$type<{
      prValue?: number; // PR value when badge was earned
      prUnit?: string; // PR unit
      challengeName?: string; // Challenge name
      programName?: string; // Program name
      trackTime?: number; // Track time achieved
      notes?: string;
    }>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (userBadge) => [
    index("user_badges_user_idx").on(userBadge.userId),
    index("user_badges_badge_idx").on(userBadge.badgeId),
    index("user_badges_featured_idx").on(userBadge.userId, userBadge.isFeatured),
    uniqueIndex("user_badges_unique_idx").on(userBadge.userId, userBadge.badgeId),
  ]
);

/**
 * External Achievements - Achievements logged from outside the app
 * (marathons, ironmans, competitions, etc.)
 */
export const externalAchievements = pgTable(
  "external_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(), // marathon, ironman, competition, obstacle_race, etc.
    name: text("name").notNull(),
    description: text("description"),
    achievedDate: date("achieved_date"),
    value: text("value"), // time, place, etc.
    unit: text("unit"),
    proofUrl: text("proof_url"), // Photo/certificate URL
    isVerified: boolean("is_verified").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (achievement) => [
    index("external_achievements_user_idx").on(achievement.userId),
    index("external_achievements_category_idx").on(achievement.category),
  ]
);

/**
 * User Sports - Sports the user plays
 */
export const userSports = pgTable(
  "user_sports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Neon Auth user ID
    sport: text("sport").notNull(), // baseball, hockey, football, soccer, etc.
    level: text("level"), // recreational, high_school, college, professional, amateur
    yearsPlaying: integer("years_playing"),
    position: text("position"), // Position played (if applicable)
    currentlyActive: boolean("currently_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (sport) => [
    index("user_sports_user_idx").on(sport.userId),
    index("user_sports_sport_idx").on(sport.sport),
    index("user_sports_active_idx").on(sport.userId, sport.currentlyActive),
  ]
);

/**
 * Profile Completeness Cache - Cached completeness status for fast lookups
 */
export const profileCompletenessCache = pgTable(
  "profile_completeness_cache",
  {
    userId: text("user_id").primaryKey().notNull(), // Neon Auth user ID
    overallPercent: integer("overall_percent").default(0).notNull(),
    sections: jsonb("sections").$type<{
      basics?: number; // Display name, birthday, location
      bodyMetrics?: number; // Weight, height, body fat
      equipment?: number; // Gym locations and equipment
      goals?: number; // Active goals
      limitations?: number; // Injuries and limitations
      skills?: number; // Athletic skills
      sports?: number; // Sports played
    }>().default({}).notNull(),
    missingFields: jsonb("missing_fields").$type<string[]>().default([]).notNull(),
    dismissedPrompts: jsonb("dismissed_prompts").$type<string[]>().default([]).notNull(),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
  },
  (cache) => [
    index("profile_completeness_updated_idx").on(cache.lastUpdated),
  ]
);

// ============================================================================
// USER CAPABILITIES (Physical Assessment)
// ============================================================================

/**
 * User Capabilities - Physical assessment for movement readiness
 */
export const userCapabilities = pgTable(
  "user_capabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow().notNull(),
    
    // Mobility Tests
    canTouchToes: text("can_touch_toes"), // easily, barely, no
    canDeepSquat: text("can_deep_squat"), // full_depth, parallel, quarter, no
    canChildsPose: text("can_childs_pose"), // comfortable, tight, no
    canOverheadReach: text("can_overhead_reach"), // full, limited, painful
    canLungeDeep: text("can_lunge_deep"), // full, partial, no
    
    // Stability Tests
    canSingleLegStand: text("can_single_leg_stand"), // 30s+, 10-30s, <10s
    canPlankHold: text("can_plank_hold"), // 60s+, 30-60s, <30s, no
    
    // Power/Plyometric Readiness
    canBoxJump: text("can_box_jump"), // yes, low_only, no
    canJumpRope: text("can_jump_rope"), // yes, limited, no
    canBurpees: text("can_burpees"), // full, modified, no
    
    // Strength Baseline
    canPushup: text("can_pushup"), // full, modified, wall_only, no
    canPullup: text("can_pullup"), // multiple, one, assisted, no
    canDeadliftHinge: text("can_deadlift_hinge"), // good_form, needs_work, pain
    
    // Special Considerations
    balanceIssues: boolean("balance_issues").default(false).notNull(),
    dizzinessWithMovement: boolean("dizziness_with_movement").default(false).notNull(),
    cardioLimitationsNotes: text("cardio_limitations_notes"),
    
    // Overall Assessment
    overallMobilityScore: integer("overall_mobility_score"), // 1-10
    overallStrengthScore: integer("overall_strength_score"), // 1-10
    readinessLevel: text("readiness_level"), // rehabilitation, beginner, general, athletic
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (cap) => [
    index("user_capabilities_user_idx").on(cap.userId),
    index("user_capabilities_assessed_idx").on(cap.assessedAt),
  ]
);

// ============================================================================
// CONTENT RATINGS & COMMENTS
// ============================================================================

/**
 * Universal content ratings
 */
export const contentRatings = pgTable(
  "content_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    contentType: text("content_type").notNull(), // workout, challenge, program, circle
    contentId: uuid("content_id").notNull(),
    rating: integer("rating").notNull(), // 1-5
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (rating) => [
    index("content_ratings_user_idx").on(rating.userId),
    index("content_ratings_content_idx").on(rating.contentType, rating.contentId),
    uniqueIndex("content_ratings_unique_idx").on(rating.userId, rating.contentType, rating.contentId),
  ]
);

/**
 * Universal content comments
 */
export const contentComments = pgTable(
  "content_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    contentType: text("content_type").notNull(), // workout, challenge, program
    contentId: uuid("content_id").notNull(),
    parentCommentId: uuid("parent_comment_id"), // For replies
    content: text("content").notNull(),
    likesCount: integer("likes_count").default(0).notNull(),
    isEdited: boolean("is_edited").default(false).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (comment) => [
    index("content_comments_user_idx").on(comment.userId),
    index("content_comments_content_idx").on(comment.contentType, comment.contentId),
    index("content_comments_parent_idx").on(comment.parentCommentId),
  ]
);

/**
 * Content reports - for community moderation
 */
export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: text("reporter_id").notNull(), // User who reported
    contentType: text("content_type").notNull(), // challenge, workout, program, comment
    contentId: uuid("content_id").notNull(),
    reason: text("reason").notNull(), // inappropriate, spam, harassment, copyright, other
    details: text("details"), // Additional details from reporter
    status: text("status").default("pending").notNull(), // pending, resolved, dismissed
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"), // Admin user ID who resolved
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (report) => [
    index("content_reports_reporter_idx").on(report.reporterId),
    index("content_reports_content_idx").on(report.contentType, report.contentId),
    index("content_reports_status_idx").on(report.status),
  ]
);

/**
 * Comment likes
 */
export const commentLikes = pgTable(
  "comment_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => contentComments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (like) => [
    index("comment_likes_comment_idx").on(like.commentId),
    uniqueIndex("comment_likes_unique_idx").on(like.userId, like.commentId),
  ]
);

// ============================================================================
// USER PRIVACY SETTINGS
// ============================================================================

/**
 * Fine-grained privacy controls for user data
 */
export const userPrivacySettings = pgTable(
  "user_privacy_settings",
  {
    userId: text("user_id").primaryKey().notNull(),
    
    // Field-level visibility (public, circle, private)
    nameVisibility: text("name_visibility").default("public").notNull(),
    profilePictureVisibility: text("profile_picture_visibility").default("public").notNull(),
    cityVisibility: text("city_visibility").default("circle").notNull(),
    ageVisibility: text("age_visibility").default("private").notNull(),
    weightVisibility: text("weight_visibility").default("private").notNull(),
    bodyFatVisibility: text("body_fat_visibility").default("private").notNull(),
    fitnessLevelVisibility: text("fitness_level_visibility").default("circle").notNull(),
    goalsVisibility: text("goals_visibility").default("circle").notNull(),
    limitationsVisibility: text("limitations_visibility").default("private").notNull(),
    workoutHistoryVisibility: text("workout_history_visibility").default("circle").notNull(),
    personalRecordsVisibility: text("personal_records_visibility").default("circle").notNull(),
    badgesVisibility: text("badges_visibility").default("public").notNull(),
    sportsVisibility: text("sports_visibility").default("public").notNull(),
    capabilitiesVisibility: text("capabilities_visibility").default("private").notNull(),
    
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ============================================================================
// CONTENT RELATIONS
// ============================================================================

export const contentCommentsRelations = relations(contentComments, ({ one, many }) => ({
  parentComment: one(contentComments, {
    fields: [contentComments.parentCommentId],
    references: [contentComments.id],
    relationName: "parentComment",
  }),
  replies: many(contentComments, { relationName: "parentComment" }),
  likes: many(commentLikes),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(contentComments, {
    fields: [commentLikes.commentId],
    references: [contentComments.id],
  }),
}));

// ============================================================================
// BADGES & ACHIEVEMENTS RELATIONS
// ============================================================================

export const badgeDefinitionsRelations = relations(badgeDefinitions, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  badge: one(badgeDefinitions, {
    fields: [userBadges.badgeId],
    references: [badgeDefinitions.id],
  }),
}));

export const userSportsRelations = relations(userSports, ({ }) => ({
  // Relations are via userId text field
}));

export const profileCompletenessCacheRelations = relations(profileCompletenessCache, ({ }) => ({
  // Relations are via userId text field
}));

// ============================================================================
// CIRCLE POSTS (Social Feed)
// ============================================================================

/**
 * Circle posts - social feed for circles
 * Members can post text/images, admins can post workouts/challenges/goals
 */
export const circlePosts = pgTable(
  "circle_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(), // Neon Auth user ID
    postType: text("post_type").notNull(), // "text", "image", "workout", "challenge", "goal", "milestone"
    
    // Content fields
    content: text("content"), // Text content
    imageUrl: text("image_url"), // For image posts
    
    // Referenced entities (one of these for linked posts)
    workoutPlanId: uuid("workout_plan_id").references(() => workoutPlans.id, { onDelete: "set null" }),
    challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "set null" }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    
    // Interaction counts (denormalized)
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    
    // For workout/challenge assignments
    isAssignment: boolean("is_assignment").default(false).notNull(), // Admin assigned this
    dueDate: timestamp("due_date", { withTimezone: true }), // Optional deadline
    
    isPinned: boolean("is_pinned").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (post) => [
    index("circle_posts_circle_idx").on(post.circleId),
    index("circle_posts_author_idx").on(post.authorId),
    index("circle_posts_type_idx").on(post.postType),
    index("circle_posts_created_idx").on(post.createdAt),
    index("circle_posts_pinned_idx").on(post.isPinned),
  ]
);

/**
 * Circle post likes
 */
export const circlePostLikes = pgTable(
  "circle_post_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => circlePosts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (like) => [
    index("circle_post_likes_post_idx").on(like.postId),
    index("circle_post_likes_user_idx").on(like.userId),
    uniqueIndex("circle_post_likes_unique_idx").on(like.postId, like.userId),
  ]
);

/**
 * Circle post comments
 */
export const circlePostComments = pgTable(
  "circle_post_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => circlePosts.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (comment) => [
    index("circle_post_comments_post_idx").on(comment.postId),
    index("circle_post_comments_author_idx").on(comment.authorId),
  ]
);

// ============================================================================
// CHALLENGE MILESTONES
// ============================================================================

/**
 * Challenge milestones - structured progression within challenges
 * Links challenges to workouts, goals, and provides phased completion
 */
export const challengeMilestones = pgTable(
  "challenge_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    
    // Milestone info
    order: integer("order").notNull(), // 1, 2, 3...
    name: text("name").notNull(), // "Week 1: Walk 15 min/day"
    description: text("description"),
    
    // Linked entities (optional - what this milestone requires)
    workoutPlanId: uuid("workout_plan_id").references(() => workoutPlans.id, { onDelete: "set null" }),
    programWeekId: uuid("program_week_id").references(() => programWeeks.id, { onDelete: "set null" }),
    goalTargetValue: real("goal_target_value"), // e.g., walk 10000 steps
    goalTargetUnit: text("goal_target_unit"), // e.g., "steps"
    
    // Duration
    durationDays: integer("duration_days"), // How long this milestone lasts
    
    // Completion criteria
    completionType: text("completion_type").notNull(), // "workout", "days", "goal", "manual"
    requiredCompletions: integer("required_completions").default(1).notNull(),
    
    // Fun labels
    unlockMessage: text("unlock_message"), // "You're crushing it! On to Phase 2!"
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (milestone) => [
    index("challenge_milestones_challenge_idx").on(milestone.challengeId),
    index("challenge_milestones_order_idx").on(milestone.challengeId, milestone.order),
  ]
);

/**
 * Track user progress on challenge milestones
 */
export const challengeMilestoneProgress = pgTable(
  "challenge_milestone_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => challengeParticipants.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => challengeMilestones.id, { onDelete: "cascade" }),
    
    status: text("status").default("locked").notNull(), // "locked", "active", "completed", "skipped"
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completionCount: integer("completion_count").default(0).notNull(),
    notes: text("notes"),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (progress) => [
    index("challenge_milestone_progress_participant_idx").on(progress.participantId),
    index("challenge_milestone_progress_milestone_idx").on(progress.milestoneId),
    uniqueIndex("challenge_milestone_progress_unique_idx").on(progress.participantId, progress.milestoneId),
  ]
);

// ============================================================================
// CHALLENGE PROOF UPLOADS
// ============================================================================

/**
 * Challenge proof uploads - photos/videos of challenge completion
 * Users can upload proof with visibility controls (private, circle, public)
 */
export const challengeProofUploads = pgTable(
  "challenge_proof_uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => challengeParticipants.id, { onDelete: "cascade" }),
    progressId: uuid("progress_id")
      .references(() => challengeProgress.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id")
      .references(() => challengeMilestones.id, { onDelete: "set null" }),
    
    // Media
    mediaType: text("media_type").notNull(), // "image" | "video"
    mediaUrl: text("media_url").notNull(),
    thumbnailUrl: text("thumbnail_url"), // For videos
    
    // Visibility
    visibility: text("visibility").default("private").notNull(), // "private" | "circle" | "public"
    
    // Context
    caption: text("caption"),
    dayNumber: integer("day_number"),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (proof) => [
    index("challenge_proof_uploads_participant_idx").on(proof.participantId),
    index("challenge_proof_uploads_visibility_idx").on(proof.visibility),
    index("challenge_proof_uploads_created_idx").on(proof.createdAt),
  ]
);

// ============================================================================
// CIRCLE POSTS RELATIONS
// ============================================================================

export const circlePostsRelations = relations(circlePosts, ({ one, many }) => ({
  circle: one(circles, {
    fields: [circlePosts.circleId],
    references: [circles.id],
  }),
  workoutPlan: one(workoutPlans, {
    fields: [circlePosts.workoutPlanId],
    references: [workoutPlans.id],
  }),
  challenge: one(challenges, {
    fields: [circlePosts.challengeId],
    references: [challenges.id],
  }),
  goal: one(goals, {
    fields: [circlePosts.goalId],
    references: [goals.id],
  }),
  likes: many(circlePostLikes),
  comments: many(circlePostComments),
}));

export const circlePostLikesRelations = relations(circlePostLikes, ({ one }) => ({
  post: one(circlePosts, {
    fields: [circlePostLikes.postId],
    references: [circlePosts.id],
  }),
}));

export const circlePostCommentsRelations = relations(circlePostComments, ({ one }) => ({
  post: one(circlePosts, {
    fields: [circlePostComments.postId],
    references: [circlePosts.id],
  }),
}));

// ============================================================================
// CHALLENGE MILESTONES RELATIONS
// ============================================================================

export const challengeMilestonesRelations = relations(challengeMilestones, ({ one, many }) => ({
  challenge: one(challenges, {
    fields: [challengeMilestones.challengeId],
    references: [challenges.id],
  }),
  workoutPlan: one(workoutPlans, {
    fields: [challengeMilestones.workoutPlanId],
    references: [workoutPlans.id],
  }),
  programWeek: one(programWeeks, {
    fields: [challengeMilestones.programWeekId],
    references: [programWeeks.id],
  }),
  progress: many(challengeMilestoneProgress),
}));

export const challengeMilestoneProgressRelations = relations(challengeMilestoneProgress, ({ one }) => ({
  participant: one(challengeParticipants, {
    fields: [challengeMilestoneProgress.participantId],
    references: [challengeParticipants.id],
  }),
  milestone: one(challengeMilestones, {
    fields: [challengeMilestoneProgress.milestoneId],
    references: [challengeMilestones.id],
  }),
}));

export const challengeProofUploadsRelations = relations(challengeProofUploads, ({ one }) => ({
  participant: one(challengeParticipants, {
    fields: [challengeProofUploads.participantId],
    references: [challengeParticipants.id],
  }),
  progress: one(challengeProgress, {
    fields: [challengeProofUploads.progressId],
    references: [challengeProgress.id],
  }),
  milestone: one(challengeMilestones, {
    fields: [challengeProofUploads.milestoneId],
    references: [challengeMilestones.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Circle = typeof circles.$inferSelect;
export type NewCircle = typeof circles.$inferInsert;
export type CircleMember = typeof circleMembers.$inferSelect;
export type NewCircleMember = typeof circleMembers.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;
export type MemberContextSnapshot = typeof memberContextSnapshot.$inferSelect;
export type AiResponseCache = typeof aiResponseCache.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type NewOnboardingProgress = typeof onboardingProgress.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type CircleRequest = typeof circleRequests.$inferSelect;
export type NewCircleRequest = typeof circleRequests.$inferInsert;
export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type ActivityFeed = typeof activityFeed.$inferSelect;
export type NewActivityFeed = typeof activityFeed.$inferInsert;
export type CircleJoinRequest = typeof circleJoinRequests.$inferSelect;
export type NewCircleJoinRequest = typeof circleJoinRequests.$inferInsert;
export type UserLocation = typeof userLocations.$inferSelect;
export type NewUserLocation = typeof userLocations.$inferInsert;
export type EquipmentCatalog = typeof equipmentCatalog.$inferSelect;
export type NewEquipmentCatalog = typeof equipmentCatalog.$inferInsert;
export type UserMetric = typeof userMetrics.$inferSelect;
export type NewUserMetric = typeof userMetrics.$inferInsert;
export type UserLimitation = typeof userLimitations.$inferSelect;
export type NewUserLimitation = typeof userLimitations.$inferInsert;
export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;

// Challenges
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type NewChallengeParticipant = typeof challengeParticipants.$inferInsert;
export type ChallengeProgress = typeof challengeProgress.$inferSelect;
export type NewChallengeProgress = typeof challengeProgress.$inferInsert;

// Community Programs
export type CommunityProgram = typeof communityPrograms.$inferSelect;
export type NewCommunityProgram = typeof communityPrograms.$inferInsert;
export type ProgramWeek = typeof programWeeks.$inferSelect;
export type NewProgramWeek = typeof programWeeks.$inferInsert;
export type ProgramWorkout = typeof programWorkouts.$inferSelect;
export type NewProgramWorkout = typeof programWorkouts.$inferInsert;
export type ProgramEnrollment = typeof programEnrollments.$inferSelect;
export type NewProgramEnrollment = typeof programEnrollments.$inferInsert;
export type ProgramWorkoutProgress = typeof programWorkoutProgress.$inferSelect;
export type NewProgramWorkoutProgress = typeof programWorkoutProgress.$inferInsert;

// Shared Workouts
export type SharedWorkout = typeof sharedWorkouts.$inferSelect;
export type NewSharedWorkout = typeof sharedWorkouts.$inferInsert;
export type SavedWorkout = typeof savedWorkouts.$inferSelect;
export type NewSavedWorkout = typeof savedWorkouts.$inferInsert;

// Badges & Achievements
export type BadgeDefinition = typeof badgeDefinitions.$inferSelect;
export type NewBadgeDefinition = typeof badgeDefinitions.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;
export type UserSport = typeof userSports.$inferSelect;
export type NewUserSport = typeof userSports.$inferInsert;
export type ProfileCompletenessCache = typeof profileCompletenessCache.$inferSelect;
export type NewProfileCompletenessCache = typeof profileCompletenessCache.$inferInsert;

// User Capabilities
export type UserCapability = typeof userCapabilities.$inferSelect;
export type NewUserCapability = typeof userCapabilities.$inferInsert;

// Content Ratings & Comments
export type ContentRating = typeof contentRatings.$inferSelect;
export type NewContentRating = typeof contentRatings.$inferInsert;
export type ContentComment = typeof contentComments.$inferSelect;
export type NewContentComment = typeof contentComments.$inferInsert;
export type CommentLike = typeof commentLikes.$inferSelect;
export type NewCommentLike = typeof commentLikes.$inferInsert;

// User Privacy Settings
export type UserPrivacySettings = typeof userPrivacySettings.$inferSelect;
export type NewUserPrivacySettings = typeof userPrivacySettings.$inferInsert;

// Circle Posts
export type CirclePost = typeof circlePosts.$inferSelect;
export type NewCirclePost = typeof circlePosts.$inferInsert;
export type CirclePostLike = typeof circlePostLikes.$inferSelect;
export type NewCirclePostLike = typeof circlePostLikes.$inferInsert;
export type CirclePostComment = typeof circlePostComments.$inferSelect;
export type NewCirclePostComment = typeof circlePostComments.$inferInsert;

// Challenge Milestones
export type ChallengeMilestone = typeof challengeMilestones.$inferSelect;
export type NewChallengeMilestone = typeof challengeMilestones.$inferInsert;
export type ChallengeMilestoneProgress = typeof challengeMilestoneProgress.$inferSelect;
export type NewChallengeMilestoneProgress = typeof challengeMilestoneProgress.$inferInsert;

// Challenge Proof Uploads
export type ChallengeProofUpload = typeof challengeProofUploads.$inferSelect;
export type NewChallengeProofUpload = typeof challengeProofUploads.$inferInsert;

// User Program Schedules
export type UserProgramSchedule = typeof userProgramSchedules.$inferSelect;
export type NewUserProgramSchedule = typeof userProgramSchedules.$inferInsert;
export type ScheduledWorkout = typeof scheduledWorkouts.$inferSelect;
export type NewScheduledWorkout = typeof scheduledWorkouts.$inferInsert;
