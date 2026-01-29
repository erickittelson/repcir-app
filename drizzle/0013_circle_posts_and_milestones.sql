-- Circle Posts and Challenge Milestones Migration
-- Adds social feed capabilities to circles and milestone-based progression to challenges

-- ============================================================================
-- CIRCLE POSTS (Social Feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "circle_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
  "author_id" text NOT NULL,
  "post_type" text NOT NULL,
  "content" text,
  "image_url" text,
  "workout_plan_id" uuid REFERENCES "workout_plans"("id") ON DELETE SET NULL,
  "challenge_id" uuid REFERENCES "challenges"("id") ON DELETE SET NULL,
  "goal_id" uuid REFERENCES "goals"("id") ON DELETE SET NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "comment_count" integer DEFAULT 0 NOT NULL,
  "is_assignment" boolean DEFAULT false NOT NULL,
  "due_date" timestamp with time zone,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "circle_posts_circle_idx" ON "circle_posts" ("circle_id");
CREATE INDEX IF NOT EXISTS "circle_posts_author_idx" ON "circle_posts" ("author_id");
CREATE INDEX IF NOT EXISTS "circle_posts_type_idx" ON "circle_posts" ("post_type");
CREATE INDEX IF NOT EXISTS "circle_posts_created_idx" ON "circle_posts" ("created_at");
CREATE INDEX IF NOT EXISTS "circle_posts_pinned_idx" ON "circle_posts" ("is_pinned");

-- ============================================================================
-- CIRCLE POST LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "circle_post_likes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL REFERENCES "circle_posts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "circle_post_likes_post_idx" ON "circle_post_likes" ("post_id");
CREATE INDEX IF NOT EXISTS "circle_post_likes_user_idx" ON "circle_post_likes" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "circle_post_likes_unique_idx" ON "circle_post_likes" ("post_id", "user_id");

-- ============================================================================
-- CIRCLE POST COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "circle_post_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL REFERENCES "circle_posts"("id") ON DELETE CASCADE,
  "author_id" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "circle_post_comments_post_idx" ON "circle_post_comments" ("post_id");
CREATE INDEX IF NOT EXISTS "circle_post_comments_author_idx" ON "circle_post_comments" ("author_id");

-- ============================================================================
-- CHALLENGE MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "challenge_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "challenge_id" uuid NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "order" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "workout_plan_id" uuid REFERENCES "workout_plans"("id") ON DELETE SET NULL,
  "program_week_id" uuid REFERENCES "program_weeks"("id") ON DELETE SET NULL,
  "goal_target_value" real,
  "goal_target_unit" text,
  "duration_days" integer,
  "completion_type" text NOT NULL,
  "required_completions" integer DEFAULT 1 NOT NULL,
  "unlock_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "challenge_milestones_challenge_idx" ON "challenge_milestones" ("challenge_id");
CREATE INDEX IF NOT EXISTS "challenge_milestones_order_idx" ON "challenge_milestones" ("challenge_id", "order");

-- ============================================================================
-- CHALLENGE MILESTONE PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "challenge_milestone_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_id" uuid NOT NULL REFERENCES "challenge_participants"("id") ON DELETE CASCADE,
  "milestone_id" uuid NOT NULL REFERENCES "challenge_milestones"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'locked' NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "completion_count" integer DEFAULT 0 NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "challenge_milestone_progress_participant_idx" ON "challenge_milestone_progress" ("participant_id");
CREATE INDEX IF NOT EXISTS "challenge_milestone_progress_milestone_idx" ON "challenge_milestone_progress" ("milestone_id");
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_milestone_progress_unique_idx" ON "challenge_milestone_progress" ("participant_id", "milestone_id");

-- ============================================================================
-- ADD NEW FIELDS TO CHALLENGES TABLE
-- ============================================================================

-- Fun branding fields
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "difficulty_label" text;
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "branding_theme" text;

-- Linked program for structured challenges
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "program_id" uuid REFERENCES "community_programs"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "challenges_program_idx" ON "challenges" ("program_id");
