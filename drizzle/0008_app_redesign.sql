-- Migration: App Redesign - Social Features
-- Add social features: user follows, activity feed, circle join requests, user locations, equipment catalog

-- Add visibility and category to circles
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'private' NOT NULL;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "member_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "image_url" text;

-- Create indexes for circles discovery
CREATE INDEX IF NOT EXISTS "circles_visibility_idx" ON "circles" ("visibility");
CREATE INDEX IF NOT EXISTS "circles_category_idx" ON "circles" ("category");

-- User follows table
CREATE TABLE IF NOT EXISTS "user_follows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "follower_id" text NOT NULL,
  "following_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_follows_follower_idx" ON "user_follows" ("follower_id");
CREATE INDEX IF NOT EXISTS "user_follows_following_idx" ON "user_follows" ("following_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_follows_unique_idx" ON "user_follows" ("follower_id", "following_id");

-- Activity feed table
CREATE TABLE IF NOT EXISTS "activity_feed" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "activity_type" text NOT NULL,
  "entity_type" text,
  "entity_id" uuid,
  "metadata" jsonb,
  "visibility" text DEFAULT 'followers' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "activity_feed_user_idx" ON "activity_feed" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_feed_type_idx" ON "activity_feed" ("activity_type");
CREATE INDEX IF NOT EXISTS "activity_feed_visibility_idx" ON "activity_feed" ("visibility", "created_at");

-- Circle join requests table
CREATE TABLE IF NOT EXISTS "circle_join_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "message" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "responded_by" text,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "circle_join_requests_circle_idx" ON "circle_join_requests" ("circle_id", "status");
CREATE INDEX IF NOT EXISTS "circle_join_requests_user_idx" ON "circle_join_requests" ("user_id", "status");

-- User locations table
CREATE TABLE IF NOT EXISTS "user_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "address" text,
  "is_active" boolean DEFAULT false NOT NULL,
  "equipment" jsonb DEFAULT '[]' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_locations_user_idx" ON "user_locations" ("user_id");
CREATE INDEX IF NOT EXISTS "user_locations_active_idx" ON "user_locations" ("user_id", "is_active");

-- Equipment catalog table
CREATE TABLE IF NOT EXISTS "equipment_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "category" text NOT NULL,
  "is_standard" boolean DEFAULT true NOT NULL,
  "user_id" text,
  "icon" text,
  "details" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "equipment_catalog_category_idx" ON "equipment_catalog" ("category");
CREATE INDEX IF NOT EXISTS "equipment_catalog_standard_idx" ON "equipment_catalog" ("is_standard");

-- Seed standard equipment catalog
INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
  -- Cardio
  ('Treadmill', 'cardio', true, 'activity'),
  ('Stationary Bike', 'cardio', true, 'bike'),
  ('Elliptical', 'cardio', true, 'activity'),
  ('Rowing Machine', 'cardio', true, 'waves'),
  ('Stair Climber', 'cardio', true, 'stairs'),
  ('Jump Rope', 'cardio', true, 'activity'),
  -- Strength - Free Weights
  ('Dumbbells', 'strength', true, 'dumbbell'),
  ('Barbell', 'strength', true, 'dumbbell'),
  ('Kettlebells', 'strength', true, 'dumbbell'),
  ('Weight Plates', 'strength', true, 'disc'),
  ('EZ Curl Bar', 'strength', true, 'dumbbell'),
  ('Trap Bar', 'strength', true, 'dumbbell'),
  -- Strength - Racks & Benches
  ('Squat Rack', 'strength', true, 'box'),
  ('Power Rack', 'strength', true, 'box'),
  ('Flat Bench', 'strength', true, 'bed'),
  ('Adjustable Bench', 'strength', true, 'bed'),
  ('Incline Bench', 'strength', true, 'bed'),
  ('Preacher Curl Bench', 'strength', true, 'bed'),
  -- Strength - Machines
  ('Cable Machine', 'strength', true, 'box'),
  ('Smith Machine', 'strength', true, 'box'),
  ('Leg Press', 'strength', true, 'box'),
  ('Leg Extension', 'strength', true, 'box'),
  ('Leg Curl', 'strength', true, 'box'),
  ('Lat Pulldown', 'strength', true, 'box'),
  ('Seated Row Machine', 'strength', true, 'box'),
  ('Chest Press Machine', 'strength', true, 'box'),
  ('Shoulder Press Machine', 'strength', true, 'box'),
  ('Pec Deck', 'strength', true, 'box'),
  -- Accessories
  ('Pull-up Bar', 'accessories', true, 'minus'),
  ('Dip Station', 'accessories', true, 'minus'),
  ('Resistance Bands', 'accessories', true, 'link'),
  ('Medicine Ball', 'accessories', true, 'circle'),
  ('Stability Ball', 'accessories', true, 'circle'),
  ('Ab Roller', 'accessories', true, 'circle'),
  ('Battle Ropes', 'accessories', true, 'cable'),
  ('Suspension Trainer (TRX)', 'accessories', true, 'link'),
  ('Foam Roller', 'accessories', true, 'cylinder'),
  ('Plyo Box', 'accessories', true, 'box'),
  -- Flexibility
  ('Yoga Mat', 'flexibility', true, 'square'),
  ('Stretching Strap', 'flexibility', true, 'link'),
  ('Yoga Blocks', 'flexibility', true, 'box')
ON CONFLICT DO NOTHING;
