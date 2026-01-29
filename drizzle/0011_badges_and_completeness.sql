-- Badge Definitions - Catalog of all available badges
CREATE TABLE IF NOT EXISTS "badge_definitions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "icon" text, -- Icon name or emoji
    "image_url" text, -- Optional badge image
    "category" text NOT NULL, -- strength, skill, sport, consistency, challenge, program, social, track
    "tier" text DEFAULT 'bronze' NOT NULL, -- bronze, silver, gold, platinum
    "criteria" jsonb DEFAULT '{}' NOT NULL, -- Flexible rules for earning
    "criteria_description" text, -- Human-readable criteria
    "is_automatic" boolean DEFAULT true NOT NULL, -- Auto-award or manual claim
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for badge_definitions
CREATE INDEX IF NOT EXISTS "badge_definitions_category_idx" ON "badge_definitions" ("category");
CREATE INDEX IF NOT EXISTS "badge_definitions_tier_idx" ON "badge_definitions" ("tier");
CREATE INDEX IF NOT EXISTS "badge_definitions_active_idx" ON "badge_definitions" ("is_active");

-- User Badges - Badges earned by users
CREATE TABLE IF NOT EXISTS "user_badges" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL, -- Neon Auth user ID
    "badge_id" uuid NOT NULL REFERENCES "badge_definitions"("id") ON DELETE CASCADE,
    "earned_at" timestamp with time zone DEFAULT now() NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL, -- User can reorder featured badges
    "is_featured" boolean DEFAULT false NOT NULL, -- Show on profile
    "metadata" jsonb DEFAULT '{}', -- PR value, time, challenge name, etc.
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for user_badges
CREATE INDEX IF NOT EXISTS "user_badges_user_idx" ON "user_badges" ("user_id");
CREATE INDEX IF NOT EXISTS "user_badges_badge_idx" ON "user_badges" ("badge_id");
CREATE INDEX IF NOT EXISTS "user_badges_featured_idx" ON "user_badges" ("user_id", "is_featured");
CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_unique_idx" ON "user_badges" ("user_id", "badge_id");

-- User Sports - Sports the user plays
CREATE TABLE IF NOT EXISTS "user_sports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL, -- Neon Auth user ID
    "sport" text NOT NULL, -- baseball, hockey, football, soccer, etc.
    "level" text, -- recreational, high_school, college, professional, amateur
    "years_playing" integer,
    "position" text, -- Position played (if applicable)
    "currently_active" boolean DEFAULT true NOT NULL,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for user_sports
CREATE INDEX IF NOT EXISTS "user_sports_user_idx" ON "user_sports" ("user_id");
CREATE INDEX IF NOT EXISTS "user_sports_sport_idx" ON "user_sports" ("sport");
CREATE INDEX IF NOT EXISTS "user_sports_active_idx" ON "user_sports" ("user_id", "currently_active");

-- Profile Completeness Cache - Cached completeness status for fast lookups
CREATE TABLE IF NOT EXISTS "profile_completeness_cache" (
    "user_id" text PRIMARY KEY NOT NULL, -- Neon Auth user ID
    "overall_percent" integer DEFAULT 0 NOT NULL,
    "sections" jsonb DEFAULT '{}' NOT NULL, -- {basics: 100, equipment: 0, goals: 50, ...}
    "missing_fields" jsonb DEFAULT '[]' NOT NULL, -- ["equipment", "limitations"]
    "dismissed_prompts" jsonb DEFAULT '[]' NOT NULL, -- Prompts user has dismissed
    "last_updated" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for profile_completeness_cache
CREATE INDEX IF NOT EXISTS "profile_completeness_updated_idx" ON "profile_completeness_cache" ("last_updated");
