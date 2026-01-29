-- Migration: Add user profiles, messaging, and notifications
-- Created: 2026-01-21
--
-- This migration adds:
-- 1. user_profiles - User-level settings (profile pic, birthday, city, privacy)
-- 2. messages - Circle member direct messaging
-- 3. notifications - In-app and push notifications

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================
-- User-level settings independent of circle membership
-- Stores profile picture, birthday, location, privacy settings, notification prefs

CREATE TABLE "user_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL UNIQUE,  -- Neon Auth user ID
  "display_name" text,
  "profile_picture" text,  -- Vercel Blob Storage URL
  "birth_month" integer CHECK (birth_month >= 1 AND birth_month <= 12),
  "birth_year" integer CHECK (birth_year >= 1920 AND birth_year <= 2020),
  "city" text,
  "country" text,
  "visibility" text DEFAULT 'private' NOT NULL CHECK (visibility IN ('public', 'private')),
  "notification_preferences" jsonb DEFAULT '{"messages": true, "workouts": true, "goals": true, "circles": true}'::jsonb NOT NULL,
  "push_subscription" jsonb,  -- Web Push subscription object
  "last_seen_at" timestamp WITH TIME ZONE,
  "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for discovering public profiles
CREATE INDEX "user_profiles_visibility_idx" ON "user_profiles" ("visibility") WHERE visibility = 'public';
-- Index for location-based discovery
CREATE INDEX "user_profiles_city_idx" ON "user_profiles" ("city") WHERE city IS NOT NULL;
-- Index for user lookup
CREATE INDEX "user_profiles_user_idx" ON "user_profiles" ("user_id");

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Direct messages between circle members
-- Both users must be members of the same circle to message

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
  "sender_id" text NOT NULL,  -- Neon Auth user ID
  "recipient_id" text NOT NULL,  -- Neon Auth user ID
  "content" text NOT NULL,
  "read_at" timestamp WITH TIME ZONE,
  "deleted_by_sender" boolean DEFAULT false NOT NULL,
  "deleted_by_recipient" boolean DEFAULT false NOT NULL,
  "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for listing messages in a circle
CREATE INDEX "messages_circle_idx" ON "messages" ("circle_id");
-- Index for recipient inbox (unread messages)
CREATE INDEX "messages_recipient_unread_idx" ON "messages" ("recipient_id", "read_at") WHERE read_at IS NULL;
-- Index for recipient inbox (all messages)
CREATE INDEX "messages_recipient_idx" ON "messages" ("recipient_id", "created_at" DESC);
-- Index for sender outbox
CREATE INDEX "messages_sender_idx" ON "messages" ("sender_id", "created_at" DESC);
-- Index for conversation threads (between two users)
CREATE INDEX "messages_thread_idx" ON "messages" ("sender_id", "recipient_id", "created_at" DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- In-app notifications with optional push delivery
-- Supports various types: messages, workout reminders, goals, circle invites

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,  -- Neon Auth user ID
  "type" text NOT NULL,  -- 'message', 'workout_reminder', 'goal_achieved', 'circle_invite', etc.
  "title" text NOT NULL,
  "body" text,
  "data" jsonb,  -- Type-specific payload (e.g., messageId, senderId, goalId)
  "action_url" text,  -- Deep link for notification click
  "read_at" timestamp WITH TIME ZONE,
  "dismissed_at" timestamp WITH TIME ZONE,
  "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for user's notifications (unread first)
CREATE INDEX "notifications_user_unread_idx" ON "notifications" ("user_id", "read_at") WHERE read_at IS NULL;
-- Index for user's notifications (chronological)
CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id", "created_at" DESC);
-- Index for notification type analytics
CREATE INDEX "notifications_type_idx" ON "notifications" ("type", "created_at" DESC);

-- ============================================================================
-- CIRCLE REQUESTS TABLE (for public profile discovery)
-- ============================================================================
-- When someone finds a public profile, they can request to add them to a circle

CREATE TABLE "circle_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
  "requester_id" text NOT NULL,  -- Who is sending the request
  "target_user_id" text NOT NULL,  -- Who is receiving the request
  "message" text,  -- Optional message with the request
  "status" text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  "responded_at" timestamp WITH TIME ZONE,
  "expires_at" timestamp WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for pending requests
CREATE INDEX "circle_requests_target_idx" ON "circle_requests" ("target_user_id", "status") WHERE status = 'pending';
-- Index for requester's sent requests
CREATE INDEX "circle_requests_requester_idx" ON "circle_requests" ("requester_id", "created_at" DESC);
-- Prevent duplicate pending requests
CREATE UNIQUE INDEX "circle_requests_unique_pending_idx" ON "circle_requests" ("circle_id", "target_user_id") WHERE status = 'pending';
