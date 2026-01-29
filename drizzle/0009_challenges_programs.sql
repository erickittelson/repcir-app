-- Migration: Add challenges, community programs, and shared workouts
-- Star schema design with fact tables for tracking progress

-- ============================================================================
-- CHALLENGES (Dimension Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "short_description" text,
  "cover_image" text,
  "category" text NOT NULL,
  "difficulty" text NOT NULL,
  "duration_days" integer NOT NULL,
  "rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "daily_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "visibility" text DEFAULT 'public' NOT NULL,
  "is_official" boolean DEFAULT false NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "participant_count" integer DEFAULT 0 NOT NULL,
  "completion_count" integer DEFAULT 0 NOT NULL,
  "avg_completion_rate" real,
  "created_by_user_id" text,
  "circle_id" uuid REFERENCES circles(id) ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "challenges_category_idx" ON "challenges" ("category");
CREATE INDEX IF NOT EXISTS "challenges_visibility_idx" ON "challenges" ("visibility");
CREATE INDEX IF NOT EXISTS "challenges_featured_idx" ON "challenges" ("is_featured");
CREATE INDEX IF NOT EXISTS "challenges_official_idx" ON "challenges" ("is_official");

-- ============================================================================
-- CHALLENGE PARTICIPANTS (Bridge Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "challenge_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "challenge_id" uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "start_date" timestamp with time zone DEFAULT now() NOT NULL,
  "end_date" timestamp with time zone,
  "completed_date" timestamp with time zone,
  "current_day" integer DEFAULT 1 NOT NULL,
  "current_streak" integer DEFAULT 0 NOT NULL,
  "longest_streak" integer DEFAULT 0 NOT NULL,
  "days_completed" integer DEFAULT 0 NOT NULL,
  "days_failed" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "challenge_participants_challenge_idx" ON "challenge_participants" ("challenge_id");
CREATE INDEX IF NOT EXISTS "challenge_participants_user_idx" ON "challenge_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "challenge_participants_status_idx" ON "challenge_participants" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_participants_unique_idx" ON "challenge_participants" ("challenge_id", "user_id");

-- ============================================================================
-- CHALLENGE PROGRESS (Fact Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "challenge_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "participant_id" uuid NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  "day" integer NOT NULL,
  "date" timestamp with time zone NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "tasks_completed" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "proof_image_url" text,
  "notes" text,
  "mood" text,
  "energy_level" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "challenge_progress_participant_idx" ON "challenge_progress" ("participant_id");
CREATE INDEX IF NOT EXISTS "challenge_progress_date_idx" ON "challenge_progress" ("date");
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_progress_unique_idx" ON "challenge_progress" ("participant_id", "day");

-- ============================================================================
-- COMMUNITY PROGRAMS (Dimension Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "community_programs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "short_description" text,
  "cover_image" text,
  "category" text NOT NULL,
  "difficulty" text NOT NULL,
  "duration_weeks" integer NOT NULL,
  "days_per_week" integer NOT NULL,
  "avg_workout_duration" integer,
  "primary_goal" text,
  "target_muscles" jsonb,
  "equipment_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "visibility" text DEFAULT 'public' NOT NULL,
  "is_official" boolean DEFAULT false NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "enrollment_count" integer DEFAULT 0 NOT NULL,
  "completion_count" integer DEFAULT 0 NOT NULL,
  "avg_rating" real,
  "review_count" integer DEFAULT 0 NOT NULL,
  "created_by_user_id" text,
  "circle_id" uuid REFERENCES circles(id) ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "community_programs_category_idx" ON "community_programs" ("category");
CREATE INDEX IF NOT EXISTS "community_programs_visibility_idx" ON "community_programs" ("visibility");
CREATE INDEX IF NOT EXISTS "community_programs_featured_idx" ON "community_programs" ("is_featured");
CREATE INDEX IF NOT EXISTS "community_programs_difficulty_idx" ON "community_programs" ("difficulty");

-- ============================================================================
-- PROGRAM WEEKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "program_weeks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "program_id" uuid NOT NULL REFERENCES community_programs(id) ON DELETE CASCADE,
  "week_number" integer NOT NULL,
  "name" text,
  "focus" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "program_weeks_program_idx" ON "program_weeks" ("program_id");
CREATE UNIQUE INDEX IF NOT EXISTS "program_weeks_unique_idx" ON "program_weeks" ("program_id", "week_number");

-- ============================================================================
-- PROGRAM WORKOUTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "program_workouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "program_id" uuid NOT NULL REFERENCES community_programs(id) ON DELETE CASCADE,
  "week_id" uuid REFERENCES program_weeks(id) ON DELETE CASCADE,
  "week_number" integer NOT NULL,
  "day_number" integer NOT NULL,
  "name" text NOT NULL,
  "focus" text,
  "estimated_duration" integer,
  "workout_plan_id" uuid REFERENCES workout_plans(id) ON DELETE SET NULL,
  "exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "program_workouts_program_idx" ON "program_workouts" ("program_id");
CREATE INDEX IF NOT EXISTS "program_workouts_week_idx" ON "program_workouts" ("week_id");

-- ============================================================================
-- PROGRAM ENROLLMENTS (Bridge Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "program_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "program_id" uuid NOT NULL REFERENCES community_programs(id) ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "start_date" timestamp with time zone DEFAULT now() NOT NULL,
  "current_week" integer DEFAULT 1 NOT NULL,
  "current_day" integer DEFAULT 1 NOT NULL,
  "workouts_completed" integer DEFAULT 0 NOT NULL,
  "total_workouts" integer NOT NULL,
  "completed_date" timestamp with time zone,
  "rating" integer,
  "review" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "program_enrollments_program_idx" ON "program_enrollments" ("program_id");
CREATE INDEX IF NOT EXISTS "program_enrollments_user_idx" ON "program_enrollments" ("user_id");
CREATE INDEX IF NOT EXISTS "program_enrollments_status_idx" ON "program_enrollments" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "program_enrollments_unique_idx" ON "program_enrollments" ("program_id", "user_id");

-- ============================================================================
-- PROGRAM WORKOUT PROGRESS (Fact Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "program_workout_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "enrollment_id" uuid NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
  "program_workout_id" uuid NOT NULL REFERENCES program_workouts(id) ON DELETE CASCADE,
  "workout_session_id" uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "completed_date" timestamp with time zone,
  "skipped" boolean DEFAULT false NOT NULL,
  "notes" text,
  "rating" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "program_workout_progress_enrollment_idx" ON "program_workout_progress" ("enrollment_id");
CREATE INDEX IF NOT EXISTS "program_workout_progress_workout_idx" ON "program_workout_progress" ("program_workout_id");

-- ============================================================================
-- SHARED WORKOUTS (Community Discovery)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "shared_workouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workout_plan_id" uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "category" text,
  "difficulty" text,
  "estimated_duration" integer,
  "target_muscles" jsonb,
  "equipment_required" jsonb,
  "visibility" text DEFAULT 'public' NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "save_count" integer DEFAULT 0 NOT NULL,
  "use_count" integer DEFAULT 0 NOT NULL,
  "avg_rating" real,
  "review_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "shared_workouts_user_idx" ON "shared_workouts" ("user_id");
CREATE INDEX IF NOT EXISTS "shared_workouts_category_idx" ON "shared_workouts" ("category");
CREATE INDEX IF NOT EXISTS "shared_workouts_visibility_idx" ON "shared_workouts" ("visibility");
CREATE INDEX IF NOT EXISTS "shared_workouts_featured_idx" ON "shared_workouts" ("is_featured");

-- ============================================================================
-- SAVED WORKOUTS (User Bookmarks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "saved_workouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "shared_workout_id" uuid NOT NULL REFERENCES shared_workouts(id) ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "saved_workouts_user_idx" ON "saved_workouts" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "saved_workouts_unique_idx" ON "saved_workouts" ("user_id", "shared_workout_id");

-- ============================================================================
-- SEED OFFICIAL CHALLENGES
-- ============================================================================

INSERT INTO "challenges" (
  "name",
  "description",
  "short_description",
  "category",
  "difficulty",
  "duration_days",
  "rules",
  "daily_tasks",
  "visibility",
  "is_official",
  "is_featured"
) VALUES
(
  '75 Hard',
  'The original mental toughness program. Complete all 5 critical tasks every single day for 75 days. No exceptions, no substitutions. If you fail any task, you start over from Day 1.',
  'The ultimate mental toughness challenge - 75 days, no excuses.',
  'transformation',
  'extreme',
  75,
  '["Complete ALL 5 daily tasks", "No alcohol or cheat meals", "No substitutions or modifications", "If you miss a task, restart from Day 1", "Take a progress photo every day"]'::jsonb,
  '[
    {"name": "Two 45-minute workouts", "description": "One must be outdoors, regardless of weather", "type": "workout", "isRequired": true},
    {"name": "Follow a diet", "description": "Any diet you choose, but stick to it strictly", "type": "nutrition", "isRequired": true},
    {"name": "Drink 1 gallon of water", "description": "One gallon (128oz) of water per day", "type": "nutrition", "isRequired": true},
    {"name": "Read 10 pages", "description": "Read 10 pages of a non-fiction/self-improvement book", "type": "mindset", "isRequired": true},
    {"name": "Take a progress photo", "description": "Document your journey daily", "type": "custom", "isRequired": true}
  ]'::jsonb,
  'public',
  true,
  true
),
(
  '30-Day Squat Challenge',
  'Build lower body strength and endurance with progressive daily squats. Start with 50 squats and work your way up to 250 by Day 30.',
  'Progressive squat challenge - from 50 to 250 in 30 days.',
  'strength',
  'intermediate',
  30,
  '["Complete the prescribed number of squats each day", "Break into sets if needed", "Rest days are built in", "Track your progress"]'::jsonb,
  '[
    {"name": "Complete daily squats", "description": "Day 1-5: 50-70, Day 6-10: 75-100, Day 11-20: 105-150, Day 21-30: 155-250", "type": "workout", "isRequired": true}
  ]'::jsonb,
  'public',
  true,
  true
),
(
  '7-Day Mindful Movement',
  'A gentle introduction to daily movement. Perfect for beginners or recovery weeks. Focus on consistency over intensity.',
  'Build the habit of daily movement in just one week.',
  'wellness',
  'beginner',
  7,
  '["Complete at least 20 minutes of movement daily", "Focus on how you feel, not performance", "Any type of movement counts"]'::jsonb,
  '[
    {"name": "20 minutes of movement", "description": "Walking, stretching, yoga, or any activity you enjoy", "type": "workout", "isRequired": true},
    {"name": "5 minutes of mindfulness", "description": "Meditation, deep breathing, or quiet reflection", "type": "mindset", "isRequired": false}
  ]'::jsonb,
  'public',
  true,
  true
),
(
  '21-Day Consistency Builder',
  'They say it takes 21 days to build a habit. Commit to daily workouts for 3 weeks and establish your fitness routine.',
  'Build the workout habit in 21 days.',
  'hybrid',
  'beginner',
  21,
  '["Complete one workout every day", "Minimum 30 minutes", "Any type of workout counts", "Rest days can be active recovery"]'::jsonb,
  '[
    {"name": "30-minute workout", "description": "Strength, cardio, yoga, or any structured workout", "type": "workout", "isRequired": true}
  ]'::jsonb,
  'public',
  true,
  false
)
ON CONFLICT DO NOTHING;
