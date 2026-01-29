-- Challenge Proof Uploads Migration
-- Allows users to upload photos/videos as proof of challenge completion
-- with visibility controls (private, circle, public)

CREATE TABLE IF NOT EXISTS "challenge_proof_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_id" uuid NOT NULL REFERENCES "challenge_participants"("id") ON DELETE CASCADE,
  "progress_id" uuid REFERENCES "challenge_progress"("id") ON DELETE CASCADE,
  "milestone_id" uuid REFERENCES "challenge_milestones"("id") ON DELETE SET NULL,
  
  -- Media
  "media_type" text NOT NULL, -- "image" | "video"
  "media_url" text NOT NULL,
  "thumbnail_url" text,
  
  -- Visibility
  "visibility" text DEFAULT 'private' NOT NULL, -- "private" | "circle" | "public"
  
  -- Context
  "caption" text,
  "day_number" integer,
  
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "challenge_proof_uploads_participant_idx" ON "challenge_proof_uploads" ("participant_id");
CREATE INDEX IF NOT EXISTS "challenge_proof_uploads_visibility_idx" ON "challenge_proof_uploads" ("visibility");
CREATE INDEX IF NOT EXISTS "challenge_proof_uploads_created_idx" ON "challenge_proof_uploads" ("created_at");
