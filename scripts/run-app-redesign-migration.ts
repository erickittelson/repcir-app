/**
 * Run migration for App Redesign - Social Features
 * Adds: visibility/category to circles, user_follows, activity_feed,
 *       circle_join_requests, user_locations, equipment_catalog
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log("Running migration: App Redesign - Social Features\n");

  try {
    // Add visibility and category to circles
    console.log("Adding columns to circles table...");
    await sql`ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'private' NOT NULL`;
    console.log("✓ Added visibility column");

    await sql`ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "category" text`;
    console.log("✓ Added category column");

    await sql`ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "member_count" integer DEFAULT 0 NOT NULL`;
    console.log("✓ Added member_count column");

    await sql`ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "image_url" text`;
    console.log("✓ Added image_url column");

    // Create indexes for circles discovery
    await sql`CREATE INDEX IF NOT EXISTS "circles_visibility_idx" ON "circles" ("visibility")`;
    await sql`CREATE INDEX IF NOT EXISTS "circles_category_idx" ON "circles" ("category")`;
    console.log("✓ Created circles indexes");

    // Create user_follows table
    console.log("\nCreating user_follows table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "user_follows" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "follower_id" text NOT NULL,
        "following_id" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "user_follows_follower_idx" ON "user_follows" ("follower_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "user_follows_following_idx" ON "user_follows" ("following_id")`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "user_follows_unique_idx" ON "user_follows" ("follower_id", "following_id")`;
    console.log("✓ Created user_follows table with indexes");

    // Create activity_feed table
    console.log("\nCreating activity_feed table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "activity_feed" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL,
        "activity_type" text NOT NULL,
        "entity_type" text,
        "entity_id" uuid,
        "metadata" jsonb,
        "visibility" text DEFAULT 'followers' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "activity_feed_user_idx" ON "activity_feed" ("user_id", "created_at")`;
    await sql`CREATE INDEX IF NOT EXISTS "activity_feed_type_idx" ON "activity_feed" ("activity_type")`;
    await sql`CREATE INDEX IF NOT EXISTS "activity_feed_visibility_idx" ON "activity_feed" ("visibility", "created_at")`;
    console.log("✓ Created activity_feed table with indexes");

    // Create circle_join_requests table
    console.log("\nCreating circle_join_requests table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "circle_join_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL,
        "message" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "responded_by" text,
        "responded_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "circle_join_requests_circle_idx" ON "circle_join_requests" ("circle_id", "status")`;
    await sql`CREATE INDEX IF NOT EXISTS "circle_join_requests_user_idx" ON "circle_join_requests" ("user_id", "status")`;
    console.log("✓ Created circle_join_requests table with indexes");

    // Create user_locations table
    console.log("\nCreating user_locations table...");
    await sql`
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
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "user_locations_user_idx" ON "user_locations" ("user_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "user_locations_active_idx" ON "user_locations" ("user_id", "is_active")`;
    console.log("✓ Created user_locations table with indexes");

    // Create equipment_catalog table
    console.log("\nCreating equipment_catalog table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "equipment_catalog" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "category" text NOT NULL,
        "is_standard" boolean DEFAULT true NOT NULL,
        "user_id" text,
        "icon" text,
        "details" jsonb,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "equipment_catalog_category_idx" ON "equipment_catalog" ("category")`;
    await sql`CREATE INDEX IF NOT EXISTS "equipment_catalog_standard_idx" ON "equipment_catalog" ("is_standard")`;
    console.log("✓ Created equipment_catalog table with indexes");

    // Check if equipment_catalog is empty before seeding
    const existingEquipment = await sql`SELECT COUNT(*) as count FROM "equipment_catalog"`;
    const count = Number(existingEquipment[0]?.count ?? 0);

    if (count === 0) {
      console.log("\nSeeding standard equipment catalog...");

      // Cardio
      await sql`INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
        ('Treadmill', 'cardio', true, 'activity'),
        ('Stationary Bike', 'cardio', true, 'bike'),
        ('Elliptical', 'cardio', true, 'activity'),
        ('Rowing Machine', 'cardio', true, 'waves'),
        ('Stair Climber', 'cardio', true, 'stairs'),
        ('Jump Rope', 'cardio', true, 'activity')
      `;

      // Strength - Free Weights
      await sql`INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
        ('Dumbbells', 'strength', true, 'dumbbell'),
        ('Barbell', 'strength', true, 'dumbbell'),
        ('Kettlebells', 'strength', true, 'dumbbell'),
        ('Weight Plates', 'strength', true, 'disc'),
        ('EZ Curl Bar', 'strength', true, 'dumbbell'),
        ('Trap Bar', 'strength', true, 'dumbbell')
      `;

      // Strength - Racks & Benches
      await sql`INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
        ('Squat Rack', 'strength', true, 'box'),
        ('Power Rack', 'strength', true, 'box'),
        ('Flat Bench', 'strength', true, 'bed'),
        ('Adjustable Bench', 'strength', true, 'bed'),
        ('Incline Bench', 'strength', true, 'bed'),
        ('Preacher Curl Bench', 'strength', true, 'bed')
      `;

      // Strength - Machines
      await sql`INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
        ('Cable Machine', 'strength', true, 'box'),
        ('Smith Machine', 'strength', true, 'box'),
        ('Leg Press', 'strength', true, 'box'),
        ('Leg Extension', 'strength', true, 'box'),
        ('Leg Curl', 'strength', true, 'box'),
        ('Lat Pulldown', 'strength', true, 'box'),
        ('Seated Row Machine', 'strength', true, 'box'),
        ('Chest Press Machine', 'strength', true, 'box'),
        ('Shoulder Press Machine', 'strength', true, 'box'),
        ('Pec Deck', 'strength', true, 'box')
      `;

      // Accessories
      await sql`INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
        ('Pull-up Bar', 'accessories', true, 'minus'),
        ('Dip Station', 'accessories', true, 'minus'),
        ('Resistance Bands', 'accessories', true, 'link'),
        ('Medicine Ball', 'accessories', true, 'circle'),
        ('Stability Ball', 'accessories', true, 'circle'),
        ('Ab Roller', 'accessories', true, 'circle'),
        ('Battle Ropes', 'accessories', true, 'cable'),
        ('Suspension Trainer (TRX)', 'accessories', true, 'link'),
        ('Foam Roller', 'accessories', true, 'cylinder'),
        ('Plyo Box', 'accessories', true, 'box')
      `;

      // Flexibility
      await sql`INSERT INTO "equipment_catalog" ("name", "category", "is_standard", "icon") VALUES
        ('Yoga Mat', 'flexibility', true, 'square'),
        ('Stretching Strap', 'flexibility', true, 'link'),
        ('Yoga Blocks', 'flexibility', true, 'box')
      `;

      console.log("✓ Seeded standard equipment catalog");
    } else {
      console.log(`\nSkipping equipment catalog seeding (${count} items already exist)`);
    }

    console.log("\n✅ Migration completed successfully!");

    // Verify the changes
    console.log("\nVerifying migration...");
    const circleColumns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'circles'
      AND column_name IN ('visibility', 'category', 'member_count', 'image_url')
      ORDER BY column_name
    `;
    console.log("Circles table columns:", circleColumns.map(c => c.column_name).join(", "));

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_follows', 'activity_feed', 'circle_join_requests', 'user_locations', 'equipment_catalog')
      ORDER BY table_name
    `;
    console.log("New tables created:", tables.map(t => t.table_name).join(", "));

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
