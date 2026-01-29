-- Enhanced Limitations System
-- Add new columns to user_limitations for better injury/condition context

ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "is_healed" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "is_chronic_permanent" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "healing_timeline" text;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "injury_date" timestamp with time zone;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "cause_type" text;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "medical_diagnosis" text;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "treating_with_pt" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "functional_impact" jsonb DEFAULT '{}';
ALTER TABLE "user_limitations" ADD COLUMN IF NOT EXISTS "modification_notes" text;

-- Physical Capability Assessment Table
CREATE TABLE IF NOT EXISTS "user_capabilities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Mobility Tests
    "can_touch_toes" text,
    "can_deep_squat" text,
    "can_childs_pose" text,
    "can_overhead_reach" text,
    "can_lunge_deep" text,
    
    -- Stability Tests
    "can_single_leg_stand" text,
    "can_plank_hold" text,
    
    -- Power/Plyometric Readiness
    "can_box_jump" text,
    "can_jump_rope" text,
    "can_burpees" text,
    
    -- Strength Baseline
    "can_pushup" text,
    "can_pullup" text,
    "can_deadlift_hinge" text,
    
    -- Special Considerations
    "balance_issues" boolean DEFAULT false NOT NULL,
    "dizziness_with_movement" boolean DEFAULT false NOT NULL,
    "cardio_limitations_notes" text,
    
    -- Overall Assessment
    "overall_mobility_score" integer,
    "overall_strength_score" integer,
    "readiness_level" text,
    
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for user_capabilities
CREATE INDEX IF NOT EXISTS "user_capabilities_user_idx" ON "user_capabilities" ("user_id");
CREATE INDEX IF NOT EXISTS "user_capabilities_assessed_idx" ON "user_capabilities" ("assessed_at");

-- Universal Content Ratings Table
CREATE TABLE IF NOT EXISTS "content_ratings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "content_type" text NOT NULL,
    "content_id" uuid NOT NULL,
    "rating" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for content_ratings
CREATE INDEX IF NOT EXISTS "content_ratings_user_idx" ON "content_ratings" ("user_id");
CREATE INDEX IF NOT EXISTS "content_ratings_content_idx" ON "content_ratings" ("content_type", "content_id");
CREATE UNIQUE INDEX IF NOT EXISTS "content_ratings_unique_idx" ON "content_ratings" ("user_id", "content_type", "content_id");

-- Universal Content Comments Table
CREATE TABLE IF NOT EXISTS "content_comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "content_type" text NOT NULL,
    "content_id" uuid NOT NULL,
    "parent_comment_id" uuid,
    "content" text NOT NULL,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "is_edited" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for content_comments
CREATE INDEX IF NOT EXISTS "content_comments_user_idx" ON "content_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "content_comments_content_idx" ON "content_comments" ("content_type", "content_id");
CREATE INDEX IF NOT EXISTS "content_comments_parent_idx" ON "content_comments" ("parent_comment_id");

-- Comment Likes Table
CREATE TABLE IF NOT EXISTS "comment_likes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "comment_id" uuid NOT NULL REFERENCES "content_comments"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for comment_likes
CREATE INDEX IF NOT EXISTS "comment_likes_comment_idx" ON "comment_likes" ("comment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_unique_idx" ON "comment_likes" ("user_id", "comment_id");

-- User Privacy Settings Table
CREATE TABLE IF NOT EXISTS "user_privacy_settings" (
    "user_id" text PRIMARY KEY NOT NULL,
    
    -- Field-level visibility (public, circle, private)
    "name_visibility" text DEFAULT 'public' NOT NULL,
    "profile_picture_visibility" text DEFAULT 'public' NOT NULL,
    "city_visibility" text DEFAULT 'circle' NOT NULL,
    "age_visibility" text DEFAULT 'private' NOT NULL,
    "weight_visibility" text DEFAULT 'private' NOT NULL,
    "body_fat_visibility" text DEFAULT 'private' NOT NULL,
    "fitness_level_visibility" text DEFAULT 'circle' NOT NULL,
    "goals_visibility" text DEFAULT 'circle' NOT NULL,
    "limitations_visibility" text DEFAULT 'private' NOT NULL,
    "workout_history_visibility" text DEFAULT 'circle' NOT NULL,
    "personal_records_visibility" text DEFAULT 'circle' NOT NULL,
    "badges_visibility" text DEFAULT 'public' NOT NULL,
    "sports_visibility" text DEFAULT 'public' NOT NULL,
    "capabilities_visibility" text DEFAULT 'private' NOT NULL,
    
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Enhanced Circles - Add new columns
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "focus_area" text;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "target_demographic" text;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "activity_type" text;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "schedule_type" text;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "max_members" integer;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "join_type" text DEFAULT 'request';
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "rules" jsonb DEFAULT '[]';
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]';
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "circle_goals" jsonb DEFAULT '[]';

-- Add popularity and trending scores to content tables
ALTER TABLE "shared_workouts" ADD COLUMN IF NOT EXISTS "popularity_score" real DEFAULT 0 NOT NULL;
ALTER TABLE "shared_workouts" ADD COLUMN IF NOT EXISTS "trending_score" real DEFAULT 0 NOT NULL;
ALTER TABLE "shared_workouts" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone DEFAULT now();
ALTER TABLE "shared_workouts" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;

ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "popularity_score" real DEFAULT 0 NOT NULL;
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "trending_score" real DEFAULT 0 NOT NULL;
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone DEFAULT now();
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "avg_rating" real;
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "rating_count" integer DEFAULT 0 NOT NULL;

ALTER TABLE "community_programs" ADD COLUMN IF NOT EXISTS "popularity_score" real DEFAULT 0 NOT NULL;
ALTER TABLE "community_programs" ADD COLUMN IF NOT EXISTS "trending_score" real DEFAULT 0 NOT NULL;
ALTER TABLE "community_programs" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone DEFAULT now();
ALTER TABLE "community_programs" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;

-- Enhanced user_locations type field - add new types
-- Note: The type field accepts any text, new types: commercial, crossfit, boutique, hotel, military, office, apartment

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS "circles_focus_area_idx" ON "circles" ("focus_area");
CREATE INDEX IF NOT EXISTS "circles_target_demographic_idx" ON "circles" ("target_demographic");
CREATE INDEX IF NOT EXISTS "circles_join_type_idx" ON "circles" ("join_type");

CREATE INDEX IF NOT EXISTS "shared_workouts_popularity_idx" ON "shared_workouts" ("popularity_score" DESC);
CREATE INDEX IF NOT EXISTS "shared_workouts_trending_idx" ON "shared_workouts" ("trending_score" DESC);

CREATE INDEX IF NOT EXISTS "challenges_popularity_idx" ON "challenges" ("popularity_score" DESC);
CREATE INDEX IF NOT EXISTS "challenges_trending_idx" ON "challenges" ("trending_score" DESC);

CREATE INDEX IF NOT EXISTS "community_programs_popularity_idx" ON "community_programs" ("popularity_score" DESC);
CREATE INDEX IF NOT EXISTS "community_programs_trending_idx" ON "community_programs" ("trending_score" DESC);
