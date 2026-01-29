/**
 * Run migration 0007: Add user_profiles, messages, notifications tables
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log("Running migration 0007: Add user_profiles, messages, notifications...\n");

  try {
    // Check if user_profiles table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
      );
    `;

    if (tableExists[0].exists) {
      console.log("✓ user_profiles table already exists, skipping creation");
    } else {
      // Create user_profiles table
      await sql`
        CREATE TABLE "user_profiles" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" text NOT NULL UNIQUE,
          "display_name" text,
          "profile_picture" text,
          "birth_month" integer CHECK (birth_month >= 1 AND birth_month <= 12),
          "birth_year" integer CHECK (birth_year >= 1900 AND birth_year <= 2025),
          "city" text,
          "country" text,
          "visibility" text DEFAULT 'private' NOT NULL CHECK (visibility IN ('public', 'private')),
          "notification_preferences" jsonb DEFAULT '{"messages": true, "workouts": true, "goals": true, "circles": true}'::jsonb NOT NULL,
          "push_subscription" jsonb,
          "last_seen_at" timestamp WITH TIME ZONE,
          "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL,
          "updated_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
        )
      `;
      console.log("✓ Created user_profiles table");

      // Create indexes
      await sql`CREATE INDEX "user_profiles_visibility_idx" ON "user_profiles" ("visibility") WHERE visibility = 'public'`;
      await sql`CREATE INDEX "user_profiles_city_idx" ON "user_profiles" ("city") WHERE city IS NOT NULL`;
      await sql`CREATE INDEX "user_profiles_user_idx" ON "user_profiles" ("user_id")`;
      console.log("✓ Created user_profiles indexes");
    }

    // Check if messages table exists
    const messagesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'messages'
      );
    `;

    if (messagesExists[0].exists) {
      console.log("✓ messages table already exists, skipping creation");
    } else {
      await sql`
        CREATE TABLE "messages" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
          "sender_id" text NOT NULL,
          "recipient_id" text NOT NULL,
          "content" text NOT NULL,
          "read_at" timestamp WITH TIME ZONE,
          "deleted_by_sender" boolean DEFAULT false NOT NULL,
          "deleted_by_recipient" boolean DEFAULT false NOT NULL,
          "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
        )
      `;
      console.log("✓ Created messages table");

      await sql`CREATE INDEX "messages_circle_idx" ON "messages" ("circle_id")`;
      await sql`CREATE INDEX "messages_recipient_unread_idx" ON "messages" ("recipient_id", "read_at") WHERE read_at IS NULL`;
      await sql`CREATE INDEX "messages_recipient_idx" ON "messages" ("recipient_id", "created_at" DESC)`;
      await sql`CREATE INDEX "messages_sender_idx" ON "messages" ("sender_id", "created_at" DESC)`;
      await sql`CREATE INDEX "messages_thread_idx" ON "messages" ("sender_id", "recipient_id", "created_at" DESC)`;
      console.log("✓ Created messages indexes");
    }

    // Check if notifications table exists
    const notificationsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
      );
    `;

    if (notificationsExists[0].exists) {
      console.log("✓ notifications table already exists, skipping creation");
    } else {
      await sql`
        CREATE TABLE "notifications" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" text NOT NULL,
          "type" text NOT NULL,
          "title" text NOT NULL,
          "body" text,
          "data" jsonb,
          "action_url" text,
          "read_at" timestamp WITH TIME ZONE,
          "dismissed_at" timestamp WITH TIME ZONE,
          "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
        )
      `;
      console.log("✓ Created notifications table");

      await sql`CREATE INDEX "notifications_user_unread_idx" ON "notifications" ("user_id", "read_at") WHERE read_at IS NULL`;
      await sql`CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id", "created_at" DESC)`;
      await sql`CREATE INDEX "notifications_type_idx" ON "notifications" ("type", "created_at" DESC)`;
      console.log("✓ Created notifications indexes");
    }

    // Check if circle_requests table exists
    const circleRequestsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'circle_requests'
      );
    `;

    if (circleRequestsExists[0].exists) {
      console.log("✓ circle_requests table already exists, skipping creation");
    } else {
      await sql`
        CREATE TABLE "circle_requests" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
          "requester_id" text NOT NULL,
          "target_user_id" text NOT NULL,
          "message" text,
          "status" text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
          "responded_at" timestamp WITH TIME ZONE,
          "expires_at" timestamp WITH TIME ZONE DEFAULT (now() + interval '7 days'),
          "created_at" timestamp WITH TIME ZONE DEFAULT now() NOT NULL
        )
      `;
      console.log("✓ Created circle_requests table");

      await sql`CREATE INDEX "circle_requests_target_idx" ON "circle_requests" ("target_user_id", "status") WHERE status = 'pending'`;
      await sql`CREATE INDEX "circle_requests_requester_idx" ON "circle_requests" ("requester_id", "created_at" DESC)`;
      await sql`CREATE UNIQUE INDEX "circle_requests_unique_pending_idx" ON "circle_requests" ("circle_id", "target_user_id") WHERE status = 'pending'`;
      console.log("✓ Created circle_requests indexes");
    }

    console.log("\n✅ Migration 0007 completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
