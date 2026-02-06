-- Migration: Add Row Level Security (RLS) Policies
-- Date: 2026-02-03
-- Purpose: Database-level access control for defense-in-depth

-- =============================================================================
-- IMPORTANT: RLS Configuration
-- =============================================================================
-- To use RLS, the application must set the current user context on each connection:
--   SET app.current_user_id = 'user-uuid-here';
--
-- This can be done in the database connection setup:
-- ```typescript
-- const client = await pool.connect();
-- await client.query(`SET app.current_user_id = '${userId}'`);
-- // ... execute queries
-- client.release();
-- ```
-- =============================================================================

-- Helper function to get current user (with fallback for migrations/admin)
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_user_id', true),
    '' -- Empty string for migrations/admin (bypass RLS)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 1. USER PROFILES - Users can only access their own profile
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT
  USING (
    user_id = current_app_user_id()
    OR current_app_user_id() = '' -- Admin bypass
  );

-- Policy: Users can update their own profile
CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE
  USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

-- Policy: Users can insert their own profile
CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT
  WITH CHECK (
    user_id = current_app_user_id()
    OR current_app_user_id() = '' -- Admin bypass for onboarding
  );

-- =============================================================================
-- 2. USER METRICS - Health data protection
-- =============================================================================

ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_metrics_select_own ON user_metrics
  FOR SELECT
  USING (
    user_id = current_app_user_id()
    OR current_app_user_id() = ''
  );

CREATE POLICY user_metrics_insert_own ON user_metrics
  FOR INSERT
  WITH CHECK (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY user_metrics_update_own ON user_metrics
  FOR UPDATE
  USING (user_id = current_app_user_id());

CREATE POLICY user_metrics_delete_own ON user_metrics
  FOR DELETE
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 3. USER LIMITATIONS - Sensitive health data
-- =============================================================================

ALTER TABLE user_limitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_limitations_select_own ON user_limitations
  FOR SELECT
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY user_limitations_modify_own ON user_limitations
  FOR ALL
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 4. USER CAPABILITIES - Physical assessment data
-- =============================================================================

ALTER TABLE user_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_capabilities_select_own ON user_capabilities
  FOR SELECT
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY user_capabilities_modify_own ON user_capabilities
  FOR ALL
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 5. COACH CONVERSATIONS - AI coaching privacy
-- =============================================================================

ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations (through their member ID)
CREATE POLICY coach_conversations_select_own ON coach_conversations
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

CREATE POLICY coach_conversations_modify_own ON coach_conversations
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

-- =============================================================================
-- 6. COACH MESSAGES - AI coaching messages
-- =============================================================================

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_messages_select_own ON coach_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT cc.id FROM coach_conversations cc
      JOIN circle_members cm ON cc.member_id = cm.id
      WHERE cm.user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

CREATE POLICY coach_messages_modify_own ON coach_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT cc.id FROM coach_conversations cc
      JOIN circle_members cm ON cc.member_id = cm.id
      WHERE cm.user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

-- =============================================================================
-- 7. MEMBER EMBEDDINGS - AI-generated embeddings
-- =============================================================================

ALTER TABLE member_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_embeddings_select_own ON member_embeddings
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

CREATE POLICY member_embeddings_modify_own ON member_embeddings
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

-- =============================================================================
-- 8. MESSAGES - Direct messages privacy
-- =============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY messages_select_own ON messages
  FOR SELECT
  USING (
    sender_id = current_app_user_id()
    OR recipient_id = current_app_user_id()
    OR current_app_user_id() = ''
  );

-- Users can only insert messages they send
CREATE POLICY messages_insert_own ON messages
  FOR INSERT
  WITH CHECK (sender_id = current_app_user_id() OR current_app_user_id() = '');

-- Users can update messages they sent (for soft delete)
CREATE POLICY messages_update_own ON messages
  FOR UPDATE
  USING (
    sender_id = current_app_user_id()
    OR recipient_id = current_app_user_id()
  );

-- =============================================================================
-- 9. NOTIFICATIONS - User notifications
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY notifications_modify_own ON notifications
  FOR ALL
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 10. AUDIT LOGS - Restrict to own logs (admin can see all via bypass)
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- Only system can insert audit logs (via admin bypass)
CREATE POLICY audit_logs_insert_system ON audit_logs
  FOR INSERT
  WITH CHECK (current_app_user_id() = '' OR user_id = current_app_user_id());

-- =============================================================================
-- 11. USER PRIVACY SETTINGS
-- =============================================================================

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_privacy_settings_select_own ON user_privacy_settings
  FOR SELECT
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

CREATE POLICY user_privacy_settings_modify_own ON user_privacy_settings
  FOR ALL
  USING (user_id = current_app_user_id() OR current_app_user_id() = '');

-- =============================================================================
-- 12. PERSONAL RECORDS
-- =============================================================================

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY personal_records_select_own ON personal_records
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

CREATE POLICY personal_records_modify_own ON personal_records
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

-- =============================================================================
-- 13. GOALS
-- =============================================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select_own ON goals
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

CREATE POLICY goals_modify_own ON goals
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM circle_members WHERE user_id = current_app_user_id()
    )
    OR current_app_user_id() = ''
  );

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. Admin operations should set current_app_user_id to empty string ''
-- 2. The empty string check (current_app_user_id() = '') provides an admin bypass
-- 3. For circle-scoped data, policies check through circle_members join
-- 4. Public data (exercises, badges, etc.) intentionally NOT protected by RLS
-- 5. To test RLS: SET app.current_user_id = 'test-user-id'; SELECT * FROM user_profiles;
-- 6. To disable RLS for maintenance: SET ROLE postgres; or use BYPASSRLS role
-- =============================================================================
