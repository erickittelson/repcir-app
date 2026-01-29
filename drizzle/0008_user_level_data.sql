-- Migration: Move personal data from member-scoped to user-scoped tables
-- This fixes the schema issue where personal attributes (injuries, metrics, skills)
-- were incorrectly tied to circle_members instead of users directly.

-- ============================================================================
-- CREATE NEW USER-LEVEL TABLES
-- ============================================================================

-- User Metrics (weight, height, body composition over time)
CREATE TABLE IF NOT EXISTS "user_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "date" timestamp with time zone DEFAULT now() NOT NULL,
  "weight" real,
  "height" real,
  "body_fat_percentage" real,
  "fitness_level" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_metrics_user_idx" ON "user_metrics" ("user_id");
CREATE INDEX IF NOT EXISTS "user_metrics_date_idx" ON "user_metrics" ("date");

-- User Limitations (injuries, conditions)
CREATE TABLE IF NOT EXISTS "user_limitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "body_part" text,
  "condition" text,
  "description" text,
  "affected_areas" jsonb,
  "severity" text,
  "pain_level" integer,
  "duration" text,
  "avoids_movements" jsonb,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_limitations_user_idx" ON "user_limitations" ("user_id");
CREATE INDEX IF NOT EXISTS "user_limitations_active_idx" ON "user_limitations" ("user_id", "active");

-- User Skills (gymnastics, athletic abilities)
CREATE TABLE IF NOT EXISTS "user_skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "current_status" text DEFAULT 'learning' NOT NULL,
  "current_status_date" timestamp with time zone DEFAULT now(),
  "all_time_best_status" text DEFAULT 'learning' NOT NULL,
  "all_time_best_date" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_skills_user_idx" ON "user_skills" ("user_id");
CREATE INDEX IF NOT EXISTS "user_skills_status_idx" ON "user_skills" ("user_id", "current_status");

-- ============================================================================
-- MIGRATE DATA FROM MEMBER-SCOPED TO USER-SCOPED TABLES
-- ============================================================================

-- Migrate member_metrics to user_metrics
-- Join through circle_members to get user_id, deduplicate by taking the latest per user per date
INSERT INTO "user_metrics" ("user_id", "date", "weight", "height", "body_fat_percentage", "fitness_level", "notes", "created_at")
SELECT DISTINCT ON (cm.user_id, mm.date::date)
  cm.user_id,
  mm.date,
  mm.weight,
  mm.height,
  mm.body_fat_percentage,
  mm.fitness_level,
  mm.notes,
  mm.created_at
FROM "member_metrics" mm
JOIN "circle_members" cm ON mm.member_id = cm.id
WHERE cm.user_id IS NOT NULL
ORDER BY cm.user_id, mm.date::date, mm.created_at DESC
ON CONFLICT DO NOTHING;

-- Migrate member_limitations to user_limitations
-- Extract body_part and condition from description if possible
INSERT INTO "user_limitations" ("user_id", "type", "description", "affected_areas", "severity", "start_date", "end_date", "active", "notes", "created_at", "updated_at")
SELECT DISTINCT ON (cm.user_id, ml.description)
  cm.user_id,
  ml.type,
  ml.description,
  ml.affected_areas,
  ml.severity,
  ml.start_date,
  ml.end_date,
  ml.active,
  ml.notes,
  ml.created_at,
  ml.updated_at
FROM "member_limitations" ml
JOIN "circle_members" cm ON ml.member_id = cm.id
WHERE cm.user_id IS NOT NULL
ORDER BY cm.user_id, ml.description, ml.created_at DESC
ON CONFLICT DO NOTHING;

-- Migrate member_skills to user_skills
INSERT INTO "user_skills" ("user_id", "name", "category", "current_status", "current_status_date", "all_time_best_status", "all_time_best_date", "notes", "created_at", "updated_at")
SELECT DISTINCT ON (cm.user_id, ms.name)
  cm.user_id,
  ms.name,
  ms.category,
  ms.current_status,
  ms.current_status_date,
  ms.all_time_best_status,
  ms.all_time_best_date,
  ms.notes,
  ms.created_at,
  ms.updated_at
FROM "member_skills" ms
JOIN "circle_members" cm ON ms.member_id = cm.id
WHERE cm.user_id IS NOT NULL
ORDER BY cm.user_id, ms.name, ms.created_at DESC
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTE: Old member_* tables are kept for backwards compatibility
-- They can be dropped in a future migration once all code is updated
-- ============================================================================
