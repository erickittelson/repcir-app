-- Migration: Add content visibility to workouts, plans, templates, and programs
-- Date: 2026-02-20
-- Purpose: Enable private/public/circles/connections visibility on all workout content
-- Safety: Non-breaking, additive only. All new columns have defaults.

-- =============================================================================
-- 1. WORKOUT PLANS - Add visibility column
-- =============================================================================
-- workoutPlans are circle-scoped today. Adding visibility lets creators share
-- plans beyond their circle when they choose to.

ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

COMMENT ON COLUMN workout_plans.visibility IS
  'Content visibility: private | public | circles | connections. Default private.';

-- Index for filtering plans by visibility (discovery queries)
CREATE INDEX IF NOT EXISTS workout_plans_visibility_idx
  ON workout_plans (visibility);

-- Compound index for paginated discovery: "show me public plans, newest first"
CREATE INDEX IF NOT EXISTS workout_plans_visibility_created_idx
  ON workout_plans (visibility, created_at DESC);

-- =============================================================================
-- 2. SHARED WORKOUTS - Change default from 'public' to 'private'
-- =============================================================================
-- The shared_workouts table already has a visibility column. We change the
-- column default so NEW rows default to 'private'. Existing rows keep their
-- current value (most are 'public' from the old default).
--
-- NOTE: This does NOT update existing rows. If you want to backfill existing
-- shared workouts to 'private', run the optional backfill below.

ALTER TABLE shared_workouts
  ALTER COLUMN visibility SET DEFAULT 'private';

COMMENT ON COLUMN shared_workouts.visibility IS
  'Content visibility: private | public | circles | connections. Default private.';

-- =============================================================================
-- 3. WORKOUT TEMPLATES - Add visibility column
-- =============================================================================
-- Templates with isSystem=true remain globally visible regardless of this field.
-- For user-created templates, visibility controls who can discover them.

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

COMMENT ON COLUMN workout_templates.visibility IS
  'Content visibility: private | public | circles | connections. Default private. System templates ignore this.';

CREATE INDEX IF NOT EXISTS workout_templates_visibility_idx
  ON workout_templates (visibility);

-- =============================================================================
-- 4. COMMUNITY PROGRAMS - Change default from 'public' to 'private'
-- =============================================================================
-- Same pattern as shared_workouts: change the default, leave existing rows.

ALTER TABLE community_programs
  ALTER COLUMN visibility SET DEFAULT 'private';

COMMENT ON COLUMN community_programs.visibility IS
  'Content visibility: private | public | circles | connections. Default private.';

-- =============================================================================
-- 5. OPTIONAL: Backfill existing rows (uncomment if desired)
-- =============================================================================
-- These UPDATE statements change existing 'public' rows to 'private'.
-- Only run these if you want to retroactively hide previously-public content.
-- Most teams prefer to leave existing content as-is and only enforce the new
-- default going forward.
--
-- UPDATE shared_workouts SET visibility = 'private' WHERE visibility = 'public';
-- UPDATE community_programs SET visibility = 'private' WHERE visibility = 'public';

-- =============================================================================
-- 6. ADD CHECK CONSTRAINTS for valid visibility values
-- =============================================================================
-- These prevent invalid values from being inserted at the database level.

ALTER TABLE workout_plans
  ADD CONSTRAINT workout_plans_visibility_check
  CHECK (visibility IN ('private', 'public', 'circles', 'connections'));

ALTER TABLE shared_workouts
  ADD CONSTRAINT shared_workouts_visibility_check
  CHECK (visibility IN ('private', 'public', 'circles', 'connections'));

ALTER TABLE workout_templates
  ADD CONSTRAINT workout_templates_visibility_check
  CHECK (visibility IN ('private', 'public', 'circles', 'connections'));

ALTER TABLE community_programs
  ADD CONSTRAINT community_programs_visibility_check
  CHECK (visibility IN ('private', 'public', 'circles', 'connections'));
