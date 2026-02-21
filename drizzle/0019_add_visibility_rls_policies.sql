-- Migration: RLS policies for content visibility
-- Date: 2026-02-20
-- Purpose: Enforce visibility rules at the database level for workout content
-- Depends on: 0017_add_row_level_security.sql, 0018_add_content_visibility.sql

-- =============================================================================
-- HELPER: Check if requesting user shares a circle with the content creator
-- =============================================================================
-- Used by "circles" visibility policies. Returns true if the current app user
-- is a member of ANY circle that the given user_id is also a member of.

CREATE OR REPLACE FUNCTION shares_circle_with(creator_user_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM circle_members cm1
    JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
    WHERE cm1.user_id = current_app_user_id()
      AND cm2.user_id = creator_user_id
      AND cm1.user_id != cm2.user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- HELPER: Check if requesting user has an accepted connection with creator
-- =============================================================================

CREATE OR REPLACE FUNCTION is_connected_to(creator_user_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM connections
    WHERE status = 'accepted'
      AND (
        (requester_id = current_app_user_id() AND addressee_id = creator_user_id)
        OR (requester_id = creator_user_id AND addressee_id = current_app_user_id())
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 1. SHARED WORKOUTS - Visibility-aware RLS
-- =============================================================================

ALTER TABLE shared_workouts ENABLE ROW LEVEL SECURITY;

-- SELECT: Visibility-based access
CREATE POLICY shared_workouts_select ON shared_workouts
  FOR SELECT
  USING (
    -- Admin bypass
    current_app_user_id() = ''
    -- Creator can always see their own
    OR user_id = current_app_user_id()
    -- Public content visible to all
    OR visibility = 'public'
    -- Circles: visible if requester shares a circle with creator
    OR (visibility = 'circles' AND shares_circle_with(user_id))
    -- Connections: visible if requester has accepted connection with creator
    OR (visibility = 'connections' AND is_connected_to(user_id))
  );

-- INSERT: Users can only create shared workouts as themselves
CREATE POLICY shared_workouts_insert ON shared_workouts
  FOR INSERT
  WITH CHECK (
    user_id = current_app_user_id()
    OR current_app_user_id() = ''
  );

-- UPDATE: Only the creator can update their shared workout
CREATE POLICY shared_workouts_update ON shared_workouts
  FOR UPDATE
  USING (user_id = current_app_user_id() OR current_app_user_id() = '')
  WITH CHECK (user_id = current_app_user_id() OR current_app_user_id() = '');

-- DELETE: Only the creator can delete their shared workout
CREATE POLICY shared_workouts_delete ON shared_workouts
  FOR DELETE
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 2. SAVED WORKOUTS - Users can only manage their own saves
-- =============================================================================

ALTER TABLE saved_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_workouts_select ON saved_workouts
  FOR SELECT
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY saved_workouts_insert ON saved_workouts
  FOR INSERT
  WITH CHECK (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY saved_workouts_delete ON saved_workouts
  FOR DELETE
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 3. WORKOUT TEMPLATES - Visibility-aware RLS
-- =============================================================================

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: System templates always visible; user templates follow visibility
CREATE POLICY workout_templates_select ON workout_templates
  FOR SELECT
  USING (
    current_app_user_id() = ''
    -- System templates are always visible
    OR is_system = true
    -- Creator can always see their own
    OR created_by = current_app_user_id()
    -- Public
    OR visibility = 'public'
    -- Circles
    OR (visibility = 'circles' AND shares_circle_with(created_by))
    -- Connections
    OR (visibility = 'connections' AND is_connected_to(created_by))
  );

-- INSERT: Users create templates as themselves
CREATE POLICY workout_templates_insert ON workout_templates
  FOR INSERT
  WITH CHECK (
    created_by = current_app_user_id()
    OR current_app_user_id() = ''
  );

-- UPDATE: Only creator can update
CREATE POLICY workout_templates_update ON workout_templates
  FOR UPDATE
  USING (created_by = current_app_user_id() OR current_app_user_id() = '')
  WITH CHECK (created_by = current_app_user_id() OR current_app_user_id() = '');

-- DELETE: Only creator can delete
CREATE POLICY workout_templates_delete ON workout_templates
  FOR DELETE
  USING (created_by = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 4. COMMUNITY PROGRAMS - Visibility-aware RLS
-- =============================================================================

ALTER TABLE community_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_programs_select ON community_programs
  FOR SELECT
  USING (
    current_app_user_id() = ''
    OR created_by_user_id = current_app_user_id()
    OR visibility = 'public'
    OR (visibility = 'circles' AND shares_circle_with(created_by_user_id))
    OR (visibility = 'connections' AND is_connected_to(created_by_user_id))
  );

CREATE POLICY community_programs_insert ON community_programs
  FOR INSERT
  WITH CHECK (
    created_by_user_id = current_app_user_id()
    OR current_app_user_id() = ''
  );

CREATE POLICY community_programs_update ON community_programs
  FOR UPDATE
  USING (created_by_user_id = current_app_user_id() OR current_app_user_id() = '')
  WITH CHECK (created_by_user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY community_programs_delete ON community_programs
  FOR DELETE
  USING (created_by_user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. workout_plans table is NOT given RLS here because it is circle-scoped
--    (accessed through circle_members membership). Its visibility column is
--    enforced at the application layer when serving discovery/browse queries.
--    Circle membership already restricts who can see plans within a circle.
--
-- 2. The shares_circle_with() and is_connected_to() helper functions use
--    STABLE volatility, allowing Postgres to cache results within a single
--    statement. For high-traffic discovery queries, consider materializing
--    the social graph into a lookup table if these functions become a
--    bottleneck (unlikely below ~10K concurrent users).
--
-- 3. The "private" visibility case is handled implicitly: if visibility is
--    "private" and the user is not the creator, none of the OR conditions
--    match, so the row is excluded.
--
-- 4. For workout_plans, the visibility field is used at the application layer
--    in discovery/browse queries like:
--    WHERE visibility = 'public'
--       OR (visibility = 'circles' AND circle_id IN (...user's circle IDs))
--       OR (visibility = 'connections' AND created_by_member_id IN (...connected member IDs))
--       OR created_by_member_id = :currentMemberId
-- =============================================================================
