-- Migration: Add Performance Indexes
-- Date: 2026-02-03
-- Purpose: Optimize query performance based on database audit

-- =============================================================================
-- 1. TEXT SEARCH INDEXES (Trigram for ILIKE queries)
-- =============================================================================

-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Exercise search indexes (heavily used in /api/search)
CREATE INDEX IF NOT EXISTS exercises_name_trgm_idx
  ON exercises USING GIN(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS exercises_description_trgm_idx
  ON exercises USING GIN(description gin_trgm_ops);

-- Member name search
CREATE INDEX IF NOT EXISTS circle_members_name_trgm_idx
  ON circle_members USING GIN(name gin_trgm_ops);

-- =============================================================================
-- 2. ANALYTICS COMPOSITE INDEXES (Date range queries)
-- =============================================================================

-- Workout sessions - most common query pattern: member + status + date
CREATE INDEX IF NOT EXISTS workout_sessions_member_status_date_idx
  ON workout_sessions(member_id, status, date DESC);

-- Member metrics - time series queries
CREATE INDEX IF NOT EXISTS member_metrics_member_date_idx
  ON member_metrics(member_id, date DESC);

-- User metrics - time series queries
CREATE INDEX IF NOT EXISTS user_metrics_user_date_idx
  ON user_metrics(user_id, date DESC);

-- Context notes - recent notes lookup
CREATE INDEX IF NOT EXISTS context_notes_member_created_idx
  ON context_notes(member_id, created_at DESC);

-- =============================================================================
-- 3. LEADERBOARD INDEXES (Multi-column sorting)
-- =============================================================================

-- Challenge leaderboard - triple-column DESC ordering
CREATE INDEX IF NOT EXISTS challenge_participants_leaderboard_idx
  ON challenge_participants(
    challenge_id,
    current_day DESC,
    current_streak DESC,
    longest_streak DESC
  );

-- Program leaderboard
CREATE INDEX IF NOT EXISTS program_enrollments_leaderboard_idx
  ON program_enrollments(
    program_id,
    workouts_completed DESC,
    current_week DESC
  );

-- =============================================================================
-- 4. SOCIAL/FEED INDEXES (Activity queries)
-- =============================================================================

-- Activity feed - user timeline
CREATE INDEX IF NOT EXISTS activity_feed_user_created_idx
  ON activity_feed(user_id, created_at DESC);

-- User follows - follower lookup
CREATE INDEX IF NOT EXISTS user_follows_follower_idx
  ON user_follows(follower_id);

-- User follows - following lookup
CREATE INDEX IF NOT EXISTS user_follows_following_idx
  ON user_follows(following_id);

-- =============================================================================
-- 5. DISCOVERY INDEXES (Public content)
-- =============================================================================

-- Shared workouts - discovery page
CREATE INDEX IF NOT EXISTS shared_workouts_discovery_idx
  ON shared_workouts(visibility, is_featured DESC, popularity_score DESC)
  WHERE visibility = 'public';

-- Community programs - discovery page
CREATE INDEX IF NOT EXISTS community_programs_discovery_idx
  ON community_programs(visibility, is_featured DESC, popularity_score DESC)
  WHERE visibility = 'public';

-- Challenges - discovery page
CREATE INDEX IF NOT EXISTS challenges_discovery_idx
  ON challenges(visibility, is_featured DESC, popularity_score DESC)
  WHERE visibility = 'public';

-- =============================================================================
-- 6. AUDIT & COMPLIANCE INDEXES
-- =============================================================================

-- Audit logs - user lookup for GDPR requests
CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
  ON audit_logs(user_id, created_at DESC);

-- Audit logs - action type lookup
CREATE INDEX IF NOT EXISTS audit_logs_action_severity_idx
  ON audit_logs(action, severity, created_at DESC);

-- AI response cache - cleanup queries
CREATE INDEX IF NOT EXISTS ai_response_cache_expires_idx
  ON ai_response_cache(expires_at)
  WHERE expires_at IS NOT NULL;

-- =============================================================================
-- 7. SCHEDULING INDEXES
-- =============================================================================

-- Scheduled workouts - user date lookup
CREATE INDEX IF NOT EXISTS scheduled_workouts_user_date_idx
  ON scheduled_workouts(user_id, scheduled_date, status);

-- Notifications - user unread lookup
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- =============================================================================
-- 8. VECTOR SIMILARITY INDEX (if supported by Neon)
-- =============================================================================

-- Note: HNSW index for faster approximate nearest neighbor search
-- Uncomment if your Neon plan supports HNSW indexes
-- CREATE INDEX IF NOT EXISTS exercises_embedding_hnsw_idx
--   ON exercises USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

-- CREATE INDEX IF NOT EXISTS member_embeddings_hnsw_idx
--   ON member_embeddings USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

-- =============================================================================
-- 9. PARTIAL INDEXES (Reduce index size)
-- =============================================================================

-- Active goals only (most queries filter for active)
CREATE INDEX IF NOT EXISTS goals_member_active_idx
  ON goals(member_id, category)
  WHERE status = 'active';

-- Active limitations only
CREATE INDEX IF NOT EXISTS member_limitations_active_idx
  ON member_limitations(member_id)
  WHERE active = true;

-- Active user limitations only
CREATE INDEX IF NOT EXISTS user_limitations_active_idx
  ON user_limitations(user_id)
  WHERE is_chronic_permanent = true OR severity IN ('severe', 'moderate');

-- Completed workout sessions (for analytics)
CREATE INDEX IF NOT EXISTS workout_sessions_completed_idx
  ON workout_sessions(member_id, date DESC)
  WHERE status = 'completed';

-- =============================================================================
-- 10. COVERING INDEXES (Include columns to avoid table lookup)
-- =============================================================================

-- Circle members with profile data (common JOIN pattern)
CREATE INDEX IF NOT EXISTS circle_members_circle_lookup_idx
  ON circle_members(circle_id, user_id)
  INCLUDE (name, role, profile_picture);

-- Personal records with exercise lookup
CREATE INDEX IF NOT EXISTS personal_records_member_type_idx
  ON personal_records(member_id, record_type, exercise_id)
  INCLUDE (value, unit, date);
