-- User Connections/Friendships Migration
-- Bidirectional connections between users with status tracking
-- Unlike follows, connections require mutual acceptance

CREATE TABLE IF NOT EXISTS "connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_id" text NOT NULL, -- Neon Auth user ID - who sent the request
  "addressee_id" text NOT NULL, -- Neon Auth user ID - who received the request
  "status" text DEFAULT 'pending' NOT NULL, -- 'pending' | 'accepted' | 'rejected' | 'blocked'
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS "connections_requester_idx" ON "connections" ("requester_id");
CREATE INDEX IF NOT EXISTS "connections_addressee_idx" ON "connections" ("addressee_id");
CREATE INDEX IF NOT EXISTS "connections_status_idx" ON "connections" ("status");
CREATE INDEX IF NOT EXISTS "connections_requester_status_idx" ON "connections" ("requester_id", "status");
CREATE INDEX IF NOT EXISTS "connections_addressee_status_idx" ON "connections" ("addressee_id", "status");

-- Unique constraint to prevent duplicate connection requests between same users
CREATE UNIQUE INDEX IF NOT EXISTS "connections_unique_pair_idx" ON "connections" ("requester_id", "addressee_id");
